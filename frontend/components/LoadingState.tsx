"use client";

import ProgressBar from "@/components/ui/ProgressBar";

const STAGES = [
  { key: "rate_limit",  label: "Checking limits",        icon: "⏱" },
  { key: "cache",       label: "Checking cache",          icon: "📦" },
  { key: "download",    label: "Downloading reel",        icon: "⬇️" },
  { key: "transcribe",  label: "Transcribing audio",      icon: "🎙" },
  { key: "frames",      label: "Extracting frames",       icon: "🖼" },
  { key: "analyze",     label: "Analyzing content",       icon: "🧠" },
  { key: "classify",    label: "Identifying content type", icon: "🔍" },
  { key: "link",        label: "Finding promised link",   icon: "🔗" },
  { key: "roadmap",     label: "Writing guide",           icon: "📝" },
];

interface LoadingStateProps {
  currentStage: string;
}

export default function LoadingState({ currentStage }: LoadingStateProps) {
  const currentIndex  = STAGES.findIndex((s) => s.key === currentStage);
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;
  const progressPercent = Math.round(((effectiveIndex + 1) / STAGES.length) * 100);

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">

      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-base font-semibold text-[var(--text-primary)]">
          {STAGES[effectiveIndex]?.label ?? "Processing"}…
        </p>
        <p className="text-xs text-[var(--text-muted)]">Hang tight, this takes a few seconds</p>
      </div>

      {/* Overall progress bar */}
      <ProgressBar value={progressPercent} showLabel variant="brand" />

      {/* Stage list */}
      <div className="space-y-2">
        {STAGES.map((stage, i) => {
          const isCompleted = i < effectiveIndex;
          const isCurrent   = i === effectiveIndex;
          const isPending   = i > effectiveIndex;

          return (
            <div
              key={stage.key}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] border transition-all duration-300 ${
                isCurrent
                  ? "bg-[var(--brand-dim)] border-[var(--brand-border)]"
                  : isCompleted
                  ? "bg-white border-[var(--border-default)]"
                  : "bg-[var(--bg-elevated)] border-transparent opacity-40"
              }`}
            >
              {/* Status indicator */}
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {isCompleted && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {isCurrent && (
                  <div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent spinner"
                    style={{ borderColor: "var(--brand-solid)", borderTopColor: "transparent" }}
                  />
                )}
                {isPending && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-active)]" />
                )}
              </div>

              <span
                className={`text-xs flex-1 ${
                  isCurrent
                    ? "text-[var(--brand-solid)] font-semibold"
                    : isCompleted
                    ? "text-[var(--text-secondary)]"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {stage.label}
              </span>

              {isCurrent && (
                <span className="text-[10px] font-semibold text-[var(--brand-solid)] bg-[var(--brand-dim)] px-2 py-0.5 rounded-[var(--radius-pill)]">
                  {progressPercent}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
