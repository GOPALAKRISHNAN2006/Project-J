import uuid
from datetime import datetime
from typing import List, Optional
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, File, UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user
from app.core.database import get_db
from app.models.chat import (
    ChatRequest, ChatSession, ChatMessage, 
    ChatSessionCreate, ChatSessionSummary, ChatSessionResponse,
    ChatMessageResponse
)
from app.models.user import User
from app.services.ai_service import AIService
from app.ws.manager import connection_manager

router = APIRouter()


def _session_to_summary(session: ChatSession) -> ChatSessionSummary:
    return ChatSessionSummary(
        id=str(session.id),
        title=session.title,
        model=session.model,
        created_at=session.created_at,
        updated_at=session.updated_at or session.created_at,
        message_count=len(session.messages) if hasattr(session, 'messages') and session.messages else 0,
        is_archived=session.is_archived,
    )


@router.get("/sessions", response_model=List[ChatSessionSummary])
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all chat sessions for the current user."""
    user_id = uuid.UUID(current_user["user_id"])
    query = (
        select(ChatSession)
        .where(ChatSession.user_id == user_id, ChatSession.is_archived == False)
        .options(selectinload(ChatSession.messages))
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
    )
    result = await db.execute(query)
    sessions = result.scalars().all()
    return [_session_to_summary(s) for s in sessions]


@router.post("/sessions", response_model=ChatSessionSummary, status_code=201)
async def create_session(
    data: ChatSessionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session."""
    user_id = uuid.UUID(current_user["user_id"])
    session = ChatSession(
        user_id=user_id,
        title=data.title or "New Chat",
        model=data.model or settings.DEFAULT_MODEL,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # We need messages to be an empty list for the summary converter
    session.messages = []
    return _session_to_summary(session)


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single chat session with full message history."""
    user_id = uuid.UUID(current_user["user_id"])
    sid = uuid.UUID(session_id)
    
    query = (
        select(ChatSession)
        .where(ChatSession.id == sid, ChatSession.user_id == user_id)
        .options(selectinload(ChatSession.messages))
    )
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return session


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = uuid.UUID(current_user["user_id"])
    sid = uuid.UUID(session_id)
    
    query = delete(ChatSession).where(ChatSession.id == sid, ChatSession.user_id == user_id)
    result = await db.execute(query)
    await db.commit()
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Session not found")


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a file/image and return its metadata."""
    upload_dir = Path("uploads") / str(current_user["user_id"])
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_id = str(uuid.uuid4())
    file_path = upload_dir / f"{file_id}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {
        "id": file_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": os.path.getsize(file_path),
        "url": f"/api/chat/files/{file_id}/{file.filename}"
    }


@router.get("/files/{file_id}/{filename}")
async def get_file(
    file_id: str,
    filename: str,
    current_user: dict = Depends(get_current_user),
):
    upload_dir = Path("uploads") / str(current_user["user_id"])
    file_path = upload_dir / f"{file_id}_{filename}"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path)


@router.post("/send")
async def send_message(
    req: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message and get a streaming AI response."""
    user_id = uuid.UUID(current_user["user_id"])

    # Resolve or create session
    if req.session_id:
        sid = uuid.UUID(req.session_id)
        query = (
            select(ChatSession)
            .where(ChatSession.id == sid, ChatSession.user_id == user_id)
            .options(selectinload(ChatSession.messages))
        )
        result = await db.execute(query)
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        session = ChatSession(
            user_id=user_id,
            model=req.model or settings.DEFAULT_MODEL,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session.messages = []

    # Prepare messages for AI service
    history = []
    if req.messages:
        # Override history (for edit/regenerate)
        history = req.messages
    else:
        # Use session history + new message
        for m in session.messages:
            history.append(m)
        user_msg = ChatMessage(session_id=session.id, role="user", content=req.message)
        history.append(user_msg)
        db.add(user_msg)

    # Get user settings for AI service
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    ai_service = AIService.from_user(user)

    async def stream_response():
        full_response = ""
        # AIService.stream_chat expects List[ChatMessage] or similar
        async for chunk in ai_service.stream_chat(history, req.model or session.model):
            full_response += chunk
            yield f"data: {chunk}\n\n"

        # Save assistant reply
        assistant_msg = ChatMessage(
            session_id=session.id, 
            role="assistant", 
            content=full_response, 
            model=req.model or session.model
        )
        db.add(assistant_msg)
        
        # Update session timestamp and title
        session.updated_at = datetime.utcnow()
        if not session.title or session.title == "New Chat":
            session.title = req.message[:60] + ("..." if len(req.message) > 60 else "")

        await db.commit()
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")


@router.websocket("/ws/{session_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """WebSocket endpoint for real-time chat streaming."""
    await websocket.accept()

    # ── 1. Authenticate via Token ──────────────────────────────────────────
    from jose import jwt, JWTError
    from app.core.config import settings
    
    try:
        # Wait for auth message from client
        auth_data = await websocket.receive_json()
        token = auth_data.get("token")

        if not token:
            await websocket.send_json({"error": "Authentication required"})
            await websocket.close(code=4001)
            return

        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str = payload.get("user_id") or payload.get("sub")
        if not user_id_str:
            raise JWTError("Missing user_id/sub")
        user_id = uuid.UUID(user_id_str)

    except (JWTError, Exception) as e:
        await websocket.send_json({"error": f"Authentication failed: {str(e)}"})
        await websocket.close(code=4001)
        return

    # ── 2. Establish Connection ─────────────────────────────────────────────
    await connection_manager.connect(websocket, session_id)

    try:
        while True:
            data = await websocket.receive_json()
            message = data.get("message", "")
            
            if not message:
                continue

            model = data.get("model")
            sid = uuid.UUID(session_id)

            query = (
                select(ChatSession)
                .where(ChatSession.id == sid, ChatSession.user_id == user_id)
                .options(selectinload(ChatSession.messages))
            )
            result = await db.execute(query)
            session = result.scalar_one_or_none()
            
            if not session:
                await websocket.send_json({"error": "Session not found"})
                continue

            # Fetch user for provider config
            user_result = await db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if not user:
                await websocket.send_json({"error": "User not found"})
                continue

            # Save user message
            user_msg = ChatMessage(session_id=session.id, role="user", content=message)
            db.add(user_msg)
            await db.commit()
            await db.refresh(session)

            ai_service = AIService.from_user(user)
            full_response = ""

            await websocket.send_json({"type": "start", "session_id": session_id})

            async for chunk in ai_service.stream_chat(session.messages, model or user.default_model):
                full_response += chunk
                await websocket.send_json({"type": "chunk", "content": chunk})

            await websocket.send_json({"type": "done", "content": full_response})

            # Save assistant message
            assistant_msg = ChatMessage(
                session_id=session.id, 
                role="assistant", 
                content=full_response, 
                model=model or user.default_model
            )
            db.add(assistant_msg)
            session.updated_at = datetime.utcnow()
            await db.commit()

            # Trigger memory extraction (since we are in a WS loop, we can just await it or use a background task)
            # For simplicity in WS, we'll run it in background
            import asyncio
            conversation_chunk = f"User: {message}\nAssistant: {full_response}"
            asyncio.create_task(ai_service.extract_and_store_memories(conversation_chunk))

    except WebSocketDisconnect:
        connection_manager.disconnect(session_id)
    except Exception as e:
        await websocket.send_json({"error": str(e)})
