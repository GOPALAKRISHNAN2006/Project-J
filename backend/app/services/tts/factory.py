from typing import Optional
from app.services.tts.base import BaseTTSProvider
from app.services.tts.piper_provider import PiperProvider
from app.services.tts.openai_tts_provider import OpenAITTSProvider
from app.services.tts.elevenlabs_provider import ElevenLabsProvider
from app.models.user import User

class TTSProviderFactory:
    """
    Factory to resolve the appropriate TTS provider.
    Enables runtime switching between local (Piper) and cloud (OpenAI/ElevenLabs).
    """

    @staticmethod
    def get_provider(user: Optional[User] = None) -> BaseTTSProvider:
        if not user:
            return PiperProvider()

        provider_type = getattr(user, "tts_provider", "piper")

        if provider_type == "openai-tts":
            return OpenAITTSProvider(
                api_key=user.openai_api_key,
                voice=user.voice_id or "alloy"
            )
        
        if provider_type == "elevenlabs":
            if not user.elevenlabs_api_key:
                return PiperProvider() # Fallback
            return ElevenLabsProvider(
                api_key=user.elevenlabs_api_key,
                voice_id=user.voice_id or "pNInz6obpgDQGcFmaJgB"
            )

        # Default to local Piper
        return PiperProvider(model_path=user.voice_id)
