import React from "react";

interface ProgressBarProps {
  value: number; // 0–100
  showLabel?: boolean;
  variant?: "brand" | "neutral";
  height?: "thin" | "default";
  className?: string;
}

export default function ProgressBar({
  value,
  showLabel = false,
  variant = "brand",
  height = "default",
  className = "",
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const trackH = height === "thin" ? "h-1.5" : "h-2";
  const fillBg =
    variant === "brand"
      ? "bg-[image:var(--brand-gradient)]"
      : "bg-[var(--accent-info)]";

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full ${trackH} rounded-[var(--radius-pill)] bg-black/[0.06] overflow-hidden`}>
        <div
          className={`h-full rounded-[var(--radius-pill)] ${fillBg} transition-all duration-700 ease-out`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <p className="text-right text-[11px] text-[var(--text-muted)] mt-1 tabular-nums">
          {clamped}%
        </p>
      )}
    </div>
  );
}
