from typing import List, Optional
from uuid import UUID
from sqlalchemy import select
from app.models.chat import ChatSession, ChatMessage
from app.repositories.base import BaseRepository

class ChatRepository(BaseRepository[ChatSession]):
    def __init__(self, db):
        super().__init__(ChatSession, db)

    async def get_user_sessions(self, user_id: UUID) -> List[ChatSession]:
        query = select(self.model).where(self.model.user_id == user_id).order_by(self.model.updated_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def add_message(self, session_id: UUID, role: str, content: str, tokens: Optional[int] = None, model: Optional[str] = None) -> ChatMessage:
        message = ChatMessage(session_id=session_id, role=role, content=content, tokens=tokens, model=model)
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message
