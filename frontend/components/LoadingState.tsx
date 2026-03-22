"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { key: "rate_limit",  label: "Checking rate limits",             step: 1 },
  { key: "cache",       label: "Checking cache",                   step: 2 },
  { key: "download",   label: "Downloading reel from Instagram",  step: 3 },
  { key: "transcribe", label: "Transcribing audio",               step: 4 },
  { key: "frames",     label: "Extracting key frames",            step: 5 },
  { key: "analyze",    label: "Analyzing with Llama 4 Scout",     step: 6 },
  { key: "link",       label: "Hunting for the promised link",    step: 7 },
  { key: "roadmap",    label: "Writing your guide",               step: 8 },
];

const QUOTES = [
  { text: "Finally decoded a reel that had 2000 comments. Got the exact link in seconds.", author: "Content creator" },
  { text: "This saved me from following 3 accounts just to get a free PDF link.", author: "Marketer" },
  { text: "The step-by-step guide it generates is actually better than what the creator promised.", author: "Student" },
  { text: "Used it on 10 reels. Found the actual resource link on 7 of them.", author: "Researcher" },
];

interface LoadingStateProps {
  currentStage: string;
  onComplete?: () => void;
}

function RadarAnimation() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto drop-shadow-[0_0_20px_rgba(139,92,246,0.4)]">
      {/* Background circles */}
      <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="1" />
      <circle cx="60" cy="60" r="37" fill="none" stroke="rgba(139,92,246,0.18)" strokeWidth="1" />
      <circle cx="60" cy="60" r="22" fill="none" stroke="rgba(139,92,246,0.25)" strokeWidth="1" />
      <circle cx="60" cy="60" r="7"  fill="rgba(139,92,246,0.4)" />

      {/* Sweep cone */}
      <g className="radar-sweep">
        <path
          d="M60,60 L60,8 A52,52 0 0,1 108,60 Z"
          fill="url(#sweepGradient)"
          opacity="0.6"
        />
        <line x1="60" y1="60" x2="60" y2="8" stroke="#8B5CF6" strokeWidth="1.5" opacity="0.9" />
      </g>

      {/* Gradient fill for sweep cone */}
      <defs>
        <radialGradient id="sweepGradient" cx="60" cy="60" r="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#8B5CF6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Teal orbiting dot */}
      <g style={{ transformOrigin: "60px 60px" }}>
        <circle
          className="orbit-dot-1"
          cx="60" cy="32"
          r="4"
          fill="#14B8A6"
          style={{ transformOrigin: "60px 60px", filter: "drop-shadow(0 0 5px #14B8A6)" }}
        />
      </g>

      {/* Amber orbiting dot */}
      <g style={{ transformOrigin: "60px 60px" }}>
        <circle
          className="orbit-dot-2"
          cx="60" cy="16"
          r="3"
          fill="#F59E0B"
          style={{ transformOrigin: "60px 60px", filter: "drop-shadow(0 0 5px #F59E0B)" }}
        />
      </g>

      {/* Cross-hairs */}
      <line x1="60" y1="8" x2="60" y2="112" stroke="rgba(139,92,246,0.12)" strokeWidth="0.5" />
      <line x1="8" y1="60" x2="112" y2="60" stroke="rgba(139,92,246,0.12)" strokeWidth="0.5" />
    </svg>
  );
}

