import asyncio
import os
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.session import SessionLocal
from app.models.download import Download
from app.services.aria2 import Aria2Client
from app.services.settings import get_db_settings
from app.services.downloader import move_completed_download, resolve_safe_path
from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)

# Map of aria2 error codes
ARIA2_ERRORS = {
    "1": "An unknown error occurred.",
    "2": "Time out.",
    "3": "Resource not found.",
    "4": "Resource not found.",
    "5": "Download speed was too slow.",
    "6": "Network problem occurred.",
    "7": "Unfinished download.",
    "8": "Remote server did not support resume.",
    "9": "Not enough disk space.",
    "10": "Piece length was different.",
    "11": "aria2 was downloading the same file.",
    "12": "Download was aborted.",
    "13": "IPv4/IPv6 resolver failed.",
    "14": "HTTP header was bad.",
    "15": "HTTP status code was bad.",
    "16": "aria2 could not create directory.",
    "17": "aria2 could not create file.",
    "18": "I/O error occurred.",
    "19": "Could not self-allocate memory.",
    "20": "Connection was refused.",
}

async def sync_downloads(db: AsyncSession, aria2_client: Aria2Client):
    """
    Syncs the state of all active and paused downloads in the database with aria2.
    """
    # Fetch downloads that are in non-terminal states
    stmt = select(Download).where(
        Download.status.in_(["Downloading", "Waiting", "Paused"])
    )
    result = await db.execute(stmt)
    downloads = result.scalars().all()
    
    if not downloads:
        return

    db_settings = await get_db_settings(db)

    for download in downloads:
        if not download.aria2_gid:
            # If no GID is present, try to re-add if auto_resume is enabled, otherwise fail
            if db_settings.auto_resume:
                logger.info(f"Re-adding download with missing GID for ID: {download.id}")
                try:
                    await re_add_lost_download(db, aria2_client, download, db_settings)
                except Exception as e:
                    logger.error(f"Failed to re-add download {download.id}: {e}")
            else:
                download.status = "Failed"
                download.error_message = "Download task lost in engine (missing GID)."
            continue

        try:
            # Query aria2 for status
            status_res = await aria2_client.tell_status(download.aria2_gid)
            
            aria2_status = status_res.get("status")
            completed_len = int(status_res.get("completedLength", 0))
            total_len = int(status_res.get("totalLength", 0))
            speed = int(status_res.get("downloadSpeed", 0))
            
            # Update file paths dynamically if aria2 discovered them (e.g. actual filename from headers)
            files = status_res.get("files", [])
            if files and len(files) == 1:
                path = files[0].get("path", "")
                if path:
                    actual_name = os.path.basename(path)
                    if actual_name and actual_name != download.filename:
                        # Prevent writing temporary or empty names
                        if not actual_name.endswith(".aria2") and actual_name != "download":
                            download.filename = actual_name
            
            # Progress calculation
            progress = int((completed_len / total_len) * 100) if total_len > 0 else 0
            
            # ETA calculation
            eta = 0
            if speed > 0 and total_len > completed_len:
                eta = int((total_len - completed_len) / speed)
                
            download.progress = progress
            download.downloaded_bytes = completed_len
            download.total_bytes = total_len
            download.speed = speed
            download.eta = eta
            download.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

            if aria2_status == "active":
                download.status = "Downloading"
                if not download.started_at:
                    download.started_at = datetime.now(timezone.utc).replace(tzinfo=None)
                download.error_message = None
                
            elif aria2_status == "waiting":
                download.status = "Waiting"
                download.speed = 0
                download.eta = 0
                
            elif aria2_status == "paused":
                download.status = "Paused"
                download.speed = 0
                download.eta = 0
                
            elif aria2_status == "complete":
                # Download finished, move to destination folder
                logger.info(f"Download complete: {download.filename} (ID: {download.id})")
                
                # Fetch actual download paths from aria2
                src_paths = [f.get("path") for f in files if f.get("path")]
                target_completed_dir = resolve_safe_path(db_settings.default_download_dir, download.destination)
                
                try:
                    move_completed_download(src_paths, target_completed_dir, download.filename)
                    download.status = "Completed"
                    download.progress = 100
                    download.speed = 0
                    download.eta = 0
                    download.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
                    download.error_message = None
                    
                    # Clean up from aria2 history
                    await aria2_client.remove_download_result(download.aria2_gid)
                except Exception as e:
                    logger.error(f"Error moving completed download {download.id}: {e}")
                    download.status = "Failed"
                    download.error_message = f"Failed to save download: {e}"
                    
            elif aria2_status == "error":
                # Download failed in aria2
                err_code = status_res.get("errorCode", "1")
                err_msg = ARIA2_ERRORS.get(err_code, f"aria2 error code {err_code}.")
                logger.error(f"Download failed in aria2 (GID: {download.aria2_gid}): {err_msg}")
                
                download.status = "Failed"
                download.speed = 0
                download.eta = 0
                download.error_message = err_msg
                
                # Clean up from aria2 history
                try:
                    await aria2_client.remove_download_result(download.aria2_gid)
                except Exception:
                    pass

        except Exception as e:
            # GID not found or aria2 communication error
            # Check if this GID is lost (e.g. getStatus raises an exception because task is gone)
            logger.warning(f"Failed to query aria2 for GID {download.aria2_gid}: {e}")
            
            if "not found" in str(e).lower() or "is not defined" in str(e).lower():
                # Task is lost in aria2
                if db_settings.auto_resume:
                    logger.info(f"Re-adding lost download GID {download.aria2_gid} (ID: {download.id})")
                    try:
                        await re_add_lost_download(db, aria2_client, download, db_settings)
                    except Exception as re_err:
                        logger.error(f"Failed to re-add download: {re_err}")
                else:
                    download.status = "Failed"
                    download.error_message = "Download task lost in engine. Auto-resume is disabled."
            else:
                # Other connection issues (e.g. aria2 crashed or is restarting)
                # Keep current DB status and hope it recovers in subsequent ticks
                pass

    await db.commit()

async def re_add_lost_download(db: AsyncSession, aria2_client: Aria2Client, download: Download, settings):
    """
    Re-adds a lost download to aria2, enabling range requests to resume from partial files.
    """
    options = {
        "dir": app_settings.INCOMPLETE_DIR,
        "split": str(settings.connections_per_download),
        "max-connection-per-server": str(settings.connections_per_download),
        "max-tries": str(settings.retry_attempts),
        "retry-wait": str(settings.retry_delay),
        "continue": "true" # Important: continue downloading from partial data
    }
    if download.filename:
        options["out"] = download.filename
        
    try:
        new_gid = await aria2_client.add_uri([download.url], options)
        download.aria2_gid = new_gid
        if download.status == "Paused":
            # If it was paused in the database, pause the newly added task as well
            await aria2_client.pause(new_gid)
    except Exception as e:
        logger.error(f"Failed to re-add URI {download.url}: {e}")
        download.status = "Failed"
        download.error_message = f"Failed to auto-resume download: {e}"

async def monitor_loop(aria2_client: Aria2Client):
    """
    Persistent loop checking aria2 statuses. Runs inside the FastAPI app lifecycle.
    """
    logger.info("Starting background download monitor loop...")
    while True:
        try:
            async with SessionLocal() as db:
                await sync_downloads(db, aria2_client)
        except Exception as e:
            logger.error(f"Error in monitor loop tick: {e}")
            
        # Refresh interval can be dynamically fetched, but defaults to 1 second
        await asyncio.sleep(1)
