"use client";

import { useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export default function YoutubeDownloader() {
  const [url, setUrl] = useState('');
  const [quality, setQuality] = useState('best');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    if (!url.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/youtube/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), quality }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Download failed');
      }
      const blob = await resp.blob();
      const disposition = resp.headers.get('Content-Disposition');
      let filename = 'youtube_download';
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match) filename = match[1];
      }
      const dlUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(dlUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setLoading(false);
    }
  };

  const qualityOptions = [
    { value: 'best', label: 'Best Quality (video+audio)' },
    { value: '1080p', label: '1080p MP4' },
    { value: '720p', label: '720p MP4' },
    { value: '480p', label: '480p MP4' },
    { value: 'audio', label: 'Audio Only (m4a)' },
  ];

  return (
    <div className="youtube-downloader">
      <h3 className="youtube-downloader__title">YouTube Downloader</h3>
      <div className="youtube-downloader__form">
        <input
          type="text"
          placeholder="Paste YouTube URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="youtube-downloader__input"
        />
        <div className="youtube-downloader__qualities">
          {qualityOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setQuality(opt.value)}
              className={`youtube-downloader__quality-btn ${
                quality === opt.value ? 'youtube-downloader__quality-btn--active' : ''
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleDownload}
          disabled={loading}
          className={`youtube-downloader__submit-btn ${
            loading ? 'youtube-downloader__submit-btn--loading' : ''
          }`}
        >
          {loading ? 'Downloading…' : 'Download'}
        </button>
        {error && (
          <p className="youtube-downloader__error">{error}</p>
        )}
      </div>
    </div>
  );
}
