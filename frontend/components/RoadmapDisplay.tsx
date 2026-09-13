"use client";

import React from "react";
import Card from "@/components/ui/Card";

// ── Markdown Formatter ────────────────────────────────────────────────────────
function RichText({ text }: { text: string }) {
  if (!text) return null;
  
  // Split by code blocks (```language ... ```)
  const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
  const blocks = text.split(codeBlockRegex);

  return (
    <>
      {blocks.map((block, index) => {
        // Odd indices are the captured code blocks
        if (index % 2 === 1) {
          return (
            <div key={index} className="my-3 bg-[#111113] border border-white/10 rounded-md p-3 overflow-x-auto text-xs font-mono text-[#a1a1aa] shadow-inner">
              <pre>{block.trim()}</pre>
            </div>
          );
        }

        // Even indices are normal text
        const lines = block.split('\n');
        return (
          <React.Fragment key={index}>
            {lines.map((line, lineIdx) => {
              const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.+?\]\(https?:\/\/.+?\))/g);
              const lineContent = parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={i} className="text-[var(--text-primary)] font-semibold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                  return <em key={i}>{part.slice(1, -1)}</em>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                  return <code key={i} className="bg-[var(--bg-elevated)] border border-[var(--border-default)] px-1.5 py-0.5 rounded text-xs text-[var(--text-primary)]">{part.slice(1, -1)}</code>;
                }
                const linkMatch = part.match(/^\[(.+?)\]\((https?:\/\/.+?)\)$/);
                if (linkMatch) {
                  return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-solid)] hover:underline">{linkMatch[1]}</a>;
                }
                return <span key={i}>{part}</span>;
              });
              
              return (
                <React.Fragment key={lineIdx}>
                  {lineContent}
                  {lineIdx < lines.length - 1 && <br />}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

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
  const rawSections = markdown.split(/(?:^|\n)##\s+/).filter(Boolean);
  const sections: ParsedSection[] = [];
  
  for (const section of rawSections) {
     if (!section.trim() || section.toLowerCase().startsWith("roadmap")) continue;
     const lines = section.split('\n');
     const rawTitle = lines[0].trim();
     const content = lines.slice(1).join('\n').trim();
     
     if (!content) continue;
     
     const titleLower = rawTitle.toLowerCase().replace(/[^a-z]/g, '');
     let mappedTitle = rawTitle;
     
     if (titleLower.includes('teaching')) mappedTitle = "What This Reel Is Actually Teaching";
     else if (titleLower.includes('need')) mappedTitle = "What You'll Need";
     else if (titleLower.includes('step')) mappedTitle = "Step-by-Step Guide";
     else if (titleLower.includes('mistake')) mappedTitle = "Common Mistakes to Avoid";
     else if (titleLower.includes('resource') || titleLower.includes('free')) mappedTitle = "Free Resources to Learn More";

     sections.push({ title: mappedTitle, content });
  }
  return sections;
}

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => {
      const trimmed = l.trim();
      // Ignore horizontal rules like --- or ***
      if (/^[\*\-]{3,}$/.test(trimmed)) return false;
      return trimmed.startsWith("*") || trimmed.startsWith("-");
    })
    .map((l) => l.replace(/^[\s]*[\*\-]\s*/, "").trim())
    .filter(Boolean);
}

