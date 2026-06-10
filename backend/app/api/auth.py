from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password, create_access_token, 
    get_current_user, generate_reset_token
)
from app.models.user import User, UserCreate, UserLogin, UserResponse, TokenResponse
from app.core.config import settings

router = APIRouter()

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class SocialLoginRequest(BaseModel):
    provider: str
    token: str

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new JARVIS user account."""
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hash_password(user_data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email, "name": user.name})
    return TokenResponse(
        access_token=token,
        user=UserResponse.from_orm(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, remember: bool = False, db: AsyncSession = Depends(get_db)):
    """Authenticate and return JWT token."""
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    expires = None
    if remember:
        expires = timedelta(days=30) # Remember for 30 days

    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "name": user.name},
        expires_delta=expires
    )
    return TokenResponse(
        access_token=token,
        user=UserResponse.from_orm(user),
    )

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Generate a password reset token and 'send' email (mocked)."""
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    
    if user:
        token = generate_reset_token()
        user.reset_password_token = token
        # expires in 1 hour
        from datetime import datetime
        user.reset_password_expires = datetime.utcnow() + timedelta(hours=1)
        await db.commit()
        # In a real app, send email here. For JARVIS, we return the token in mock response
        return {"message": "Reset instructions sent", "debug_token": token}
    
    return {"message": "If that email exists, instructions were sent."}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Verify reset token and update password."""
    from datetime import datetime
    result = await db.execute(
        select(User).where(
            User.reset_password_token == req.token,
            User.reset_password_expires > datetime.utcnow()
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user.hashed_password = hash_password(req.new_password)
    user.reset_password_token = None
    user.reset_password_expires = None
    await db.commit()
    
    return {"message": "Password updated successfully"}

@router.post("/social-login", response_model=TokenResponse)
async def social_login(req: SocialLoginRequest, db: AsyncSession = Depends(get_db)):
    """Placeholder for social login verification (Google/GitHub)."""
    # Mocking social login verification
    # In a real app, verify the token with the provider's API
    email = f"social_{req.provider}_{req.token[:5]}@example.com"
    name = f"{req.provider.capitalize()} User"
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            email=email,
            name=name,
            hashed_password="SOCIAL_AUTH_NO_PASSWORD",
            google_id=req.token if req.provider == "google" else None,
            github_id=req.token if req.provider == "github" else None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    token = create_access_token({"sub": str(user.id), "email": user.email, "name": user.name})
    return TokenResponse(
        access_token=token,
        user=UserResponse.from_orm(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Get current authenticated user profile."""
    import uuid
    user_id = uuid.UUID(current_user["user_id"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse.from_orm(user)
