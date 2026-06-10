from typing import AsyncGenerator, List, Optional
from openai import AsyncOpenAI
from app.services.ai.base import BaseLLMProvider
from app.models.chat import ChatMessage

class OpenAICompatibleProvider(BaseLLMProvider):
    """
    Base class for providers that use the OpenAI-compatible API (OpenAI, Ollama, etc.)
    Reduces duplicate logic across different strategies.
    """

    def __init__(self, api_key: str, base_url: str, provider_name: str):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        self.provider_name = provider_name

    def _prepare_messages(self, messages: List[ChatMessage], system_prompt: Optional[str]):
        formatted = []
        if system_prompt:
            formatted.append({"role": "system", "content": system_prompt})
        
        for msg in messages:
            formatted.append({"role": msg.role, "content": msg.content})
        return formatted

    async def stream_chat(
        self,
        messages: List[ChatMessage],
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        payload = self._prepare_messages(messages, system_prompt)
        
        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=payload,
                stream=True,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"\n\n[{self.provider_name} Error: {str(e)}]"

    async def complete(
        self,
        messages: List[ChatMessage],
        model: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        result = ""
        async for chunk in self.stream_chat(messages, model, system_prompt, temperature, max_tokens):
            result += chunk
        return result

    async def get_available_models(self) -> List[dict]:
        """To be implemented by child classes."""
        return []
