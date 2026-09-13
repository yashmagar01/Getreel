import React from "react";

interface StepCardProps {
  step: number;
  title: string;
  description: string;
  className?: string;
}

export default function StepCard({ step, title, description, className = "" }: StepCardProps) {
  return (
    <div
      className={`flex gap-4 p-5 rounded-[var(--radius-lg)] bg-[var(--bg-card)] border border-[var(--border-default)] shadow-[var(--shadow-sm)] ${className}`}
    >
      {/* Step badge */}
      <div
        className="shrink-0 w-9 h-9 rounded-[var(--radius-pill)] flex items-center justify-center text-white text-sm font-bold shadow-[var(--shadow-brand)]"
        style={{ background: "var(--brand-gradient)" }}
      >
        {step}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">{title}</p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
