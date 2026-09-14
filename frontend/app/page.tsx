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

function extractQuote(teachingRaw: string): string | null {
  if (!teachingRaw) return null;
  const bold = teachingRaw.match(/\*\*(.+?)\*\*/);
  if (bold && bold[1].trim().length > 10) return bold[1].trim();
  const quoted = teachingRaw.match(/["“]([^"”]{10,220})["”]/);
  if (quoted) return quoted[1].trim();
  return null;
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

// ── Content-type display labels (Phase D/E: section title + sidebar) ─────────
function sectionTitleFor(contentType?: string): string {
  switch (contentType) {
    case "entertainment_commentary": return "Breakdown";
    case "pure_entertainment":       return "Quick Recap";
    default:                        return "Roadmap";
  }
}

function contentTypeLabel(contentType?: string): string {
  switch (contentType) {
    case "teaser_tutorial":          return "Tutorial breakdown";
    case "entertainment_commentary": return "Entertainment breakdown";
    case "pure_entertainment":       return "Quick recap";
    default:                         return "Tutorial breakdown";
  }
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
                            <p className="text-[11px] font-extrabold tracking-[0.2em] uppercase text-[var(--brand-solid)] flex items-center gap-1.5">
                              <span className="text-sm">💡</span> What this reel is actually teaching
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

                  {/* Roadmap / Breakdown / Quick Recap (content-type aware) */}
                  {(result.roadmap || (result.blocks?.length ?? 0) > 0) && (
                    <section className="space-y-6 pt-8 border-t border-[var(--border-default)]">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[var(--text-muted)]">{sectionTitleFor(result.content_type)}</h3>
                        <div className="h-px flex-1 bg-[var(--border-default)]" />
                      </div>
                      <RoadmapDisplay
                        roadmap={result.roadmap || ""}
                        blocks={result.blocks}
                        fromCache={result.from_cache || false}
                        skipFirst={true}
                      />
                      
                      {/* Final CTA Banner */}
                      <div className="mt-12 w-full bg-gradient-to-r from-[#FF8A73]/10 to-[#FF5D8F]/10 rounded-[24px] p-8 text-center border border-[#FF8A73]/20 shadow-sm">
                        <h4 className="text-xl font-bold text-[var(--text-primary)] mb-3">Want to discuss this further?</h4>
                        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
                          Dive deeper into this topic, explore related concepts, or get personalized suggestions.
                        </p>
                        <button className="bg-white text-[#FF5D8F] text-sm font-bold px-8 py-3 rounded-full shadow-sm hover:shadow-md transition-shadow">
                          Start Discussion
                        </button>
                      </div>
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
                        <div className="bg-white rounded-[18px] p-5 border border-[var(--border-default)] shadow-[0_8px_24px_rgba(15,23,42,.05)] flex flex-col items-center text-center space-y-4">
                          <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm border border-gray-100 flex items-center justify-center bg-[#FFE8EF]">
                             <svg className="w-6 h-6 text-[#FF5D8F]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">Instagram Reel</p>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {meta?.username ? `@${meta.username}` : "Original Creator"}
                            </p>
                          </div>
                          <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full gap-2 bg-gradient-to-r from-[#FF8A73] to-[#FF5D8F] text-white text-sm font-bold px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity shadow-[0_4px_12px_rgba(255,93,143,.2)]"
                          >
                            Open the resource
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
                        { label: "Target Audience", value: result.concept?.target_audience || "General learners", icon: <svg className="w-4 h-4 text-[#FF5D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
                        { label: "Content Type", value: contentTypeLabel(result.content_type), icon: <svg className="w-4 h-4 text-[#FF5D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg> },
                        { label: "Read Time", value: estimateReadTime(result.roadmap), icon: <svg className="w-4 h-4 text-[#FF5D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                        { label: "Difficulty", value: "Easy", icon: <svg className="w-4 h-4 text-[#FF5D8F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
                      ].map((row, i, arr) => (
                        <div
                          key={row.label}
                          className={`flex items-center gap-3 py-3.5 ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-[#FFE8EF] flex items-center justify-center shrink-0">
                            {row.icon}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{row.label}</span>
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{row.value}</span>
                          </div>
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

                  {(result.roadmap || (result.blocks?.length ?? 0) > 0) && (
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
