import uuid
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel

from app.core.database import Base


class Plugin(Base):
    __tablename__ = "plugins"

    id = Column(String(100), primary_key=True) # Identifier like "weather", "spotify"
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    version = Column(String(20), default="1.0.0")
    author = Column(String(100), nullable=True)
    category = Column(String(50), nullable=True)
    icon = Column(String(255), nullable=True)
    is_official = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to user installations
    installations = relationship("UserPlugin", back_populates="plugin", cascade="all, delete-orphan")


class UserPlugin(Base):
    __tablename__ = "user_plugins"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    plugin_id = Column(String(100), ForeignKey("plugins.id"), primary_key=True)
    config = Column(JSON, nullable=True)
    is_enabled = Column(Boolean, default=True)
    installed_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="plugins")
    plugin = relationship("Plugin", back_populates="installations")


class PluginResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    version: str
    author: Optional[str]
    category: Optional[str]
    icon: Optional[str]
    is_official: bool

    model_config = {"from_attributes": True}


class UserPluginResponse(BaseModel):
    plugin_id: str
    config: Optional[Dict[str, Any]]
    is_enabled: bool
    installed_at: datetime
    plugin: PluginResponse

    model_config = {"from_attributes": True}
