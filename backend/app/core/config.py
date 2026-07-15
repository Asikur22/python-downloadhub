import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "DownloadHub"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:////database/downloadhub.db"

    # aria2 configuration
    ARIA2_RPC_URL: str = "http://127.0.0.1:6800/jsonrpc"
    ARIA2_RPC_SECRET: str = Field(default_factory=lambda: os.getenv("ARIA2_RPC_SECRET", "downloadhub_rpc_secret_12345"))

    # Folder paths (inside container)
    DOWNLOADS_DIR: str = "/downloads"
    INCOMPLETE_DIR: str = "/downloads/incomplete"
    COMPLETED_DIR: str = "/downloads/completed"
    CONFIG_DIR: str = "/config"
    LOGS_DIR: str = "/logs"

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8975",
        "http://127.0.0.1:8975",
        "*"
    ]

settings = Settings()
