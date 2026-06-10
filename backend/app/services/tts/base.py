from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

class BaseTTSProvider(ABC):
    """
    Abstract Base Class for Text-to-Speech Providers.
    Follows Strategy Pattern for local and cloud TTS engines.
    """

    @abstractmethod
    async def synthesize(self, text: str, **kwargs) -> str:
        """
        Synthesize text to speech.
        Returns the path to the generated audio file.
        """
        pass

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """Return provider status and configuration."""
        pass
