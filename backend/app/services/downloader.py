import os
import shutil
import logging
from urllib.parse import urlparse
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.download import Download
from app.schemas.download import DownloadCreate
from app.services.aria2 import Aria2Client
from app.services.settings import get_db_settings
from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)

def get_filename_from_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path
    filename = os.path.basename(path)
    if not filename or "." not in filename:
        filename = "download"
    return filename

def resolve_safe_path(base_dir: str, relative_path: str) -> str:
    """
    Safely resolves a relative path under base_dir to prevent directory traversal.
    """
    if not relative_path:
        return base_dir
    
    # Remove leading slashes and dot segments
    clean_relative = os.path.normpath(relative_path).lstrip("/")
    if clean_relative.startswith("..") or "/../" in clean_relative:
        raise ValueError("Invalid destination path: directory traversal detected")
        
    resolved = os.path.abspath(os.path.join(base_dir, clean_relative))
    if not resolved.startswith(os.path.abspath(base_dir)):
        raise ValueError("Invalid destination path: traversal outside base directory")
        
    return resolved

def move_completed_download(source_paths: list[str], target_dir: str, custom_filename: str = None) -> list[str]:
    """
    Moves downloaded files from incomplete folder to the target completed directory.
    """
    os.makedirs(target_dir, exist_ok=True)
    moved_paths = []
    
    for src in source_paths:
        if not os.path.exists(src):
            logger.warning(f"Source file to move does not exist: {src}")
            continue
            
        base_name = os.path.basename(src)
        if custom_filename and len(source_paths) == 1:
            target_name = custom_filename
        else:
            target_name = base_name
            
        dest = os.path.join(target_dir, target_name)
        
        # If destination file already exists, we append a suffix to avoid overwriting
        if os.path.exists(dest):
            name, ext = os.path.splitext(target_name)
            counter = 1
            while os.path.exists(dest):
                dest = os.path.join(target_dir, f"{name}_{counter}{ext}")
                counter += 1
                
        shutil.move(src, dest)
        moved_paths.append(dest)
        
        # Clean up aria2 control file if present
        aria_control = src + ".aria2"
        if os.path.exists(aria_control):
            try:
                os.remove(aria_control)
            except Exception as e:
                logger.warning(f"Could not remove aria2 control file: {aria_control}: {e}")
                
    return moved_paths

async def add_download(db: AsyncSession, aria2_client: Aria2Client, download_in: DownloadCreate) -> Download:
    # 1. Duplicate detection (look for active, waiting, or paused downloads with the same URL)
    stmt = select(Download).where(
        Download.url == download_in.url,
        Download.status.in_(["Downloading", "Waiting", "Paused"])
    )
    result = await db.execute(stmt)
    if result.scalars().first():
        raise ValueError("A download with this URL is already active or paused")

    # 2. Get active settings
    db_settings = await get_db_settings(db)
    
    # 3. Determine filename and resolve destination
    filename = download_in.filename.strip() if download_in.filename else get_filename_from_url(download_in.url)
    destination = download_in.destination.strip() if download_in.destination else ""
    
    # Resolve target directory securely
    target_completed_dir = resolve_safe_path(db_settings.default_download_dir, destination)
    
    # 4. Prepare aria2 options
    options = {
        "dir": app_settings.INCOMPLETE_DIR,
        "split": str(db_settings.connections_per_download),
        "max-connection-per-server": str(db_settings.connections_per_download),
        "max-tries": str(db_settings.retry_attempts),
        "retry-wait": str(db_settings.retry_delay),
    }
    if download_in.filename:
        options["out"] = filename

    # 5. Add to aria2
    try:
        aria2_gid = await aria2_client.add_uri([download_in.url], options)
    except Exception as e:
        logger.error(f"Failed to add download to aria2: {e}")
        raise RuntimeError(f"Download engine error: {e}")

    # 6. Create database record
    download = Download(
        aria2_gid=aria2_gid,
        filename=filename,
        url=download_in.url,
        destination=destination,
        status="Waiting",
        progress=0,
        downloaded_bytes=0,
        total_bytes=0,
        speed=0,
        eta=0
    )
    db.add(download)
    await db.commit()
    await db.refresh(download)
    return download

