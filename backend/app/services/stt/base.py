from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, AsyncGenerator

class BaseSTTProvider(ABC):
    """
    Abstract Base Class for Speech-to-Text Providers.
    Ensures modularity for local (Faster-Whisper) and cloud (OpenAI Whisper) engines.
    """

    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, **kwargs: Any) -> Dict[str, Any]:
        """
        Transcribe a complete audio buffer to text.
        Returns a dict with 'text', 'language', and 'confidence'.
        """
        pass

    @abstractmethod
    async def stream_transcribe(
        self, 
        audio_stream: AsyncGenerator[bytes, None], 
        **kwargs: Any
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream audio chunks and yield partial/final transcripts.
        This allows for real-time STT feedback.
        """
        pass

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """Return provider status and configuration."""
        pass
