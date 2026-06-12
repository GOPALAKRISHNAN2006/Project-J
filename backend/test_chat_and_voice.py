import asyncio
import os
import httpx
from app.services.voice_service import VoiceService
from app.models.user import User

async def verify_services():
    print("--- Starting Diagnostic Verification ---")
    
    # 1. Test local backend API connection and Login
    print("\n1. Testing Backend Connection & Login...")
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            login_resp = await client.post(
                "http://127.0.0.1:8000/api/auth/login",
                json={
                    "email": "admin@jarvis.ai",
                    "password": "password123"
                }
            )
            print(f"Login Status: {login_resp.status_code}")
            if login_resp.status_code != 200:
                print(f"Login Response: {login_resp.text}")
                return
            
            token_data = login_resp.json()
            token = token_data["access_token"]
            print("Login successful! Token retrieved.")
        except Exception as e:
            print(f"Failed to connect to backend: {e}")
            return

        # 2. Test AI Chat completing a prompt
        print("\n2. Testing AI Chat (Gemini)...")
        try:
            headers = {"Authorization": f"Bearer {token}"}
            chat_resp = await client.post(
                "http://127.0.0.1:8000/api/chat/send",
                headers=headers,
                json={
                    "message": "Verify system status in one sentence.",
                    "model": "gemini-3.5-flash",
                    "stream": False
                }
            )
            print(f"Chat API Status: {chat_resp.status_code}")
            print(f"Response Content: {chat_resp.text}")
        except Exception as e:
            print(f"Chat request failed: {e}")

    # 3. Test Local TTS Voice Synthesis (via gTTS/Piper fallback)
    print("\n3. Testing Local Voice (TTS) Synthesis...")
    try:
        # Create a mock User object to load VoiceService configuration
        mock_user = User(
            name="Tony Stark",
            ai_provider="gemini",
            default_model="gemini-3.5-flash",
            stt_provider="faster-whisper",
            tts_provider="piper"
        )
        vs = VoiceService(user=mock_user)
        print("VoiceService initialized. Synthesizing audio file...")
        audio_path = await vs.synthesize("System diagnostic complete. All modules operational.")
        
        print(f"Generated Audio Path: {audio_path}")
        if os.path.exists(audio_path):
            file_size = os.path.getsize(audio_path)
            print(f"Verification Success! Audio file exists (Size: {file_size} bytes).")
            # Cleanup temp file
            os.remove(audio_path)
        else:
            print("Verification Failed: Audio file was not created.")
    except Exception as e:
        print(f"Voice synthesis test failed: {e}")

if __name__ == "__main__":
    asyncio.run(verify_services())