async def pause_download(db: AsyncSession, aria2_client: Aria2Client, download_id: str) -> Download:
    result = await db.execute(select(Download).where(Download.id == download_id))
    download = result.scalar_one_or_none()
    if not download:
        raise KeyError("Download not found")
        
    if download.status in ["Downloading", "Waiting"]:
        if download.aria2_gid:
            try:
                await aria2_client.pause(download.aria2_gid)
            except Exception as e:
                logger.error(f"aria2 pause failed for GID {download.aria2_gid}: {e}")
        download.status = "Paused"
        download.speed = 0
        await db.commit()
        await db.refresh(download)
    return download

async def resume_download(db: AsyncSession, aria2_client: Aria2Client, download_id: str) -> Download:
    result = await db.execute(select(Download).where(Download.id == download_id))
    download = result.scalar_one_or_none()
    if not download:
        raise KeyError("Download not found")
        
    if download.status in ["Paused", "Stopped", "Failed"]:
        # If the task exists in aria2, we just unpause it
        success = False
        if download.aria2_gid:
            try:
                await aria2_client.unpause(download.aria2_gid)
                success = True
            except Exception:
                # GID might not exist in aria2 anymore (e.g. queue was cleared)
                pass
                
        # If not successful, we re-add the download to aria2
        if not success:
            db_settings = await get_db_settings(db)
            options = {
                "dir": app_settings.INCOMPLETE_DIR,
                "split": str(db_settings.connections_per_download),
                "max-connection-per-server": str(db_settings.connections_per_download),
                "max-tries": str(db_settings.retry_attempts),
                "retry-wait": str(db_settings.retry_delay),
            }
            if download.filename:
                options["out"] = download.filename
                
            try:
                new_gid = await aria2_client.add_uri([download.url], options)
                download.aria2_gid = new_gid
            except Exception as e:
                logger.error(f"Failed to re-add download for resume: {e}")
                download.status = "Failed"
                download.error_message = f"Failed to resume download: {e}"
                await db.commit()
                return download
                
        download.status = "Downloading"
        download.error_message = None
        if not download.started_at:
            download.started_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
        await db.refresh(download)
    return download

async def stop_download(db: AsyncSession, aria2_client: Aria2Client, download_id: str) -> Download:
    result = await db.execute(select(Download).where(Download.id == download_id))
    download = result.scalar_one_or_none()
    if not download:
        raise KeyError("Download not found")
        
    if download.status in ["Downloading", "Waiting", "Paused"]:
        if download.aria2_gid:
            try:
                await aria2_client.remove(download.aria2_gid)
            except Exception as e:
                logger.error(f"aria2 remove failed: {e}")
                
        download.status = "Stopped"
        download.speed = 0
        download.eta = 0
        await db.commit()
        await db.refresh(download)
    return download

async def restart_download(db: AsyncSession, aria2_client: Aria2Client, download_id: str) -> Download:
    result = await db.execute(select(Download).where(Download.id == download_id))
    download = result.scalar_one_or_none()
    if not download:
        raise KeyError("Download not found")
        
    # 1. Remove from aria2 if exists
    if download.aria2_gid:
        try:
            await aria2_client.force_remove(download.aria2_gid)
        except Exception:
            pass
        try:
            await aria2_client.remove_download_result(download.aria2_gid)
        except Exception:
            pass

    # 2. Delete partial or completed files
    db_settings = await get_db_settings(db)
    
    # Delete from incomplete folder
    incomplete_path = os.path.join(app_settings.INCOMPLETE_DIR, download.filename)
    if os.path.exists(incomplete_path):
        try:
            if os.path.isdir(incomplete_path):
                shutil.rmtree(incomplete_path)
            else:
                os.remove(incomplete_path)
        except Exception as e:
            logger.warning(f"Could not remove incomplete file {incomplete_path}: {e}")
            
    incomplete_control = incomplete_path + ".aria2"
    if os.path.exists(incomplete_control):
        try:
            os.remove(incomplete_control)
        except Exception:
            pass
            
    # Delete from completed folder
    try:
        completed_dir = resolve_safe_path(db_settings.default_download_dir, download.destination)
        completed_path = os.path.join(completed_dir, download.filename)
        if os.path.exists(completed_path):
            if os.path.isdir(completed_path):
                shutil.rmtree(completed_path)
            else:
                os.remove(completed_path)
    except Exception as e:
        logger.warning(f"Could not remove completed file: {e}")

    # 3. Add fresh download to aria2
    options = {
        "dir": app_settings.INCOMPLETE_DIR,
        "split": str(db_settings.connections_per_download),
        "max-connection-per-server": str(db_settings.connections_per_download),
        "max-tries": str(db_settings.retry_attempts),
        "retry-wait": str(db_settings.retry_delay),
    }
    if download.filename:
        options["out"] = download.filename
        
    try:
        new_gid = await aria2_client.add_uri([download.url], options)
        download.aria2_gid = new_gid
    except Exception as e:
        logger.error(f"Restart addUri failed: {e}")
        download.status = "Failed"
        download.error_message = f"Failed to restart download: {e}"
        await db.commit()
        return download

    # 4. Reset database metrics
    download.status = "Waiting"
    download.progress = 0
    download.downloaded_bytes = 0
    download.total_bytes = 0
    download.speed = 0
    download.eta = 0
    download.started_at = None
    download.completed_at = None
    download.error_message = None
    
    await db.commit()
    await db.refresh(download)
    return download

