"use client";

import React, { useState, useEffect } from "react";
import { getDownloadUrl } from "@/lib/api";

interface DownloadButtonProps {
  token: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ token }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
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
    <div className="fade-up w-full bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-xl" style={{ animationDelay: '200ms' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l-4 4m0 0l-4-4m4 4V4M10 18h4a2 2 0 012 2v2H8v-2a2 2 0 012-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-semibold">Reel saved</h3>
          <p className="text-gray-500 text-xs">Ready for offline viewing</p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={isDownloading || isExpired}
        className={`
          w-full py-4 rounded-xl font-bold transition-all duration-300 shadow-lg
          ${isExpired 
            ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5" 
            : isDownloading
              ? "bg-blue-900/40 text-blue-300 border border-blue-500/20"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 hover:scale-[1.02] active:scale-95 shadow-blue-900/20"
          }
        `}
      >
        <span>
          {isExpired ? "Download expired" : isDownloading ? "Preparing..." : "Download .mp4"}
        </span>
      </button>

      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] sm:text-xs">
        <div className={`w-1.5 h-1.5 rounded-full ${isExpired ? "bg-red-500" : "bg-blue-500 animate-pulse"}`} />
        <span className={isExpired ? "text-red-400" : "text-gray-400"}>
          {isExpired ? "Link has expired" : `Expires in ${displayTime}`}
        </span>
      </div>
    </div>
  );
};
