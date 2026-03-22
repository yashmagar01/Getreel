"use client";

import { useState, useRef } from "react";

// Remove unused AnalyzeResult import

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
    if (!trimmed) return;

    // Robust check: does it contain 'instagram.com/reel/'?
    if (!INSTAGRAM_REEL_REGEX.test(trimmed)) {
      setLocalError("Please enter a valid Instagram Reel URL.");
      inputRef.current?.focus();
      return;
    }

    onSubmit(trimmed);
  };

  const isButtonEnabled = !isLoading && url.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-3">
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl blur opacity-0 group-focus-within:opacity-60 transition-all duration-500" />

        <div className="relative flex gap-2 bg-gray-900/80 backdrop-blur-sm border border-white/10 rounded-2xl p-2">
          {/* Instagram icon prefix */}
          <div className="flex items-center pl-3 shrink-0">
            <svg className="w-5 h-5 text-pink-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </div>

          <input
            ref={inputRef}
            id="reel-url-input"
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (localError) setLocalError("");
            }}
            onPaste={(e) => {
              const pastedText = e.clipboardData.getData("text");
              setUrl(pastedText);
            }}
            placeholder="Paste Instagram Reel URL here..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none py-3 pr-2 min-w-0"
            autoComplete="off"
            spellCheck={false}
          />

          <button
            id="decode-reel-button"
            type="submit"
            disabled={!isButtonEnabled}
            className={`
              relative shrink-0 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200
              ${!isButtonEnabled
                ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-95 shadow-lg shadow-violet-900/40"
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Decoding...
              </span>
            ) : (
              "Decode Reel →"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-red-400 text-sm px-1 animate-in slide-in-from-top-1 duration-200">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
