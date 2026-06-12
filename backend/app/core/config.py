from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # ── Databases ──────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://jarvis:jarvis_secret_2024@localhost:5432/jarvis_db"
    MONGODB_URL: str = "mongodb://jarvis:jarvis_secret_2024@localhost:27017"
    MONGODB_DB: str = "jarvis_db"

    # ── ChromaDB ───────────────────────────────────
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001

    # ── Security ───────────────────────────────────
    SECRET_KEY: str = "jarvis-ultra-secret-key-stark-industries-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ── AI ────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    GEMINI_API_KEY: str = ""
    DEFAULT_PROVIDER: str = "gemini"
    DEFAULT_MODEL: str = "gemini-3.5-flash"

    # Ollama - Removed (Transitioned to OpenAI-only)
    # HASS_URL: Optional[str] = None
    # HASS_TOKEN: Optional[str] = None

    # ── Home Assistant ─────────────────────────────
    HASS_URL: Optional[str] = None
    HASS_TOKEN: Optional[str] = None

    # ── App ───────────────────────────────────────
    APP_NAME: str = "JARVIS"
    DEBUG: bool = True
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: list[str] = ["*"]
    RATE_LIMIT_PER_MINUTE: int = 60

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
