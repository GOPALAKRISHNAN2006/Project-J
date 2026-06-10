import os
import tempfile
from typing import Any, Dict, Optional
from app.services.stt.factory import STTProviderFactory
from app.services.tts.factory import TTSProviderFactory
from app.models.user import User

class VoiceService:
    """
    High-level Voice Service for STT and TTS.
    Fully modular architecture using Strategy Pattern.
    """

    def __init__(self, user: Optional[User] = None):
        self.user = user
        self.stt_provider = STTProviderFactory.get_provider(user)
        self.tts_provider = TTSProviderFactory.get_provider(user)

    async def transcribe(self, audio_bytes: bytes, **kwargs) -> Dict[str, Any]:
        """
        Transcribe audio using the injected STT provider.
        """
        result = await self.stt_provider.transcribe(audio_bytes, **kwargs)
        
        return {
            "transcript": result.get("text", ""),
            "confidence": result.get("confidence", 0.0),
            "language": result.get("language", "en"),
            "provider": self.stt_provider.get_info()["provider"]
        }

    async def synthesize(self, text: str, **kwargs) -> str:
        """
        Synthesize text to speech using the injected TTS provider.
        """
        return await self.tts_provider.synthesize(text, **kwargs)
