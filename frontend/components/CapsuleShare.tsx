"use client";

import { useState } from "react";
import type { ProgressEvent } from "@/lib/api";
import Card from "@/components/ui/Card";
import PrimaryButton from "@/components/ui/PrimaryButton";

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
  const [copied, setCopied]         = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const topic      = result.concept?.topic || "this reel";
  const transcript = result.roadmap ? result.roadmap.slice(0, 1500) : "";
  const linkUrl    = result.promised_link?.url || "";

  const isFailed = topic.toLowerCase().includes("could not extract") || topic === "Unknown" || topic === "this reel";

  const capsulePrompt = isFailed
    ? `I tried to decode an Instagram reel, but the tool couldn't extract enough information. Here is the response I got:

Analysis:
${transcript}
${linkUrl ? `\nThe creator also linked to: ${linkUrl}` : ""}

Can you help me figure out what this reel might have been about, or what details I should look for to understand it better?`
    : `I decoded an Instagram reel about "${topic}". Here is the complete analysis:

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
    <Card variant="default" padding="md">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-[var(--radius-pill)] flex items-center justify-center"
            style={{ background: "var(--brand-gradient)" }}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            Share to AI
          </span>
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Discuss this decoded reel with any AI assistant.
        </p>

        {/* LLM buttons grid */}
        <div className="grid grid-cols-2 gap-2">
          {LLM_TARGETS.map((target) => (
            <a
              key={target.id}
              href={target.url(capsulePrompt)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-center py-2 px-3 rounded-[var(--radius-md)] border border-[var(--brand-border)] text-[var(--brand-solid)] hover:bg-[var(--brand-dim)] transition-colors font-medium"
            >
              {target.name}
            </a>
          ))}
        </div>

        {/* Copy prompt */}
        <PrimaryButton
          onClick={handleCopy}
          variant="ghost"
          size="sm"
          className="w-full justify-center text-xs"
        >
          {copied ? "✓ Copied!" : "Copy context as prompt"}
        </PrimaryButton>

        {/* Shareable link */}
        {capsuleId && (
          <button
            onClick={async () => {
              const origin = window.location.origin;
              const url    = `${origin}/capsule/${capsuleId}`;
              await navigator.clipboard.writeText(url);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 2000);
            }}
            className="w-full text-xs py-2 rounded-[var(--radius-md)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {linkCopied ? "✓ Link copied!" : "Copy shareable link"}
          </button>
        )}
      </div>
    </Card>
  );
}
