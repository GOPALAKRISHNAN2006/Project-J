import google.generativeai as genai
from typing import AsyncGenerator, List, Optional, Dict, Any
from app.services.ai.base import AIProvider
from app.models.chat import ChatMessage
from app.core.config import settings

class GeminiProvider(AIProvider):
    """
    Google Gemini implementation of the AIProvider.
    Uses the official Google Generative AI Python SDK.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        if self.api_key:
            genai.configure(api_key=self.api_key)

    @property
    def name(self) -> str:
        return "gemini"

    async def stream_chat(
        self,
        messages: List[ChatMessage],
        model: str,
        system_prompt: Optional[str] = None,
        **kwargs: Any
    ) -> AsyncGenerator[str, None]:
        if not self.api_key:
            yield "\n\n[Gemini Error: API Key not configured. Please add GEMINI_API_KEY to your .env file or Settings.]"
            return

        # Gemini 1.5 models support system instructions
        generation_config = {
            "temperature": kwargs.get("temperature", 0.7),
            "top_p": kwargs.get("top_p", 0.95),
            "top_k": kwargs.get("top_k", 64),
            "max_output_tokens": kwargs.get("max_tokens", 8192),
        }

        # Handle system prompt
        model_kwargs = {}
        if system_prompt:
            model_kwargs["system_instruction"] = system_prompt

        try:
            gemini_model = genai.GenerativeModel(
                model_name=model or settings.DEFAULT_MODEL,
                generation_config=generation_config,
                **model_kwargs
            )

            # Convert messages to Gemini format
            # Gemini expects 'role': 'user' or 'model' (for assistant)
            history = []
            for msg in messages[:-1]:
                role = "user" if msg.role == "user" else "model"
                history.append({"role": role, "parts": [msg.content]})

            chat = gemini_model.start_chat(history=history)
            
            last_message_content = messages[-1].content
            
            # Multimodal support (images)
            parts = [last_message_content]
            if "image_b64" in kwargs:
                image_b64 = kwargs.pop("image_b64")
                parts.append({
                    "mime_type": "image/jpeg",
                    "data": image_b64
                })

            response = await chat.send_message_async(
                parts,
                stream=True
            )

            async for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            yield f"\n\n[Gemini Error: {str(e)}]"

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
        return [
            {"id": "gemini-3.5-flash", "name": "Gemini 1.5 Flash", "provider": "Google", "context": "1M"},
            {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro", "provider": "Google", "context": "2M"},
            {"id": "gemini-1.0-pro", "name": "Gemini 1.0 Pro", "provider": "Google", "context": "32k"},
        ]
