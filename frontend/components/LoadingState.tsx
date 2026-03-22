"use client";

import { useEffect, useState } from "react";

const STAGE_CONFIG: Record<string, { label: string; step: number; emoji: string }> = {
  rate_limit:  { label: "Checking rate limits",                  step: 1, emoji: "🛡️" },
  cache:       { label: "Checking if we've seen this reel",      step: 2, emoji: "⚡" },
  download:    { label: "Downloading the reel from Instagram",   step: 3, emoji: "⬇️" },
  transcribe:  { label: "Transcribing audio with Whisper AI",    step: 4, emoji: "🎙️" },
  frames:      { label: "Extracting key video frames",           step: 5, emoji: "🖼️" },
  analyze:     { label: "Analyzing with Llama 4 Scout",         step: 6, emoji: "🧠" },
  link:        { label: "Hunting for the promised link",         step: 7, emoji: "🔗" },
  roadmap:     { label: "Writing your step-by-step guide",      step: 8, emoji: "📋" },
};

const TOTAL_STEPS = 8;

interface LoadingStateProps {
  currentStage: string;
}

export default function LoadingState({ currentStage }: LoadingStateProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const elapsedTimer = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);

    return () => clearInterval(elapsedTimer);
  }, []);

  const config = STAGE_CONFIG[currentStage] || { 
    label: "Waking up the pipeline...", 
    step: 0, 
    emoji: "⏳" 
  };

  const progress = Math.max(5, (config.step / TOTAL_STEPS) * 100);

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-in fade-in duration-500">
      <div className="relative bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 overflow-hidden">
        {/* Animated gradient blob */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-violet-900/20 to-indigo-900/20 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative space-y-6">
          {/* Status message */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-900/40 border border-violet-500/30 flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-violet-500/10">
              {config.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-lg truncate">
                {config.label}
              </h3>
              <p className="text-gray-400 text-sm mt-0.5">
                Stage {config.step} of {TOTAL_STEPS}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-2 w-full bg-gray-800/50 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Detailed stages list */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {Object.entries(STAGE_CONFIG).map(([key, item]) => {
              const isCompleted = item.step < config.step;
              const isCurrent = key === currentStage;
              
              return (
                <div 
                  key={key} 
                  className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
                    isCurrent ? "text-violet-400" : isCompleted ? "text-green-500/70" : "text-gray-600"
                  }`}
                >
                  <span className="shrink-0">
                    {isCompleted ? "✓" : isCurrent ? "●" : "○"}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
              );
            })}
          </div>

          {/* Cold start warning after 20 seconds */}
          {elapsed >= 20 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 flex items-start gap-3 text-amber-400/80 text-xs bg-amber-900/20 border border-amber-500/20 rounded-xl p-4">
              <span className="text-lg shrink-0">🚀</span>
              <span className="leading-relaxed">
                The server is currently waking up from its slumber. This happens on the free tier after some inactivity. Hang tight, we&apos;re almost there!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
