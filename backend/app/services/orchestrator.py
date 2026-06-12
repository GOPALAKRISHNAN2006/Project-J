import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List

from app.services.ai_service import AIService
from app.services.voice_service import VoiceService
from app.models.user import User
from app.models.chat import ChatMessage, ChatSession

class JarvisOrchestrator:
    """
    The central coordinator for JARVIS.
    Connects STT -> AI -> TTS into a single workflow.
    """

    def __init__(self, user: User, mongo_db: Any):
        self.user = user
        self.mongo_db = mongo_db
        self.ai_service = AIService.from_user(user)
        self.voice_service = VoiceService(user=user)

    async def process_voice_interaction(
        self, 
        audio_bytes: bytes, 
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Full pipeline: 
        1. Speech -> Text (Faster-Whisper)
        2. Text -> AI Response (OpenAI/Ollama)
        3. AI Response -> Speech (Piper/ElevenLabs)
        """
        
        # ── 1. Speech to Text ────────────────────────────────────────────────
        stt_result = await self.voice_service.transcribe(audio_bytes)
        user_text = stt_result.get("transcript", "").strip()

        if not user_text:
            return {
                "transcript": "",
                "ai_response": "I'm sorry, I didn't catch that. Could you repeat it?",
                "audio_url": None, # Handle as silence or generic prompt
                "error": "Empty transcript"
            }

        # ── 2. Handle Chat Context & AI Response ──────────────────────────────
        # Resolve or create session
        import uuid
        if session_id:
            if self.mongo_db:
                session_doc = await self.mongo_db["chat_sessions"].find_one(
                    {"id": session_id, "user_id": str(self.user.id)}
                )
                if session_doc:
                    session_doc.pop("_id", None)
                    messages_data = session_doc.pop("messages", [])
                    session = ChatSession(**session_doc)
                    session.messages = [ChatMessage(**m) for m in messages_data]
                else:
                    session = self._create_new_session()
            else:
                from app.core.database import AsyncSessionLocal
                from sqlalchemy import select
                from sqlalchemy.orm import selectinload
                try:
                    sid = uuid.UUID(session_id) if isinstance(session_id, str) else session_id
                    async with AsyncSessionLocal() as db_session:
                        result = await db_session.execute(
                            select(ChatSession)
                            .where(ChatSession.id == sid, ChatSession.user_id == self.user.id)
                            .options(selectinload(ChatSession.messages))
                        )
                        db_sess = result.scalar_one_or_none()
                        if db_sess:
                            session = ChatSession(
                                id=db_sess.id,
                                user_id=db_sess.user_id,
                                title=db_sess.title,
                                model=db_sess.model,
                                created_at=db_sess.created_at,
                                updated_at=db_sess.updated_at
                            )
                            session.messages = [
                                ChatMessage(
                                    id=m.id,
                                    session_id=m.session_id,
                                    role=m.role,
                                    content=m.content,
                                    tokens=m.tokens,
                                    model=m.model,
                                    created_at=m.created_at
                                ) for m in db_sess.messages
                            ]
                        else:
                            session = self._create_new_session()
                except Exception as e:
                    import logging
                    logging.getLogger("jarvis").warning(f"Error loading chat session from SQLite: {e}")
                    session = self._create_new_session()
        else:
            session = self._create_new_session()

        # ── 2.5 Memory Retrieval (RAG) ───────────────────────────────────────
        from app.services.memory_service import MemoryService
        from app.core.database import get_chroma_client
        from app.models.memory import MemoryCategory
        
        chroma = get_chroma_client()
        context_parts = []
        if chroma:
            ms = MemoryService(chroma)
            # Perform a broad search across all relevant categories
            memories = await ms.search_memories(str(self.user.id), user_text, n_results=10)
            
            if memories:
                # Group by category for cleaner context injection
                categorized = {}
                for m in memories:
                    cat = m.category.value if m.category else "general"
                    if cat not in categorized: categorized[cat] = []
                    categorized[cat].append(m.content)
                
                context_parts.append("\n=== RELEVANT LONG-TERM MEMORIES ===")
                for cat, docs in categorized.items():
                    context_parts.append(f"\n[{cat.upper()}]:")
                    for doc in docs:
                        context_parts.append(f"- {doc}")

        current_time = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")
        system_prompt = (
            f"You are JARVIS, an advanced AI assistant created by Gokul. "
            f"You are currently assisting {self.user.name}. "
            f"Current time: {current_time}."
            f"{''.join(context_parts)}\n\n"
            "Use the provided memories to give personalized, context-aware responses. "
            "If a user mentions a project, person, or deadline from their memory, acknowledge it."
        )

        # Add user message to history
        user_msg = ChatMessage(role="user", content=user_text)
        session.messages.append(user_msg)

        # Get AI Response
        ai_text = await self.ai_service.complete(
            messages=session.messages,
            model=self.user.default_model,
            system_prompt=system_prompt
        )

        # Add assistant response to history
        assistant_msg = ChatMessage(
            role="assistant", 
            content=ai_text, 
            model=self.user.default_model
        )
        session.messages.append(assistant_msg)
        session.updated_at = datetime.utcnow()

        # Save session update
        if self.mongo_db:
            messages_list = []
            for m in session.messages:
                messages_list.append({
                    "role": m.role,
                    "content": m.content,
                    "model": m.model,
                    "tokens": getattr(m, 'tokens', None)
                })
            await self.mongo_db["chat_sessions"].update_one(
                {"id": str(session.id)},
                {"$set": {
                    "user_id": str(self.user.id),
                    "title": session.title,
                    "model": session.model,
                    "messages": messages_list,
                    "updated_at": session.updated_at
                }},
                upsert=True
            )
        else:
            from app.core.database import AsyncSessionLocal
            try:
                sid = uuid.UUID(str(session.id)) if isinstance(session.id, str) else session.id
                async with AsyncSessionLocal() as db_session:
                    from sqlalchemy import select, delete
                    db_sess = await db_session.get(ChatSession, sid)
                    if not db_sess:
                        db_sess = ChatSession(
                            id=sid,
                            user_id=session.user_id,
                            title=session.title,
                            model=session.model,
                            created_at=session.created_at,
                            updated_at=session.updated_at
                        )
                        db_session.add(db_sess)
                    else:
                        db_sess.title = session.title
                        db_sess.model = session.model
                        db_sess.updated_at = session.updated_at
                    
                    # Re-populate messages by deleting old ones and adding the updated list
                    await db_session.execute(delete(ChatMessage).where(ChatMessage.session_id == sid))
                    for m in session.messages:
                        db_msg = ChatMessage(
                            id=m.id or uuid.uuid4(),
                            session_id=sid,
                            role=m.role,
                            content=m.content,
                            tokens=m.tokens,
                            model=m.model,
                            created_at=m.created_at
                        )
                        db_session.add(db_msg)
                    await db_session.commit()
            except Exception as e:
                import logging
                logging.getLogger("jarvis").warning(f"Error saving chat session to SQLite: {e}")

        # ── 3. Text to Speech ────────────────────────────────────────────────
        # Synthesize the AI's response
        audio_path = await self.voice_service.synthesize(ai_text)

        return {
            "session_id": str(session.id),
            "transcript": user_text,
            "ai_response": ai_text,
            "audio_path": audio_path, # Frontend will use this to stream back
            "stt_info": self.voice_service.stt_provider.get_info(),
            "ai_info": {"provider": self.user.ai_provider, "model": self.user.default_model},
            "tts_info": self.voice_service.tts_provider.get_info()
        }

    def _create_new_session(self) -> ChatSession:
        import uuid
        uid = uuid.uuid4()
        user_id = self.user.id
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        return ChatSession(
            id=uid,
            user_id=user_id,
            title="Voice Interaction",
            model=self.user.default_model,
            messages=[]
        )
