"""
M5 — Cloud Speech-to-Text + Text-to-Speech (Sanjeevani AI)
Replaces browser-only webkitSpeechRecognition with Google Cloud Speech API.
Supports Indian language acoustic models: hi-IN, te-IN, ta-IN, mr-IN, bn-IN, kn-IN, ml-IN, en-IN.
"""
import base64
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/ai/speech", tags=["Cloud Speech-to-Text & TTS"])

SUPPORTED_LANGUAGE_CODES = {
    "hi": "hi-IN",
    "te": "te-IN",
    "ta": "ta-IN",
    "mr": "mr-IN",
    "bn": "bn-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "en": "en-IN"
}

class SpeechToTextRequest(BaseModel):
    audio_base64: str            # Base64-encoded audio (LINEAR16 / WEBM_OPUS)
    language_code: Optional[str] = "hi"  # ISO 639-1; mapped to BCP-47
    mime_type: Optional[str] = "audio/webm"  # audio/webm | audio/wav | audio/ogg

class TextToSpeechRequest(BaseModel):
    text: str
    language_code: Optional[str] = "hi"
    voice_gender: Optional[str] = "FEMALE"  # MALE | FEMALE | NEUTRAL


@router.post("/speech-to-text")
def transcribe_audio(req: SpeechToTextRequest):
    """
    Transcribes voice input using Google Cloud Speech-to-Text V1.
    Supports 8 Indian languages for ASHA worker voice commands.
    """
    bcp47 = SUPPORTED_LANGUAGE_CODES.get(req.language_code, "hi-IN")

    try:
        from google.cloud import speech
        client = speech.SpeechClient()

        audio_bytes = base64.b64decode(req.audio_base64)
        audio = speech.RecognitionAudio(content=audio_bytes)

        encoding_map = {
            "audio/webm": speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            "audio/wav": speech.RecognitionConfig.AudioEncoding.LINEAR16,
            "audio/ogg": speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
        }
        encoding = encoding_map.get(req.mime_type, speech.RecognitionConfig.AudioEncoding.WEBM_OPUS)

        config = speech.RecognitionConfig(
            encoding=encoding,
            language_code=bcp47,
            alternative_language_codes=[c for c in SUPPORTED_LANGUAGE_CODES.values() if c != bcp47][:3],
            enable_automatic_punctuation=True,
            model="latest_long",
            use_enhanced=True
        )

        response = client.recognize(config=config, audio=audio)
        transcript = " ".join(
            result.alternatives[0].transcript
            for result in response.results
            if result.alternatives
        )
        confidence = response.results[0].alternatives[0].confidence if response.results else 0.0

        return {
            "success": True,
            "transcript": transcript,
            "confidence": round(confidence, 3),
            "language_detected": bcp47,
            "api": "Google Cloud Speech-to-Text V1",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

    except ImportError:
        raise HTTPException(status_code=501, detail="google-cloud-speech not installed. Run: pip install google-cloud-speech")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech-to-Text error: {str(e)}")


@router.post("/text-to-speech")
def synthesize_speech(req: TextToSpeechRequest):
    """
    Synthesizes speech using Google Cloud Text-to-Speech.
    Returns base64-encoded MP3 audio for playback in the frontend.
    """
    bcp47 = SUPPORTED_LANGUAGE_CODES.get(req.language_code, "hi-IN")

    try:
        from google.cloud import texttospeech
        client = texttospeech.TextToSpeechClient()

        synthesis_input = texttospeech.SynthesisInput(text=req.text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=bcp47,
            ssml_gender=texttospeech.SsmlVoiceGender[req.voice_gender]
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

        response = client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        audio_b64 = base64.b64encode(response.audio_content).decode("utf-8")

        return {
            "success": True,
            "audio_base64": audio_b64,
            "mime_type": "audio/mp3",
            "language": bcp47,
            "api": "Google Cloud Text-to-Speech V1",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

    except ImportError:
        raise HTTPException(status_code=501, detail="google-cloud-texttospeech not installed. Run: pip install google-cloud-texttospeech")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text-to-Speech error: {str(e)}")
