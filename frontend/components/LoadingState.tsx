"use client";

const STAGES = [
  { key: "rate_limit",  label: "Checking limits" },
  { key: "cache",       label: "Checking cache" },
  { key: "download",    label: "Downloading reel" },
  { key: "transcribe",  label: "Transcribing audio" },
  { key: "frames",      label: "Extracting frames" },
  { key: "analyze",     label: "Analyzing content" },
  { key: "link",        label: "Finding promised link" },
  { key: "roadmap",     label: "Writing guide" },
];

interface LoadingStateProps {
  currentStage: string;
}

export default function LoadingState({ currentStage }: LoadingStateProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;
  const progressPercent = Math.round(((effectiveIndex + 1) / STAGES.length) * 100);

  return (
    <div className="w-full max-w-sm mx-auto space-y-8">
      <div className="flex justify-center">
        <svg width="64" height="64" viewBox="0 0 64 64" className="text-[#4A90D9]">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-10" />
          <circle
            cx="32" cy="32" r="28"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeDasharray={`${(progressPercent / 100) * 176} 176`}
            strokeLinecap="round"
            className="transition-all duration-700"
            transform="rotate(-90 32 32)"
          />
          <circle cx="32" cy="32" r="4" fill="currentColor" className="opacity-30" />
          <circle cx="32" cy="14" r="3" fill="currentColor" className="spinner" />
        </svg>
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm text-[#a1a1aa]">
          {STAGES[effectiveIndex]?.label ?? "Processing"}...
        </p>
        <p className="text-xs text-[#52525b]">{progressPercent}%</p>
      </div>

      <div className="space-y-1.5">
        {STAGES.map((stage, i) => {
          const isCompleted = i < effectiveIndex;
          const isCurrent = i === effectiveIndex;
          const isPending = i > effectiveIndex;
          return (
            <div
              key={stage.key}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                isCurrent ? "bg-white/[0.04]" : ""
              } ${isPending ? "opacity-30" : ""}`}
            >
              <div className="w-4 h-4 flex items-center justify-center shrink-0">
                {isCompleted && (
                  <svg className="w-3.5 h-3.5 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isCurrent && (
                  <div className="w-3 h-3 rounded-full border-2 border-[#4A90D9] border-t-transparent spinner" />
                )}
                {isPending && <div className="w-1.5 h-1.5 rounded-full bg-[#3f3f46]" />}
              </div>
              <span className={`text-xs ${isCurrent ? "text-[#f4f4f5] font-medium" : "text-[#71717a]"}`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
