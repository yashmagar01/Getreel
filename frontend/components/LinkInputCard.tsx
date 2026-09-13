"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import PrimaryButton from "@/components/ui/PrimaryButton";

// ── Platform detection ────────────────────────────────────────────────────────
const INSTAGRAM_RE = /instagram\.com\/reel\/([A-Za-z0-9_-]+)/;
const YOUTUBE_RE   = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]+)/;

type Platform = "instagram" | "youtube" | null;

function detectPlatform(url: string): Platform {
  if (INSTAGRAM_RE.test(url)) return "instagram";
  if (YOUTUBE_RE.test(url))   return "youtube";
  return null;
}

// ── Quality options ───────────────────────────────────────────────────────────
const QUALITY_OPTIONS = [
  { value: "best",  label: "Best" },
  { value: "1080p", label: "1080p" },
  { value: "720p",  label: "720p" },
  { value: "480p",  label: "480p" },
  { value: "audio", label: "Audio only" },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// ── Props ─────────────────────────────────────────────────────────────────────
interface LinkInputCardProps {
  onInstagramSubmit: (url: string) => void;
  isLoading: boolean;
  error?: string;
  onPlatformChange?: (platform: Platform) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LinkInputCard({
  onInstagramSubmit,
  isLoading,
  error: externalError = "",
  onPlatformChange,
}: LinkInputCardProps) {
  const [url, setUrl]               = useState("");
  const [platform, setPlatform]     = useState<Platform>(null);
  const [quality, setQuality]       = useState("best");
  const [localError, setLocalError] = useState("");
  const [ytLoading, setYtLoading]   = useState(false);
  const [mounted, setMounted]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const error = localError || externalError;

  // Detect platform on every url change
  const handleUrlChange = useCallback((raw: string) => {
    setUrl(raw);
    if (localError) setLocalError("");
    const detected = detectPlatform(raw.trim());
    setPlatform(detected);
    onPlatformChange?.(detected);
  }, [localError, onPlatformChange]);

  // ── YouTube download ────────────────────────────────────────────────────────
  const handleYoutubeDownload = async () => {
    setYtLoading(true);
    setLocalError("");
    try {
      const resp = await fetch(`${BACKEND_URL}/api/youtube/download`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: url.trim(), quality }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "Download failed");
      }
      const blob = await resp.blob();
      const disposition = resp.headers.get("Content-Disposition");
      let filename = "video_download";
      if (disposition) {
        const m = disposition.match(/filename="?([^";]+)"?/);
        if (m) filename = m[1];
      }
      const dlUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(dlUrl);
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setYtLoading(false);
    }
  };

  // ── Instagram submit ────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    const trimmed = url.trim();

    if (!trimmed) {
      setLocalError("Paste an Instagram Reel or YouTube URL to get started.");
      inputRef.current?.focus();
      return;
    }

    if (platform === "youtube") {
      await handleYoutubeDownload();
      return;
    }

    if (platform === "instagram") {
      onInstagramSubmit(trimmed);
      return;
    }

    setLocalError("Paste a valid Instagram Reel or YouTube URL.");
    inputRef.current?.focus();
  };

  const submitLoading = isLoading || ytLoading;
  const isEnabled     = mounted && !submitLoading && url.trim().length > 0;

  const buttonLabel =
    submitLoading ? (platform === "youtube" ? "Downloading…" : "Decoding…")
    : platform === "youtube"    ? "Download"
    : platform === "instagram"  ? "Decode"
    : "Analyze";

  // ── Platform icon prefix ────────────────────────────────────────────────────
  const PlatformIcon = () => {
    if (platform === "instagram") {
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth={1.6}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" strokeWidth={2.5} />
        </svg>
      );
    }
    if (platform === "youtube") {
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.498 6.186a2.994 2.994 0 0 0-2.108-2.12C19.527 3.6 12 3.6 12 3.6s-7.527 0-9.39.466A2.994 2.994 0 0 0 .502 6.186 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .502 5.814 2.994 2.994 0 0 0 2.108 2.12C4.473 20.4 12 20.4 12 20.4s7.527 0 9.39-.466a2.994 2.994 0 0 0 2.108-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 shrink-0 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input row */}
        <div
          className={`flex items-center gap-2 bg-white border rounded-[var(--radius-pill)] px-4 py-2.5 transition-all duration-200 shadow-[var(--shadow-sm)] focus-within:shadow-[var(--shadow-md)] ${
            error
              ? "border-[var(--accent-red)]/40 focus-within:border-[var(--accent-red)]/60"
              : platform
              ? "border-[var(--brand-border)] focus-within:border-[var(--brand-solid)]"
              : "border-[var(--border-default)] focus-within:border-[var(--border-active)]"
          }`}
        >
          <PlatformIcon />

          <input
            ref={inputRef}
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Paste Instagram Reel or YouTube URL…"
            disabled={submitLoading}
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-placeholder)] text-sm outline-none py-1.5 min-w-0"
            autoComplete="off"
            spellCheck={false}
            aria-label="Video or reel URL"
          />

          {/* Paste shortcut */}
          {!url && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  handleUrlChange(text);
                } catch {/* permission denied */}
              }}
              className="shrink-0 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--brand-solid)] transition-colors px-1"
            >
              Paste
            </button>
          )}

          <PrimaryButton
            type="submit"
            size="sm"
            loading={submitLoading}
            disabled={!isEnabled}
            className="shrink-0"
          >
            {buttonLabel}
          </PrimaryButton>
        </div>

        {/* YouTube quality picker — slides in when YT link detected */}
        {platform === "youtube" && (
          <div className="flex flex-wrap gap-2 px-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setQuality(opt.value)}
                className={`px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium border transition-all duration-150 ${
                  quality === opt.value
                    ? "border-[var(--brand-border)] bg-[var(--brand-dim)] text-[var(--brand-solid)]"
                    : "border-[var(--border-default)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 text-[var(--accent-red)] text-sm px-1 animate-in fade-in duration-200">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
