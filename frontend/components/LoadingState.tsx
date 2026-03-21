"use client";

import { useEffect, useState } from "react";

const STATUS_MESSAGES = [
  { icon: "⬇️", text: "Downloading the reel..." },
  { icon: "🎙️", text: "Transcribing what they said..." },
  { icon: "🖼️", text: "Extracting video frames..." },
  { icon: "🔍", text: "Asking Gemini what they're hiding..." },
  { icon: "✍️", text: "Generating your full roadmap..." },
];

export default function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 4000);

    const elapsedTimer = setInterval(() => {
      setElapsed((s) => s + 1);
    }, 1000);

    return () => {
      clearInterval(msgTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  const current = STATUS_MESSAGES[msgIndex];

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-in fade-in duration-500">
      <div className="relative bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-8 overflow-hidden">
        {/* Animated gradient blob */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-violet-900/20 to-indigo-900/20 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="relative space-y-6">
          {/* Status message */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-900/40 border border-violet-500/30 flex items-center justify-center text-lg shrink-0">
              {current.icon}
            </div>
            <div>
              <p
                key={msgIndex}
                className="text-white font-medium text-sm animate-in slide-in-from-left-2 duration-300"
              >
                {current.text}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">Step {msgIndex + 1} of {STATUS_MESSAGES.length}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-[4000ms] ease-linear"
                style={{ width: `${((msgIndex + 1) / STATUS_MESSAGES.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Skeleton lines */}
          <div className="space-y-3 pt-2">
            {[100, 85, 92, 70, 88].map((w, i) => (
              <div
                key={i}
                className="h-3 bg-gray-800/80 rounded-full animate-pulse"
                style={{
                  width: `${w}%`,
                  animationDelay: `${i * 120}ms`,
                }}
              />
            ))}
          </div>

          {/* Cold start warning after 20 seconds */}
          {elapsed >= 20 && (
            <div className="animate-in fade-in duration-500 flex items-start gap-2 text-amber-400/80 text-xs bg-amber-900/10 border border-amber-500/20 rounded-xl p-3">
              <span className="text-base shrink-0">⏳</span>
              <span>Taking longer than usual? Render&apos;s free server may be starting up — hang tight.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
