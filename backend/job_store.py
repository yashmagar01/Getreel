import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Optional
import os

# In-memory stores
_progress_queues: dict[str, asyncio.Queue] = {}   # job_id → SSE event queue
_download_store: dict[str, dict] = {}              # token → {path, expires_at}

def create_job() -> str:
    """Creates a new job_id and its SSE queue. Returns job_id."""
    job_id = str(uuid.uuid4())
    _progress_queues[job_id] = asyncio.Queue()
    return job_id

def get_queue(job_id: str) -> Optional[asyncio.Queue]:
    """Returns the SSE queue for a job, or None if not found."""
    return _progress_queues.get(job_id)

def delete_queue(job_id: str):
    """Removes the queue after SSE stream closes."""
    if job_id in _progress_queues:
        del _progress_queues[job_id]

def register_download(video_path: str) -> str:
    """
    Stores video_path under a new UUID token.
    Sets expiry to 15 minutes from now.
    Returns the token string.
    """
    token = str(uuid.uuid4())
    _download_store[token] = {
        "path": video_path,
        "expires_at": datetime.now() + timedelta(minutes=15)
    }
    return token

def get_download_path(token: str) -> Optional[str]:
    """
    Returns the video path for a token if it exists and hasn't expired.
    Returns None if token is invalid or expired.
    Does NOT delete the token — deletion happens in the download endpoint after streaming.
    """
    data = _download_store.get(token)
    if not data:
        return None
    
    if datetime.now() > data["expires_at"]:
        delete_download_token(token)
        return None
        
    return data["path"]

def delete_download_token(token: str):
    """Removes the token from the store."""
    if token in _download_store:
        del _download_store[token]

def cleanup_expired_downloads():
    """
    Scans _download_store and deletes files + tokens where expires_at < now().
    Called periodically from a background task in main.py.
    """
    now = datetime.now()
    expired_tokens = [
        token for token, data in _download_store.items()
        if now > data["expires_at"]
    ]
    
    for token in expired_tokens:
        data = _download_store[token]
        path = data["path"]
        if os.path.exists(path):
            try:
                os.remove(path)
                print(f"Cleanup: Removed expired video file {path}")
            except Exception as e:
                print(f"Cleanup: Failed to remove {path}: {e}")
        
        delete_download_token(token)
