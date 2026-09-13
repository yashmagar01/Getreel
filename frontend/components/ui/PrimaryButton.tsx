import React from "react";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "gradient" | "outline" | "ghost";
  className?: string;
  id?: string;
}

const sizeMap = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export default function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  size = "md",
  variant = "gradient",
  className = "",
  id,
}: PrimaryButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-pill)] transition-all duration-200 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-solid)] focus-visible:ring-offset-2";

  const variants = {
    gradient:
      "bg-[image:var(--brand-gradient)] text-white shadow-[var(--shadow-brand)] hover:opacity-90 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
    outline:
      "bg-transparent border border-[var(--brand-border)] text-[var(--brand-solid)] hover:bg-[var(--brand-dim)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
    ghost:
      "bg-transparent text-[var(--brand-solid)] hover:bg-[var(--brand-dim)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
  };

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizeMap[size]} ${className}`}
    >
      {loading && (
        <svg
          className="w-4 h-4 spinner shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
