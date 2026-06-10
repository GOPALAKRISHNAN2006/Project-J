import tempfile
import httpx
from typing import Any, Dict, Optional
from app.services.tts.base import BaseTTSProvider

class ElevenLabsProvider(BaseTTSProvider):
    """
    ElevenLabs Implementation for ultra-realistic voice synthesis.
    """

    def __init__(self, api_key: str, voice_id: str = "pNInz6obpgDQGcFmaJgB"): # Default: Adam
        self.api_key = api_key
        self.voice_id = voice_id
        self.base_url = "https://api.elevenlabs.io/v1/text-to-speech"

    async def synthesize(self, text: str, **kwargs) -> str:
        voice_id = kwargs.get("voice_id", self.voice_id)
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/{voice_id}",
                json=data,
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise Exception(f"ElevenLabs error: {response.text}")

            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
            tmp_path = tmp.name
            with open(tmp_path, "wb") as f:
                f.write(response.content)
            return tmp_path

    def get_info(self) -> Dict[str, Any]:
        return {
            "provider": "elevenlabs",
            "voice_id": self.voice_id,
            "type": "cloud"
        }
