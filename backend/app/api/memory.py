import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.security import get_current_user
from app.core.database import get_chroma_client
from app.models.memory import MemoryCreate, MemorySearchRequest, MemoryEntry, MemoryCategory, MemoryUpdate
from app.services.memory_service import MemoryService

router = APIRouter()

@router.get("/", response_model=List[MemoryEntry])
async def list_memories(
    category: Optional[MemoryCategory] = None,
    collection: str = Query("jarvis_memory"),
    limit: int = Query(20, le=100),
    current_user: dict = Depends(get_current_user),
    chroma=Depends(get_chroma_client),
):
    """List stored memory entries with optional category filter."""
    if not chroma:
        raise HTTPException(status_code=503, detail="ChromaDB not available")
    svc = MemoryService(chroma)
    return await svc.list_memories(current_user["user_id"], collection, category, limit)


@router.post("/", response_model=MemoryEntry, status_code=201)
async def create_memory(
    data: MemoryCreate,
    current_user: dict = Depends(get_current_user),
    chroma=Depends(get_chroma_client),
):
    """Store a new memory entry in ChromaDB with category."""
    if not chroma:
        raise HTTPException(status_code=503, detail="ChromaDB not available")
    svc = MemoryService(chroma)
    return await svc.add_memory(
        current_user["user_id"], 
        data.content, 
        data.category, 
        data.metadata, 
        data.collection
    )


@router.patch("/{memory_id}", response_model=None)
async def update_memory(
    memory_id: str,
    data: MemoryUpdate,
    collection: str = Query("jarvis_memory"),
    current_user: dict = Depends(get_current_user),
    chroma=Depends(get_chroma_client),
):
    """Update an existing memory entry."""
    if not chroma:
        raise HTTPException(status_code=503, detail="ChromaDB not available")
    svc = MemoryService(chroma)
    await svc.update_memory(
        current_user["user_id"], 
        memory_id, 
        data.content, 
        data.metadata, 
        collection
    )
    return {"status": "updated"}


@router.post("/search", response_model=List[MemoryEntry])
async def search_memories(
    req: MemorySearchRequest,
    current_user: dict = Depends(get_current_user),
    chroma=Depends(get_chroma_client),
):
    """Semantic search across memory entries with optional category filter."""
    if not chroma:
        raise HTTPException(status_code=503, detail="ChromaDB not available")
    svc = MemoryService(chroma)
    return await svc.search_memories(
        current_user["user_id"], 
        req.query, 
        req.n_results, 
        req.category, 
        req.collection
    )


@router.delete("/{memory_id}", status_code=204)
async def delete_memory(
    memory_id: str,
    collection: str = Query("jarvis_memory"),
    current_user: dict = Depends(get_current_user),
    chroma=Depends(get_chroma_client),
):
    """Delete a memory entry by ID."""
    if not chroma:
        raise HTTPException(status_code=503, detail="ChromaDB not available")
    svc = MemoryService(chroma)
    await svc.delete_memory(current_user["user_id"], memory_id, collection)
