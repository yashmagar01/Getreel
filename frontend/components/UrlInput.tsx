"use client";

import { useState, useRef, useEffect } from "react";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  error: string;
}

const INSTAGRAM_REEL_REGEX = /instagram\.com\/reel\/([A-Za-z0-9_-]+)/;

export default function UrlInput({ onSubmit, isLoading, error: externalError }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const error = localError || externalError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    const trimmed = url.trim();
    if (!trimmed) {
      setLocalError("Please enter an Instagram Reel URL to decode.");
      inputRef.current?.focus();
      return;
    }
    if (!INSTAGRAM_REEL_REGEX.test(trimmed)) {
      setLocalError("Please enter a valid Instagram Reel URL.");
      inputRef.current?.focus();
      return;
    }
    onSubmit(trimmed);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isButtonEnabled = mounted && !isLoading && url.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto space-y-3">
      <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 focus-within:border-white/[0.16] transition-colors">
        <svg className="w-4 h-4 shrink-0 text-[#52525b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); if (localError) setLocalError(""); }}
          placeholder="Paste Instagram Reel URL..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-[#f4f4f5] placeholder-[#3f3f46] text-sm outline-none py-2 min-w-0"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={!isButtonEnabled}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            !isButtonEnabled
              ? "bg-white/[0.04] text-[#52525b] cursor-not-allowed"
              : "bg-white/[0.08] text-[#f4f4f5] hover:bg-white/[0.12] active:scale-95"
          }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 spinner" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Decoding
            </span>
          ) : (
            "Decode"
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-[#ef4444] text-sm px-1 animate-in fade-in duration-200">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
