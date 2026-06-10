from typing import Dict, Any, Optional
from app.services.agents.base import BaseAgent

class CodingAgent(BaseAgent):
    """Writes, debugs, and optimizes code."""
    
    async def execute(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        system_prompt = (
            "You are the Coding Agent in the Nexus-6 framework. "
            "You specialize in writing high-quality, efficient, and well-documented code. "
            "Follow best practices for the requested language and framework."
        )
        
        result = await self._query_ai_with_tools(
            prompt=f"Task: {task}\n\nTechnical Context: {context}",
            system_prompt=system_prompt
        )
        
        # Extract code blocks if any
        import re
        code_blocks = re.findall(r'```(?:\w+)?\n(.*?)\n```', result, re.DOTALL)
        
        return {
            "status": "success",
            "implementation": result,
            "code_snippets": code_blocks
        }
