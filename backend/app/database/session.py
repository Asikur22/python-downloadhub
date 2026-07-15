from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

database_url = settings.DATABASE_URL
if database_url.startswith("sqlite://"):
    database_url = database_url.replace("sqlite://", "sqlite+aiosqlite://")

engine = create_async_engine(
    database_url,
    connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
)

SessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    class_=AsyncSession
)

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
