import json
from typing import Dict, Any, Optional, List
from app.services.agents.base import BaseAgent

class PlannerAgent(BaseAgent):
    """Breaks complex goals into actionable tasks and manages workflow execution."""
    
    async def execute(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Decomposes a high-level goal into a prioritized and estimated plan.
        """
        system_prompt = (
            "You are the Planner Agent, the central intelligence of the Nexus-6 multi-agent framework. "
            "Your job is to take a high-level goal and break it down into a list of discrete, "
            "sequenced tasks that can be handled by specialized agents: "
            "Research, Coding, Browser, Memory, Automation, Antigravity, Vision. "
            "\n\nCRITICAL REQUIREMENTS:\n"
            "1. PRIORITIZE tasks based on dependencies and urgency.\n"
            "2. ESTIMATE completion time for each task in minutes.\n"
            "3. DEFINE clear dependencies between tasks.\n"
            "4. Output ONLY a valid JSON list of objects."
            "\n\nJSON SCHEMA:\n"
            "[{ \"id\": \"T1\", \"agent\": \"research\", \"task\": \"desc\", \"priority\": 1-5, \"estimated_minutes\": 10, \"dependencies\": [] }]"
        )
        
        plan_raw = await self._query_ai(
            prompt=f"Goal: {task}\n\nContext: {context}",
            system_prompt=system_prompt
        )
        
        try:
            import re
            json_match = re.search(r'\[.*\]', plan_raw, re.DOTALL)
            if json_match:
                plan = json.loads(json_match.group(0))
            else:
                plan = json.loads(plan_raw)
            
            # Sort by priority (higher number = higher priority)
            plan.sort(key=lambda x: x.get("priority", 1), reverse=True)
            
            total_time = sum(t.get("estimated_minutes", 15) for t in plan)
                
            return {
                "status": "success",
                "goal": task,
                "plan": plan,
                "metrics": {
                    "total_tasks": len(plan),
                    "estimated_completion_time": f"{total_time} minutes",
                    "priority_summary": "Tasks sorted by priority and dependencies"
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Failed to parse plan: {str(e)}",
                "raw_output": plan_raw
            }
