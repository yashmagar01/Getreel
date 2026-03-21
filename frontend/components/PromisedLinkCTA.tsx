"use client";

// components/PromisedLinkCTA.tsx
// Place above <RoadmapDisplay> in page.tsx:
//   {result.promised_link && <PromisedLinkCTA link={result.promised_link} />}

export interface PromisedLink {
  url: string;
  description: string;
  source: "caption" | "transcript" | "bio" | "bio_aggregator" | "targeted_search" | "generic_search";
  confidence: "high" | "medium" | "low";
}

const SOURCE_META: Record<
  PromisedLink["source"],
  { label: string; color: string; bg: string; border: string; heading: string }
> = {
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
  bio: {
    label: "From creator's bio",
    color: "#c4b5fd",
    bg: "rgba(124,58,237,0.1)",
    border: "rgba(124,58,237,0.3)",
    heading: "Found directly in the creator's Instagram bio.",
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
};

const CONFIDENCE_LABEL: Record<PromisedLink["confidence"], string> = {
  high:   "High confidence",
  medium: "Medium confidence",
  low:    "Low confidence",
};

export default function PromisedLinkCTA({ link }: { link: PromisedLink }) {
  const meta = SOURCE_META[link.source] ?? SOURCE_META.generic_search;

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
      `}</style>

      <div className="cta-outer">
        <div
          className="cta-card"
          style={{
            ["--cta-bg" as string]: meta.bg,
            ["--cta-border" as string]: meta.border,
            ["--cta-color" as string]: meta.color,
          }}
        >
          <div className="cta-badges">
            <span className="cta-badge">
              <span className="cta-badge-dot" />
              {meta.label}
            </span>
            <span className="cta-conf">{CONFIDENCE_LABEL[link.confidence]}</span>
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
