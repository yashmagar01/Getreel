"use client";

import React from "react";
import ProgressBar from "./ProgressBar";

export type MediaStatus = "queued" | "downloading" | "done" | "failed";

interface MediaListRowProps {
  title: string;
  subtitle?: string;
  thumbnailSrc?: string;
  status: MediaStatus;
  progress?: number; // 0–100, used when status === "downloading"
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

function ThumbnailPlaceholder() {
  return (
    <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--bg-hover)] flex items-center justify-center shrink-0">
      <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.283.659-.734.659-1.205v-9.768c0-.47-.252-.922-.659-1.205a11.136 11.136 0 00-6.181 0c-.407.283-.659.735-.659 1.205v9.768c0 .47.252.921.659 1.205a11.136 11.136 0 006.181 0z" />
      </svg>
    </div>
  );
}

function TrailingElement({
  status,
  progress = 0,
  onAction,
  actionLabel,
}: Pick<MediaListRowProps, "status" | "progress" | "onAction" | "actionLabel">) {
  if (status === "downloading") {
    return (
      <div className="w-24 shrink-0">
        <ProgressBar value={progress} showLabel height="thin" />
      </div>
    );
  }

  if (status === "done") {
    return (
      <button
        onClick={onAction}
        title={actionLabel || "Download"}
        className="shrink-0 w-8 h-8 rounded-[var(--radius-pill)] flex items-center justify-center bg-[var(--brand-dim)] text-[var(--brand-solid)] hover:bg-[var(--brand-border)] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </button>
    );
  }

  if (status === "failed") {
    return (
      <span className="shrink-0 text-[11px] text-[var(--accent-red)] font-medium">Failed</span>
    );
  }

  // queued
  return (
    <span className="shrink-0 text-[11px] text-[var(--text-muted)]">Queued</span>
  );
}

export default function MediaListRow({
  title,
  subtitle,
  thumbnailSrc,
  status,
  progress = 0,
  onAction,
  actionLabel,
  className = "",
}: MediaListRowProps) {
  const isActive = status === "downloading";

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-[var(--radius-md)] border transition-all duration-200 ${
        isActive
          ? "bg-[var(--brand-dim)] border-[var(--brand-border)]"
          : "bg-[var(--bg-card)] border-[var(--border-default)]"
      } ${className}`}
    >
      {/* Thumbnail */}
      {thumbnailSrc ? (
        <img
          src={thumbnailSrc}
          alt=""
          className="w-12 h-12 rounded-[var(--radius-md)] object-cover shrink-0"
        />
      ) : (
        <ThumbnailPlaceholder />
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{title}</p>
        {subtitle && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {/* Trailing */}
      <TrailingElement
        status={status}
        progress={progress}
        onAction={onAction}
        actionLabel={actionLabel}
      />
    </div>
  );
}
