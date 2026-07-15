from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database.session import get_db
import shutil
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("")
async def get_health(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    aria2_client = request.app.state.aria2_client
    
    # 1. Check DB connection
    db_status = "disconnected"
    try:
        # Simple query to check connectivity
        await db.execute(select(1))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")

    # 2. Check aria2 connection
    aria2_status = "disconnected"
    try:
        is_alive = await aria2_client.ping()
        if is_alive:
            aria2_status = "connected"
    except Exception as e:
        logger.error(f"aria2 health check failed: {e}")

    # 3. Check storage utilization of the downloads volume
    storage_stats = {
        "total_bytes": 0,
        "used_bytes": 0,
        "free_bytes": 0,
        "used_percent": 0.0
    }
    
    downloads_path = "/downloads"
    if os.path.exists(downloads_path):
        try:
            total, used, free = shutil.disk_usage(downloads_path)
            used_percent = round((used / total) * 100, 2) if total > 0 else 0.0
            storage_stats = {
                "total_bytes": total,
                "used_bytes": used,
                "free_bytes": free,
                "used_percent": used_percent
            }
        except Exception as e:
            logger.error(f"Failed to fetch storage usage: {e}")

    status = "ok"
    if db_status != "connected" or aria2_status != "connected":
        status = "degraded"

    return {
        "status": status,
        "database": db_status,
        "aria2": aria2_status,
        "storage": storage_stats
    }
