from datetime import datetime
from typing import Optional
from pydantic import BaseModel, HttpUrl, field_validator
import re

class DownloadBase(BaseModel):
    filename: Optional[str] = None
    destination: Optional[str] = None

class DownloadCreate(BaseModel):
    url: str
    filename: Optional[str] = None
    destination: Optional[str] = None

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("URL cannot be empty")
        
        # Match HTTP, HTTPS, FTP protocols
        pattern = re.compile(
            r'^(https?|ftp)://' # Protocol
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|' # Domain
            r'localhost|' # Localhost
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})' # IP address
            r'(?::\d+)?' # Port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE
        )
        if not pattern.match(v):
            raise ValueError("URL must be a valid HTTP, HTTPS, or FTP protocol URL")
        return v

    @field_validator("destination")
    @classmethod
    def validate_destination(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = v.strip()
            # Simple check for directory traversal attempts in path input
            if ".." in v or v.startswith("/"):
                raise ValueError("Destination folder must be a relative path and cannot contain '..'")
        return v

class DownloadOut(BaseModel):
    id: str
    aria2_gid: Optional[str] = None
    filename: str
    url: str
    destination: Optional[str] = None
    status: str
    progress: int
    downloaded_bytes: int
    total_bytes: int
    speed: int
    eta: int
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True
