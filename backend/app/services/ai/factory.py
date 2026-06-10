from typing import Dict, Type, Optional, List
from app.services.ai.base import AIProvider
from app.services.ai.openai_provider import OpenAIProvider
from app.services.ai.gemini_provider import GeminiProvider
from app.models.user import User
from app.core.config import settings

class ProviderFactory:
    """
    Registry and Factory for AI Providers.
    Follows the Factory pattern to instantiate providers at runtime.
    """
    
    _providers: Dict[str, Type[AIProvider]] = {
        "openai": OpenAIProvider,
        "gemini": GeminiProvider,
    }

    @classmethod
    def list_providers(cls) -> List[Dict[str, str]]:
        """Return a list of all registered providers."""
        return [
            {"id": "gemini", "name": "Google Gemini", "description": "Google's latest Gemini models (1.5 Pro/Flash)"},
            {"id": "openai", "name": "OpenAI", "description": "Official OpenAI models (GPT-4o, etc.)"},
        ]

    @classmethod
    def get_provider(cls, user: User) -> AIProvider:
        """
        Resolve and instantiate the correct provider based on user settings.
        """
        provider_name = user.ai_provider or settings.DEFAULT_PROVIDER
        provider_class = cls._providers.get(provider_name, GeminiProvider)

        if provider_name == "gemini":
            return provider_class(api_key=user.gemini_api_key)
        
        return provider_class(
            api_key=user.openai_api_key,
            base_url=user.openai_base_url
        )

    @classmethod
    def register_provider(cls, name: str, provider_class: Type[AIProvider]):
        """Register a new provider class."""
        cls._providers[name] = provider_class
