"use client";

interface SidebarProps {
  activeSection: string;
  onSelect: (section: string) => void;
  topic?: string;
}

const NAV_ITEMS = [
  { key: "overview",   icon: "🎯", label: "Overview"         },
  { key: "steps",      icon: "📋", label: "Step-by-Step"     },
  { key: "tools",      icon: "🛠️", label: "Tools & Resources" },
  { key: "mistakes",   icon: "⚠️", label: "Mistakes"         },
  { key: "link",       icon: "🔗", label: "The Link"         },
  { key: "download",   icon: "⬇️", label: "Download"         },
];

export default function Sidebar({ activeSection, onSelect, topic }: SidebarProps) {
  return (
    <>
      {/* ── DESKTOP sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto border-r border-white/10 bg-[var(--surface-2)] pt-6 pb-8 px-3">
        {topic && (
          <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-semibold px-3 mb-4 line-clamp-2 leading-relaxed">
            {topic}
          </p>
        )}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left w-full
                  ${isActive
                    ? "bg-[var(--accent-purple-dim)] border-l-2 border-l-purple-500 text-white pl-[10px]"
                    : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-white border-l-2 border-l-transparent"
                  }
                `}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── MOBILE horizontal tab bar ───────────────────── */}
      <div className="md:hidden flex overflow-x-auto scrollbar-hide bg-[var(--surface-2)] border-b border-white/10 px-2 py-2 gap-1 sticky top-14 z-30">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0
                ${isActive
                  ? "bg-[var(--accent-purple-dim)] text-white border border-purple-500/40"
                  : "text-[var(--text-secondary)] hover:bg-white/5"
                }
              `}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
