from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.automation import Automation, AutomationCreate, AutomationUpdate, AutomationResponse
from app.models.user import User
from app.services.agents.factory import Nexus6Orchestrator

router = APIRouter()


def _to_response(a: Automation) -> AutomationResponse:
    return AutomationResponse(
        id=str(a.id),
        name=a.name,
        description=a.description,
        trigger_type=a.trigger_type,
        trigger_config=a.trigger_config,
        actions=a.actions or [],
        is_active=a.is_active,
        run_count=a.run_count or 0,
        last_run=str(a.last_run) if a.last_run else None,
        created_at=str(a.created_at) if a.created_at else None,
    )


@router.get("/", response_model=List[AutomationResponse])
async def list_automations(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import uuid
    uid = uuid.UUID(current_user["user_id"]) if isinstance(current_user["user_id"], str) else current_user["user_id"]
    result = await db.execute(
        select(Automation).where(Automation.user_id == uid)
    )
    return [_to_response(a) for a in result.scalars().all()]


@router.post("/", response_model=AutomationResponse, status_code=201)
async def create_automation(
    data: AutomationCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import uuid
    uid = uuid.UUID(current_user["user_id"]) if isinstance(current_user["user_id"], str) else current_user["user_id"]
    automation = Automation(
        user_id=uid,
        name=data.name,
        description=data.description,
        trigger_type=data.trigger_type,
        trigger_config=data.trigger_config,
        actions=data.actions,
        is_active=data.is_active,
    )
    db.add(automation)
    await db.commit()
    await db.refresh(automation)
    return _to_response(automation)


@router.get("/{automation_id}", response_model=AutomationResponse)
async def get_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import uuid
    uid = uuid.UUID(current_user["user_id"]) if isinstance(current_user["user_id"], str) else current_user["user_id"]
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.user_id == uid,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    return _to_response(automation)


@router.patch("/{automation_id}", response_model=AutomationResponse)
async def update_automation(
    automation_id: str,
    data: AutomationUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import uuid
    uid = uuid.UUID(current_user["user_id"]) if isinstance(current_user["user_id"], str) else current_user["user_id"]
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.user_id == uid,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(automation, field, value)

    await db.commit()
    await db.refresh(automation)
    return _to_response(automation)


@router.delete("/{automation_id}", status_code=204)
async def delete_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import uuid
    uid = uuid.UUID(current_user["user_id"]) if isinstance(current_user["user_id"], str) else current_user["user_id"]
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.user_id == uid,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")
    await db.delete(automation)
    await db.commit()


@router.post("/{automation_id}/run")
async def run_automation(
    automation_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger an automation."""
    import uuid
    uid = uuid.UUID(current_user["user_id"]) if isinstance(current_user["user_id"], str) else current_user["user_id"]
    result = await db.execute(
        select(Automation).where(
            Automation.id == automation_id,
            Automation.user_id == uid,
        )
    )
    automation = result.scalar_one_or_none()
    if not automation:
        raise HTTPException(status_code=404, detail="Automation not found")

    automation.run_count = (automation.run_count or 0) + 1
    from datetime import datetime
    automation.last_run = datetime.utcnow()
    await db.commit()

    return {"message": f"Automation '{automation.name}' triggered successfully", "run_count": automation.run_count}


@router.post("/solve")
async def solve_goal_with_agents(
    goal: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Solve a complex goal using the Nexus-6 Multi-Agent Framework."""
    # Fetch full user object for the orchestrator
    import uuid
    uid = uuid.UUID(current_user["user_id"]) if isinstance(current_user["user_id"], str) else current_user["user_id"]
    user_result = await db.execute(select(User).where(User.id == uid))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    orchestrator = Nexus6Orchestrator(user)
    result = await orchestrator.solve_goal(goal)
    
    return result
