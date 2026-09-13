import React from "react";

interface Platform {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    label: "Instagram",
    color: "#E1306C",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-6 h-6">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" strokeWidth={2.5} />
      </svg>
    ),
  },
  {
    id: "youtube",
    label: "YouTube",
    color: "#FF0000",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M23.498 6.186a2.994 2.994 0 0 0-2.108-2.12C19.527 3.6 12 3.6 12 3.6s-7.527 0-9.39.466A2.994 2.994 0 0 0 .502 6.186 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .502 5.814 2.994 2.994 0 0 0 2.108 2.12C4.473 20.4 12 20.4 12 20.4s7.527 0 9.39-.466a2.994 2.994 0 0 0 2.108-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
];

interface PlatformIconGridProps {
  activePlatform?: string | null;
  className?: string;
}

export default function PlatformIconGrid({ activePlatform, className = "" }: PlatformIconGridProps) {
  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      {PLATFORMS.map((p) => {
        const isActive = activePlatform === p.id;
        return (
          <div key={p.id} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center transition-all duration-200 shadow-[var(--shadow-sm)] ${
                isActive
                  ? "scale-110 shadow-[var(--shadow-md)]"
                  : "opacity-70 hover:opacity-100 hover:shadow-[var(--shadow-md)]"
              }`}
              style={{
                backgroundColor: isActive ? `${p.color}15` : "var(--bg-card)",
                color: p.color,
                border: isActive ? `1.5px solid ${p.color}40` : "1px solid var(--border-default)",
              }}
              title={p.label}
              aria-label={p.label}
            >
              {p.icon}
            </div>
            <span
              className="text-[11px] font-medium"
              style={{ color: isActive ? p.color : "var(--text-muted)" }}
            >
              {p.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
