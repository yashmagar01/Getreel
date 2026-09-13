"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RoadmapDisplay from "@/components/RoadmapDisplay";
import PromisedLinkCTA from "@/components/PromisedLinkCTA";
import type { ContentBlock } from "@/lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface CapsuleData {
  reel_url: string;
  topic: string;
  transcript: string;
  concept_summary: any;
  roadmap_markdown: string;
  promised_link: any;
  content_type?: string;
  blocks?: ContentBlock[];
}

export default function CapsuleClient() {
  const params = useParams();
  const [capsule, setCapsule] = useState<CapsuleData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`${BACKEND_URL}/capsule/${params.id}`)
      .then((r) => { if (!r.ok) throw new Error("Capsule not found"); return r.json(); })
      .then(setCapsule)
      .catch((e) => setError(e.message));
  }, [params?.id]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <p className="text-3xl">&#128533;</p>
          <p className="text-sm text-[#71717a]">{error}</p>
        </div>
      </div>
    );
  }

  if (!capsule) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="w-6 h-6 border-2 border-[#4A90D9] border-t-transparent rounded-full spinner" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 space-y-10">
      <div>
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#52525b] mb-2">
          Shared Capsule
        </div>
        <h1 className="text-2xl md:text-4xl font-light text-balance">
          {capsule.topic}
        </h1>
      </div>

      {capsule.promised_link && (
        <div className="max-w-lg">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#52525b] mb-2">
            Promised Link
          </div>
          <PromisedLinkCTA link={capsule.promised_link} />
        </div>
      )}

      <section className="space-y-6 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.04]" />
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#52525b]">
            Roadmap
          </h2>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>
        <RoadmapDisplay roadmap={capsule.roadmap_markdown} blocks={capsule.blocks} />
      </section>

      <footer className="text-center pt-8 border-t border-white/[0.04]">
        <a href="/" className="text-xs text-[#52525b] hover:text-[#71717a] transition-colors">
          Decode your own reel &rarr;
        </a>
      </footer>
    </div>
  );
}
