import os
from collections import deque
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.schemas.setting import SettingsSchema
from app.services.settings import get_db_settings, update_db_settings
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("", response_model=SettingsSchema)
async def get_settings(db: AsyncSession = Depends(get_db)):
    try:
        db_settings = await get_db_settings(db)
        return db_settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {e}")

@router.put("", response_model=SettingsSchema)
async def update_settings(
    settings_in: SettingsSchema,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    aria2_client = request.app.state.aria2_client
    try:
        # Save to DB
        updated_settings = await update_db_settings(db, settings_in)
        
        # Sync relevant options to active aria2 instance
        aria2_options = {
            "max-concurrent-downloads": str(updated_settings.max_concurrent_downloads),
            "split": str(updated_settings.connections_per_download),
            "max-connection-per-server": str(updated_settings.connections_per_download),
            "max-overall-download-limit": str(updated_settings.global_max_download_limit),
            "max-tries": str(updated_settings.retry_attempts),
            "retry-wait": str(updated_settings.retry_delay)
        }
        
        try:
            await aria2_client.change_global_option(aria2_options)
            logger.info("Successfully synchronized settings to active aria2 instance.")
        except Exception as e:
            logger.warning(f"Could not push settings to active aria2 instance (it might be offline): {e}")

        return updated_settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {e}")

@router.post("/restart-engine")
async def restart_engine(request: Request, db: AsyncSession = Depends(get_db)):
    app = request.app
    
    # 1. Terminate old process if exists
    if hasattr(app.state, "aria2_process") and app.state.aria2_process:
        process = app.state.aria2_process
        logger.info("Terminating aria2c subprocess for manual restart...")
        process.terminate()
        try:
            process.wait(timeout=3.0)
        except Exception:
            logger.warning("aria2c did not terminate cleanly; killing it.")
            process.kill()
            process.wait()
            
    # 2. Start new process
    if hasattr(app.state, "start_aria2"):
        try:
            await app.state.start_aria2()
            logger.info("aria2c subprocess restarted successfully.")
        except Exception as e:
            logger.error(f"Failed to restart aria2c subprocess: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to start downloader process: {e}")
            
        # 3. Wait a moment and re-sync options
        aria2_client = app.state.aria2_client
        # Wait up to 3 seconds for it to start up
        rpc_ready = False
        import asyncio
        for _ in range(6):
            if await aria2_client.ping():
                rpc_ready = True
                break
            await asyncio.sleep(0.5)
            
        if not rpc_ready:
            raise HTTPException(status_code=500, detail="Downloader process started but RPC interface is unreachable.")
            
        try:
            db_settings = await get_db_settings(db)
            aria2_options = {
                "max-concurrent-downloads": str(db_settings.max_concurrent_downloads),
                "split": str(db_settings.connections_per_download),
                "max-connection-per-server": str(db_settings.connections_per_download),
                "max-overall-download-limit": str(db_settings.global_max_download_limit),
                "max-tries": str(db_settings.retry_attempts),
                "retry-wait": str(db_settings.retry_delay)
            }
            await aria2_client.change_global_option(aria2_options)
            logger.info("Resynced options to restarted aria2c engine.")
        except Exception as e:
            logger.warning(f"Could not push settings to restarted aria2c instance: {e}")
            
        return {"status": "success", "message": "Downloader engine restarted successfully"}
    else:
        raise HTTPException(status_code=500, detail="Downloader restart handler not initialized.")


@router.get("/logs")
async def list_logs():
    try:
        logs_dir = settings.LOGS_DIR
        if not os.path.exists(logs_dir):
            return []
        
        # Get log files
        files = []
        for f in os.listdir(logs_dir):
            if f.endswith(".log"):
                path = os.path.join(logs_dir, f)
                if os.path.isfile(path):
                    files.append({
                        "name": f,
                        "size": os.path.getsize(path),
                        "modified": os.path.getmtime(path)
                    })
        return sorted(files, key=lambda x: x["name"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list log files: {e}")


@router.get("/logs/{log_name}")
async def get_log_content(
    log_name: str,
    lines: int = Query(default=200, ge=1, le=2000)
):
    # Security check: prevent directory traversal and restrict to .log files
    if "/" in log_name or "\\" in log_name or not log_name.endswith(".log"):
        raise HTTPException(status_code=400, detail="Invalid log file name")
        
    log_path = os.path.join(settings.LOGS_DIR, log_name)
    if not os.path.exists(log_path) or not os.path.isfile(log_path):
        raise HTTPException(status_code=404, detail="Log file not found")
        
    try:
        # Read the last N lines efficiently
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            lines_list = list(deque(f, maxlen=lines))
        return {
            "name": log_name,
            "lines": lines_list,
            "total_lines": len(lines_list)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read log file: {e}")
