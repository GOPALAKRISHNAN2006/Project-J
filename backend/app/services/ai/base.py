from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Optional, Dict, Any
from app.models.chat import ChatMessage

class AIProvider(ABC):
    """
    Abstract Base Class for AI Providers.
    Defines the contract that all providers must follow.
    """

    @abstractmethod
    async def stream_chat(
        self,
        messages: List[ChatMessage],
        model: str,
        system_prompt: Optional[str] = None,
        **kwargs: Any
    ) -> AsyncGenerator[str, None]:
        """Stream chat completions token by token."""
        pass

    @abstractmethod
    async def complete(
        self,
        messages: List[ChatMessage],
        model: str,
        system_prompt: Optional[str] = None,
        **kwargs: Any
    ) -> str:
        """Non-streaming completion."""
        pass

    @abstractmethod
    async def list_models(self) -> List[Dict[str, Any]]:
        """List models supported by this provider."""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider."""
        pass
