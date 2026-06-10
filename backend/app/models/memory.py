import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel

from app.core.database import Base


class Memory(Base):
    __tablename__ = "memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    collection = Column(String(100), default="jarvis_memory")
    metadata_json = Column(JSON, nullable=True) # Renamed to avoid confusion with SQLAlchemy metadata
    vector_id = Column(String(255), nullable=True) # Reference to ChromaDB ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="memories")


from enum import Enum

class MemoryCategory(str, Enum):
    PROJECTS = "projects"
    PEOPLE = "people"
    PREFERENCES = "preferences"
    DEADLINES = "deadlines"
    HABITS = "habits"
    LEARNING = "learning"
    GOALS = "goals"
    GENERAL = "general"

class MemoryCreate(BaseModel):
    content: str
    category: MemoryCategory = MemoryCategory.GENERAL
    metadata: Optional[Dict[str, Any]] = None
    collection: Optional[str] = "jarvis_memory"

class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class MemoryResponse(BaseModel):
    id: str
    content: str
    category: MemoryCategory
    collection: str
    metadata_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class MemoryEntry(BaseModel):
    id: str
    content: str
    category: Optional[MemoryCategory] = MemoryCategory.GENERAL
    metadata: Optional[Dict[str, Any]] = None
    distance: Optional[float] = None

class MemorySearchRequest(BaseModel):
    query: str
    n_results: int = 5
    category: Optional[MemoryCategory] = None
    collection: str = "jarvis_memory"
