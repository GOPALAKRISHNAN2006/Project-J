from typing import Dict, Any, Optional
from app.services.agents.base import BaseAgent
from app.services.memory_service import MemoryService
from app.core.database import get_chroma_client
from app.models.memory import MemoryCategory

class MemoryAgent(BaseAgent):
    """Maintains persistent context and manages semantic memory."""
    
    def __init__(self, user, ai_service=None):
        super().__init__("MemoryAgent", user, ai_service)
        self.memory_service = MemoryService(get_chroma_client())

    async def execute(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Supports: 'store', 'retrieve', 'search', 'delete'
        """
        action = (context or {}).get("action", "search")
        
        if action == "store":
            content = (context or {}).get("content", task)
            category_val = (context or {}).get("category", "general")
            category = MemoryCategory(category_val)
            metadata = (context or {}).get("metadata")
            
            memory = await self.memory_service.add_memory(
                str(self.user.id), content, category, metadata
            )
            return {"status": "success", "memory_id": memory.id}
            
        elif action == "retrieve" or action == "search":
            query = (context or {}).get("query", task)
            category_val = (context or {}).get("category")
            category = MemoryCategory(category_val) if category_val else None
            
            memories = await self.memory_service.search_memories(
                str(self.user.id), query, category=category
            )
            return {"status": "success", "memories": [m.model_dump() for m in memories]}
            
        return {"status": "error", "message": f"Unknown action: {action}"}
