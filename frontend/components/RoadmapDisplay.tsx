"use client";

import { useState } from "react";

interface RoadmapDisplayProps {
  roadmap: string;
  fromCache?: boolean;
}

interface ParsedSection {
  title: string;
  content: string;
}

// Parse the 5 fixed markdown sections into an array
function parseSections(markdown: string): ParsedSection[] {
  const sectionTitles = [
    "What This Reel Is Actually Teaching",
    "What You'll Need",
    "Step-by-Step Guide",
    "Common Mistakes to Avoid",
    "Free Resources to Learn More",
  ];

  const sections: ParsedSection[] = [];

  for (let i = 0; i < sectionTitles.length; i++) {
    const title = sectionTitles[i];
    const nextTitle = sectionTitles[i + 1];

    const startMarker = `## ${title}`;
    const startIdx = markdown.indexOf(startMarker);
    if (startIdx === -1) continue;

    const contentStart = startIdx + startMarker.length;
    const endIdx = nextTitle
      ? markdown.indexOf(`## ${nextTitle}`)
      : markdown.length;

    const content = markdown
      .slice(contentStart, endIdx === -1 ? markdown.length : endIdx)
      .trim();

    sections.push({ title, content });
  }

  return sections;
}

// Parse bullet list items from markdown
function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => line.trim().startsWith("*") || line.trim().startsWith("-"))
    .map((line) => line.replace(/^[\s*\-]+/, "").trim())
    .filter(Boolean);
}

// Parse numbered steps — handles "1. **Title**: description" and "1. description" formats
function parseSteps(
  text: string
): { title: string; description: string }[] {
  const lines = text.split("\n");
  const steps: { title: string; description: string }[] = [];
  let current: { title: string; description: string } | null = null;

  for (const line of lines) {
    const matchBold = line.match(/^\d+\.\s+\*\*(.+?)\*\*[:\-]?\s*(.*)/);
    const matchPlain = line.match(/^(\d+)\.\s+(.*)/);

    if (matchBold) {
      if (current) steps.push(current);
      current = { title: matchBold[1].trim(), description: matchBold[2].trim() };
    } else if (matchPlain) {
      if (current) steps.push(current);
      current = { title: `Step ${matchPlain[1]}`, description: matchPlain[2].trim() };
    } else if (current && line.trim()) {
      current.description += " " + line.trim();
    }
  }
  if (current) steps.push(current);
  return steps;
}

// Parse resource links or plain text resources
function parseResources(text: string): { label: string; url?: string }[] {
  return text
    .split("\n")
    .filter((l) => l.trim().startsWith("*") || l.trim().startsWith("-"))
    .map((line) => {
      const clean = line.replace(/^[\s*\-]+/, "").trim();
      const linkMatch = clean.match(/\[(.+?)\]\((https?:\/\/.+?)\)/);
      if (linkMatch) return { label: linkMatch[1], url: linkMatch[2] };
      const urlInline = clean.match(/(https?:\/\/[^\s)]+)/);
      if (urlInline) {
        const label = clean.replace(urlInline[1], "").replace(/[:\-<>]/g, "").trim();
        return { label: label || urlInline[1], url: urlInline[1] };
      }
      return { label: clean };
    })
    .filter((r) => r.label);
}

// ── Section renderers ──────────────────────────────────────────────────────

function TeachingSection({ content }: { content: string }) {
  return (
    <div className="section-card teaching-card">
      <div className="section-header">
        <span className="section-icon">🎯</span>
        <h2 className="section-title">What This Reel Is Actually Teaching</h2>
      </div>
      <p className="teaching-text">{content}</p>
    </div>
  );
}

