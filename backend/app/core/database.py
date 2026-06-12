from typing import AsyncGenerator, Optional
import logging

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
try:
    import chromadb
except ImportError:
    chromadb = None
from sqlalchemy import text

from app.core.config import settings

logger = logging.getLogger("jarvis.database")

# ── SQLAlchemy (PostgreSQL / SQLite Fallback) ──────────────────────────────────
# Default to SQLite if Postgres is unavailable
_db_url = settings.DATABASE_URL
if not _db_url:
    _db_url = "sqlite+aiosqlite:///./jarvis.db"

engine = create_async_engine(_db_url, echo=settings.DEBUG, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# ── MongoDB ────────────────────────────────────────────────────────────────────
_mongo_client: Optional[AsyncIOMotorClient] = None
_mongo_db: Optional[AsyncIOMotorDatabase] = None

# ── ChromaDB ───────────────────────────────────────────────────────────────────
_chroma_client = None


async def init_db() -> None:
    global _mongo_client, _mongo_db, _chroma_client, engine, AsyncSessionLocal

    # 1. Attempt SQLAlchemy initialization
    try:
        # Test connection
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.warning(f"Failed to connect to primary database ({settings.DATABASE_URL}). Falling back to SQLite. Error: {e}")
        _db_url = "sqlite+aiosqlite:///./jarvis.db"
        engine = create_async_engine(_db_url, echo=settings.DEBUG)
        AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Import models to ensure they are registered with Base
    from app.models.user import User  # noqa: F401
    from app.models.automation import Automation  # noqa: F401
    from app.models.chat import ChatSession, ChatMessage # noqa: F401
    from app.models.memory import Memory # noqa: F401
    from app.models.task import Task # noqa: F401
    from app.models.calendar import CalendarEvent # noqa: F401
    from app.models.voice import VoiceClone, VoiceInteraction # noqa: F401
    from app.models.plugin import UserPlugin, Plugin # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. MongoDB Initialization (Optional)
    try:
        _mongo_client = AsyncIOMotorClient(settings.MONGODB_URL, serverSelectionTimeoutMS=2000)
        # Test connection
        await _mongo_client.admin.command('ping')
        _mongo_db = _mongo_client[settings.MONGODB_DB]
    except Exception as e:
        logger.warning(f"MongoDB connection failed. Chat history will not be persisted. Error: {e}")
        if _mongo_client:
            _mongo_client.close()
            _mongo_client = None
        _mongo_db = None

    # 3. ChromaDB Initialization (Optional)
    try:
        if chromadb is None:
            raise ImportError("ChromaDB is not installed")
        _chroma_client = chromadb.HttpClient(
            host=settings.CHROMA_HOST, port=settings.CHROMA_PORT
        )
        # Simple health check
        _chroma_client.heartbeat()
    except Exception as e:
        logger.warning(f"ChromaDB HttpClient connection failed. Falling back to local PersistentClient. Error: {e}")
        try:
            import os
            os.makedirs("./chroma_db", exist_ok=True)
            _chroma_client = chromadb.PersistentClient(path="./chroma_db")
            logger.info("Successfully initialized local ChromaDB PersistentClient.")
        except Exception as ex:
            logger.warning(f"ChromaDB PersistentClient initialization failed. Long-term memory will not be available. Error: {ex}")
            _chroma_client = None


async def close_db() -> None:
    global _mongo_client
    if _mongo_client:
        _mongo_client.close()
    await engine.dispose()


# ── Dependency helpers ─────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_mongo_db() -> Optional[AsyncIOMotorDatabase]:
    return _mongo_db


def get_chroma_client():
    return _chroma_client
