import httpx
from typing import Dict, Any, List, Optional
from app.core.config import settings

class HomeAssistantService:
    """Service to interact with Home Assistant REST API."""

    def __init__(self):
        self.base_url = settings.HASS_URL.rstrip("/") if settings.HASS_URL else None
        self.token = settings.HASS_TOKEN
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
        }

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url and self.token)

    async def get_states(self) -> List[Dict[str, Any]]:
        """Fetch all states from HA."""
        if not self.is_configured:
            return []
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/states", headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_state(self, entity_id: str) -> Dict[str, Any]:
        """Fetch state of a specific entity."""
        if not self.is_configured:
            return {}
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/states/{entity_id}", headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def call_service(self, domain: str, service: str, service_data: Dict[str, Any]) -> Any:
        """Call a HA service."""
        if not self.is_configured:
            return {"error": "Home Assistant not configured"}
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/services/{domain}/{service}",
                headers=self.headers,
                json=service_data
            )
            response.raise_for_status()
            return response.json()

    async def turn_on(self, entity_id: str, **kwargs) -> Any:
        domain = entity_id.split(".")[0]
        service_data = {"entity_id": entity_id, **kwargs}
        # Many domains use 'turn_on' but some might differ
        return await self.call_service(domain, "turn_on", service_data)

    async def turn_off(self, entity_id: str, **kwargs) -> Any:
        domain = entity_id.split(".")[0]
        service_data = {"entity_id": entity_id, **kwargs}
        return await self.call_service(domain, "turn_off", service_data)

    async def set_value(self, domain: str, service: str, entity_id: str, value: Any, key: str = "value") -> Any:
        service_data = {"entity_id": entity_id, key: value}
        return await self.call_service(domain, service, service_data)
