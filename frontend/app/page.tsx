"use client";

import { useState, useCallback } from "react";
import LinkInputCard from "@/components/LinkInputCard";
import LoadingState from "@/components/LoadingState";
import RoadmapDisplay from "@/components/RoadmapDisplay";
import PromisedLinkCTA from "@/components/PromisedLinkCTA";
import { DownloadButton } from "@/components/DownloadButton";
import CapsuleShare from "@/components/CapsuleShare";
import PlatformIconGrid from "@/components/ui/PlatformIconGrid";
import Onboarding from "@/components/Onboarding";
import BottomNav from "@/components/BottomNav";
import { analyzeReel, type ProgressEvent } from "@/lib/api";

type Result = ProgressEvent;
type Platform = "instagram" | "youtube" | null;

export default function Home() {
  const [isLoading, setIsLoading]       = useState(false);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [result, setResult]             = useState<Result | null>(null);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform>(null);

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
    <>
      <Onboarding />

      <main className="min-h-screen relative pb-16 md:pb-0">

        {/* ── VIEW: Idle / Input ─────────────────────────────────────────── */}
        {!result && !isLoading && (
          <div className="flex flex-col items-center px-6 pt-20 pb-24 max-w-3xl mx-auto min-h-screen">

            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[var(--radius-pill)] bg-[var(--brand-dim)] border border-[var(--brand-border)] text-xs font-semibold tracking-widest uppercase text-[var(--brand-solid)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-solid)] pulse-subtle" />
              AI-Powered · Video Tools
            </div>

            {/* Hero */}
            <h1 className="text-4xl md:text-[3.5rem] font-bold text-center mb-4 leading-tight tracking-tight text-balance max-w-2xl text-[var(--text-primary)]">
              Paste a link.{" "}
              <span className="shimmer-text">Get everything.</span>
            </h1>

            <p className="text-[var(--text-secondary)] text-center text-base md:text-lg max-w-md mb-10 leading-relaxed">
              Decode any Instagram Reel — AI extracts the roadmap, links, and resources. Or download any YouTube video in seconds.
            </p>

            {/* Unified input */}
            <LinkInputCard
              onInstagramSubmit={handleAnalyze}
              isLoading={isLoading}
              error={error || ""}
              onPlatformChange={setActivePlatform}
            />

            {/* Platform grid */}
            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-semibold">Supported platforms</p>
              <PlatformIconGrid activePlatform={activePlatform} />
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-10 justify-center">
              {[
                "Audio Transcribed",
                "Frames Analyzed",
                "AI Roadmap",
                "Results Cached",
                "YT Quality Picker",
              ].map((label) => (
                <span
                  key={label}
                  className="text-xs px-3 py-1.5 rounded-[var(--radius-pill)] bg-white border border-[var(--border-default)] text-[var(--text-muted)] tracking-wide shadow-[var(--shadow-sm)]"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── VIEW: Loading ──────────────────────────────────────────────── */}
        {isLoading && (
          <div className="min-h-screen flex items-center justify-center px-6">
            <LoadingState currentStage={currentStage} />
          </div>
        )}

        {/* ── VIEW: Result ───────────────────────────────────────────────── */}
        {result && !isLoading && (
          <div className="animate-in fade-in duration-500">
            {/* Sticky header */}
            <header className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-white/90 backdrop-blur-xl shadow-[var(--shadow-sm)]">
              <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--brand-solid)] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Decode another
                </button>

                <span
                  className="text-[10px] font-bold tracking-[0.15em] uppercase text-white px-3 py-1.5 rounded-[var(--radius-pill)]"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  Analysis Complete
                </span>
              </div>
            </header>

            <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">

              {/* Topic */}
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Topic</p>
                </div>
                <h2 className="text-2xl md:text-4xl font-bold leading-tight text-balance text-[var(--text-primary)]">
                  {result.concept?.topic || "What this reel is actually teaching"}
                </h2>
                {result.concept?.target_audience && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">Audience</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--border-active)]" />
                    <span>{result.concept.target_audience}</span>
                  </div>
                )}
              </section>

              {/* Cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6">
                <div className="min-h-[180px]">
                  {result.promised_link ? (
                    <PromisedLinkCTA link={result.promised_link} />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 p-8 rounded-[var(--radius-lg)] bg-white border border-[var(--border-default)] shadow-[var(--shadow-sm)] text-center">
                      <div className="w-10 h-10 rounded-[var(--radius-pill)] bg-[var(--bg-hover)] flex items-center justify-center">
                        <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">No link found</p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">No specific link was mentioned in this reel.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {downloadToken && (
                    <div className="fade-up" style={{ animationDelay: "100ms" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Download</p>
                      </div>
                      <DownloadButton token={downloadToken} />
                    </div>
                  )}

                  {result.roadmap && (
                    <div className="fade-up" style={{ animationDelay: "200ms" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Share</p>
                      </div>
                      <CapsuleShare result={result} capsuleId={result.capsule_id} />
                    </div>
                  )}
                </div>
              </div>

              {/* Roadmap */}
              {result.roadmap && (
                <section className="space-y-6 pt-4 border-t border-[var(--border-default)]">
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-[var(--border-default)]" />
                    <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Roadmap</h3>
                    <div className="h-px flex-1 bg-[var(--border-default)]" />
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

        {/* ── Footer ────────────────────────────────────────────────────── */}
        {!isLoading && (
          <footer className="w-full py-10 text-center border-t border-[var(--border-default)] bg-white">
            <p className="text-xs text-[var(--text-muted)] tracking-wide">
              GetReel &mdash; No follows. No comments. No waiting.
            </p>
          </footer>
        )}
      </main>

      <BottomNav />
    </>
  );
}
