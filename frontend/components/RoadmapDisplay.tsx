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

// Parse numbered steps
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

// ── Section renderers ──────────────────────────────────────────────────────

function SectionWrapper({ 
  title, 
  emoji, 
  children, 
  borderColor, 
  bgColor,
  delay
}: { 
  title: string; 
  emoji: string; 
  children: React.ReactNode; 
  borderColor: string;
  bgColor: string;
  delay: string;
}) {
  return (
    <div 
      className={`fade-up w-full p-6 mb-6 rounded-2xl border border-white/5 border-l-4 ${borderColor} ${bgColor} backdrop-blur-sm`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl shrink-0">{emoji}</span>
        <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function TeachingSection({ content, delay }: { content: string; delay: string }) {
  return (
    <SectionWrapper title="What This Reel Is Actually Teaching" emoji="🎯" borderColor="border-l-purple-500" bgColor="bg-purple-500/5" delay={delay}>
      <p className="text-gray-300 leading-relaxed text-sm md:text-base">{content}</p>
    </SectionWrapper>
  );
}

function NeedsSection({ content, delay }: { content: string; delay: string }) {
  const items = parseBullets(content);
  return (
    <SectionWrapper title="What You'll Need" emoji="🛠️" borderColor="border-l-emerald-500" bgColor="bg-emerald-500/5" delay={delay}>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <div key={i} className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium">
            {item}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

function StepsSection({ content, delay }: { content: string; delay: string }) {
  const steps = parseSteps(content);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <SectionWrapper title="Step-by-Step Guide" emoji="📋" borderColor="border-l-blue-500" bgColor="bg-blue-500/5" delay={delay}>
      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`group rounded-xl border border-white/5 transition-all duration-200 cursor-pointer ${
              activeStep === i ? "bg-blue-950/30 border-blue-500/30" : "bg-white/5 hover:bg-white/10"
            }`}
            onClick={() => setActiveStep(activeStep === i ? null : i)}
          >
            <div className="flex items-center gap-4 p-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                activeStep === i ? "bg-blue-500 text-white border-blue-400" : "bg-gray-800 text-gray-400 border-white/5"
              }`}>
                {i + 1}
              </div>
              <div className="flex-1 font-medium text-gray-200 text-sm">{step.title}</div>
              <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${activeStep === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {activeStep === i && (
              <div className="px-16 pb-4 text-sm text-gray-400 leading-relaxed animate-in fade-in slide-in-from-top-1">
                {step.description}
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

function MistakesSection({ content, delay }: { content: string; delay: string }) {
  const items = parseBullets(content);
  return (
    <SectionWrapper title="Common Mistakes to Avoid" emoji="⚠️" borderColor="border-l-red-500" bgColor="bg-red-500/5" delay={delay}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-red-500/5 text-red-200 text-sm leading-relaxed">
            <span className="text-red-500 font-bold shrink-0">✕</span>
            {item}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

function ResourcesSection({ content, delay }: { content: string; delay: string }) {
  const resources = parseResources(content);
  return (
    <SectionWrapper title="Free Resources to Learn More" emoji="📚" borderColor="border-l-amber-500" bgColor="bg-amber-500/5" delay={delay}>
      <div className="grid gap-2">
        {resources.map((r, i) => (
          r.url ? (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/15 text-amber-200 text-sm transition-all group"
            >
              <span>{r.label}</span>
              <svg className="w-4 h-4 opacity-50 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <div key={i} className="p-3 rounded-lg bg-gray-800/40 text-gray-400 text-sm">
              {r.label}
            </div>
          )
        ))}
      </div>
    </SectionWrapper>
  );
}

export default function RoadmapDisplay({ roadmap, fromCache, skipFirst, singleSection }: RoadmapDisplayProps) {
  const sections = parseSections(roadmap);

  const renderSection = (section: ParsedSection, index: number) => {
    // Determine delay for fade-up (index * 80ms)
    const delay = `${index * 80}ms`;

    // If singleSection is specified, only render that section
    if (singleSection && section.title !== singleSection) return null;

    if (skipFirst && section.title === "What This Reel Is Actually Teaching") return null;

    switch (section.title) {
      case "What This Reel Is Actually Teaching":
        return <TeachingSection key={section.title} content={section.content} delay={delay} />;
      case "What You'll Need":
        return <NeedsSection key={section.title} content={section.content} delay={delay} />;
      case "Step-by-Step Guide":
        return <StepsSection key={section.title} content={section.content} delay={delay} />;
      case "Common Mistakes to Avoid":
        return <MistakesSection key={section.title} content={section.content} delay={delay} />;
      case "Free Resources to Learn More":
        return <ResourcesSection key={section.title} content={section.content} delay={delay} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {sections.length > 0 ? (
        sections.map((section, idx) => renderSection(section, idx))
      ) : (
        <div className="p-6 rounded-2xl bg-gray-900 border border-white/10 text-gray-500 text-sm">
          Could not parse roadmap sections. Raw output below:
          <pre className="mt-4 p-4 rounded bg-black/40 overflow-x-auto text-[10px] sm:text-xs text-gray-500 whitespace-pre-wrap">
            {roadmap}
          </pre>
        </div>
      )}
    </div>
  );
}