function parseSteps(text: string): { title: string; description: string }[] {
  const lines = text.split("\n");
  const steps: { title: string; description: string }[] = [];
  let current: { title: string; description: string } | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[\*\-]{3,}$/.test(trimmed)) continue; // ignore horizontal rules

    const matchHeader = line.match(/^###\s+(?:Step\s*\d*[:\-]?\s*)?(.*)/i);
    const matchBold  = line.match(/^\d+\.\s+\*\*(.+?)\*\*[:\-]?\s*(.*)/);
    const matchPlain = line.match(/^(\d+)\.\s+(.*)/);
    const matchBulletBold = line.match(/^[\*\-]\s+\*\*(.+?)\*\*[:\-]?\s*(.*)/);

    if (matchHeader) {
      if (current) steps.push(current);
      current = { title: matchHeader[1].trim(), description: "" };
    } else if (matchBold) {
      if (current) steps.push(current);
      current = { title: matchBold[1].trim(), description: matchBold[2].trim() };
    } else if (matchBulletBold) {
      if (current) steps.push(current);
      current = { title: matchBulletBold[1].trim(), description: matchBulletBold[2].trim() };
    } else if (matchPlain) {
      if (current) steps.push(current);
      
      let desc = matchPlain[2].trim();
      let title = "";
      
      const colonIdx = desc.indexOf(':');
      const dotIdx = desc.indexOf('.');
      
      if (colonIdx > 0 && colonIdx < 50) {
        title = desc.slice(0, colonIdx).trim();
        desc = desc.slice(colonIdx + 1).trim();
      } else if (dotIdx > 0 && dotIdx < 50) {
        title = desc.slice(0, dotIdx).trim();
        desc = desc.slice(dotIdx + 1).trim();
      } else {
        if (desc.length < 60) {
          title = desc;
          desc = "";
        } else {
          const words = desc.split(' ');
          title = words.slice(0, 5).join(' ') + '...';
        }
      }
      current = { title: title.replace(/\*\*/g, '').replace(/\*/g, ''), description: desc };
    } else if (current && line.trim()) {
      current.description += "\n" + line.trim();
    } else if (!current && line.trim()) {
      // Prevent dropping text if the AI starts dumping text before formatting a step
      current = { title: "Overview", description: line.trim() };
    }
  }
  if (current) steps.push(current);
  return steps;
}

function parseResources(text: string): { label: string; url?: string }[] {
  return text
    .split("\n")
    .filter((l) => {
      const trimmed = l.trim();
      // Ignore horizontal rules like --- or ***
      if (/^[\*\-]{3,}$/.test(trimmed)) return false;
      return trimmed.startsWith("*") || trimmed.startsWith("-");
    })
    .map((line) => {
      // Strip only the leading bullet markup, not formatting asterisks
      const clean = line.replace(/^[\s]*[\*\-]\s*/, "").trim();
      let label = "";
      let url = "";
      
      const linkMatch = clean.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
      if (linkMatch) {
         const matchedLabel = linkMatch[1];
         url = linkMatch[2];
         
         // Extract any descriptive text placed before the link
         const remainder = clean.replace(linkMatch[0], "").replace(/\*\*/g, "").replace(/[:\-]+\s*$/, "").trim();
         
         if (matchedLabel.startsWith("http") && remainder.length > 3) {
             label = remainder;
         } else {
             label = matchedLabel.replace(/\*\*/g, "");
             if (remainder && !matchedLabel.startsWith("http")) {
                 label = remainder + " " + label;
             }
         }
      } else {
          const bareUrlMatch = clean.match(/(https?:\/\/[^\s\*]+)/);
          if (bareUrlMatch) {
              url = bareUrlMatch[1];
              label = clean.replace(url, "").replace(/\*\*/g, "").replace(/[:\-]+\s*$/, "").trim();
              if (!label) label = url;
          } else {
              label = clean.replace(/\*\*/g, "").trim();
          }
      }
      
      // Final cleanup of stray syntax
      label = label.replace(/\*/g, "").replace(/^[\:\-]\s*/, "").replace(/[\:\-]\s*$/, "").trim();
      return url ? { label, url } : { label };
    })
    .filter((r) => r.label);
}

// ── Section card wrapper (Premium dashboard style) ────────────────────────────
function SectionCard({ title, accentColor, children, delay }: {
  title: string;
  accentColor?: string;
  children: React.ReactNode;
  delay: string;
}) {
  return (
    <div className="fade-up" style={{ animationDelay: delay }}>
      <Card variant="default" padding="none" className="bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)] rounded-[18px] p-6 border border-[var(--border-default)]">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-1 h-5 rounded-full shrink-0"
              style={{ background: accentColor || "linear-gradient(to right, #FF8A73, #FF5D8F)" }}
            />
            <h3 className="text-sm font-extrabold tracking-wide text-[var(--text-primary)]">{title}</h3>
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
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        <RichText text={content} />
      </p>
    </SectionCard>
  );
}

