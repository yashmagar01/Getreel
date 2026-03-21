import os
from groq import Groq


def transcribe_audio(audio_path: str) -> str:
    """
    Transcribe an audio file using Groq's Whisper API.

    Args:
        audio_path: Path to the audio file (mp3, wav, etc.)

    Returns:
        Transcript as a plain string.

    Raises:
        Exception: If audio is silent/music-only or API call fails.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY environment variable is not set.")

    client = Groq(api_key=api_key)

    try:
        with open(audio_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=audio_file,
                response_format="text",  # returns plain string, not JSON
            )
    except Exception as e:
        raise Exception(f"Groq Whisper transcription failed: {str(e)}")

    # response_format="text" returns the string directly
    transcript = response if isinstance(response, str) else str(response)
    transcript = transcript.strip()

    if not transcript:
        raise Exception(
            "This reel appears to have no spoken content to transcribe. "
            "It may be music-only. The decoder works best on tutorial or "
            "talking-head reels."
        )

    return transcript
