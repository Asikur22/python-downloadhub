import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, DateTime
from app.database.base_class import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

class Download(Base):
    __tablename__ = "downloads"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    aria2_gid = Column(String(64), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    destination = Column(Text, nullable=True)
    status = Column(String(50), nullable=False, default="Waiting")
    progress = Column(Integer, nullable=False, default=0)
    downloaded_bytes = Column(Integer, nullable=False, default=0)
    total_bytes = Column(Integer, nullable=False, default=0)
    speed = Column(Integer, nullable=False, default=0)
    eta = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, nullable=False, default=get_utc_now)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=get_utc_now, onupdate=get_utc_now)
