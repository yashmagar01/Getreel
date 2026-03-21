"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";
import LoadingState from "@/components/LoadingState";
import RoadmapDisplay from "@/components/RoadmapDisplay";

interface Result {
  roadmap: string;
  concept: string;
  from_cache: boolean;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const handleResult = (data: Result) => {
    setResult(data);
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white relative overflow-x-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-violet-700/10 rounded-full blur-3xl" />
        <div className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-indigo-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[40%] w-[500px] h-[500px] bg-purple-800/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 py-16 md:py-24">
        {/* Logo badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-900/30 border border-violet-500/30 text-violet-300 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          AI-Powered Reel Decoder
        </div>

        {/* Hero heading */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-center mb-4 leading-tight tracking-tight">
          <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Get the actual guide,
          </span>
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            not the teaser.
          </span>
        </h1>

        <p className="text-gray-400 text-center text-base md:text-lg max-w-lg mb-10 leading-relaxed">
          Paste any Instagram Reel URL. We reverse-engineer the creator&apos;s{" "}
          <span className="text-gray-300">&quot;follow & comment&quot;</span> trick and give you the
          complete step-by-step roadmap — instantly.
        </p>

        {/* Input */}
        {!result && (
          <UrlInput
            onResult={handleResult}
            onLoadingChange={setIsLoading}
            isLoading={isLoading}
          />
        )}

        {/* Feature pills — show only on idle */}
        {!isLoading && !result && (
          <div className="flex flex-wrap gap-2 mt-8 justify-center">
            {[
              { icon: "🎙️", label: "Audio transcribed" },
              { icon: "🖼️", label: "Frames analyzed" },
              { icon: "🤖", label: "Powered by Gemini + Llama" },
              { icon: "⚡", label: "Results cached" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gray-900/80 border border-white/10 text-gray-400"
              >
                <span>{icon}</span>
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Loading state */}
        {isLoading && <LoadingState />}

        {/* Result */}
        {result && !isLoading && (
          <>
            {/* Decode another reel button */}
            <button
              id="decode-another-button"
              onClick={handleReset}
              className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-4 py-2 rounded-xl transition-all duration-200 hover:bg-white/5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Decode another reel
            </button>

            <RoadmapDisplay roadmap={result.roadmap} fromCache={result.from_cache} />
          </>
        )}

        {/* Footer */}
        <footer className="mt-20 text-center text-gray-600 text-xs space-y-1">
          <p>Reel Decoder — No follows. No comments. No waiting.</p>
          <p>Powered by Groq Whisper · Gemini 1.5 Pro · Llama 3.3 70B</p>
        </footer>
      </div>
    </main>
  );
}
