"use client";

import { useState, useEffect } from "react";
import { getDownloadUrl } from "@/lib/api";
import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";

interface DownloadButtonProps {
  token: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ token }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [timeLeft, setTimeLeft]           = useState(15 * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = () => {
    if (timeLeft === 0) return;
    setIsDownloading(true);
    const url  = getDownloadUrl(token);
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsDownloading(false), 2000);
  };

  const minutes    = Math.floor(timeLeft / 60);
  const seconds    = timeLeft % 60;
  const displayTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const isExpired  = timeLeft === 0;
  // Expiry progress bar: starts full and drains
  const expiryPct = Math.round((timeLeft / (15 * 60)) * 100);

  return (
    <Card variant="default" padding="md">
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[var(--radius-pill)] flex items-center justify-center shadow-[var(--shadow-brand)]"
            style={{ background: isExpired ? "var(--bg-hover)" : "var(--brand-gradient)" }}
          >
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Reel saved</p>
            <p className="text-xs text-[var(--text-muted)]">Ready for offline viewing</p>
          </div>
        </div>

        {/* Expiry countdown bar */}
        <div>
          <div className="w-full h-1.5 rounded-[var(--radius-pill)] bg-[var(--border-default)] overflow-hidden">
            <div
              className="h-full rounded-[var(--radius-pill)] transition-all duration-1000 ease-linear"
              style={{
                width: `${expiryPct}%`,
                background: isExpired ? "var(--accent-red)" : "var(--brand-gradient)",
              }}
            />
          </div>
          <p className={`text-[10px] mt-1 text-right ${isExpired ? "text-[var(--accent-red)]" : "text-[var(--text-muted)]"}`}>
            {isExpired ? "Link has expired" : `Expires in ${displayTime}`}
          </p>
        </div>

        {/* CTA */}
        <PrimaryButton
          onClick={handleDownload}
          disabled={isDownloading || isExpired}
          loading={isDownloading}
          className="w-full justify-center"
          variant={isExpired ? "outline" : "gradient"}
        >
          {isExpired ? "Download expired" : isDownloading ? "Preparing…" : "Download .mp4"}
        </PrimaryButton>
      </div>
    </Card>
  );
};
