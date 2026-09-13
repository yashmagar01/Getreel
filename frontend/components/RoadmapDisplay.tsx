"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";

interface RoadmapDisplayProps {
  roadmap: string;
  fromCache?: boolean;
  skipFirst?: boolean;
  singleSection?: string;
}

interface ParsedSection {
  title: string;
  content: string;
}

const SECTION_TITLES = [
  "What This Reel Is Actually Teaching",
  "What You'll Need",
  "Step-by-Step Guide",
  "Common Mistakes to Avoid",
  "Free Resources to Learn More",
];

function parseSections(markdown: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  for (let i = 0; i < SECTION_TITLES.length; i++) {
    const title     = SECTION_TITLES[i];
    const nextTitle = SECTION_TITLES[i + 1];
    const startMarker = `## ${title}`;
    const startIdx    = markdown.indexOf(startMarker);
    if (startIdx === -1) continue;
    const contentStart = startIdx + startMarker.length;
    const endIdx       = nextTitle ? markdown.indexOf(`## ${nextTitle}`) : markdown.length;
    const content      = markdown.slice(contentStart, endIdx === -1 ? markdown.length : endIdx).trim();
    sections.push({ title, content });
  }
  return sections;
}

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => l.trim().startsWith("*") || l.trim().startsWith("-"))
    .map((l) => l.replace(/^[\s*\-]+/, "").trim())
    .filter(Boolean);
}

function parseSteps(text: string): { title: string; description: string }[] {
  const lines = text.split("\n");
  const steps: { title: string; description: string }[] = [];
  let current: { title: string; description: string } | null = null;
  for (const line of lines) {
    const matchBold  = line.match(/^\d+\.\s+\*\*(.+?)\*\*[:\-]?\s*(.*)/);
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

function parseResources(text: string): { label: string; url?: string }[] {
  return text
    .split("\n")
    .filter((l) => l.trim().startsWith("*") || l.trim().startsWith("-"))
    .map((line) => {
      const clean = line.replace(/^[\s*\-]+/, "").trim();
      const linkMatch = clean.match(/\[(.+?)\]\((https?:\/\/.+?)\)/);
      if (linkMatch) return { label: linkMatch[1], url: linkMatch[2] };
      return { label: clean };
    })
    .filter((r) => r.label);
}

// ── Section card wrapper ───────────────────────────────────────────────────────
function SectionCard({ title, accentColor, children, delay }: {
  title: string;
  accentColor?: string;
  children: React.ReactNode;
  delay: string;
}) {
  return (
    <div className="fade-up" style={{ animationDelay: delay }}>
      <Card variant="default" padding="md">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-1 h-4 rounded-[var(--radius-pill)] shrink-0"
              style={{ background: accentColor || "var(--brand-gradient)" }}
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          </div>
          {children}
        </div>
      </Card>
    </div>
  );
}

// ── Sub-sections ───────────────────────────────────────────────────────────────
function TeachingSection({ content, delay }: { content: string; delay: string }) {
  return (
    <SectionCard title="What This Reel Is Actually Teaching" delay={delay}>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{content}</p>
    </SectionCard>
  );
}

function NeedsSection({ content, delay }: { content: string; delay: string }) {
  const items = parseBullets(content);
  return (
    <SectionCard title="What You'll Need" delay={delay}>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="text-xs px-3 py-1.5 rounded-[var(--radius-pill)] bg-[var(--brand-dim)] border border-[var(--brand-border)] text-[var(--brand-solid)] font-medium"
          >
            {item}
          </span>
        ))}
      </div>
    </SectionCard>
  );
}

function StepsSection({ content, delay }: { content: string; delay: string }) {
  const steps = parseSteps(content);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  return (
    <SectionCard title="Step-by-Step Guide" delay={delay}>
      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`rounded-[var(--radius-md)] border transition-all duration-200 cursor-pointer ${
              activeStep === i
                ? "bg-[var(--brand-dim)] border-[var(--brand-border)]"
                : "bg-[var(--bg-elevated)] border-[var(--border-default)] hover:border-[var(--border-hover)]"
            }`}
            onClick={() => setActiveStep(activeStep === i ? null : i)}
          >
            <div className="flex items-center gap-3 p-3">
              {/* Step number badge */}
              <div
                className="shrink-0 w-6 h-6 rounded-[var(--radius-pill)] flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: "var(--brand-gradient)" }}
              >
                {i + 1}
              </div>
              <span className="flex-1 text-sm text-[var(--text-primary)] font-medium">{step.title}</span>
              <svg
                className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${activeStep === i ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {activeStep === i && step.description && (
              <div className="px-12 pb-3 text-xs text-[var(--text-secondary)] leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-200">
                {step.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function MistakesSection({ content, delay }: { content: string; delay: string }) {
  const items = parseBullets(content);
  return (
    <SectionCard title="Common Mistakes to Avoid" delay={delay}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
            <span className="text-[var(--accent-red)] shrink-0 mt-0.5 font-bold">✕</span>
            {item}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ResourcesSection({ content, delay }: { content: string; delay: string }) {
  const resources = parseResources(content);
  return (
    <SectionCard title="Free Resources to Learn More" delay={delay}>
      <div className="space-y-1.5">
        {resources.map((r, i) =>
          r.url ? (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] hover:bg-[var(--brand-dim)] border border-[var(--border-default)] hover:border-[var(--brand-border)] text-sm text-[var(--text-secondary)] hover:text-[var(--brand-solid)] transition-all group"
            >
              <span className="truncate">{r.label}</span>
              <svg
                className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--brand-solid)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <div key={i} className="p-2.5 text-sm text-[var(--text-muted)]">{r.label}</div>
          )
        )}
      </div>
    </SectionCard>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function RoadmapDisplay({ roadmap, fromCache, skipFirst, singleSection }: RoadmapDisplayProps) {
  const sections = parseSections(roadmap);

  const renderSection = (section: ParsedSection, index: number) => {
    const delay = `${index * 100}ms`;
    if (singleSection && section.title !== singleSection) return null;
    if (skipFirst && section.title === "What This Reel Is Actually Teaching") return null;
    switch (section.title) {
      case "What This Reel Is Actually Teaching": return <TeachingSection key={section.title} content={section.content} delay={delay} />;
      case "What You'll Need":                    return <NeedsSection    key={section.title} content={section.content} delay={delay} />;
      case "Step-by-Step Guide":                  return <StepsSection    key={section.title} content={section.content} delay={delay} />;
      case "Common Mistakes to Avoid":            return <MistakesSection key={section.title} content={section.content} delay={delay} />;
      case "Free Resources to Learn More":        return <ResourcesSection key={section.title} content={section.content} delay={delay} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {fromCache && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Cached result
        </div>
      )}
      {sections.length > 0
        ? sections.map((s, i) => renderSection(s, i))
        : <pre className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">{roadmap}</pre>
      }
    </div>
  );
}
