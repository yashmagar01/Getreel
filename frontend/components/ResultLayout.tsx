"use client";

import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/StatCard";
import RoadmapDisplay from "@/components/RoadmapDisplay";
import PromisedLinkCTA, { PromisedLink } from "@/components/PromisedLinkCTA";
import { DownloadButton } from "@/components/DownloadButton";

interface Concept {
  topic?: string;
  what_creator_withholds?: string;
  target_audience?: string;
  tools_mentioned?: string[];
}

interface ResultLayoutProps {
  activeSection: string;
  setActiveSection: (s: string) => void;
  roadmap: string;
  fromCache: boolean;
  concept?: Concept;
  promisedLink?: PromisedLink | null;
  downloadToken?: string | null;
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ concept, promisedLink, downloadToken }: {
  concept?: Concept;
  promisedLink?: PromisedLink | null;
  downloadToken?: string | null;
}) {
  const toolCount = concept?.tools_mentioned?.length ?? 0;
  const topic = concept?.topic ?? "AI-generated guide";

  return (
    <div className="space-y-6 fade-up">
      {/* Zone A: 3 stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="🎯" value={toolCount > 0 ? "AI + Free" : "AI"} label="Topic Type" accentColor="text-purple-400" />
        <StatCard icon="🛠️" value={toolCount > 0 ? `${toolCount} tools` : "—"} label="Tools Needed" accentColor="text-teal-400" />
        <StatCard icon="⏱️" value="~15 min" label="To Implement" accentColor="text-amber-400" />
      </div>

      {/* Zone B: Hero card */}
      <div className="rounded-2xl p-6 relative overflow-hidden border border-purple-500/20"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(99,102,241,0.15))" }}>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.15),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <p className="text-[11px] font-bold text-purple-400 uppercase tracking-widest">
            What This Reel Is Actually Teaching
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-white leading-snug">{topic}</h2>
          {concept?.what_creator_withholds && (
            <div className="space-y-1">
              <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">What they hid from you:</p>
              <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">{concept.what_creator_withholds}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {concept?.target_audience && (
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
                👥 {concept.target_audience}
              </span>
            )}
            {concept?.tools_mentioned?.[0] && (
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
                🛠️ {concept.tools_mentioned[0]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Zone C: Link + Download side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {promisedLink ? (
          <PromisedLinkCTA link={promisedLink} />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--surface-3)] border border-dashed border-white/10 text-[var(--text-muted)] text-center gap-2 min-h-[140px]">
            <span className="text-2xl opacity-30">🔗</span>
            <p className="text-sm">No specific link found in this reel.</p>
          </div>
        )}

        {downloadToken ? (
          <DownloadButton token={downloadToken} />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--surface-3)] border border-white/5 text-[var(--text-muted)] text-center min-h-[140px]">
            <p className="text-xs italic leading-relaxed">Video processing unavailable for this reel format.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab section wrapper ───────────────────────────────────────────────────────

function TabContent({ activeSection, roadmap, fromCache, concept, promisedLink, downloadToken }: Omit<ResultLayoutProps, "setActiveSection">) {
  switch (activeSection) {
    case "overview":
      return <OverviewTab concept={concept} promisedLink={promisedLink} downloadToken={downloadToken} />;

    case "steps":
      return (
        <div className="fade-up">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📋</span> Step-by-Step Guide
          </h2>
          <RoadmapDisplay roadmap={roadmap} fromCache={fromCache} skipFirst={false} singleSection="Step-by-Step Guide" />
        </div>
      );

    case "tools":
      return (
        <div className="fade-up">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🛠️</span> Tools & Resources
          </h2>
          <RoadmapDisplay roadmap={roadmap} fromCache={fromCache} skipFirst={false} singleSection="What You'll Need" />
          <div className="mt-4">
            <RoadmapDisplay roadmap={roadmap} fromCache={fromCache} skipFirst={false} singleSection="Free Resources to Learn More" />
          </div>
        </div>
      );

    case "mistakes":
      return (
        <div className="fade-up">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>⚠️</span> Common Mistakes to Avoid
          </h2>
          <RoadmapDisplay roadmap={roadmap} fromCache={fromCache} skipFirst={false} singleSection="Common Mistakes to Avoid" />
        </div>
      );

    case "link":
      return (
        <div className="fade-up max-w-xl mx-auto">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔗</span> The Promised Link
          </h2>
          {promisedLink ? (
            <PromisedLinkCTA link={promisedLink} />
          ) : (
            <div className="flex flex-col items-center justify-center p-10 rounded-2xl bg-[var(--surface-3)] border border-dashed border-white/10 text-[var(--text-muted)] text-center gap-3">
              <span className="text-4xl opacity-20">🔗</span>
              <p className="text-sm">No direct link was discovered in this reel.</p>
              <p className="text-xs">Try checking the creator&apos;s bio or looking in the comments.</p>
            </div>
          )}
        </div>
      );

    case "download":
      return (
        <div className="fade-up max-w-sm mx-auto">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>⬇️</span> Download Reel
          </h2>
          {downloadToken ? (
            <DownloadButton token={downloadToken} />
          ) : (
            <div className="flex flex-col items-center justify-center p-10 rounded-2xl bg-[var(--surface-3)] border border-white/5 text-[var(--text-muted)] text-center gap-3">
              <p className="text-xs italic leading-relaxed">Video processing unavailable for this reel format.</p>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}

// ── Main ResultLayout ─────────────────────────────────────────────────────────

export default function ResultLayout({
  activeSection,
  setActiveSection,
  roadmap,
  fromCache,
  concept,
  promisedLink,
  downloadToken,
}: ResultLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        topic={concept?.topic}
      />

      {/* Mobile tab bar is rendered inside Sidebar, so main shifts down on mobile */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Mobile: extra top spacing for the tab bar (44px) */}
        <div className="px-4 md:px-8 py-6 md:py-8 max-w-4xl">
          <TabContent
            activeSection={activeSection}
            roadmap={roadmap}
            fromCache={fromCache}
            concept={concept}
            promisedLink={promisedLink}
            downloadToken={downloadToken}
          />
        </div>
      </main>
    </div>
  );
}
