from fastapi import APIRouter, Depends, HTTPException, Query, Request, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.database.session import get_db
from app.models.download import Download
from app.schemas.download import DownloadCreate, DownloadOut
from app.services import downloader

router = APIRouter()

@router.get("", response_model=List[DownloadOut])
async def list_downloads(
    search: Optional[str] = Query(None, description="Search by filename or URL"),
    status: Optional[str] = Query(None, description="Filter by status (All, Waiting, Downloading, Paused, Stopped, Failed, Completed, Cancelled)"),
    sort_by: Optional[str] = Query("newest", description="Sort by newest, oldest, filename, size, progress, completion_time"),
    sort_order: Optional[str] = Query("desc", description="asc or desc"),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Download)

    # 1. Search filter
    if search:
        search_query = f"%{search.strip()}%"
        stmt = stmt.where(
            (Download.filename.ilike(search_query)) |
            (Download.url.ilike(search_query))
        )

    # 2. Status filter
    if status and status.lower() != "all":
        # Capitalize state to match DB entries (e.g. Downloading, Completed)
        formatted_status = status.capitalize()
        # Edge case for status filtering
        if formatted_status == "Waiting":
            formatted_status = "Waiting"
        stmt = stmt.where(Download.status == formatted_status)

    # 3. Sorting
    sort_col = Download.created_at
    if sort_by == "oldest":
        sort_col = Download.created_at
        sort_order = "asc" if sort_order is None else sort_order
    elif sort_by == "newest":
        sort_col = Download.created_at
        sort_order = "desc" if sort_order is None else sort_order
    elif sort_by == "filename":
        sort_col = Download.filename
    elif sort_by == "size":
        sort_col = Download.total_bytes
    elif sort_by == "progress":
        sort_col = Download.progress
    elif sort_by == "completion_time":
        sort_col = Download.completed_at

    if sort_order == "desc":
        stmt = stmt.order_by(sort_col.desc())
    else:
        stmt = stmt.order_by(sort_col.asc())

    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("", response_model=DownloadOut, status_code=http_status.HTTP_201_CREATED)
async def create_download(
    download_in: DownloadCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    aria2_client = request.app.state.aria2_client
    try:
        download = await downloader.add_download(db, aria2_client, download_in)
        return download
    except ValueError as e:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{id}", response_model=DownloadOut)
async def get_download_details(
    id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Download).where(Download.id == id))
    download = result.scalar_one_or_none()
    if not download:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Download task not found")
    return download

@router.delete("/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_download(
    id: str,
    request: Request,
    delete_file: bool = Query(False, description="Delete physical files and database history"),
    db: AsyncSession = Depends(get_db)
):
    aria2_client = request.app.state.aria2_client
    try:
        await downloader.delete_download(db, aria2_client, id, delete_file)
        return
    except KeyError:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Download task not found")
    except Exception as e:
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{id}/pause", response_model=DownloadOut)
async def pause_download(
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    aria2_client = request.app.state.aria2_client
    try:
        download = await downloader.pause_download(db, aria2_client, id)
        return download
    except KeyError:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Download task not found")
    except Exception as e:
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{id}/resume", response_model=DownloadOut)
async def resume_download(
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    aria2_client = request.app.state.aria2_client
    try:
        download = await downloader.resume_download(db, aria2_client, id)
        return download
    except KeyError:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Download task not found")
    except Exception as e:
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{id}/stop", response_model=DownloadOut)
async def stop_download(
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    aria2_client = request.app.state.aria2_client
    try:
        download = await downloader.stop_download(db, aria2_client, id)
        return download
    except KeyError:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Download task not found")
    except Exception as e:
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{id}/restart", response_model=DownloadOut)
async def restart_download(
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    aria2_client = request.app.state.aria2_client
    try:
        download = await downloader.restart_download(db, aria2_client, id)
        return download
    except KeyError:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Download task not found")
    except Exception as e:
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{id}/retry", response_model=DownloadOut)
async def retry_download(
    id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    aria2_client = request.app.state.aria2_client
    try:
        download = await downloader.retry_download(db, aria2_client, id)
        return download
    except KeyError:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Download task not found")
    except ValueError as e:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
