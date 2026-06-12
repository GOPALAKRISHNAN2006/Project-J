from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, Form, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import base64
import json
import os
import asyncio
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db, get_mongo_db
from app.models.user import User
from app.core.security import get_current_user, get_user_from_token
from app.services.voice_service import VoiceService
from app.services.orchestrator import JarvisOrchestrator

router = APIRouter()


class TTSRequest(BaseModel):
    text: str


class STTResponse(BaseModel):
    transcript: str
    confidence: Optional[float] = None
    language: Optional[str] = None


@router.post("/transcribe", response_model=STTResponse)
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Transcribe uploaded audio file to text using Faster-Whisper."""
    import uuid
    uid = uuid.UUID(current_user["user_id"]) if isinstance(current_user["user_id"], str) else current_user["user_id"]
    user_result = await db.execute(select(User).where(User.id == uid))
    user = user_result.scalar_one_or_none()
    
    vs = VoiceService(user=user)
    audio_bytes = await file.read()
    
    result = await vs.transcribe(audio_bytes, vad_filter=True)
    return STTResponse(**result)


@router.post("/synthesize")
async def synthesize_speech(
    req: TTSRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Convert text to speech (TTS) and return audio file."""
    import uuid
    uid = uuid.UUID(current_user["user_id"]) if isinstance(current_user["user_id"], str) else current_user["user_id"]
    user_result = await db.execute(select(User).where(User.id == uid))
    user = user_result.scalar_one_or_none()
    
    vs = VoiceService(user=user)
    audio_path = await vs.synthesize(req.text)
    
    media_type = "audio/wav" if audio_path.endswith(".wav") else "audio/mpeg"
    
    return FileResponse(
        audio_path,
        media_type=media_type,
        filename="jarvis_response.mp3",
    )


def cleanup_temp_file(path: str):
    """Safely delete a temporary file after it has been served."""
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


@router.post("/interact")
async def voice_interaction(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    mongo_db = Depends(get_mongo_db),
):
    """
    The main JARVIS voice entry point.
    Takes audio, returns transcript, text response, and synthesized audio.
    """
    import uuid
    uid = uuid.UUID(current_user["user_id"]) if isinstance(current_user["user_id"], str) else current_user["user_id"]
    user_result = await db.execute(select(User).where(User.id == uid))
    user = user_result.scalar_one_or_none()
    
    audio_bytes = await file.read()
    jarvis = JarvisOrchestrator(user=user, mongo_db=mongo_db)
    result = await jarvis.process_voice_interaction(audio_bytes, session_id)
    
    audio_path = result.pop("audio_path")
    if audio_path:
        background_tasks.add_task(cleanup_temp_file, audio_path)
    
    headers = {
        "X-Jarvis-Metadata": base64.b64encode(json.dumps(result).encode()).decode()
    }
    
    return FileResponse(
        audio_path,
        media_type="audio/wav" if audio_path.endswith(".wav") else "audio/mpeg",
        headers=headers
    )


import re

def split_sentences(text: str) -> list[str]:
    """Split text into sentences for more natural TTS streaming."""
    # Split by common sentence endings followed by space or end of string
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

