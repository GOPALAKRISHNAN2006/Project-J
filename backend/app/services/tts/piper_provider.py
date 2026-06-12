import os
import asyncio
import tempfile
from typing import Any, Dict, Optional
from app.services.tts.base import BaseTTSProvider

class PiperProvider(BaseTTSProvider):
    """
    Piper TTS Implementation for local, fast, and offline voice synthesis.
    Expects 'piper' binary to be in the system PATH.
    """

    def __init__(self, model_path: Optional[str] = None):
        # Default model for JARVIS (English, neutral/witty)
        self.model = model_path or "en_US-lessac-medium"

    async def synthesize(self, text: str, **kwargs) -> str:
        """
        Run Piper synthesis via subprocess to ensure non-blocking local execution.
        """
        output_fd, output_path = tempfile.mkstemp(suffix=".wav")
        os.close(output_fd)

        try:
            # Piper command: echo "text" | piper --model model.onnx --output_file out.wav
            process = await asyncio.create_subprocess_exec(
                "piper", 
                "--model", self.model, 
                "--output_file", output_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate(input=text.encode())
            
            if process.returncode != 0:
                raise Exception(f"Piper error: {stderr.decode()}")
                
            return output_path
        except Exception as e:
            # Fallback to local pyttsx3 first, then gTTS if pyttsx3 fails
            import logging
            logger = logging.getLogger("jarvis")
            logger.info(f"Local piper execution failed ({e}). Attempting local pyttsx3 fallback...")
            try:
                return await self._fallback_pyttsx3(text)
            except Exception as pyttsx3_err:
                logger.warning(f"pyttsx3 fallback failed: {pyttsx3_err}. Trying gTTS...")
                try:
                    return await self._fallback_gtts(text)
                except Exception as gtts_err:
                    logger.error(f"gTTS fallback failed: {gtts_err}")
                    raise gtts_err

    async def _fallback_pyttsx3(self, text: str) -> str:
        import pyttsx3
        loop = asyncio.get_event_loop()
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp_path = tmp.name
        tmp.close()
        
        def _speak():
            # In Windows, we must initialize pythoncom for comtypes if running in threads
            try:
                import pythoncom
                pythoncom.CoInitialize()
            except ImportError:
                pass
            engine = pyttsx3.init()
            engine.save_to_file(text, tmp_path)
            engine.runAndWait()
            try:
                engine.stop()
            except:
                pass
                
        await loop.run_in_executor(None, _speak)
        return tmp_path

    async def _fallback_gtts(self, text: str) -> str:
        from gtts import gTTS
        tts = gTTS(text=text, lang="en")
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        tmp_path = tmp.name
        tmp.close()
        tts.save(tmp_path)
        return tmp_path

    def get_info(self) -> Dict[str, Any]:
        return {
            "provider": "piper",
            "model": self.model,
            "type": "local",
            "offline": True
        }
