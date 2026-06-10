from typing import List, Dict, Any, Optional
import json
import re
from app.models.user import User
from app.services.ai_service import AIService
from app.models.chat import ChatMessage
from app.services.agents.tools import ToolRegistry

class BaseAgent:
    """Base class for all specialized agents in the Nexus-6 framework."""
    
    def __init__(self, name: str, user: User, ai_service: Optional[AIService] = None):
        self.name = name
        self.user = user
        self.ai_service = ai_service or AIService.from_user(user)
        self.tools = ToolRegistry(user)

    async def execute(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a task and return a standardized result."""
        raise NotImplementedError("Each agent must implement its own execution logic.")

    async def _query_ai_with_tools(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """
        Autonomous loop:
        1. Query AI
        2. Check for tool calls
        3. Execute tools
        4. Provide feedback to AI
        5. Return final answer
        """
        tool_definitions = self.tools.get_tool_definitions()
        
        full_system_prompt = (
            f"{system_prompt or ''}\n\n"
            "You have access to the following tools. To call a tool, output a JSON object in this format:\n"
            "THOUGHT: your reasoning\n"
            "TOOL: {\"name\": \"tool_name\", \"parameters\": {\"param1\": \"val1\"}}\n"
            "Wait for the output. If you have the final answer, output:\n"
            "ANSWER: your final response\n\n"
            "Available Tools:\n" + json.dumps(tool_definitions, indent=2)
        )

        current_prompt = prompt
        history = []
        
        for _ in range(5): # Limit to 5 iterations to prevent infinite loops
            history.append(ChatMessage(role="user", content=current_prompt))
            response = await self.ai_service.complete(
                messages=history,
                system_prompt=full_system_prompt,
                use_memory=False
            )
            history.append(ChatMessage(role="assistant", content=response))
            
            # Check for tool call
            tool_match = re.search(r'TOOL:\s*(\{.*\})', response, re.DOTALL)
            if tool_match:
                try:
                    tool_call = json.loads(tool_match.group(1))
                    tool_name = tool_call.get("name")
                    params = tool_call.get("parameters", {})
                    
                    result = await self.tools.call_tool(tool_name, **params)
                    current_prompt = f"TOOL_OUTPUT: {json.dumps(result)}"
                except Exception as e:
                    current_prompt = f"TOOL_ERROR: {str(e)}"
            else:
                # Check for answer
                answer_match = re.search(r'ANSWER:\s*(.*)', response, re.DOTALL)
                if answer_match:
                    return answer_match.group(1).strip()
                return response # Fallback

        return "Error: Maximum iterations reached without a final answer."

    async def _query_ai(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Helper to get a completion from the AI service."""
        msg = ChatMessage(role="user", content=prompt)
        return await self.ai_service.complete(
            messages=[msg],
            system_prompt=system_prompt,
            use_memory=False
        )
