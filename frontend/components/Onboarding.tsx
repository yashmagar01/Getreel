"use client";

import { useEffect, useState } from "react";
import StepCard from "@/components/ui/StepCard";
import PrimaryButton from "@/components/ui/PrimaryButton";

const STEPS = [
  {
    step: 1,
    title: "Paste your link",
    description: "Drop in any Instagram Reel or YouTube URL — we'll detect the platform automatically.",
  },
  {
    step: 2,
    title: "We decode or download",
    description: "For Reels, AI extracts the roadmap, promised links, and hidden resources. For YouTube, choose quality and download instantly.",
  },
  {
    step: 3,
    title: "Save or share",
    description: "Download the video, copy the AI-ready context, or share a permanent link with anyone.",
  },
];

const STORAGE_KEY = "gr-onboarded";

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide]     = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const isLast = slide === STEPS.length - 1;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={dismiss}
    >
      {/* Modal */}
      <div
        className="w-full max-w-sm bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-[var(--brand-solid)]">
              Welcome to GetReel
            </p>
            <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">
              How it works
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors p-1"
            aria-label="Close onboarding"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step card */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" key={slide}>
          <StepCard
            step={STEPS[slide].step}
            title={STEPS[slide].title}
            description={STEPS[slide].description}
          />
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`rounded-full transition-all duration-200 ${
                i === slide
                  ? "w-6 h-2"
                  : "w-2 h-2 opacity-30 hover:opacity-60"
              }`}
              style={{ background: "var(--brand-gradient)" }}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {!isLast && (
            <button
              onClick={dismiss}
              className="flex-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors py-2"
            >
              Skip
            </button>
          )}
          <PrimaryButton
            onClick={() => {
              if (isLast) { dismiss(); } else { setSlide((s) => s + 1); }
            }}
            className={isLast ? "w-full justify-center" : "flex-2 justify-center"}
          >
            {isLast ? "Get Started" : "Next"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
