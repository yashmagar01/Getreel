import React from "react";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "brand-tinted";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

const paddingMap = {
  none: "",
  sm:   "p-3",
  md:   "p-5",
  lg:   "p-6",
};

export default function Card({
  children,
  variant = "default",
  padding = "md",
  className = "",
  style,
}: CardProps) {
  const base = "rounded-[var(--radius-lg)] border transition-shadow";

  const variantStyles: Record<NonNullable<CardProps["variant"]>, string> = {
    "default":      "bg-[var(--bg-card)] border-[var(--border-default)] shadow-[var(--shadow-sm)]",
    "elevated":     "bg-[var(--bg-card)] border-[var(--border-default)] shadow-[var(--shadow-md)]",
    "brand-tinted": "bg-[var(--brand-dim)] border-[var(--brand-border)]",
  };

  return (
    <div
      className={`${base} ${variantStyles[variant]} ${paddingMap[padding]} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
