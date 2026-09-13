"use client";

import { useState, useEffect } from "react";
import { getDownloadUrl } from "@/lib/api";

interface DownloadButtonProps {
  token: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ token }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

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
    const url = getDownloadUrl(token);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsDownloading(false), 2000);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const displayTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const isExpired = timeLeft === 0;

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center">
          <svg className="w-4 h-4 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-[#f4f4f5] font-medium">Reel saved</p>
          <p className="text-xs text-[#52525b]">Ready for offline viewing</p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={isDownloading || isExpired}
        className={`w-full text-sm py-2.5 rounded-lg transition-colors ${
          isExpired
            ? "bg-white/[0.03] text-[#52525b] cursor-not-allowed"
            : "bg-white/[0.06] hover:bg-white/[0.10] text-[#f4f4f5]"
        }`}
      >
        {isExpired ? "Download expired" : isDownloading ? "Preparing..." : "Download .mp4"}
      </button>

      <div className="flex items-center justify-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${isExpired ? "bg-[#ef4444]" : "bg-[#4A90D9] pulse-subtle"}`} />
        <span className={`text-[10px] ${isExpired ? "text-[#ef4444]" : "text-[#52525b]"}`}>
          {isExpired ? "Link has expired" : `Expires in ${displayTime}`}
        </span>
      </div>
    </div>
  );
};
