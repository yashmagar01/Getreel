"use client";

// components/PromisedLinkCTA.tsx
// Handles regular links, DM gates, and comment gates.

export interface PromisedLink {
  // Regular link result
  url?: string;
  description?: string;
  source?:
    | "caption"
    | "transcript"
    | "transcript_explicit_url"
    | "transcript_llm"
    | "bio"
    | "bio_info_dict"
    | "bio_instaloader"
    | "bio_ytdlp_profile"
    | "bio_aggregator"
    | "targeted_search"
    | "generic_search"
    | "comment_creator"
    | "comment_user";
  confidence?: "high" | "medium" | "low";

  // Gate types (Phase 2)
  type?: "dm_gate" | "comment_gate";
  keyword?: string;
  handle?: string;         // Instagram handle for DM link
  reel_url?: string;       // Original reel URL for comment link
}

// ─── Source metadata (regular links) ─────────────────────────────────────────

const SOURCE_META: Record<string, { label: string; color: string; bg: string; border: string; heading: string }> = {
  caption: {
    label: "Found in reel caption",
    color: "#6ee7b7",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.3)",
    heading: "The link was hiding in the caption all along.",
  },
  transcript: {
    label: "Creator said it out loud",
    color: "#93c5fd",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.3)",
    heading: "Creator mentioned this link verbally in the reel.",
  },
  transcript_explicit_url: {
    label: "Creator said it out loud",
    color: "#93c5fd",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.3)",
    heading: "Creator explicitly mentioned this URL in the reel.",
  },
  transcript_llm: {
    label: "Creator said it out loud",
    color: "#93c5fd",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.3)",
    heading: "Creator mentioned this link verbally in the reel.",
  },
  bio: {
    label: "From creator's bio",
    color: "#c4b5fd",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.3)",
    heading: "Found directly in the creator's Instagram bio.",
  },
  bio_info_dict: {
    label: "From creator's bio",
    color: "#c4b5fd",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.3)",
    heading: "External link found in reel metadata.",
  },
  bio_instaloader: {
    label: "From creator's bio",
    color: "#c4b5fd",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.3)",
    heading: "Found directly in the creator's Instagram bio.",
  },
  bio_ytdlp_profile: {
    label: "From creator's bio",
    color: "#c4b5fd",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.3)",
    heading: "Found in the creator's Instagram profile.",
  },
  bio_aggregator: {
    label: "Via creator's link-in-bio",
    color: "#c4b5fd",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.3)",
    heading: "Best match from the creator's link-in-bio page.",
  },
  targeted_search: {
    label: "Targeted search match",
    color: "#fcd34d",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    heading: "Best match found by searching for this creator and topic.",
  },
  generic_search: {
    label: "General search result",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.2)",
    heading: "Best publicly available resource for this topic.",
  },
  comment_creator: {
    label: "Found in creator's comment",
    color: "#6ee7b7",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.3)",
    heading: "Creator posted this link in the comments.",
  },
  comment_user: {
    label: "Found in a comment",
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.2)",
    heading: "A user shared this link in the comments.",
  },
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high:   "High confidence",
  medium: "Medium confidence",
  low:    "Low confidence",
};

// ─── Gate card (dm_gate / comment_gate) ──────────────────────────────────────

