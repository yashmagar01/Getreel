"use client";

import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";

export interface PromisedLink {
  url?: string;
  description?: string;
  source?: string;
  confidence?: "high" | "medium" | "low";
  type?: "dm_gate" | "comment_gate";
  keyword?: string;
  handle?: string;
  reel_url?: string;
  winner_layer?: string;
  label?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  caption: "Caption",
  transcript: "Transcript",
  transcript_explicit_url: "Transcript",
  transcript_llm: "Transcript",
  bio: "Bio",
  bio_info_dict: "Bio",
  bio_instaloader: "Bio",
  bio_ytdlp_profile: "Bio",
  bio_aggregator: "Bio",
  targeted_search: "Search",
  generic_search: "Search",
  comment_creator: "Comment",
  comment_user: "Comment",
  dm_bot: "DM Bot",
  youtube_crossref: "YouTube",
  wayback_bio: "Archive",
};

export default function PromisedLinkCTA({ link }: { link: PromisedLink }) {
  // ── Gated flows ──────────────────────────────────────────────────────────
  if (link.type === "dm_gate" || link.type === "comment_gate") {
    const isDm = link.type === "dm_gate";
    return (
      <Card variant="brand-tinted" padding="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--brand-solid)] bg-[var(--brand-dim)] border border-[var(--brand-border)] px-2.5 py-1 rounded-[var(--radius-pill)]"
            >
              {isDm ? "DM Gated" : "Comment Gated"}
            </span>
          </div>

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {isDm
              ? "This creator uses automated DMs. Send them this keyword:"
              : "Comment this keyword on the reel to get the link:"}
          </p>

          <div className="text-center">
            <span className="inline-block text-lg font-mono font-bold tracking-widest text-[var(--brand-solid)] bg-white border border-[var(--brand-border)] rounded-[var(--radius-md)] px-6 py-2.5 shadow-[var(--shadow-sm)]">
              {link.keyword}
            </span>
          </div>

          <PrimaryButton
            onClick={() => {
              window.open(
                isDm
                  ? "https://www.instagram.com/direct/inbox"
                  : link.reel_url || "https://www.instagram.com",
                "_blank",
                "noopener,noreferrer"
              );
            }}
            className="w-full justify-center"
          >
            {isDm ? "Open Instagram DMs" : "Open Reel"}
          </PrimaryButton>
        </div>
      </Card>
    );
  }

  // ── Normal link ───────────────────────────────────────────────────────────
  const sourceLabel = SOURCE_LABELS[link.source ?? ""] || "Unknown";
  const confidenceLabel =
    link.confidence === "high" ? "High"
    : link.confidence === "medium" ? "Medium"
    : "Low";

  return (
    <Card variant="default" padding="md">
      <div className="space-y-4">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--text-muted)] bg-[var(--bg-hover)] px-2.5 py-1 rounded-[var(--radius-pill)]">
            {sourceLabel}
          </span>
          <span
            className={`text-[10px] font-semibold px-2.5 py-1 rounded-[var(--radius-pill)] ${
              link.confidence === "high"
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : link.confidence === "medium"
                ? "text-amber-700 bg-amber-50 border border-amber-200"
                : "text-[var(--text-muted)] bg-[var(--bg-hover)]"
            }`}
          >
            {confidenceLabel} confidence
          </span>
        </div>

        {link.description && (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{link.description}</p>
        )}

        {link.url && (
          <>
            <PrimaryButton
              onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
              className="w-full justify-center"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open the resource
            </PrimaryButton>
            <p className="text-[10px] text-[var(--text-muted)] font-mono truncate">{link.url}</p>
          </>
        )}
      </div>
    </Card>
  );
}
