import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import Boolean, Column, DateTime, Integer, JSON, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel

from app.core.database import Base


# ── ORM Model ─────────────────────────────────────────────────────────────────
class Automation(Base):
    __tablename__ = "automations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    trigger_type = Column(String(50), nullable=False)  # schedule | event | manual
    trigger_config = Column(JSON, nullable=True)
    actions = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, default=True)
    run_count = Column(Integer, default=0)
    last_run = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="automations")


# ── Pydantic Schemas ───────────────────────────────────────────────────────────
class AutomationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger_type: str
    trigger_config: Optional[Dict[str, Any]] = None
    actions: List[Dict[str, Any]] = []
    is_active: bool = True


class AutomationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_config: Optional[Dict[str, Any]] = None
    actions: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


class AutomationResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    trigger_type: str
    trigger_config: Optional[Dict[str, Any]]
    actions: List[Dict[str, Any]]
    is_active: bool
    run_count: int
    last_run: Optional[str] = None
    created_at: Optional[str] = None

    model_config = {"from_attributes": True}
