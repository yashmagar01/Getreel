"use client";

import { useState, useCallback } from "react";
import UrlInput from "@/components/UrlInput";
import YoutubeDownloader from "@/components/YoutubeDownloader";
import LoadingState from "@/components/LoadingState";
import RoadmapDisplay from "@/components/RoadmapDisplay";
import PromisedLinkCTA from "@/components/PromisedLinkCTA";
import { DownloadButton } from "@/components/DownloadButton";
import CapsuleShare from "@/components/CapsuleShare";
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

  const handleReset = useCallback(() => {
    setResult(null);
    setDownloadToken(null);
    setError(null);
    setCurrentStage("");
  }, []);

  return (
    <main className="min-h-screen relative">
      {/* ── VIEW: Idle / Input ── */}
      {!result && !isLoading && (
        <div className="flex flex-col items-center px-6 pt-24 pb-24 max-w-3xl mx-auto min-h-screen">
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs font-medium tracking-widest uppercase text-[#71717a]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4A90D9] pulse-subtle" />
            AI-Powered Reel Decoder
          </div>

          <h1 className="text-4xl md:text-6xl font-light text-center mb-4 leading-tight tracking-tight text-balance max-w-2xl">
            Decode any Instagram Reel
          </h1>

          <p className="text-[#71717a] text-center text-base md:text-lg max-w-md mb-10 leading-relaxed">
            Paste a reel URL. Get the complete roadmap, resources, and promised links — no follows, no comments, no waiting.
          </p>

          <UrlInput
                      onSubmit={handleAnalyze}
                      isLoading={isLoading}
                      error={error || ""}
                    />

          <div className="flex flex-wrap gap-2 mt-10 justify-center">
            {[
              "Audio Transcribed",
              "Frames Analyzed",
              "AI Roadmap",
              "Results Cached",
            ].map((label) => (
              <span
                key={label}
                className="text-xs px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[#52525b] tracking-wide"
              >
                {label}
              </span>
            ))}
          </div>

          <YoutubeDownloader />
        </div>
      )}

      {/* ── VIEW: Loading ── */}
      {isLoading && (
        <div className="min-h-screen flex items-center justify-center px-6">
          <LoadingState currentStage={currentStage} />
        </div>
      )}

      {/* ── VIEW: Result ── */}
      {result && !isLoading && (
        <div className="animate-in fade-in duration-500">
          <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#111213]/80 backdrop-blur-xl">
            <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
              <button
                onClick={handleReset}
                className="text-sm text-[#71717a] hover:text-[#f4f4f5] transition-colors"
              >
                &larr; Decode another
              </button>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#4A90D9] bg-[#4A90D9]/[0.08] px-2.5 py-1 rounded">
                  Analysis Complete
                </span>
              </div>
            </div>
          </header>

          <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">
            <section className="space-y-4">
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#52525b]">
                Topic
              </div>
              <h2 className="text-2xl md:text-4xl font-light leading-tight text-balance">
                {result.concept?.topic || "What this reel is actually teaching"}
              </h2>
              {result.concept?.target_audience && (
                <div className="flex items-center gap-2 text-sm text-[#71717a]">
                  <span className="text-[10px] uppercase tracking-wider text-[#52525b]">Audience</span>
                  <span className="w-1 h-1 rounded-full bg-[#3f3f46]" />
                  <span>{result.concept.target_audience}</span>
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
              <div className="min-h-[180px]">
                {result.promised_link ? (
                  <PromisedLinkCTA link={result.promised_link} />
                ) : (
                  <div className="h-full flex items-center justify-center p-8 rounded-xl bg-white/[0.03] border border-dashed border-white/[0.06] text-[#52525b] text-sm text-center">
                    No specific link was mentioned in this reel.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {downloadToken && (
                  <div className="fade-up" style={{ animationDelay: "100ms" }}>
                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#52525b] mb-2">
                      Download
                    </div>
                    <DownloadButton token={downloadToken} />
                  </div>
                )}

                {result.roadmap && (
                  <div className="fade-up" style={{ animationDelay: "200ms" }}>
                    <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#52525b] mb-2">
                      Share
                    </div>
                    <CapsuleShare result={result} capsuleId={result.capsule_id} />
                  </div>
                )}
              </div>
            </div>

            {result.roadmap && (
              <section className="space-y-6 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/[0.04]" />
                  <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#52525b]">
                    Roadmap
                  </h3>
                  <div className="h-px flex-1 bg-white/[0.04]" />
                </div>
                <RoadmapDisplay
                  roadmap={result.roadmap}
                  fromCache={result.from_cache || false}
                  skipFirst={true}
                />
              </section>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      {!isLoading && (
        <footer className="w-full py-12 text-center border-t border-white/[0.04]">
          <p className="text-xs text-[#3f3f46] tracking-wide">
            Reel Decoder &mdash; No follows. No comments. No waiting.
          </p>
        </footer>
      )}
    </main>
  );
}
