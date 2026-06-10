from typing import AsyncGenerator, List, Optional, Dict, Any
from openai import AsyncOpenAI
from app.services.ai.base import AIProvider
from app.models.chat import ChatMessage
from app.core.config import settings

class OpenAIProvider(AIProvider):
    """
    OpenAI implementation of the AIProvider.
    Uses the official OpenAI Python SDK.
    """

    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.client = AsyncOpenAI(
            api_key=api_key or settings.OPENAI_API_KEY,
            base_url=base_url or settings.OPENAI_BASE_URL,
        )

    @property
    def name(self) -> str:
        return "openai"

    async def stream_chat(
        self,
        messages: List[ChatMessage],
        model: str,
        system_prompt: Optional[str] = None,
        **kwargs: Any
    ) -> AsyncGenerator[str, None]:
        openai_messages = []
        if system_prompt:
            openai_messages.append({"role": "system", "content": system_prompt})
        
        for msg in messages:
            # Check if content is multimodal (list) or text (str)
            # For simplicity, we also handle image_b64 in kwargs for the last message
            content = msg.content
            if msg == messages[-1] and "image_b64" in kwargs:
                image_b64 = kwargs.pop("image_b64")
                content = [
                    {"type": "text", "text": msg.content},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}
                    }
                ]
            
            openai_messages.append({"role": msg.role, "content": content})

        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=openai_messages,
                stream=True,
                temperature=kwargs.get("temperature", 0.7),
                max_tokens=kwargs.get("max_tokens", 4096),
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            yield f"\n\n[OpenAI Error: {str(e)}]"

    async def complete(
        self,
        messages: List[ChatMessage],
        model: str,
        system_prompt: Optional[str] = None,
        **kwargs: Any
    ) -> str:
        result = ""
        async for chunk in self.stream_chat(messages, model, system_prompt, **kwargs):
            result += chunk
        return result

    async def list_models(self) -> List[Dict[str, Any]]:
        # Hardcoded for common OpenAI models, could be fetched via API
        return [
            {"id": "gpt-4o", "name": "GPT-4o", "provider": "OpenAI", "context": "128k"},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "OpenAI", "context": "128k"},
            {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "provider": "OpenAI", "context": "128k"},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "provider": "OpenAI", "context": "16k"},
        ]
