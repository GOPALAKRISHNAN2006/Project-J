from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.user import User, UserUpdateSettings, UserResponse

router = APIRouter()


@router.get("/", response_model=UserResponse)
async def get_settings(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user settings."""
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse.model_validate(user)


@router.patch("/", response_model=UserResponse)
async def update_settings(
    updates: UserUpdateSettings,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user profile and AI settings."""
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


@router.get("/providers")
async def list_providers():
    """Return list of supported AI providers."""
    from app.services.ai.factory import ProviderFactory
    return {"providers": ProviderFactory.list_providers()}


@router.get("/models")
async def list_models(
    provider_name: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return list of supported AI models from a specific provider or the current one."""
    result = await db.execute(select(User).where(User.id == current_user["user_id"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.services.ai.factory import ProviderFactory
    
    # Temporarily override user's provider if provider_name is passed
    if provider_name:
        temp_user = User(
            ai_provider=provider_name,
            openai_api_key=user.openai_api_key,
            openai_base_url=user.openai_base_url,
            gemini_api_key=user.gemini_api_key
        )
        provider = ProviderFactory.get_provider(temp_user)
    else:
        provider = ProviderFactory.get_provider(user)
        
    models = await provider.list_models()
    return {"models": models}