export default function LoadingState({ currentStage, onComplete }: LoadingStateProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [completionClicked, setCompletionClicked] = useState(false);

  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;
  const progressPercent = Math.round((effectiveIndex / 8) * 100);
  const timeRemaining = Math.max(1, (8 - effectiveIndex) * 6);

  // Detect completion
  useEffect(() => {
    if (currentStage === "roadmap" || effectiveIndex === 7) {
      // Give a short delay then show complete
      const t = setTimeout(() => setIsComplete(true), 800);
      return () => clearTimeout(t);
    }
  }, [currentStage, effectiveIndex]);

  // Auto-trigger onComplete after 1500ms of showing completion state
  useEffect(() => {
    if (isComplete && !completionClicked) {
      const t = setTimeout(() => {
        setCompletionClicked(true);
        onComplete?.();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isComplete, completionClicked, onComplete]);

  // Rotate quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % QUOTES.length);
        setQuoteVisible(true);
      }, 500);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Build 3-item sliding window: [prev completed, current, next pending]
  const windowItems = [
    effectiveIndex > 0 ? STAGES[effectiveIndex - 1] : null,
    STAGES[effectiveIndex] ?? null,
    STAGES[effectiveIndex + 1] ?? null,
  ];

  const quote = QUOTES[quoteIndex];

  // ── COMPLETION STATE ───────────────────────────────────────
  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-1)] px-4">
        <div className="w-full max-w-md rounded-3xl bg-[var(--surface-2)] border border-white/10 p-8 flex flex-col items-center gap-6">
          {/* Big green checkmark */}
          <div className="scale-in w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500/60 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold text-green-400">Decode complete</h2>
            <p className="text-[var(--text-secondary)] text-sm">Your guide is ready.</p>
          </div>

          {/* 100% bar */}
          <div className="w-full space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">Progress</span>
              <span className="text-green-400 font-semibold">100%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full w-full transition-all duration-700" />
            </div>
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="text-green-400">✅</span> Roadmap generated
            </div>
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="text-green-400">✅</span> Analysis complete
            </div>
          </div>

          {/* CTA button */}
          <button
            className="w-full py-4 rounded-xl font-bold text-white text-base"
            style={{ background: "var(--gradient-cta)" }}
            onClick={() => { setCompletionClicked(true); onComplete?.(); }}
          >
            View Your Guide →
          </button>
        </div>
      </div>
    );
  }

  // ── MAIN LOADING STATE ─────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--surface-1)] px-4 overflow-y-auto py-10">
      <div className="w-full max-w-md rounded-3xl bg-[var(--surface-2)] border border-white/10 p-8 space-y-7">

        {/* Zone 1: Radar */}
        <div className="pt-2">
          <RadarAnimation />
        </div>

        {/* Zone 2: Heading + progress */}
        <div className="space-y-4">
          <div className="space-y-1 text-center">
            <h2 className="text-[26px] font-bold text-white leading-tight">Decoding your reel</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {STAGES[effectiveIndex]?.label ?? "Analyzing with AI"}...
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Progress</span>
              <span className="text-purple-400 font-semibold">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progressPercent}%`,
                  background: "linear-gradient(90deg, #7C3AED, #8B5CF6)"
                }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-1">
              <span>⚡</span>
              <span>~{timeRemaining} seconds remaining</span>
            </div>
          </div>
        </div>

        {/* Zone 3: 3-item sliding step window */}
        <div className="space-y-2">
          {windowItems.map((item, i) => {
            if (!item) return null;
            const isCompleted = i === 0;
            const isCurrent  = i === 1;
            const isPending  = i === 2;

            return (
              <div
                key={item.key}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300
                  ${isCompleted ? "bg-green-500/5 border-green-500/10" : ""}
                  ${isCurrent  ? "bg-purple-500/10 border-purple-500/30 relative overflow-hidden" : ""}
                  ${isPending  ? "bg-white/[0.02] border-white/5 opacity-50" : ""}
                `}
              >
                {isCurrent && <div className="absolute inset-0 shimmer pointer-events-none" />}

                {/* Icon */}
                <div className="relative z-10 shrink-0">
                  {isCompleted && (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="w-4 h-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  )}
                  {isPending && (
                    <div className="w-2 h-2 rounded-full bg-gray-600" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`relative z-10 text-sm truncate
                    ${isCompleted ? "text-[var(--text-muted)]" : ""}
                    ${isCurrent  ? "text-white font-semibold" : ""}
                    ${isPending  ? "text-gray-600" : ""}
                  `}
                >
                  {item.label}
                  {isCurrent ? "..." : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* Zone 4: Social proof quotes */}
        <div className="bg-white/5 rounded-xl p-4 min-h-[88px] flex flex-col justify-center">
          {quoteVisible && (
            <div className="quote-fade space-y-2">
              <p className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
                &ldquo;{quote.text}&rdquo;
              </p>
              <p className="text-xs text-purple-400/70 font-medium">— {quote.author}</p>
            </div>
          )}
        </div>

        {/* Zone 5: Status dot */}
        <div className="flex items-center justify-center gap-2 pb-1">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-[var(--text-muted)] font-medium">Live Processing</span>
        </div>

      </div>
    </div>
  );
}
