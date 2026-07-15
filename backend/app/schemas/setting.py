from typing import Optional
from pydantic import BaseModel, Field

class SettingsSchema(BaseModel):
    default_download_dir: str = Field(default="/downloads/completed")
    max_concurrent_downloads: int = Field(default=5, ge=1, le=20)
    connections_per_download: int = Field(default=5, ge=1, le=16)
    global_max_download_limit: str = Field(default="0") # "0" means unlimited, can be "500K", "10M" etc.
    retry_attempts: int = Field(default=5, ge=0, le=100)
    retry_delay: int = Field(default=60, ge=1, le=3600)
    auto_resume: bool = Field(default=True)
    theme: str = Field(default="light") # dark, light
    refresh_interval: int = Field(default=1, ge=1, le=10)
    aria2_rpc_secret: str = Field(default="")

    class Config:
        from_attributes = True
