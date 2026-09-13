"use client";

import LoadingState from "@/components/LoadingState";
import type { ReelMeta } from "@/lib/api";

interface ReelPreviewCardProps {
  meta: ReelMeta;
  currentStage: string;
}

const CAPTION_PREVIEW_LENGTH = 140;

function truncateCaption(caption: string, maxLength: number = CAPTION_PREVIEW_LENGTH): string {
  const clean = (caption || "").trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trimEnd() + "…";
}

export default function ReelPreviewCard({ meta, currentStage }: ReelPreviewCardProps) {
  const caption = truncateCaption(meta.title);
  const handle = meta.username ? `@${meta.username}` : "Instagram reel";

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      {/* ── Instant preview card ─────────────────────────────────── */}
      <div className="flex gap-4 p-4 rounded-[var(--radius-lg)] bg-white border border-[var(--border-default)] shadow-[var(--shadow-md)]">
        {/* Vertical thumbnail (9:16) */}
        <div className="shrink-0 w-28 sm:w-32 aspect-[9/16] rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-hover)] border border-[var(--border-default)]">
          {meta.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://wsrv.nl/?url=${encodeURIComponent(meta.thumbnail_url)}&h=300`}
              alt="Thumbnail preview"
              className="w-full h-full object-cover"
              loading="eager"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-[var(--text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m0-13.875a1.125 1.125 0 011.125 1.125M18 5.625v10.125m-12-10.125v10.125"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Author + caption */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: "var(--brand-gradient)" }}
              aria-hidden
            >
              {(meta.username || meta.author_name || "R").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{handle}</p>
              {meta.author_name && (
                <p className="text-xs text-[var(--text-muted)] truncate">{meta.author_name}</p>
              )}
            </div>
          </div>

          {caption ? (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{caption}</p>
          ) : (
            <p className="text-sm text-[var(--text-muted)] italic">Caption unavailable for preview.</p>
          )}

          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-solid)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-solid)] pulse-subtle" />
            Reel found — decoding
          </span>
        </div>
      </div>

      {/* ── Live pipeline progress ───────────────────────────────── */}
      <LoadingState currentStage={currentStage} />
    </div>
  );
}