@router.websocket("/ws")
async def voice_websocket(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
    mongo_db = Depends(get_mongo_db)
):
    """
    WebSocket for real-time voice interaction.
    Supports continuous conversation, sentence streaming, and interruption.
    """
    await websocket.accept()
    
    current_tasks = []
    
    def cancel_tasks():
        for task in current_tasks:
            if not task.done():
                task.cancel()
        current_tasks.clear()

    try:
        # Wait for authentication token
        auth_data = await websocket.receive_json()
        token = auth_data.get("token")
        if not token:
            await websocket.close(code=4001)
            return
        
        user_info = await get_user_from_token(token)
        if not user_info:
            await websocket.close(code=4002)
            return
            
        import uuid
        uid = uuid.UUID(user_info["user_id"]) if isinstance(user_info["user_id"], str) else user_info["user_id"]
        user_result = await db.execute(select(User).where(User.id == uid))
        user = user_result.scalar_one_or_none()
        if not user:
            await websocket.close(code=4003)
            return

        orchestrator = JarvisOrchestrator(user=user, mongo_db=mongo_db)
        audio_buffer = bytearray()
        session_id = None
        
        async def process_ai_response(transcript_text, lang, tts_options, sess_id):
            nonlocal session_id
            
            # 1. Resolve Session & History
            if not sess_id:
                sess_id = str(uuid.uuid4())
            session_id = sess_id
            
            # Fetch history
            from app.models.chat import ChatSession, ChatMessage
            import uuid
            history_objs = []
            if mongo_db:
                session_doc = await mongo_db["chat_sessions"].find_one({"id": sess_id})
                if session_doc:
                    for m in session_doc.get("messages", []):
                        history_objs.append(ChatMessage(role=m["role"], content=m["content"], model=m.get("model")))
            else:
                from app.core.database import AsyncSessionLocal
                from sqlalchemy import select
                from sqlalchemy.orm import selectinload
                try:
                    sid = uuid.UUID(sess_id) if isinstance(sess_id, str) else sess_id
                    async with AsyncSessionLocal() as db_session:
                        result = await db_session.execute(
                            select(ChatSession)
                            .where(ChatSession.id == sid)
                            .options(selectinload(ChatSession.messages))
                        )
                        db_sess = result.scalar_one_or_none()
                        if db_sess:
                            for m in db_sess.messages:
                                history_objs.append(ChatMessage(role=m.role, content=m.content, model=m.model))
                except Exception as e:
                    import logging
                    logging.getLogger("jarvis").warning(f"Error loading WS chat history from SQLite: {e}")

            # 2. Memory Retrieval (RAG)
            from app.services.memory_service import MemoryService
            from app.core.database import get_chroma_client
            
            chroma = get_chroma_client()
            context_str = ""
            if chroma:
                ms = MemoryService(chroma)
                memories = await ms.search_memories(str(user.id), transcript_text, n_results=3)
                if memories:
                    context_str = "\n\nRELEVANT MEMORIES:\n" + "\n".join([f"- {m.content}" for m in memories])
            
            current_time = datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")
            system_prompt = (
                f"You are JARVIS, an advanced AI assistant. Current time: {current_time}."
                f"{context_str}\n\nKeep your responses concise and conversational for voice interaction."
            )
            
            history_objs.append(ChatMessage(role="user", content=transcript_text))
            
            full_response = ""
            current_sentence = ""
            
            async for chunk in orchestrator.ai_service.stream_chat(
                messages=history_objs,
                model=user.default_model,
                system_prompt=system_prompt
            ):
                full_response += chunk
                current_sentence += chunk
                await websocket.send_json({"type": "response_chunk", "text": chunk})
                
                # If we have a complete sentence, synthesize it immediately
                if any(punct in chunk for punct in ".!?"):
                    sentences = split_sentences(current_sentence)
                    if len(sentences) > 1:
                        # Process all but the last potentially incomplete sentence
                        for s in sentences[:-1]:
                            await synthesize_and_send(s, tts_options)
                        current_sentence = sentences[-1]
                    elif len(sentences) == 1 and any(current_sentence.strip().endswith(p) for p in ".!?"):
                        await synthesize_and_send(sentences[0], tts_options)
                        current_sentence = ""

            # Final sentence if any
            if current_sentence.strip():
                await synthesize_and_send(current_sentence, tts_options)

            # Save to history
            history_objs.append(ChatMessage(role="assistant", content=full_response, model=user.default_model))
            if mongo_db:
                messages_list = []
                for m in history_objs:
                    messages_list.append({
                        "role": m.role,
                        "content": m.content,
                        "model": m.model
                    })
                await mongo_db["chat_sessions"].update_one(
                    {"id": sess_id},
                    {"$set": {
                        "user_id": str(user.id),
                        "messages": messages_list,
                        "updated_at": datetime.utcnow()
                    }},
                    upsert=True
                )
            else:
                from app.core.database import AsyncSessionLocal
                try:
                    sid = uuid.UUID(sess_id) if isinstance(sess_id, str) else sess_id
                    async with AsyncSessionLocal() as db_session:
                        from sqlalchemy import delete
                        db_sess = await db_session.get(ChatSession, sid)
                        if not db_sess:
                            db_sess = ChatSession(
                                id=sid,
                                user_id=user.id,
                                title=transcript_text[:60] + ("..." if len(transcript_text) > 60 else ""),
                                model=user.default_model
                            )
                            db_session.add(db_sess)
                        else:
                            db_sess.updated_at = datetime.utcnow()
                        
                        await db_session.execute(delete(ChatMessage).where(ChatMessage.session_id == sid))
                        for m in history_objs:
                            db_msg = ChatMessage(
                                id=uuid.uuid4(),
                                session_id=sid,
                                role=m.role,
                                content=m.content,
                                model=m.model
                            )
                            db_session.add(db_msg)
                        await db_session.commit()
                except Exception as e:
                    import logging
                    logging.getLogger("jarvis").warning(f"Error saving WS chat session/messages to SQLite: {e}")
            
            await websocket.send_json({"type": "response_final", "text": full_response, "session_id": sess_id})

        async def synthesize_and_send(text, options):
            audio_path = await orchestrator.voice_service.synthesize(text, **options)
            with open(audio_path, "rb") as f:
                audio_b64 = base64.b64encode(f.read()).decode()
            
            await websocket.send_json({
                "type": "audio", 
                "data": audio_b64,
                "text": text,
                "media_type": "audio/wav" if audio_path.endswith(".wav") else "audio/mpeg"
            })
            if os.path.exists(audio_path):
                os.remove(audio_path)

        while True:
            message = await websocket.receive()
            
            if "bytes" in message:
                data = message["bytes"]
                audio_buffer.extend(data)
            
            elif "text" in message:
                control = json.loads(message["text"])
                c_type = control.get("type")
                
                if c_type == "start_stream":
                    cancel_tasks()
                    audio_buffer = bytearray()
                    await websocket.send_json({"type": "ready"})

                elif c_type == "end_stream":
                    lang = control.get("language")
                    tts_options = control.get("tts_options", {})
                    sess_id = control.get("session_id") or session_id
                    
                    stt_result = await orchestrator.voice_service.transcribe(bytes(audio_buffer), language=lang)
                    transcript = stt_result.get("text", "").strip()
                    audio_buffer = bytearray()
                    
                    if not transcript:
                        await websocket.send_json({"type": "error", "message": "No speech detected"})
                        continue

                    await websocket.send_json({"type": "transcript", "text": transcript})
                    
                    # Run AI processing in background task to allow interruption
                    task = asyncio.create_task(process_ai_response(transcript, lang, tts_options, sess_id))
                    current_tasks.append(task)
                
                elif c_type == "interrupt":
                    cancel_tasks()
                    audio_buffer = bytearray()
                    await websocket.send_json({"type": "interrupted"})

    except WebSocketDisconnect:
        cancel_tasks()
    except Exception as e:
        print(f"WS Error: {e}")
        cancel_tasks()
        try: await websocket.send_json({"type": "error", "message": str(e)})
        except: pass
        await websocket.close()


    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
        await websocket.close()
