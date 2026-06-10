from typing import Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        self.active_connections.pop(client_id, None)

    async def send_json(self, client_id: str, data: dict):
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(client_id)

    async def broadcast(self, data: dict):
        for client_id, ws in list(self.active_connections.items()):
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(client_id)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


connection_manager = ConnectionManager()


@router.get("/status")
async def ws_status():
    return {"active_connections": connection_manager.connection_count}
