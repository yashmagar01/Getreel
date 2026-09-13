export interface PromisedLink {
  url?: string;
  description?: string;
  source?: string;
  confidence?: "high" | "medium" | "low";
  type?: "dm_gate" | "comment_gate";
  keyword?: string;
  handle?: string;
  reel_url?: string;
  winner_layer?: string;
  label?: string;
}

export interface Concept {
  topic: string;
  target_audience?: string;
  tools_mentioned?: string[];
  what_creator_withholds?: string;
  what_creator_shows?: string;
  key_concepts?: string[];
}

export interface ProgressEvent {
  type: "progress" | "done" | "error";
  stage?: string;
  message?: string;
  roadmap?: string;
  concept?: Concept;
  promised_link?: PromisedLink | null;
  download_token?: string;
  from_cache?: boolean;
  capsule_id?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

function sanitizeErrorMessage(message: string): string {
  if (!message) return "An unexpected error occurred.";
  if (message.includes("cookies.txt") || message.includes("rate-limiting") || message.includes("expired")) {
    return "Instagram access is currently limited. Please try again in a few minutes.";
  }
  if (message.includes("Login required")) {
    return "System maintenance in progress. Please try again later.";
  }
  return message;
}

export async function analyzeReel(
  instagramUrl: string,
  onProgress: (event: ProgressEvent) => void
): Promise<ProgressEvent> {
  if (!BACKEND_URL) {
    throw new Error("Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL.");
  }

  const response = await fetch(`${BACKEND_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instagram_url: instagramUrl }),
  });

  if (!response.ok) {
    let detail = "Failed to start analysis";
    try {
      const err = await response.json();
      detail = err.detail || detail;
    } catch {}
    throw new Error(sanitizeErrorMessage(detail));
  }

  const { job_id } = await response.json();

  return new Promise((resolve, reject) => {
    const eventSource = new EventSource(`${BACKEND_URL}/stream-progress/${job_id}`);

    eventSource.onmessage = (e) => {
      try {
        const event: ProgressEvent = JSON.parse(e.data);
        onProgress(event);
        if (event.type === "done") { eventSource.close(); resolve(event); }
        else if (event.type === "error") { eventSource.close(); reject(new Error(sanitizeErrorMessage(event.message || "Pipeline error"))); }
      } catch { eventSource.close(); reject(new Error("Failed to parse server response")); }
    };

    eventSource.onerror = () => {
      eventSource.close();
      reject(new Error("Lost connection to backend. Render's free tier may be sleeping — please try again."));
    };

    setTimeout(() => { eventSource.close(); reject(new Error("Analysis timed out after 6 minutes.")); }, 360000);
  });
}

export function getDownloadUrl(token: string): string {
  return `${BACKEND_URL}/download/${token}`;
}
