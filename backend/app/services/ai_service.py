from typing import AsyncGenerator, List, Optional, Any
from app.services.ai.factory import ProviderFactory
from app.models.chat import ChatMessage
from app.models.user import User
from app.services.memory_service import MemoryService
from app.core.database import get_chroma_client

class AIService:
    """
    High-level service for AI interactions.
    Acts as a facade over the modular AI Providers.
    """

    def __init__(self, user: User, memory_service: Optional[MemoryService] = None):
        self.user = user
        self.provider = ProviderFactory.get_provider(user)
        self.memory_service = memory_service or MemoryService(get_chroma_client())

    @classmethod
    def from_user(cls, user: User, memory_service: Optional[MemoryService] = None):
        """Factory method to create AIService with user context."""
        return cls(user=user, memory_service=memory_service)

    async def _get_context(self, query: str) -> str:
        """Retrieve relevant context from memory service."""
        if not self.memory_service or not self.memory_service.client:
            return ""
        
        memories = await self.memory_service.search_memories(
            user_id=str(self.user.id),
            query=query,
            n_results=5
        )
        
        if not memories:
            return ""
            
        context_parts = ["--- RELEVANT CONTEXT FROM MEMORY ---"]
        for mem in memories:
            category = mem.category.value if mem.category else "general"
            context_parts.append(f"[{category.upper()}]: {mem.content}")
        context_parts.append("--- END OF CONTEXT ---")
        
        return "\n".join(context_parts)

    async def extract_and_store_memories(self, conversation_chunk: str):
        """Analyze conversation and store new memories if relevant."""
        if not self.memory_service or not self.memory_service.client:
            return

        extraction_prompt = (
            "You are a memory extraction module for JARVIS. "
            "Analyze the following conversation segment and extract key facts that should be remembered. "
            "Focus on these categories: Projects, People, Preferences, Deadlines, Habits, Learning, Goals. "
            "Output ONLY a valid JSON list of objects with 'category' and 'content' keys. "
            "Categories must be one of: projects, people, preferences, deadlines, habits, learning, goals. "
            "If nothing significant is found, output []. "
            "Example: [{\"category\": \"projects\", \"content\": \"User is working on a React app called Project-J\"}]"
        )

        try:
            # Use a faster/cheaper model for extraction if possible
            # Disable memory injection for extraction to avoid recursion
            result = await self.complete(
                [ChatMessage(role="user", content=f"Segment: {conversation_chunk}")],
                system_prompt=extraction_prompt,
                use_memory=False
            )
            
            import json
            import re
            
            # Try to find JSON in the response
            json_match = re.search(r'\[.*\]', result, re.DOTALL)
            if json_match:
                extracted = json.loads(json_match.group(0))
                for item in extracted:
                    from app.models.memory import MemoryCategory
                    try:
                        category = MemoryCategory(item['category'].lower())
                        await self.memory_service.add_memory(
                            user_id=str(self.user.id),
                            content=item['content'],
                            category=category
                        )
                    except (ValueError, KeyError):
                        continue
        except Exception as e:
            print(f"Memory extraction error: {e}")

    async def stream_chat(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        use_memory: bool = True,
        **kwargs: Any
    ) -> AsyncGenerator[str, None]:
        """Stream chat completions token by token with automatic fallback."""
        
        # Use provider-agnostic defaults if not specified
        model = model or self.user.default_model
        
        default_system_prompt = (
            "You are JARVIS, an advanced AI assistant created by Gokul. "
            "You are witty, helpful, and highly intelligent. "
            "Use the provided context from memory to personalize your response if it's relevant."
        )
        
        system_prompt = system_prompt or self.user.system_prompt or default_system_prompt

        # Context injection
        if use_memory and messages:
            last_message = messages[-1].content
            context = await self._get_context(last_message)
            if context:
                system_prompt = f"{system_prompt}\n\n{context}"

        try:
            async for chunk in self.provider.stream_chat(
                messages=messages,
                model=model,
                system_prompt=system_prompt,
                **kwargs
            ):
                # Check if the chunk is an error message from the provider
                if chunk.startswith("\n\n[") and "Error:" in chunk:
                    raise Exception(chunk.strip())
                yield chunk
        except Exception as e:
            yield f"\n\n[Error: {str(e)}]"

    async def complete(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        **kwargs: Any
    ) -> str:
        """Non-streaming completion."""
        result = ""
        async for chunk in self.stream_chat(messages, model, **kwargs):
            result += chunk
        return result

    async def summarize(self, text: str) -> str:
        """Summarize a piece of text."""
        msg = ChatMessage(role="user", content=f"Summarize this in one sentence: {text}")
        return await self.complete([msg])