function NeedsSection({ content }: { content: string }) {
  const items = parseBullets(content);
  return (
    <div className="section-card needs-card">
      <div className="section-header">
        <span className="section-icon">🛠️</span>
        <h2 className="section-title">What You'll Need</h2>
      </div>
      <div className="needs-grid">
        {items.map((item, i) => (
          <div key={i} className="need-pill">
            <span className="need-dot" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepsSection({ content }: { content: string }) {
  const steps = parseSteps(content);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="section-card steps-card">
      <div className="section-header">
        <span className="section-icon">📋</span>
        <h2 className="section-title">Step-by-Step Guide</h2>
      </div>
      <div className="steps-list">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`step-item ${activeStep === i ? "step-active" : ""}`}
            onClick={() => setActiveStep(activeStep === i ? null : i)}
          >
            <div className="step-number">{i + 1}</div>
            <div className="step-body">
              <div className="step-title-row">
                <span className="step-title">{step.title}</span>
                <span className="step-chevron">
                  {activeStep === i ? "▲" : "▼"}
                </span>
              </div>
              {activeStep === i && step.description && (
                <p className="step-description">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MistakesSection({ content }: { content: string }) {
  const items = parseBullets(content);
  const fallback = !items.length ? [content] : items;

  return (
    <div className="section-card mistakes-card">
      <div className="section-header">
        <span className="section-icon">⚠️</span>
        <h2 className="section-title">Common Mistakes to Avoid</h2>
      </div>
      <div className="mistakes-list">
        {fallback.map((item, i) => (
          <div key={i} className="mistake-item">
            <span className="mistake-x">✕</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourcesSection({ content }: { content: string }) {
  const resources = parseResources(content);
  const fallback = !resources.length
    ? [{ label: content }]
    : resources;

  return (
    <div className="section-card resources-card">
      <div className="section-header">
        <span className="section-icon">📚</span>
        <h2 className="section-title">Free Resources to Learn More</h2>
      </div>
      <div className="resources-list">
        {fallback.map((r, i) =>
          r.url ? (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="resource-link"
            >
              <span className="resource-arrow">↗</span>
              {r.label}
            </a>
          ) : (
            <div key={i} className="resource-plain">
              <span className="resource-dot">•</span>
              {r.label}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function RoadmapDisplay({ roadmap, fromCache }: RoadmapDisplayProps) {
  const [copied, setCopied] = useState(false);
  const sections = parseSections(roadmap);

  const handleCopy = () => {
    navigator.clipboard.writeText(roadmap);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSection = (section: ParsedSection) => {
    switch (section.title) {
      case "What This Reel Is Actually Teaching":
        return <TeachingSection key={section.title} content={section.content} />;
      case "What You'll Need":
        return <NeedsSection key={section.title} content={section.content} />;
      case "Step-by-Step Guide":
        return <StepsSection key={section.title} content={section.content} />;
      case "Common Mistakes to Avoid":
        return <MistakesSection key={section.title} content={section.content} />;
      case "Free Resources to Learn More":
        return <ResourcesSection key={section.title} content={section.content} />;
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        .roadmap-wrapper {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* ── Top bar ── */
        .roadmap-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .roadmap-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: #a78bfa;
        }
        .roadmap-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #7c3aed;
          box-shadow: 0 0 6px #7c3aed;
        }
        .cache-badge {
          font-size: 11px;
          padding: 3px 10px;
          border-radius: 20px;
          background: rgba(250, 204, 21, 0.1);
          border: 1px solid rgba(250, 204, 21, 0.3);
          color: #fbbf24;
        }
        .copy-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #d1d5db;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .copy-btn:hover { background: rgba(255,255,255,0.1); }

        /* ── Section cards ── */
        .section-card {
          border-radius: 16px;
          padding: 24px 28px;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,0.06);
          transition: border-color 0.2s;
        }
        .section-card:hover { border-color: rgba(255,255,255,0.12); }

        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        .section-icon { font-size: 20px; }
        .section-title {
          font-size: 15px;
          font-weight: 600;
          margin: 0;
          letter-spacing: -0.01em;
        }

        /* Teaching */
        .teaching-card { background: rgba(124, 58, 237, 0.08); }
        .teaching-card .section-title { color: #c4b5fd; }
        .teaching-text {
          font-size: 14px;
          line-height: 1.75;
          color: #d1d5db;
          margin: 0;
        }

        /* Needs */
        .needs-card { background: rgba(16, 185, 129, 0.07); }
        .needs-card .section-title { color: #6ee7b7; }
        .needs-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .need-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #a7f3d0;
          font-size: 13px;
        }
        .need-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #10b981;
          flex-shrink: 0;
        }

        /* Steps */
        .steps-card { background: rgba(59, 130, 246, 0.07); }
        .steps-card .section-title { color: #93c5fd; }
        .steps-list { display: flex; flex-direction: column; gap: 8px; }
        .step-item {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          padding: 14px 16px;
          border-radius: 10px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.12);
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .step-item:hover, .step-active {
          background: rgba(59, 130, 246, 0.15) !important;
          border-color: rgba(59, 130, 246, 0.3) !important;
        }
        .step-number {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: rgba(59, 130, 246, 0.3);
          border: 1px solid rgba(59, 130, 246, 0.5);
          color: #93c5fd;
          font-size: 12px;
          font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .step-body { flex: 1; min-width: 0; }
        .step-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .step-title {
          font-size: 14px;
          font-weight: 500;
          color: #e2e8f0;
        }
        .step-chevron { font-size: 9px; color: #64748b; flex-shrink: 0; }
        .step-description {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.65;
          color: #94a3b8;
        }

        /* Mistakes */
        .mistakes-card { background: rgba(239, 68, 68, 0.06); }
        .mistakes-card .section-title { color: #fca5a5; }
        .mistakes-list { display: flex; flex-direction: column; gap: 8px; }
        .mistake-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: #fecaca;
          line-height: 1.6;
          padding: 10px 14px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.08);
        }
        .mistake-x {
          color: #f87171;
          font-weight: 700;
          font-size: 12px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* Resources */
        .resources-card { background: rgba(245, 158, 11, 0.06); }
        .resources-card .section-title { color: #fcd34d; }
        .resources-list { display: flex; flex-direction: column; gap: 6px; }
        .resource-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.15);
          color: #fde68a;
          font-size: 13px;
          text-decoration: none;
          transition: background 0.2s;
        }
        .resource-link:hover { background: rgba(245, 158, 11, 0.15); }
        .resource-arrow { font-size: 12px; opacity: 0.7; }
        .resource-plain {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: #fde68a;
          line-height: 1.6;
          padding: 8px 14px;
        }
        .resource-dot { flex-shrink: 0; }
      `}</style>

      <div className="roadmap-wrapper">
        <div className="roadmap-topbar">
          <div className="roadmap-label">
            <span className="roadmap-dot" />
            Your Roadmap
            {fromCache && (
              <span className="cache-badge">⚡ Instant — decoded before</span>
            )}
          </div>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "✓ Copied!" : "⧉ Copy Markdown"}
          </button>
        </div>

        {sections.length > 0
          ? sections.map(renderSection)
          : <p style={{ color: "#94a3b8", fontSize: 14 }}>Could not parse roadmap sections. Raw output below.<br /><pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12 }}>{roadmap}</pre></p>
        }
      </div>
    </>
  );
}