async def retry_download(db: AsyncSession, aria2_client: Aria2Client, download_id: str) -> Download:
    result = await db.execute(select(Download).where(Download.id == download_id))
    download = result.scalar_one_or_none()
    if not download:
        raise KeyError("Download not found")
        
    if download.status != "Failed":
        raise ValueError("Only failed downloads can be retried")

    # Remove from aria2 if exists
    if download.aria2_gid:
        try:
            await aria2_client.remove_download_result(download.aria2_gid)
        except Exception:
            pass

    # Start download again, preserving existing partial files
    db_settings = await get_db_settings(db)
    options = {
        "dir": app_settings.INCOMPLETE_DIR,
        "split": str(db_settings.connections_per_download),
        "max-connection-per-server": str(db_settings.connections_per_download),
        "max-tries": str(db_settings.retry_attempts),
        "retry-wait": str(db_settings.retry_delay),
        "continue": "true"
    }
    if download.filename:
        options["out"] = download.filename
        
    try:
        new_gid = await aria2_client.add_uri([download.url], options)
        download.aria2_gid = new_gid
    except Exception as e:
        logger.error(f"Retry addUri failed: {e}")
        download.status = "Failed"
        download.error_message = f"Failed to retry download: {e}"
        await db.commit()
        return download

    download.status = "Waiting"
    download.speed = 0
    download.eta = 0
    download.error_message = None
    
    await db.commit()
    await db.refresh(download)
    return download

async def delete_download(db: AsyncSession, aria2_client: Aria2Client, download_id: str, delete_file: bool) -> bool:
    result = await db.execute(select(Download).where(Download.id == download_id))
    download = result.scalar_one_or_none()
    if not download:
        raise KeyError("Download not found")

    # 1. Remove from aria2 if active or stopped
    if download.aria2_gid:
        try:
            await aria2_client.force_remove(download.aria2_gid)
        except Exception:
            pass
        try:
            await aria2_client.remove_download_result(download.aria2_gid)
        except Exception:
            pass

    # 2. Optionally delete physical files
    if delete_file:
        db_settings = await get_db_settings(db)
        
        # Incomplete files
        incomplete_path = os.path.join(app_settings.INCOMPLETE_DIR, download.filename)
        if os.path.exists(incomplete_path):
            try:
                if os.path.isdir(incomplete_path):
                    shutil.rmtree(incomplete_path)
                else:
                    os.remove(incomplete_path)
            except Exception as e:
                logger.warning(f"Failed to delete incomplete file {incomplete_path}: {e}")
                
        incomplete_control = incomplete_path + ".aria2"
        if os.path.exists(incomplete_control):
            try:
                os.remove(incomplete_control)
            except Exception:
                pass
                
        # Completed files
        try:
            completed_dir = resolve_safe_path(db_settings.default_download_dir, download.destination)
            completed_path = os.path.join(completed_dir, download.filename)
            if os.path.exists(completed_path):
                if os.path.isdir(completed_path):
                    shutil.rmtree(completed_path)
                else:
                    os.remove(completed_path)
        except Exception as e:
            logger.warning(f"Failed to delete completed file: {e}")

    # 3. Delete database record
    await db.delete(download)
    await db.commit()
    return True
