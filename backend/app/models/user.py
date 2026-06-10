import uuid

from sqlalchemy import Boolean, Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import Base


# ── ORM Model ─────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Social Logins
    google_id = Column(String(100), unique=True, nullable=True)
    github_id = Column(String(100), unique=True, nullable=True)

    # Password Reset
    reset_password_token = Column(String(100), nullable=True)
    reset_password_expires = Column(DateTime(timezone=True), nullable=True)

    # AI Configuration per user
    ai_provider = Column(String(50), default="gemini")
    openai_api_key = Column(String(255), nullable=True)
    openai_base_url = Column(String(512), nullable=True)
    gemini_api_key = Column(String(255), nullable=True)
    default_model = Column(String(100), default="gemini-1.5-flash")
    system_prompt = Column(Text, nullable=True)

    # Voice Configuration
    stt_provider = Column(String(50), default="faster-whisper")
    tts_provider = Column(String(50), default="piper")
    elevenlabs_api_key = Column(String(255), nullable=True)
    voice_id = Column(String(100), nullable=True) # Used for model size or specific voice

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    memories = relationship("Memory", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    automations = relationship("Automation", back_populates="user", cascade="all, delete-orphan")
    calendar_events = relationship("CalendarEvent", back_populates="user", cascade="all, delete-orphan")
    voice_clones = relationship("VoiceClone", back_populates="user", cascade="all, delete-orphan")
    voice_interactions = relationship("VoiceInteraction", back_populates="user", cascade="all, delete-orphan")
    plugins = relationship("UserPlugin", back_populates="user", cascade="all, delete-orphan")

    @property
    def has_openai_api_key(self) -> bool:
        return bool(self.openai_api_key)

    @property
    def has_gemini_api_key(self) -> bool:
        return bool(self.gemini_api_key)

    @property
    def has_elevenlabs_api_key(self) -> bool:
        return bool(self.elevenlabs_api_key)


# ── Pydantic Schemas ───────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    avatar_url: Optional[str] = None
    is_active: bool
    google_id: Optional[str] = None
    github_id: Optional[str] = None
    ai_provider: str
    openai_base_url: Optional[str] = None
    default_model: str
    system_prompt: Optional[str] = None
    stt_provider: str
    tts_provider: str
    voice_id: Optional[str] = None
    has_openai_api_key: bool = False
    has_gemini_api_key: bool = False
    has_elevenlabs_api_key: bool = False

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdateSettings(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    ai_provider: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    gemini_api_key: Optional[str] = None
    default_model: Optional[str] = None
    system_prompt: Optional[str] = None
    stt_provider: Optional[str] = None
    tts_provider: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    voice_id: Optional[str] = None
