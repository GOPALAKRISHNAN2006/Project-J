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
        if session_id:
            session_doc = await self.mongo_db["chat_sessions"].find_one(
                {"id": session_id, "user_id": str(self.user.id)}
            )
            if session_doc:
                session_doc.pop("_id", None)
                session = ChatSession(**session_doc)
            else:
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

        # Save session update to MongoDB
        await self.mongo_db["chat_sessions"].update_one(
            {"id": session.id},
            {"$set": {
                "messages": [m.model_dump() for m in session.messages],
                "updated_at": session.updated_at
            }},
            upsert=True
        )

        # ── 3. Text to Speech ────────────────────────────────────────────────
        # Synthesize the AI's response
        audio_path = await self.voice_service.synthesize(ai_text)

        return {
            "session_id": session.id,
            "transcript": user_text,
            "ai_response": ai_text,
            "audio_path": audio_path, # Frontend will use this to stream back
            "stt_info": self.voice_service.stt_provider.get_info(),
            "ai_info": {"provider": self.user.ai_provider, "model": self.user.default_model},
            "tts_info": self.voice_service.tts_provider.get_info()
        }

    def _create_new_session(self) -> ChatSession:
        return ChatSession(
            id=str(uuid.uuid4()),
            user_id=str(self.user.id),
            title="Voice Interaction",
            model=self.user.default_model,
            messages=[]
        )
