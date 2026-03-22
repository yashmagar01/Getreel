"use client";

import React, { useState } from "react";
import { getDownloadUrl } from "@/lib/api";

interface DownloadButtonProps {
  token: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({ token }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);
    
    // Create a hidden anchor tag and click it to trigger browser download
    const url = getDownloadUrl(token);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", ""); // Suggest a filename, though server headers usually take precedence
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Reset state after a short delay
    setTimeout(() => {
      setIsDownloading(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center gap-2 mt-6 mb-4">
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-xl border-2 
          transition-all duration-300 font-medium
          ${isDownloading 
            ? "border-gray-600 text-gray-400 cursor-not-allowed bg-gray-900/40" 
            : "border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400 active:scale-95"
          }
        `}
      >
        <span>{isDownloading ? "⌛ Preparing download..." : "⬇️ Download Reel (.mp4)"}</span>
      </button>
      <p className="text-xs text-gray-500 font-light">
        Available for 15 minutes after decoding
      </p>
    </div>
  );
};
