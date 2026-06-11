import io
import asyncio
try:
    import torch
except ImportError:
    torch = None
import numpy as np
from typing import Any, Dict, Optional, AsyncGenerator
from concurrent.futures import ThreadPoolExecutor

try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

from app.services.stt.base import BaseSTTProvider

class FasterWhisperProvider(BaseSTTProvider):
    """
    Faster-Whisper Implementation for local, high-performance STT.
    Uses ThreadPoolExecutor to prevent blocking the main event loop.
    """

    def __init__(
        self, 
        model_size: str = "base", 
        device: str = "auto", 
        compute_type: str = "default"
    ):
        if WhisperModel is None:
            raise ImportError("faster-whisper is not installed. Please add it to requirements.txt")

        # Determine device automatically if not specified
        if device == "auto":
            self.device = "cuda" if torch is not None and torch.cuda.is_available() else "cpu"
        else:
            self.device = device

        # Set compute type (int8 is efficient for CPU, float16 for GPU)
        if compute_type == "default":
            self.compute_type = "float16" if self.device == "cuda" else "int8"
        else:
            self.compute_type = compute_type

        self.model_size = model_size
        self._model = None
        self._executor = ThreadPoolExecutor(max_workers=1)

    def _get_model(self):
        """Lazy loading of the model to save memory until needed."""
        if self._model is None:
            self._model = WhisperModel(
                self.model_size, 
                device=self.device, 
                compute_type=self.compute_type
            )
        return self._model

    async def transcribe(self, audio_bytes: bytes, **kwargs) -> Dict[str, Any]:
        """
        Transcribe audio bytes using Faster-Whisper.
        Noise suppression and VAD (Voice Activity Detection) are handled by the model.
        """
        loop = asyncio.get_event_loop()
        
        try:
            # Run transcription in a separate thread to keep FastAPI responsive
            result = await loop.run_in_executor(
                self._executor, 
                self._sync_transcribe, 
                audio_bytes, 
                kwargs
            )
            return result
        except Exception as e:
            return {
                "text": f"[STT Error: {str(e)}]",
                "language": "unknown",
                "confidence": 0.0,
                "error": True
            }

    def _sync_transcribe(self, audio_bytes: bytes, options: Dict[str, Any]) -> Dict[str, Any]:
        model = self._get_model()
        
        audio_stream = io.BytesIO(audio_bytes)
        
        # model.transcribe handles noise suppression via vad_filter
        # language detection and auto-punctuation are native
        segments, info = model.transcribe(
            audio_stream,
            beam_size=options.get("beam_size", 5),
            vad_filter=options.get("vad_filter", True),
            vad_parameters=dict(min_silence_duration_ms=500),
            language=options.get("language"),
            task="transcribe"
        )

        transcript_segments = []
        total_confidence = 0
        
        # We need to consume the generator to get the text
        for segment in segments:
            transcript_segments.append({
                "text": segment.text,
                "start": segment.start,
                "end": segment.end,
                "confidence": segment.avg_logprob # Whisper uses logprob as a confidence proxy
            })
            # Convert logprob to a 0-1 confidence roughly
            total_confidence += np.exp(segment.avg_logprob)

        full_text = " ".join([s["text"] for s in transcript_segments]).strip()
        avg_confidence = (total_confidence / len(transcript_segments)) if transcript_segments else info.language_probability
        
        return {
            "text": full_text,
            "language": info.language,
            "confidence": float(avg_confidence),
            "segments": transcript_segments,
            "info": {
                "language_probability": info.language_probability,
                "duration": info.duration
            },
            "error": False
        }

    async def stream_transcribe(
        self, 
        audio_stream: AsyncGenerator[bytes, None], 
        **kwargs: Any
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream audio chunks and yield partial/final transcripts.
        Accumulates the stream and runs batch transcription.
        """
        buffer = bytearray()
        async for chunk in audio_stream:
            buffer.extend(chunk)
        if buffer:
            result = await self.transcribe(bytes(buffer), **kwargs)
            yield result

    def get_info(self) -> Dict[str, Any]:
        return {
            "provider": "faster-whisper",
            "model": self.model_size,
            "device": self.device,
            "compute_type": self.compute_type,
            "is_loaded": self._model is not None
        }
