import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel

from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(Integer, default=0) # 0: Low, 1: Medium, 2: High
    status = Column(String(50), default="todo") # todo | in_progress | review | done
    kanban_order = Column(Integer, default=0)
    due_date = Column(DateTime(timezone=True), nullable=True)
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(100), nullable=True) # daily | weekly | monthly
    is_reminder = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="tasks")


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[int] = 0
    due_date: Optional[datetime] = None
    is_reminder: Optional[bool] = False


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    is_reminder: Optional[bool] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    priority: int
    status: str
    due_date: Optional[datetime]
    is_reminder: bool
    created_at: datetime

    model_config = {"from_attributes": True}
