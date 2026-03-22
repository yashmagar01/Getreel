#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Download and install ffmpeg
if [ ! -d "bin" ]; then
  mkdir -p bin
fi

if [ ! -f "bin/ffmpeg" ]; then
  echo "Downloading ffmpeg..."
  # Use a reliable direct link to a Linux 64-bit static build
  # This build is from an official-ish source often used in CI/CD
  curl -L https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz | tar -xJ --strip-components=2 -C bin
fi

# Ensure binaries are executable
chmod +x bin/ffmpeg
chmod +x bin/ffprobe

echo "FFmpeg installation completed successfully."
