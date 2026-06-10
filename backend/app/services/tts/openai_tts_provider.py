import tempfile
from typing import Any, Dict, Optional
from openai import AsyncOpenAI
from app.services.tts.base import BaseTTSProvider
from app.core.config import settings

class OpenAITTSProvider(BaseTTSProvider):
    """
    OpenAI Implementation of TTS.
    Provides high-quality, neural voices (alloy, echo, fable, onyx, nova, shimmer).
    """

    def __init__(self, api_key: Optional[str] = None, voice: str = "alloy"):
        self.client = AsyncOpenAI(api_key=api_key or settings.OPENAI_API_KEY)
        self.voice = voice

    async def synthesize(self, text: str, **kwargs) -> str:
        voice = kwargs.get("voice", self.voice)
        speed = kwargs.get("speed", 1.0)
        
        response = await self.client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            speed=speed
        )
        
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        tmp_path = tmp.name
        tmp.close()
        
        await response.astream_to_file(tmp_path)
        return tmp_path

    def get_info(self) -> Dict[str, Any]:
        return {
            "provider": "openai-tts",
            "model": "tts-1",
            "voice": self.voice,
            "type": "cloud"
        }