function NeedsSection({ content, delay }: { content: string; delay: string }) {
  const items = parseBullets(content);
  if (items.length === 0) {
    return (
      <SectionCard title="What You'll Need" delay={delay}>
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed overflow-x-auto">
          <RichText text={content} />
        </div>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="What You'll Need" delay={delay}>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="text-xs px-3 py-1.5 rounded-[var(--radius-pill)] bg-[var(--brand-dim)] border border-[var(--brand-border)] text-[var(--brand-solid)] font-medium"
          >
            <RichText text={item} />
          </span>
        ))}
      </div>
    </SectionCard>
  );
}

function StepsSection({ content, delay }: { content: string; delay: string }) {
  const steps = parseSteps(content);

  if (steps.length === 0) {
    return (
      <SectionCard title="Step-by-Step Guide" delay={delay}>
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
          <RichText text={content} />
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="fade-up" style={{ animationDelay: delay }}>
      <div className="flex items-center gap-2.5 mb-6">
        <div
          className="w-1 h-5 rounded-full shrink-0"
          style={{ background: "linear-gradient(to right, #FF8A73, #FF5D8F)" }}
        />
        <h3 className="text-sm font-extrabold tracking-wide text-[var(--text-primary)]">Step-by-Step Guide</h3>
      </div>
      {/* Vertical timeline — always expanded, no accordion state */}
      <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pb-4">
        {steps.map((step, i) => (
          <div key={i} className="relative">
            {/* Indicator sitting on the line */}
                        <div className="absolute -left-[17px] top-4 w-8 h-8 rounded-full bg-gradient-to-r from-[#FF8A73] to-[#FF5D8F] border-4 border-white shadow-[0_8px_24px_rgba(15,23,42,.05)] flex items-center justify-center text-white text-xs font-bold">
              {i + 1}
            </div>
            {/* Step body card */}
            <div className="bg-white shadow-[0_8px_24px_rgba(15,23,42,.05)] rounded-[18px] p-6 ml-8 border border-[var(--border-default)]">
              <p className="text-[15px] font-bold text-[var(--text-primary)] leading-snug mb-1.5">
                <RichText text={step.title} />
              </p>
              {step.description && (
                <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  <RichText text={step.description} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MistakesSection({ content, delay }: { content: string; delay: string }) {
  const items = parseBullets(content);
  if (items.length === 0) {
    return (
      <SectionCard title="Common Mistakes to Avoid" delay={delay}>
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
          <RichText text={content} />
        </div>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Common Mistakes to Avoid" delay={delay}>
      <div className="bg-[#FFE8EF] rounded-[20px] p-6">
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
              <span className="text-[#FF5D8F] shrink-0 mt-0.5 font-extrabold">✕</span>
              <div><RichText text={item} /></div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function ResourcesSection({ content, delay }: { content: string; delay: string }) {
  const resources = parseResources(content);
  if (resources.length === 0) {
    return (
      <SectionCard title="Free Resources to Learn More" delay={delay}>
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
          <RichText text={content} />
        </div>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="Free Resources to Learn More" delay={delay}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {resources.map((r, i) =>
          r.url ? (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 p-4 rounded-[14px] bg-[var(--bg-elevated)] hover:bg-white border border-transparent hover:border-[var(--brand-border)] hover:shadow-[0_8px_24px_rgba(15,23,42,.05)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all group"
            >
              <span className="truncate font-medium">{r.label}</span>
              <svg
                className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-solid)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0 ml-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <div key={i} className="p-4 text-sm text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-[14px]">{r.label}</div>
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
        : (
            <SectionCard title="Analysis" delay="0ms">
              <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                <RichText text={roadmap} />
              </div>
            </SectionCard>
          )
      }
    </div>
  );
}
