from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.setting import Setting
from app.schemas.setting import SettingsSchema
from app.core.config import settings as app_settings

DEFAULT_SETTINGS = {
    "default_download_dir": "/downloads/completed",
    "max_concurrent_downloads": "5",
    "connections_per_download": "5",
    "global_max_download_limit": "0",
    "retry_attempts": "5",
    "retry_delay": "60",
    "auto_resume": "true",
    "theme": "light",
    "refresh_interval": "1",
    "aria2_rpc_secret": app_settings.ARIA2_RPC_SECRET
}

async def get_db_settings(db: AsyncSession) -> SettingsSchema:
    result = await db.execute(select(Setting))
    db_items = result.scalars().all()
    db_dict = {item.key: item.value for item in db_items}

    updated = False
    for k, v in DEFAULT_SETTINGS.items():
        if k not in db_dict:
            new_setting = Setting(key=k, value=v)
            db.add(new_setting)
            db_dict[k] = v
            updated = True
    
    if updated:
        await db.commit()

    return SettingsSchema(
        default_download_dir=db_dict["default_download_dir"],
        max_concurrent_downloads=int(db_dict["max_concurrent_downloads"]),
        connections_per_download=int(db_dict["connections_per_download"]),
        global_max_download_limit=db_dict["global_max_download_limit"],
        retry_attempts=int(db_dict["retry_attempts"]),
        retry_delay=int(db_dict["retry_delay"]),
        auto_resume=db_dict["auto_resume"].lower() == "true",
        theme=db_dict["theme"],
        refresh_interval=int(db_dict["refresh_interval"]),
        aria2_rpc_secret=db_dict["aria2_rpc_secret"]
    )

async def update_db_settings(db: AsyncSession, new_settings: SettingsSchema) -> SettingsSchema:
    settings_dict = {
        "default_download_dir": new_settings.default_download_dir,
        "max_concurrent_downloads": str(new_settings.max_concurrent_downloads),
        "connections_per_download": str(new_settings.connections_per_download),
        "global_max_download_limit": new_settings.global_max_download_limit,
        "retry_attempts": str(new_settings.retry_attempts),
        "retry_delay": str(new_settings.retry_delay),
        "auto_resume": str(new_settings.auto_resume),
        "theme": new_settings.theme,
        "refresh_interval": str(new_settings.refresh_interval),
        "aria2_rpc_secret": new_settings.aria2_rpc_secret
    }

    for k, v in settings_dict.items():
        result = await db.execute(select(Setting).where(Setting.key == k))
        setting_item = result.scalar_one_or_none()
        if setting_item:
            setting_item.value = v
        else:
            db.add(Setting(key=k, value=v))
            
    await db.commit()
    return new_settings
