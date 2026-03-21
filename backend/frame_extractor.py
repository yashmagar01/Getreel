import os
import base64
import ffmpeg
from PIL import Image
import io


def extract_frames(video_path: str, temp_dir: str) -> list[str]:
    """
    Extract key frames from a video, evenly spaced across its duration.
    Returns a list of base64-encoded JPEG strings (max 512x512, quality 85).

    - Videos >= 3s get 6 frames at 10%, 25%, 40%, 55%, 70%, 85% of duration
    - Videos < 3s get 2 frames at 25% and 75%
    """
    # Get video duration
    try:
        probe = ffmpeg.probe(video_path)
        duration = float(probe["format"]["duration"])
    except ffmpeg.Error as e:
        raise Exception(f"Could not probe video duration: {str(e)}")

    # Choose frame timestamps
    if duration >= 3.0:
        percentages = [0.10, 0.25, 0.40, 0.55, 0.70, 0.85]
    else:
        percentages = [0.25, 0.75]

    timestamps = [duration * p for p in percentages]
    frames_b64 = []

    for i, ts in enumerate(timestamps, start=1):
        frame_filename = f"frame_{i:02d}.jpg"
        frame_path = os.path.join(temp_dir, frame_filename)

        try:
            (
                ffmpeg
                .input(video_path, ss=ts)
                .output(frame_path, vframes=1, format="image2", vcodec="mjpeg")
                .overwrite_output()
                .run(quiet=True)
            )
        except ffmpeg.Error as e:
            # Skip this frame if extraction fails — don't crash the whole pipeline
            continue

        if not os.path.exists(frame_path):
            continue

        # Resize to max 512x512 preserving aspect ratio
        try:
            with Image.open(frame_path) as img:
                img.thumbnail((512, 512), Image.LANCZOS)
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=85)
                buffer.seek(0)
                frames_b64.append(base64.b64encode(buffer.read()).decode("utf-8"))
        except Exception:
            continue

    if not frames_b64:
        raise Exception("Could not extract any frames from the video.")

    return frames_b64
