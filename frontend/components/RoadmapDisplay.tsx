"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface RoadmapDisplayProps {
  roadmap: string;
  fromCache: boolean;
}

export default function RoadmapDisplay({ roadmap, fromCache }: RoadmapDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roadmap);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const el = document.createElement("textarea");
      el.value = roadmap;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.4)] animate-pulse" />
          <span className="text-white font-semibold text-sm">Your Roadmap</span>

          {fromCache && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
              ⚡ Instant — decoded before
            </span>
          )}
        </div>

        <button
          id="copy-roadmap-button"
          onClick={handleCopy}
          className={`
            flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200
            ${copied
              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
              : "bg-gray-800 border border-white/10 text-gray-400 hover:text-white hover:border-white/20"
            }
          `}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Markdown
            </>
          )}
        </button>
      </div>

      {/* Roadmap content */}
      <div className="bg-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8">
        <div className="prose prose-invert prose-sm max-w-none
          prose-headings:text-white prose-headings:font-bold
          prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
          prose-h2:pb-2 prose-h2:border-b prose-h2:border-white/10
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-li:text-gray-300 prose-li:marker:text-violet-400
          prose-strong:text-white
          prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
          prose-code:text-violet-300 prose-code:bg-violet-900/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-ol:space-y-1 prose-ul:space-y-1
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {roadmap}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
