"use client";

import { useState, useCallback } from "react";
import LinkInputCard from "@/components/LinkInputCard";
import LoadingState from "@/components/LoadingState";
import ReelPreviewCard from "@/components/ReelPreviewCard";
import RoadmapDisplay from "@/components/RoadmapDisplay";
import PromisedLinkCTA from "@/components/PromisedLinkCTA";
import { DownloadButton } from "@/components/DownloadButton";
import CapsuleShare from "@/components/CapsuleShare";
import PlatformIconGrid from "@/components/ui/PlatformIconGrid";
import Onboarding from "@/components/Onboarding";
import BottomNav from "@/components/BottomNav";
import { analyzeReel, type ProgressEvent, type ReelMeta } from "@/lib/api";

type Result = ProgressEvent;
type Platform = "instagram" | "youtube" | null;

// ── Premium dashboard helpers (UI-only, no LLM logic) ─────────────────────────
function extractTeaching(roadmap?: string): string {
  if (!roadmap) return "";
  const parts = roadmap.split(/(?:^|\n)##\s+/).filter(Boolean);
  for (const part of parts) {
    const lines = part.split("\n");
    const title = (lines[0] || "").toLowerCase();
    if (title.includes("teaching")) {
      return lines.slice(1).join("\n").trim();
    }
  }
  return "";
}

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^[#>\-\*]+\s*/gm, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuote(teachingRaw: string): string {
  if (!teachingRaw) return "";
  const bold = teachingRaw.match(/\*\*(.+?)\*\*/);
  if (bold && bold[1].trim().length > 10) return bold[1].trim();
  const quoted = teachingRaw.match(/["“]([^"”]{10,220})["”]/);
  if (quoted) return quoted[1].trim();
  const plain = stripMarkdown(teachingRaw);
  const firstSentence = plain.match(/^(.{20,220}?[.!\?])(\s|$)/);
  if (firstSentence) return firstSentence[1].trim();
  return plain.slice(0, 180).trim();
}

function estimateReadTime(roadmap?: string): string {
  if (!roadmap) return "3 min";
  const words = roadmap.split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min`;
}

function getSourceUrl(meta: ReelMeta | null, result: Result): string | null {
  if (result.promised_link?.reel_url) return result.promised_link.reel_url;
  if (meta?.shortcode) return `https://www.instagram.com/reel/${meta.shortcode}/`;
  return null;
}

export default function Home() {
  const [isLoading, setIsLoading]       = useState(false);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [meta, setMeta]                 = useState<ReelMeta | null>(null);
  const [result, setResult]             = useState<Result | null>(null);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform>(null);

  const handleAnalyze = async (url: string) => {
    setIsLoading(true);
    setResult(null);
    setMeta(null);
    setDownloadToken(null);
    setError(null);
    setCurrentStage("rate_limit");

    try {
      const res = await analyzeReel(url, (event) => {
        if (event.type === "meta" && event.meta) {
          setMeta(event.meta);
        } else if (event.type === "progress" && event.stage) {
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
    setMeta(null);
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
          <div className="min-h-screen flex items-center justify-center px-6 py-12">
            {meta ? (
              <ReelPreviewCard meta={meta} currentStage={currentStage} />
            ) : (
              <LoadingState currentStage={currentStage} />
            )}
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

            <div className="py-12">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 max-w-[1400px] mx-auto px-8">

                {/* ── LEFT COLUMN (Main Content) ── */}
                <div className="md:col-span-8 space-y-12 min-w-0">

                  {/* Topic */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                      <p className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Topic</p>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-extrabold leading-[1.15] text-balance text-[var(--text-primary)]">
                      {result.concept?.topic || "What this reel is actually teaching"}
                    </h2>
                    {result.concept?.target_audience && (
                      <div className="flex items-center gap-2.5 text-sm text-[var(--text-secondary)] mt-2">
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold border border-[var(--border-default)] px-2 py-0.5 rounded-[var(--radius-pill)] bg-white">Audience</span>
                        <span>{result.concept.target_audience}</span>
                      </div>
                    )}
                  </section>

                  {/* Quick Take hero */}
                  {(() => {
                    const teachingRaw = extractTeaching(result.roadmap);
                    const teachingPlain = stripMarkdown(teachingRaw).slice(0, 420);
                    const quote = extractQuote(teachingRaw);
                    if (!teachingPlain) return null;
                    return (
                      <section className="bg-[#FFF3F1] rounded-[24px] p-7">
                        <div className="flex flex-col sm:flex-row gap-6">
                          {/* Thumbnail */}
                          <div className="shrink-0 w-40 h-52 rounded-lg overflow-hidden bg-white/60 border border-white shadow-[0_8px_24px_rgba(15,23,42,.05)]">
                            {meta?.thumbnail_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`https://wsrv.nl/?url=${encodeURIComponent(meta.thumbnail_url)}&h=420`}
                                alt="Reel thumbnail"
                                className="w-full h-full object-cover"
                                loading="eager"
                                crossOrigin="anonymous"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center text-white text-3xl font-extrabold"
                                style={{ background: "var(--brand-gradient)" }}
                              >
                                {(result.concept?.topic || "R").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          {/* Core lesson */}
                          <div className="flex-1 min-w-0 space-y-4">
                            <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-[var(--brand-solid)]">
                              Quick Take
                            </p>
                            <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                              {teachingPlain}{teachingPlain.length >= 420 ? "…" : ""}
                            </p>
                            {quote && (
                              <div className="bg-white rounded-lg p-4 italic text-sm text-[var(--text-primary)] leading-relaxed border border-[#E8E8EC] shadow-[0_8px_24px_rgba(15,23,42,.05)]">
                                “{quote}”
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    );
                  })()}

                  {/* Promised Link */}
                  <section>
                    {result.promised_link ? (
                      <PromisedLinkCTA link={result.promised_link} />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-[var(--radius-lg)] bg-[var(--bg-elevated)] border border-[var(--border-default)] shadow-sm text-center">
                        <div className="w-12 h-12 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
                          <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-base font-semibold text-[var(--text-primary)]">No link found</p>
                          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm mx-auto">No specific link was mentioned in this reel.</p>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Roadmap */}
                  {result.roadmap && (
                    <section className="space-y-6 pt-8 border-t border-[var(--border-default)]">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Roadmap</h3>
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

                {/* ── RIGHT COLUMN (Sidebar) ── */}
                <div className="md:col-span-4 space-y-8 md:sticky md:top-24 self-start mt-8 md:mt-0">
                  {/* SOURCE card */}
                  {(() => {
                    const sourceUrl = getSourceUrl(meta, result);
                    if (!sourceUrl) return null;
                    return (
                      <div className="fade-up">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1.5 h-4 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Source</p>
                        </div>
                        <div className="bg-white rounded-[18px] p-5 border border-[var(--border-default)] shadow-[0_8px_24px_rgba(15,23,42,.05)]">
                          <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--brand-solid)] transition-colors group"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <svg className="w-4 h-4 shrink-0 text-[var(--brand-solid)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                              </svg>
                              <span className="truncate">
                                {meta?.username ? `@${meta.username} on Instagram` : "View original reel"}
                              </span>
                            </span>
                            <svg className="w-4 h-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--brand-solid)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    );
                  })()}

                  {/* ABOUT THIS ANALYSIS metadata matrix */}
                  <div className="fade-up" style={{ animationDelay: "50ms" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1.5 h-4 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">About this analysis</p>
                    </div>
                    <div className="bg-white rounded-[18px] px-5 py-2 border border-[var(--border-default)] shadow-[0_8px_24px_rgba(15,23,42,.05)]">
                      {[
                        { label: "Target Audience", value: result.concept?.target_audience || "General learners" },
                        { label: "Content Type", value: "Tutorial breakdown" },
                        { label: "Read Time", value: estimateReadTime(result.roadmap) },
                        { label: "Difficulty", value: "Easy" },
                      ].map((row, i, arr) => (
                        <div
                          key={row.label}
                          className={`flex items-center justify-between gap-4 py-3.5 ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}
                        >
                          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{row.label}</span>
                          <span className="text-sm font-semibold text-[var(--text-primary)] text-right">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {downloadToken && (
                    <div className="fade-up" style={{ animationDelay: "100ms" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-4 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Download</p>
                      </div>
                      <DownloadButton token={downloadToken} />
                    </div>
                  )}

                  {result.roadmap && (
                    <div className="fade-up" style={{ animationDelay: "200ms" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-4 rounded-full" style={{ background: "var(--brand-gradient)" }} />
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">Share</p>
                      </div>
                      <CapsuleShare result={result} capsuleId={result.capsule_id} />
                    </div>
                  )}
                </div>
                
              </div>
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
