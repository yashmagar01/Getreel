"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  accent?: "purple" | "teal" | "green" | "red" | "amber" | "none";
  padding?: "sm" | "md" | "lg";
}

const ACCENT_CLASSES: Record<string, string> = {
  purple: "border-l-4 border-l-purple-500",
  teal:   "border-l-4 border-l-teal-500",
  green:  "border-l-4 border-l-green-500",
  red:    "border-l-4 border-l-red-500",
  amber:  "border-l-4 border-l-amber-500",
  none:   "",
};

const PADDING_CLASSES: Record<string, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export default function Card({ children, className = "", accent = "none", padding = "md" }: CardProps) {
  const accentClass = ACCENT_CLASSES[accent] ?? "";
  const paddingClass = PADDING_CLASSES[padding] ?? "p-6";

  return (
    <div
      className={`
        rounded-2xl border border-white/10 bg-[var(--surface-2)] backdrop-blur-sm
        ${accentClass} ${paddingClass} ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}