function GateCard({ link }: { link: PromisedLink }) {
  const isDm = link.type === "dm_gate";
  const color       = isDm ? "#fbbf24" : "#67e8f9";
  const bg          = isDm ? "rgba(245,158,11,0.08)" : "rgba(6,182,212,0.08)";
  const border      = isDm ? "rgba(245,158,11,0.3)"  : "rgba(6,182,212,0.3)";
  const badgeLabel  = isDm ? "DM gated"              : "Comment gated";
  const heading     = isDm
    ? "Link is DM-gated"
    : "Link is delivered via comment reply";
  const body        = isDm
    ? "This creator uses automated DM responses. To receive the link, DM them the keyword below:"
    : "Comment the keyword below on the reel to receive an automatic reply with the link:";
  const btnText     = isDm ? "Open Instagram DMs" : "Open Reel on Instagram";
  const btnHref     = isDm
    ? (link.handle
        ? `https://www.instagram.com/direct/t/${link.handle}`
        : "https://www.instagram.com/direct/inbox")
    : (link.reel_url || "https://www.instagram.com");
  const btnEmoji    = isDm ? "✉️" : "💬";

  return (
    <>
      <style>{`
        .gate-outer {
          width: 100%;
          max-width: 760px;
          margin: 0 auto 20px;
        }
        .gate-card {
          border-radius: 16px;
          padding: 22px 26px 20px;
          border: 1px solid var(--gate-border);
          background: var(--gate-bg);
          position: relative;
          overflow: hidden;
        }
        .gate-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .gate-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid var(--gate-border);
          color: var(--gate-color);
          background: transparent;
        }
        .gate-badge-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: currentColor;
        }
        .gate-heading {
          font-size: 15px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }
        .gate-body {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0 0 14px;
        }
        .gate-keyword-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }
        .gate-keyword {
          display: inline-block;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--gate-color);
          background: var(--gate-bg);
          border: 2px solid var(--gate-border);
          border-radius: 12px;
          padding: 10px 28px;
          text-transform: uppercase;
          font-family: monospace;
          text-align: center;
        }
        .gate-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 13px 18px;
          border-radius: 10px;
          background: linear-gradient(135deg, #d97706, #b45309);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          border: none;
          letter-spacing: -0.01em;
          box-sizing: border-box;
        }
        .gate-btn.comment-btn {
          background: linear-gradient(135deg, #0891b2, #0e7490);
        }
        .gate-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .gate-btn:active { transform: translateY(0); }
        .gate-arrow { margin-left: auto; opacity: 0.6; font-size: 13px; }
        @media (max-width: 480px) {
          .gate-card { padding: 16px 16px 14px; }
          .gate-keyword { font-size: 18px; padding: 8px 20px; }
        }
      `}</style>

      <div className="gate-outer">
        <div
          className="gate-card"
          style={{
            ["--gate-bg" as string]:     bg,
            ["--gate-border" as string]: border,
            ["--gate-color" as string]:  color,
          }}
        >
          <div className="gate-badges">
            <span className="gate-badge">
              <span className="gate-badge-dot" />
              {badgeLabel}
            </span>
          </div>

          <h3 className="gate-heading">{heading}</h3>
          <p className="gate-body">{body}</p>

          <div className="gate-keyword-wrap">
            <span className="gate-keyword">{link.keyword}</span>
          </div>

          <a
            href={btnHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`gate-btn ${isDm ? "" : "comment-btn"}`}
          >
            <span>{btnEmoji}</span>
            {btnText}
            <span className="gate-arrow">↗</span>
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Regular link card ────────────────────────────────────────────────────────

export default function PromisedLinkCTA({ link }: { link: PromisedLink }) {
  // Route gate types to GateCard
  if (link.type === "dm_gate" || link.type === "comment_gate") {
    return <GateCard link={link} />;
  }

  const meta = SOURCE_META[link.source ?? "generic_search"] ?? SOURCE_META.generic_search;
  const confidenceLabel = CONFIDENCE_LABEL[link.confidence ?? "low"];

  return (
    <>
      <style>{`
        .cta-outer {
          width: 100%;
          max-width: 760px;
          margin: 0 auto 20px;
        }
        .cta-card {
          border-radius: 16px;
          padding: 22px 26px 20px;
          border: 1px solid var(--cta-border);
          background: var(--cta-bg);
          position: relative;
          overflow: hidden;
        }
        .cta-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .cta-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 20px;
          border: 1px solid;
          color: var(--cta-color);
          border-color: var(--cta-border);
          background: transparent;
        }
        .cta-badge-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: currentColor;
        }
        .cta-conf {
          font-size: 11px;
          color: #64748b;
          padding: 3px 8px;
          border-radius: 20px;
          border: 1px solid rgba(100,116,139,0.2);
        }
        .cta-heading {
          font-size: 15px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }
        .cta-desc {
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0 0 16px;
        }
        .cta-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 13px 18px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          border: none;
          letter-spacing: -0.01em;
          box-sizing: border-box;
        }
        .cta-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .cta-btn:active { transform: translateY(0); }
        .cta-arrow { margin-left: auto; opacity: 0.6; font-size: 13px; }
        .cta-url {
          margin-top: 9px;
          font-size: 11px;
          color: #475569;
          text-align: center;
          font-family: monospace;
          word-break: break-all;
        }
        @media (max-width: 480px) {
          .cta-card { padding: 16px 16px 14px; }
        }
      `}</style>

      <div className="cta-outer">
        <div
          className="cta-card"
          style={{
            ["--cta-bg" as string]:     meta.bg,
            ["--cta-border" as string]: meta.border,
            ["--cta-color" as string]:  meta.color,
          }}
        >
          <div className="cta-badges">
            <span className="cta-badge">
              <span className="cta-badge-dot" />
              {meta.label}
            </span>
            <span className="cta-conf">{confidenceLabel}</span>
          </div>

          <h3 className="cta-heading">{meta.heading}</h3>

          {link.description && (
            <p className="cta-desc">{link.description}</p>
          )}

          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cta-btn"
          >
            <span>🔗</span>
            Open the resource
            <span className="cta-arrow">↗</span>
          </a>

          <p className="cta-url">{link.url}</p>
        </div>
      </div>
    </>
  );
}
