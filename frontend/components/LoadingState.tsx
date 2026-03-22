"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { key: "rate_limit",  label: "Checking rate limits",             emoji: "🛡️",  step: 1 },
  { key: "cache",       label: "Checking cache",                   emoji: "⚡",  step: 2 },
  { key: "download",   label: "Downloading reel from Instagram",  emoji: "⬇️",  step: 3 },
  { key: "transcribe", label: "Transcribing audio with Whisper",  emoji: "🎙️",  step: 4 },
  { key: "frames",     label: "Extracting key video frames",      emoji: "🖼️",  step: 5 },
  { key: "analyze",    label: "Analyzing with Llama 4 Scout",     emoji: "🧠",  step: 6 },
  { key: "link",       label: "Hunting for the promised link",    emoji: "🔗",  step: 7 },
  { key: "roadmap",    label: "Writing your step-by-step guide",  emoji: "📋",  step: 8 },
];

interface LoadingStateProps {
  currentStage: string;
}

export default function LoadingState({ currentStage }: LoadingStateProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentIndex = STAGES.findIndex(s => s.key === currentStage);
  const currentInfo = STAGES[currentIndex] || STAGES[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 px-4 overflow-y-auto pt-10 pb-10">
      <div className="w-full max-w-lg space-y-12">
        
        {/* Zone 1: Top - Current Action */}
        <div className="text-center space-y-4 fade-up">
          <div className="relative inline-flex">
             <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full" />
             <div className="relative w-20 h-20 rounded-2xl bg-gray-900 border border-violet-500/30 flex items-center justify-center text-4xl shadow-2xl shadow-violet-500/20">
                <span className="animate-pulse">{currentInfo.emoji}</span>
             </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {currentInfo.label}...
            </h2>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">
              Step {currentInfo.step} of 8
            </p>
          </div>
        </div>

        {/* Zone 2: Middle - Stage Timeline */}
        <div className="space-y-3">
          {STAGES.map((stage, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isPending = idx > currentIndex;

            return (
              <div 
                key={stage.key}
                className={`
                  stage-card flex items-center gap-4 p-4 rounded-xl border transition-all duration-300
                  ${isCompleted ? "bg-green-500/5 border-green-500/20 py-3" : ""}
                  ${isCurrent ? "bg-violet-500/10 border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.1)] relative overflow-hidden" : ""}
                  ${isPending ? "bg-gray-900/40 border-white/5 opacity-40" : ""}
                `}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Shimmer for current stage */}
                {isCurrent && <div className="absolute inset-0 shimmer pointer-events-none" />}

                {/* Left side indicator */}
                <div className="relative z-10 flex shrink-0 items-center justify-center w-6 h-6">
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white scale-110">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-700" />
                  )}
                </div>

                {/* Label */}
                <div className="relative z-10 flex-1 min-w-0">
                  <span className={`
                    text-sm font-medium block truncate
                    ${isCompleted ? "text-gray-400" : ""}
                    ${isCurrent ? "text-white font-bold" : ""}
                    ${isPending ? "text-gray-600" : ""}
                  `}>
                    {stage.label}
                  </span>
                </div>

                {/* Status indicator on the right */}
                {isCurrent && (
                  <div className="relative z-10 text-[10px] font-bold text-violet-400 uppercase tracking-wider animate-pulse">
                    Working
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Zone 3: Bottom - Cold Start Warning */}
        {elapsed >= 20 && (
          <div className="fade-up flex items-start gap-3 text-amber-400/80 text-xs bg-amber-900/20 border border-amber-500/20 rounded-xl p-4 max-w-md mx-auto">
            <span className="text-lg shrink-0">🚀</span>
            <span className="leading-relaxed">
              The server is currently waking up from its slumber. This happens on the free tier after some inactivity. Hang tight!
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
