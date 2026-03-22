"use client";

import { useState } from "react";
import UrlInput from "@/components/UrlInput";
import LoadingState from "@/components/LoadingState";
import RoadmapDisplay from "@/components/RoadmapDisplay";
import PromisedLinkCTA from "@/components/PromisedLinkCTA";
import { DownloadButton } from "@/components/DownloadButton";
import { analyzeReel, type ProgressEvent } from "@/lib/api";

type Result = ProgressEvent;

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setResult(null);
    setDownloadToken(null);
    setError(null);
    setCurrentStage("rate_limit");

    try {
      const res = await analyzeReel(url, (event) => {
        if (event.type === "progress" && event.stage) {
          setCurrentStage(event.stage);
        }
      });

      setResult(res);
      setDownloadToken(res.download_token ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setDownloadToken(null);
    setError(null);
    setCurrentStage("");
  };

  const handleCopyMarkdown = () => {
    if (result?.roadmap) {
      navigator.clipboard.writeText(result.roadmap);
      alert("Markdown copied to clipboard!");
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white relative overflow-x-hidden selection:bg-violet-500/30 selection:text-violet-200">
      {/* Background grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-violet-700/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-indigo-700/10 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="relative z-10">

        {/* VIEW 1: IDLE / INPUT */}
        {!result && !isLoading && (
          <div className="flex flex-col items-center px-4 py-20 md:py-32 max-w-4xl mx-auto">
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-900/30 border border-violet-500/30 text-violet-300 text-xs font-medium animate-in fade-in slide-in-from-top-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              AI-Powered Reel Decoder
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-center mb-6 leading-tight tracking-tight animate-in fade-in duration-700">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Get the actual guide,
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                not the teaser.
              </span>
            </h1>

            <p className="text-gray-400 text-center text-base md:text-lg max-w-lg mb-12 leading-relaxed animate-in fade-in delay-200 duration-700">
              Paste any Instagram Reel URL. We reverse-engineer the creator&apos;s{" "}
              <span className="text-gray-300">&quot;follow &amp; comment&quot;</span> trick and give you the
              complete step-by-step roadmap — instantly.
            </p>

            <UrlInput
              onSubmit={handleAnalyze}
              isLoading={isLoading}
              error={error || ""}
            />

            <div className="flex flex-wrap gap-2 mt-12 justify-center animate-in fade-in delay-500 duration-700">
              {[
                { icon: "🎙️", label: "Audio transcribed" },
                { icon: "🖼️", label: "Frames analyzed" },
                { icon: "🤖", label: "Llama 4 Scout" },
                { icon: "⚡", label: "Results cached" },
              ].map(({ icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gray-900/80 border border-white/5 text-gray-400 backdrop-blur-sm"
                >
                  <span>{icon}</span>
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: LOADING */}
        {isLoading && <LoadingState currentStage={currentStage} />}

        {/* VIEW 3: RESULT */}
        {result && !isLoading && (
          <div className="animate-in fade-in duration-1000">

            {/* STICKY HEADER BAR */}
            <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-gray-950/80 backdrop-blur-md">
              <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
                >
                  <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Decode another</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyMarkdown}
                    className="hidden sm:flex text-xs px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-gray-300 font-medium"
                  >
                    Copy Markdown
                  </button>
                  <div className="hidden sm:block w-px h-4 bg-white/10 mx-2" />
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded">
                    Analysis Complete
                  </span>
                </div>
              </div>
            </header>

            <div className="max-w-6xl mx-auto px-4 py-10 md:py-16 space-y-12">

              {/* HERO SECTION */}
              <section className="fade-up w-full rounded-3xl p-8 md:p-12 relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 shadow-2xl shadow-violet-500/20">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left gap-6">
                  <div className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold uppercase tracking-widest">
                    🎯 Targeted Result
                  </div>
                  <h2 className="text-2xl md:text-5xl font-black text-white leading-tight">
                    {result.concept?.topic || "What this reel is actually teaching"}
                  </h2>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    {result.concept?.target_audience && (
                      <div className="px-3 py-1.5 rounded-lg bg-gray-900/30 border border-white/10 text-white/90 text-sm flex items-center gap-2">
                        <span className="opacity-60">Audience:</span>
                        <span className="font-semibold">{result.concept.target_audience}</span>
                      </div>
                    )}
                    {result.concept?.tools_mentioned?.[0] && (
                      <div className="px-3 py-1.5 rounded-lg bg-gray-900/30 border border-white/10 text-white/90 text-sm flex items-center gap-2">
                        <span className="opacity-60">Key Tool:</span>
                        <span className="font-semibold">{result.concept.tools_mentioned[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* TWO COLUMN ROW */}
              <section className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-8">
                {/* PROMISED LINK */}
                <div className="w-full h-full min-h-[220px]">
                  {result.promised_link ? (
                    <div className="h-full">
                      <PromisedLinkCTA link={result.promised_link} />
                    </div>
                  ) : (
                    <div className="fade-up h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-gray-900/40 border border-dashed border-white/10 text-gray-500 text-center space-y-3" style={{ animationDelay: '100ms' }}>
                      <div className="text-3xl opacity-30">🔗</div>
                      <p className="text-sm">No specific link was mentioned in this reel.</p>
                    </div>
                  )}
                </div>

                {/* DOWNLOAD BOX */}
                <div className="w-full">
                  {downloadToken ? (
                    <DownloadButton token={downloadToken} />
                  ) : (
                    <div className="fade-up h-full flex items-center justify-center p-8 rounded-2xl bg-gray-900/40 border border-white/5 text-gray-600" style={{ animationDelay: '200ms' }}>
                      <p className="text-xs italic text-center leading-relaxed">Video processing unavailable for this specific reel format.</p>
                    </div>
                  )}
                </div>
              </section>

              {/* REMAINING ROADMAP SECTIONS */}
              <section className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px flex-1 bg-white/5" />
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">The Deep Dive</h3>
                  <div className="h-px flex-1 bg-white/5" />
                </div>
                <RoadmapDisplay
                  roadmap={result.roadmap || ""}
                  fromCache={result.from_cache || false}
                  skipFirst={true}
                />
              </section>

            </div>
          </div>
        )}

        {/* FOOTER */}
        {!isLoading && (
          <footer className="w-full py-16 text-center text-gray-600 text-xs mt-12 space-y-2 border-t border-white/5">
            <p>Reel Decoder — No follows. No comments. No waiting.</p>
            <p className="opacity-50 font-medium">Whisper AI · Gemini 1.5 · Llama 4 Scout</p>
          </footer>
        )}
      </div>
    </main>
  );
}
