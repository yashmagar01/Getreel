import re

with open("backend/main.py", "r") as f:
    content = f.read()

new_imports = """
from fastapi.responses import FileResponse
from pydantic import BaseModel
import background_task # wait, we can just use BackgroundTasks
from fastapi import BackgroundTasks
import yt_downloader
import os
"""

# Insert imports
content = content.replace("from fastapi.responses import StreamingResponse, JSONResponse", "from fastapi.responses import StreamingResponse, JSONResponse, FileResponse\nfrom fastapi import BackgroundTasks\nimport backend.yt_downloader as yt_downloader\nimport os")

# Models for YouTube
yt_models = """

class YTDownloadRequest(BaseModel):
    url: str
    quality: str = "best" # e.g., '1080p', '720p', '480p', 'audio', 'best'
"""
content = content.replace("# ── URL Validation", yt_models + "\n\n# ── URL Validation")

# Route for Youtube
yt_routes = """

@app.post("/api/youtube/download")
async def download_youtube(req: YTDownloadRequest, background_tasks: BackgroundTasks):
    try:
        format_spec = "best"
        if req.quality == "1080p":
            format_spec = "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
        elif req.quality == "720p":
            format_spec = "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
        elif req.quality == "480p":
            format_spec = "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
        elif req.quality == "audio":
            format_spec = "bestaudio[ext=m4a]/bestaudio/best"
            
        file_path = await yt_downloader.download_yt_video(req.url, format_spec)
        
        def cleanup(path):
            try:
                os.remove(path)
            except Exception:
                pass
                
        background_tasks.add_task(cleanup, file_path)
        
        filename = "youtube_download" + os.path.splitext(file_path)[1]
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"YouTube download failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
"""

if "@app.post(\"/api/youtube/download\")" not in content:
    content += yt_routes

with open("backend/main.py", "w") as f:
    f.write(content)
print("done")
