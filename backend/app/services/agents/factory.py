from typing import Dict, Any, Optional, List
from app.models.user import User
from app.services.agents.base import BaseAgent
from app.services.agents.planner_agent import PlannerAgent
from app.services.agents.research_agent import ResearchAgent
from app.services.agents.coding_agent import CodingAgent
from app.services.agents.browser_agent import BrowserAgent
from app.services.agents.memory_agent import MemoryAgent
from app.services.agents.automation_agent import AutomationAgent

class AgentFactory:
    """Factory for creating specialized agents."""
    
    @staticmethod
    def get_agent(agent_type: str, user: User) -> BaseAgent:
        agents = {
            "planner": PlannerAgent,
            "research": ResearchAgent,
            "coding": CodingAgent,
            "browser": BrowserAgent,
            "memory": MemoryAgent,
            "automation": AutomationAgent
        }
        
        agent_class = agents.get(agent_type.lower())
        if not agent_class:
            raise ValueError(f"Unknown agent type: {agent_type}")
            
        return agent_class(user=user)

class Nexus6Orchestrator:
    """Orchestrates the collaboration between Nexus-6 agents."""
    
    def __init__(self, user: User):
        self.user = user
        self.planner = PlannerAgent(user=user)
        self.agents: Dict[str, BaseAgent] = {
            "research": ResearchAgent(user=user),
            "coding": CodingAgent(user=user),
            "browser": BrowserAgent(user=user),
            "memory": MemoryAgent(user=user),
            "automation": AutomationAgent(user=user)
        }

    async def solve_goal(self, goal: str) -> Dict[str, Any]:
        """High-level entry point to solve a complex goal."""
        
        # 1. Plan
        planning_result = await self.planner.execute(goal)
        if planning_result["status"] == "error":
            return planning_result
            
        plan = planning_result["plan"]
        results = []
        total_tasks = len(plan)
        
        # 2. Execute sequenced tasks
        for idx, task_spec in enumerate(plan):
            agent_type = task_spec["agent"].lower()
            task_desc = task_spec["task"]
            
            # Progress update (log-like)
            progress_msg = f"Task {idx+1}/{total_tasks}: {task_desc} (Agent: {agent_type})"
            print(progress_msg)
            
            agent = self.agents.get(agent_type)
            if not agent:
                results.append({
                    "task_id": task_spec["id"], 
                    "status": "error", 
                    "message": f"Agent {agent_type} not found",
                    "progress": f"{((idx)/total_tasks)*100:.1f}%"
                })
                continue
                
            # Inject previous results as context
            context = {
                "previous_results": results[-5:], # Increased context window
                "full_plan": plan,
                "current_task_index": idx
            }
            
            try:
                res = await agent.execute(task_desc, context)
                results.append({
                    "task_id": task_spec["id"],
                    "agent": agent_type,
                    "task": task_desc,
                    "result": res,
                    "progress": f"{((idx+1)/total_tasks)*100:.1f}%"
                })
            except Exception as e:
                results.append({
                    "task_id": task_spec["id"],
                    "agent": agent_type,
                    "task": task_desc,
                    "status": "error",
                    "message": str(e),
                    "progress": f"{((idx+1)/total_tasks)*100:.1f}%"
                })
            
        return {
            "status": "success",
            "goal": goal,
            "metrics": planning_result["metrics"],
            "final_plan": plan,
            "execution_history": results,
            "overall_progress": "100%"
        }
