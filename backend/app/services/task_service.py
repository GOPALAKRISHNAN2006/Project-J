import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.models.task import Task, TaskCreate, TaskUpdate

class TaskService:
    """Service for managing AI-powered tasks and Kanban boards."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_tasks(self, user_id: str, status: Optional[str] = None) -> List[Task]:
        query = select(Task).where(Task.user_id == user_id)
        if status:
            query = query.where(Task.status == status)
        query = query.order_by(Task.kanban_order.asc())
        
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_task(self, user_id: str, data: TaskCreate) -> Task:
        task = Task(
            user_id=user_id,
            **data.model_dump()
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def update_task(self, user_id: str, task_id: str, data: TaskUpdate) -> Optional[Task]:
        query = update(Task).where(
            Task.id == task_id, 
            Task.user_id == user_id
        ).values(**data.model_dump(exclude_unset=True))
        
        await self.db.execute(query)
        await self.db.commit()
        
        # Fetch updated
        res = await self.db.execute(select(Task).where(Task.id == task_id))
        return res.scalar_one_or_none()

    async def handle_recurrence(self, task: Task):
        """If a recurring task is completed, create the next instance."""
        if not task.is_recurring or task.status != "done":
            return

        delta = {
            "daily": timedelta(days=1),
            "weekly": timedelta(weeks=1),
            "monthly": timedelta(days=30) # Simplified
        }.get(task.recurrence_pattern)

        if delta:
            next_due = (task.due_date or datetime.utcnow()) + delta
            new_task = Task(
                user_id=task.user_id,
                title=task.title,
                description=task.description,
                priority=task.priority,
                due_date=next_due,
                is_recurring=True,
                recurrence_pattern=task.recurrence_pattern
            )
            self.db.add(new_task)
            await self.db.commit()
