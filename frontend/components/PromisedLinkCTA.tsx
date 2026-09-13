"use client";

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
  if (link.type === "dm_gate" || link.type === "comment_gate") {
    const isDm = link.type === "dm_gate";
    return (
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#71717a] bg-white/[0.04] px-2 py-1 rounded">
            {isDm ? "DM Gated" : "Comment Gated"}
          </span>
        </div>
        <p className="text-sm text-[#a1a1aa] leading-relaxed">
          {isDm
            ? "This creator uses automated DMs. Send them this keyword:"
            : "Comment this keyword on the reel to get the link:"}
        </p>
        <div className="text-center">
          <span className="inline-block text-lg font-mono font-bold tracking-widest text-[#f4f4f5] bg-white/[0.04] border border-white/[0.08] rounded-lg px-5 py-2">
            {link.keyword}
          </span>
        </div>
        <a
          href={isDm ? `https://www.instagram.com/direct/inbox` : (link.reel_url || "https://www.instagram.com")}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center text-sm py-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-[#f4f4f5] transition-colors"
        >
          {isDm ? "Open Instagram DMs" : "Open Reel"}
        </a>
      </div>
    );
  }

  const sourceLabel = SOURCE_LABELS[link.source ?? ""] || "Unknown";
  const confidenceLabel = link.confidence === "high" ? "High" : link.confidence === "medium" ? "Medium" : "Low";

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-5 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#71717a] bg-white/[0.04] px-2 py-1 rounded">
          {sourceLabel}
        </span>
        <span className={`text-[10px] font-medium px-2 py-1 rounded ${
          link.confidence === "high" ? "text-[#22c55e] bg-[#22c55e]/[0.08]" :
          link.confidence === "medium" ? "text-[#f59e0b] bg-[#f59e0b]/[0.08]" :
          "text-[#71717a] bg-white/[0.04]"
        }`}>
          {confidenceLabel}
        </span>
      </div>

      {link.description && (
        <p className="text-sm text-[#a1a1aa] leading-relaxed">{link.description}</p>
      )}

      {link.url && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full text-sm py-2.5 px-4 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] text-[#f4f4f5] transition-colors group"
        >
          <span className="truncate font-medium">Open the resource</span>
          <svg className="w-3.5 h-3.5 text-[#52525b] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}

      {link.url && (
        <p className="text-[10px] text-[#3f3f46] font-mono truncate">{link.url}</p>
      )}
    </div>
  );
}
