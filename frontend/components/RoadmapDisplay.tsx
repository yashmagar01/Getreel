"use client";

import { useState } from "react";

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
    const title = SECTION_TITLES[i];
    const nextTitle = SECTION_TITLES[i + 1];
    const startMarker = `## ${title}`;
    const startIdx = markdown.indexOf(startMarker);
    if (startIdx === -1) continue;
    const contentStart = startIdx + startMarker.length;
    const endIdx = nextTitle ? markdown.indexOf(`## ${nextTitle}`) : markdown.length;
    const content = markdown.slice(contentStart, endIdx === -1 ? markdown.length : endIdx).trim();
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

function SectionCard({ title, children, delay }: { title: string; children: React.ReactNode; delay: string }) {
  return (
    <div className="fade-up rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-3" style={{ animationDelay: delay }}>
      <h3 className="text-sm font-medium text-[#f4f4f5]">{title}</h3>
      {children}
    </div>
  );
}

function TeachingSection({ content, delay }: { content: string; delay: string }) {
  return (
    <SectionCard title="What This Reel Is Actually Teaching" delay={delay}>
      <p className="text-sm text-[#a1a1aa] leading-relaxed">{content}</p>
    </SectionCard>
  );
}

function NeedsSection({ content, delay }: { content: string; delay: string }) {
  const items = parseBullets(content);
  return (
    <SectionCard title="What You'll Need" delay={delay}>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[#a1a1aa]">
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
            className={`rounded-lg border transition-all duration-200 cursor-pointer ${
              activeStep === i ? "bg-white/[0.04] border-white/[0.10]" : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.03]"
            }`}
            onClick={() => setActiveStep(activeStep === i ? null : i)}
          >
            <div className="flex items-center gap-3 p-3">
              <span className="text-xs font-mono text-[#52525b] w-5">{i + 1}</span>
              <span className="flex-1 text-sm text-[#d4d4d8]">{step.title}</span>
              <svg className={`w-3 h-3 text-[#52525b] transition-transform ${activeStep === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {activeStep === i && step.description && (
              <div className="px-11 pb-3 text-xs text-[#71717a] leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300">
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
          <div key={i} className="flex gap-2 text-sm text-[#a1a1aa] leading-relaxed">
            <span className="text-[#ef4444] shrink-0 mt-0.5">&#10005;</span>
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
              className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] text-sm text-[#a1a1aa] transition-colors group"
            >
              <span>{r.label}</span>
              <svg className="w-3 h-3 text-[#52525b] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <div key={i} className="p-2.5 text-sm text-[#52525b]">{r.label}</div>
          )
        )}
      </div>
    </SectionCard>
  );
}

export default function RoadmapDisplay({ roadmap, fromCache, skipFirst, singleSection }: RoadmapDisplayProps) {
  const sections = parseSections(roadmap);
  const renderSection = (section: ParsedSection, index: number) => {
    const delay = `${index * 100}ms`;
    if (singleSection && section.title !== singleSection) return null;
    if (skipFirst && section.title === "What This Reel Is Actually Teaching") return null;
    switch (section.title) {
      case "What This Reel Is Actually Teaching": return <TeachingSection key={section.title} content={section.content} delay={delay} />;
      case "What You'll Need": return <NeedsSection key={section.title} content={section.content} delay={delay} />;
      case "Step-by-Step Guide": return <StepsSection key={section.title} content={section.content} delay={delay} />;
      case "Common Mistakes to Avoid": return <MistakesSection key={section.title} content={section.content} delay={delay} />;
      case "Free Resources to Learn More": return <ResourcesSection key={section.title} content={section.content} delay={delay} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {fromCache && (
        <div className="flex items-center gap-2 text-xs text-[#52525b]">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Cached result
        </div>
      )}
      {sections.length > 0 ? sections.map((s, i) => renderSection(s, i)) : (
        <pre className="text-xs text-[#52525b] whitespace-pre-wrap">{roadmap}</pre>
      )}
    </div>
  );
}
