"use client";

import { useState } from "react";
import type { ProgressEvent } from "@/lib/api";

interface CapsuleShareProps {
  result: ProgressEvent;
  capsuleId?: string;
}

const LLM_TARGETS = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    url: (prompt: string) =>
      `https://chatgpt.com/?q=${encodeURIComponent(prompt.slice(0, 4000))}`,
  },
  {
    id: "claude",
    name: "Claude",
    url: (prompt: string) =>
      `https://claude.ai/new?q=${encodeURIComponent(prompt.slice(0, 4000))}`,
  },
  {
    id: "gemini",
    name: "Gemini",
    url: (prompt: string) =>
      `https://gemini.google.com/?q=${encodeURIComponent(prompt.slice(0, 4000))}`,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    url: () => "https://chat.deepseek.com/",
  },
];

export default function CapsuleShare({ result, capsuleId }: CapsuleShareProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const topic = result.concept?.topic || "this reel";
  const transcript = result.roadmap
    ? result.roadmap.slice(0, 1500)
    : "";
  const linkUrl = result.promised_link?.url || "";

  const capsulePrompt = `I decoded an Instagram reel about "${topic}". Here is the complete analysis:

Topic: ${result.concept?.topic || "Unknown"}
${result.concept?.target_audience ? `Target Audience: ${result.concept.target_audience}` : ""}
${result.concept?.tools_mentioned?.length ? `Tools Mentioned: ${result.concept.tools_mentioned.join(", ")}` : ""}
${linkUrl ? `Promised Link: ${linkUrl}` : ""}

Roadmap:
${transcript}

I want to discuss this further and dive deeper into this topic. Can you help me understand it better and explore related concepts?`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(capsulePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-[#71717a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#52525b]">
          Share to AI
        </span>
      </div>

      <p className="text-xs text-[#71717a] leading-relaxed">
        Discuss this decoded reel with any AI assistant.
      </p>

      <div className="grid grid-cols-2 gap-2">
        {LLM_TARGETS.map((target) => (
          <a
            key={target.id}
            href={target.url(capsulePrompt)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-center py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors"
          >
            {target.name}
          </a>
        ))}
      </div>

      <button
        onClick={handleCopy}
        className="w-full text-xs py-2 rounded-lg border border-dashed border-white/[0.08] hover:bg-white/[0.04] text-[#71717a] hover:text-[#a1a1aa] transition-colors"
      >
        {copied ? "Copied!" : "Copy context as prompt"}
      </button>

      {capsuleId && (
        <button
          onClick={async () => {
            const origin = window.location.origin;
            const url = `${origin}/capsule/${capsuleId}`;
            await navigator.clipboard.writeText(url);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
          }}
          className="w-full text-xs py-2 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] text-[#52525b] hover:text-[#71717a] transition-colors"
        >
          {linkCopied ? "Link copied!" : "Copy shareable link"}
        </button>
      )}
    </div>
  );
}
