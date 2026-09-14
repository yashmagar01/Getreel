#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Download and install ffmpeg (re-verify cached binary — a stale/corrupt
# bin/ from a previous build is the #1 cause of "Failed to extract audio"
# on Render with zero diagnostics).
if [ ! -d "bin" ]; then
  mkdir -p bin
fi

ffmpeg_works() { [ -x "bin/ffmpeg" ] && ./bin/ffmpeg -version >/dev/null 2>&1; }

if ! ffmpeg_works; then
  echo "Downloading ffmpeg..."
  rm -f bin/ffmpeg bin/ffprobe
  # Use a reliable direct link to a Linux 64-bit static build
  # This build is from an official-ish source often used in CI/CD
  curl -L https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz | tar -xJ --strip-components=2 -C bin
fi

# Ensure binaries are executable
chmod +x bin/ffmpeg
chmod +x bin/ffprobe

# Fail the build fast if ffmpeg is broken — instead of failing every request at runtime.
echo "Verifying ffmpeg..."
./bin/ffmpeg -version | head -n 2
./bin/ffprobe -version | head -n 2
export PATH="$PATH:$(pwd)/bin"
python -c "import shutil; assert shutil.which('ffmpeg'), 'ffmpeg not on PATH after install'; print('ffmpeg on PATH:', shutil.which('ffmpeg'))"

if [ ! -f "bin/deno" ]; then
  echo "Downloading deno for yt-dlp..."
  curl -L https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip -o deno.zip
  python -m zipfile -e deno.zip bin/
  rm deno.zip
fi
chmod +x bin/deno

# AtomicParsley — required by yt-dlp EmbedThumbnail for mp4 metadata.
# Best-effort: apt may not be available on all Render stacks, so never fail the build.
if ! command -v AtomicParsley >/dev/null 2>&1 && [ ! -f "bin/AtomicParsley" ]; then
  echo "Installing AtomicParsley for mp4 thumbnail/metadata..."
  (apt-get update && apt-get install -y atomicparsley || true)
  if ! command -v AtomicParsley >/dev/null 2>&1; then
    echo "apt failed, trying static binary..."
    (curl -L https://github.com/wez/atomicparsley/releases/latest/download/AtomicParsleyLinux.zip -o ap.zip \
      && python -m zipfile -e ap.zip bin/ && rm ap.zip || true)
  fi
fi
chmod +x bin/AtomicParsley 2>/dev/null || true

echo "FFmpeg, Deno and AtomicParsley installation completed successfully."
