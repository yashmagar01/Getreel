export interface PromisedLink {
  url: string;
  description: string;
  source: "caption" | "transcript" | "bio" | "bio_aggregator" | "targeted_search" | "generic_search";
  confidence: "high" | "medium" | "low";
}

export interface AnalyzeResult {
  roadmap: string;
  concept: Record<string, unknown>;
  promised_link: PromisedLink | null;
  from_cache: boolean;
}

export async function analyzeReel(url: string): Promise<AnalyzeResult> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    throw new Error("Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL.");
  }

  // ── Cold-start warm-up: ping /health before the heavy /analyze call ──────
  const warmUp = async (): Promise<void> => {
    const maxWait = 60_000; // 60 seconds
    const interval = 5_000; // retry every 5s
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      try {
        const res = await fetch(`${backendUrl}/health`, {
          signal: AbortSignal.timeout(5_000),
        });
        if (res.ok) return; // server is up
      } catch {
        // server not ready yet — keep retrying
      }
      await new Promise((r) => setTimeout(r, interval));
    }
    // Give it one more shot after the loop — it might just be slow
  };

  await warmUp();

  // ── Main request ──────────────────────────────────────────────────────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300_000); // 300s timeout (5 min)

  try {
    const response = await fetch(`${backendUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instagram_url: url }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let detail = `Server error (${response.status})`;
      try {
        const json = await response.json();
        detail = json.detail || detail;
      } catch {
        // ignore parse error
      }
      throw new Error(detail);
    }

    return await response.json();
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error(
          "The server took too long. Render's free tier may be waking up — please try again in 30 seconds."
        );
      }
      throw err;
    }
    throw new Error("An unexpected error occurred.");
  }
}
