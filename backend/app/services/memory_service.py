import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime

from app.models.memory import MemoryEntry, MemoryCategory


from chromadb.api.types import EmbeddingFunction, Documents, Embeddings

class GeminiCustomEmbedding(EmbeddingFunction):
    def __init__(self, api_key: str):
        self.api_key = api_key
        
    def __call__(self, input: Documents) -> Embeddings:
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        response = genai.embed_content(
            model="models/embedding-001",
            contents=input,
            task_type="retrieval_document"
        )
        return response['embedding']


class MemoryService:
    """Service for managing vector memories in ChromaDB with categorical semantic search."""

    def __init__(self, chroma_client):
        self.client = chroma_client

    def _get_collection(self, user_id: str, collection_name: str):
        # Format name to be compliant with ChromaDB (3-63 chars, alphanumeric, starts/ends with alphanumeric)
        # Using a hash of user_id might be safer if user_id is long or contains invalid chars
        import hashlib
        from chromadb.utils import embedding_functions
        from app.core.config import settings
        
        user_hash = hashlib.md5(user_id.encode()).hexdigest()[:8]
        name = f"mem_{user_hash}_{collection_name}"[:63]
        
        # Prefer cloud-based Google Generative AI embeddings to avoid heavy 80MB local model download
        if settings.GEMINI_API_KEY:
            try:
                local_ef = GeminiCustomEmbedding(api_key=settings.GEMINI_API_KEY)
                try:
                    return self.client.get_or_create_collection(name=name, embedding_function=local_ef)
                except Exception as e:
                    err_str = str(e)
                    if "Embedding function conflict" in err_str or "already exists" in err_str:
                        import logging
                        logging.getLogger("jarvis").info(f"Recreating ChromaDB collection '{name}' to resolve embedding function conflict.")
                        try:
                            self.client.delete_collection(name=name)
                        except Exception:
                            pass
                        return self.client.get_or_create_collection(name=name, embedding_function=local_ef)
                    raise e
            except Exception as e:
                import logging
                logging.getLogger("jarvis").warning(f"Failed to initialize Gemini custom embedding: {e}. Falling back to local ONNX.")
                
        # Fallback to local ONNX embedding function
        local_ef = embedding_functions.ONNXMiniLM_L6_V2()
        return self.client.get_or_create_collection(name=name, embedding_function=local_ef)

    async def add_memory(
        self,
        user_id: str,
        content: str,
        category: MemoryCategory = MemoryCategory.GENERAL,
        metadata: Optional[Dict[str, Any]] = None,
        collection: str = "jarvis_memory",
    ) -> MemoryEntry:
        """Adds a memory to the vector store with associated category and metadata."""
        coll = self._get_collection(user_id, collection)
        memory_id = str(uuid.uuid4())
        
        # Prepare metadata for indexing
        meta = metadata or {}
        meta["user_id"] = user_id
        meta["category"] = category.value
        meta["created_at"] = datetime.utcnow().isoformat()
        meta["last_accessed"] = meta["created_at"]

        coll.add(
            documents=[content],
            metadatas=[meta],
            ids=[memory_id],
        )
        return MemoryEntry(id=memory_id, content=content, category=category, metadata=meta)

    async def search_memories(
        self,
        user_id: str,
        query: str,
        n_results: int = 5,
        category: Optional[MemoryCategory] = None,
        collection: str = "jarvis_memory",
    ) -> List[MemoryEntry]:
        """Performs semantic search across memories, optionally filtered by category."""
        coll = self._get_collection(user_id, collection)
        
        where_clause = {"user_id": user_id}
        if category:
            where_clause["category"] = category.value

        try:
            results = coll.query(
                query_texts=[query], 
                n_results=n_results,
                where=where_clause
            )
        except Exception as e:
            print(f"ChromaDB search error: {e}")
            return []

        entries = []
        if not results or not results.get("documents"):
            return []

        docs = results["documents"][0]
        ids = results["ids"][0]
        metadatas = results["metadatas"][0]
        distances = results.get("distances", [[]])[0]

        for i, doc in enumerate(docs):
            meta = metadatas[i] if i < len(metadatas) else {}
            # Update last accessed for 'aging' or 'importance' tracking
            try:
                coll.update(ids=[ids[i]], metadatas=[{**meta, "last_accessed": datetime.utcnow().isoformat()}])
            except: pass

            entries.append(MemoryEntry(
                id=ids[i],
                content=doc,
                category=MemoryCategory(meta.get("category", "general")),
                metadata=meta,
                distance=distances[i] if i < len(distances) else None,
            ))
        return entries

    async def list_memories(
        self,
        user_id: str,
        collection: str = "jarvis_memory",
        category: Optional[MemoryCategory] = None,
        limit: int = 20,
    ) -> List[MemoryEntry]:
        """Lists memories with optional category filtering."""
        coll = self._get_collection(user_id, collection)
        
        where_clause = {"user_id": user_id}
        if category:
            where_clause["category"] = category.value

        try:
            results = coll.get(
                where=where_clause,
                limit=limit
            )
        except Exception:
            return []

        entries = []
        docs = results.get("documents", [])
        ids = results.get("ids", [])
        metadatas = results.get("metadatas", [])

        for i, doc in enumerate(docs):
            meta = metadatas[i] if i < len(metadatas) else {}
            entries.append(MemoryEntry(
                id=ids[i],
                content=doc,
                category=MemoryCategory(meta.get("category", "general")),
                metadata=meta,
            ))
        return entries

    async def update_memory(
        self,
        user_id: str,
        memory_id: str,
        content: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        collection: str = "jarvis_memory",
    ):
        """Updates content or metadata of an existing memory."""
        coll = self._get_collection(user_id, collection)
        
        update_args = {"ids": [memory_id]}
        if content:
            update_args["documents"] = [content]
        if metadata:
            # Note: ChromaDB update for metadata is partial merge in some versions, 
            # but usually replaces the whole dict for that ID.
            update_args["metadatas"] = [{**metadata, "updated_at": datetime.utcnow().isoformat()}]
        
        coll.update(**update_args)

    async def delete_memory(self, user_id: str, memory_id: str, collection: str = "jarvis_memory"):
        """Deletes a memory by ID."""
        coll = self._get_collection(user_id, collection)
        coll.delete(ids=[memory_id])
