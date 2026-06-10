from typing import Optional
from app.services.stt.base import BaseSTTProvider
from app.services.stt.faster_whisper_provider import FasterWhisperProvider
from app.models.user import User

class STTProviderFactory:
    """
    Factory to resolve the appropriate STT provider.
    Follows the same pattern as AIProviderFactory for consistency.
    """

    @staticmethod
    def get_provider(user: Optional[User] = None) -> BaseSTTProvider:
        # Default to base for speed/accuracy balance
        model_size = "base"
        
        if user and user.stt_provider == "faster-whisper" and user.voice_id:
            # We use voice_id as a multipurpose field for local configs
            model_size = user.voice_id

        return FasterWhisperProvider(model_size=model_size)
