"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import RoadmapDisplay from "@/components/RoadmapDisplay";
import { analyzeReel, downloadInstagram, getDownloadUrl, reelInfo, capsuleDetail, type ProgressEvent, type ReelMeta } from "@/lib/api";
import {
  detectPlatform, formatDuration, formatViews, formatMB, INSTAGRAM_RE,
  Header, TopBadge, Hero, SmartInput, PlatformCards, DetectionBanner, GradientButton,
  IgPreview, YtPreview, YtOptions, DownloadProgress, SuccessCheck, DownloadedCard,
  AnalysisTimeline, AnalysisLiveCards, ReportTabs, ResourceList, extractLinks, stripMd, aiIndexFor,
  type Platform, type Resource,
} from "@/components/states";

type Stage = "idle" | "preview" | "downloading" | "success" | "analyzing" | "report";
const EASE = [0.22, 1, 0.36, 1] as const;
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

interface YtMeta { title: string; thumbnail?: string | null; duration?: number | null; uploader?: string | null; view_count?: number | null; }

function tagsFrom(title: string): string[] {
  const tags = title.match(/#(\w+)/g)?.map((t) => t.slice(1)) || [];
  return tags.slice(0, 3);
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<Platform>(null);
  const [sweep, setSweep] = useState(0);
  const [error, setError] = useState("");

  const [igMeta, setIgMeta] = useState<ReelMeta | null>(null);
  const [igLoading, setIgLoading] = useState(false);
  const [ytMeta, setYtMeta] = useState<YtMeta | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytQuality, setYtQuality] = useState("best");

  const [progress, setProgress] = useState(0);
  const [dlTitle, setDlTitle] = useState("");
  const [dlThumb, setDlThumb] = useState<string | null>(null);
  const [dlMeta, setDlMeta] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [igDuration, setIgDuration] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const [ytBlob, setYtBlob] = useState<string | null>(null);
  const [ytFile, setYtFile] = useState("video.mp4");
  const [ytSize, setYtSize] = useState<number | null>(null);
  const [mp3Size, setMp3Size] = useState<number | null>(null);
  const [thumbSize, setThumbSize] = useState<number | null>(null);

  const [aiStage, setAiStage] = useState("download");
  const [result, setResult] = useState<ProgressEvent | null>(null);
  const [transcript, setTranscript] = useState("");
  const [reportTab, setReportTab] = useState("Overview");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── URL → platform + metadata preflight ──
  const onUrl = useCallback((v: string) => {
    setUrl(v); setError("");
    const p = detectPlatform(v);
    setPlatform((prev) => { if (p !== prev && p) setSweep((s) => s + 1); return p; });
    if (!p) { setIgMeta(null); setYtMeta(null); setStage((s) => (s === "preview" ? "idle" : s)); }
    else setStage((s) => (s === "idle" ? "preview" : s));
  }, []);

  useEffect(() => {
    const t = url.trim();
    if (!platform || !t) return;
    let dead = false;
    if (platform === "instagram" && INSTAGRAM_RE.test(t)) {
      setIgLoading(true);
      const h = setTimeout(async () => {
        try { const m = await reelInfo(t); if (!dead) setIgMeta(m); }
        catch { if (!dead) setIgMeta(null); }
        finally { if (!dead) setIgLoading(false); }
      }, 500);
      return () => { dead = true; clearTimeout(h); };
    }
    if (platform === "youtube") {
      setYtLoading(true);
      const h = setTimeout(async () => {
        try {
          const r = await fetch(`${BACKEND}/api/youtube/info`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: t, quality: "best" }) });
          if (!r.ok) throw new Error();
          const m: YtMeta = await r.json();
          if (!dead) setYtMeta(m);
        } catch { if (!dead) setYtMeta(null); }
        finally { if (!dead) setYtLoading(false); }
      }, 600);
      return () => { dead = true; clearTimeout(h); };
    }
  }, [url, platform]);

  // fake staged progress while the real fetch runs
  useEffect(() => {
    if (stage === "downloading") {
      setProgress(4);
      timer.current = setInterval(() => setProgress((p) => Math.min(90, p + (90 - p) * 0.07 + 0.5)), 180);
    } else if (timer.current) clearInterval(timer.current);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [stage]);

  const reset = useCallback(() => {
    setStage("idle"); setUrl(""); setPlatform(null); setError("");
    setIgMeta(null); setYtMeta(null); setResult(null); setToken(null);
    setYtBlob(null); setYtSize(null); setMp3Size(null); setThumbSize(null);
    setProgress(0); setReportTab("Overview"); setTranscript("");
  }, []);

  function saveBlob(blob: Blob, name: string) {
    const u = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = name; a.click();
    setTimeout(() => window.URL.revokeObjectURL(u), 4000);
  }

  // ── Download ──
  async function onDownload() {
    const t = url.trim();
    if (!t || !platform) { setError("Paste an Instagram Reel or YouTube URL to get started."); return; }
    if (busy) return;
    setBusy(true); setError("");
    try {
      if (platform === "instagram") {
        const title = igMeta?.title || "Instagram Reel";
        setDlTitle(title); setDlThumb(igMeta?.thumbnail_url ?? null);
        setDlMeta(igDuration ? `${formatDuration(igDuration)} · 1080×1920` : "Fetching video...");
        setStage("downloading");
        const res = await downloadInstagram(t);
        setIgDuration(res.duration ?? null);
        setDlThumb(res.thumbnail ?? igMeta?.thumbnail_url ?? null);
        setDlTitle(res.title || title);
        setDlMeta(`${res.duration ? formatDuration(res.duration) + " · " : ""}1080×1920`);
        setToken(res.download_token);
        setProgress(100);
        const a = document.createElement("a");
        a.href = getDownloadUrl(res.download_token); a.setAttribute("download", ""); a.click();
        setTimeout(() => setStage("success"), 450);
      } else {
        if (ytQuality === "thumb") { await downloadThumb(); return; }
        const m = ytMeta;
        setDlTitle(m?.title || "YouTube video"); setDlThumb(m?.thumbnail ?? null);
        setDlMeta(`${m?.duration ? formatDuration(m.duration) + " · " : ""}1080p`);
        setStage("downloading");
        const r = await fetch(`${BACKEND}/api/youtube/download`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: t, quality: ytQuality }) });
        if (!r.ok) throw new Error((await r.text().catch(() => "")) || "Download failed");
        const blob = await r.blob();
        const disp = r.headers.get("Content-Disposition");
        const name = disp?.match(/filename="?([^";]+)"?/)?.[1] || (ytQuality === "audio" ? "audio.m4a" : "video.mp4");
        setYtFile(name); setYtSize(blob.size);
        setDlMeta(`${m?.duration ? formatDuration(m.duration) + " · " : ""}${formatMB(blob.size) || ""} · 1080p`);
        const u = window.URL.createObjectURL(blob);
        setYtBlob(u);
        const a = document.createElement("a"); a.href = u; a.download = name; a.click();
        setProgress(100);
        setTimeout(() => setStage("success"), 450);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
      setStage("preview");
    } finally { setBusy(false); }
  }

  async function downloadThumb() {
    const src = ytMeta?.thumbnail;
    if (!src) { setError("No thumbnail available for this video."); return; }
    try {
      const r = await fetch(src);
      const b = await r.blob();
      setThumbSize(b.size);
      saveBlob(b, "thumbnail.jpg");
    } catch { window.open(src, "_blank"); }
  }

  async function downloadMp3() {
    const t = url.trim();
    setBusy(true);
    try {
      const r = await fetch(`${BACKEND}/api/youtube/download`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: t, quality: "audio" }) });
      if (!r.ok) throw new Error("Audio download failed");
      const b = await r.blob();
      setMp3Size(b.size);
      saveBlob(b, ytFile.replace(/\.\w+$/, "") + ".m4a");
    } catch (e) { setError(e instanceof Error ? e.message : "Audio download failed"); }
    finally { setBusy(false); }
  }

  // ── Find Resources (Flow B) ──
  async function onAnalyze() {
    const t = url.trim();
    if (!t) return;
    setStage("analyzing"); setAiStage("download"); setResult(null);
    try {
      const res = await analyzeReel(t, (ev) => {
        if (ev.type === "meta" && ev.meta) setIgMeta(ev.meta);
        else if (ev.type === "progress" && ev.stage) setAiStage(ev.stage);
      }, token);
      setResult(res);
      if (res.download_token) setToken(res.download_token);
      setReportTab("Overview");
      setStage("report");
      if (res.capsule_id) capsuleDetail(res.capsule_id).then((c) => setTranscript(c.transcript || "")).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setStage("success");
    }
  }

  const aiIdx = aiIndexFor(aiStage);
  const aiPct = Math.round(((aiIdx + 1) / 6) * 100);

  const resources: Resource[] = (() => {
    if (!result) return [];
    const out: Resource[] = [];
    const seen = new Set<string>();
    const push = (name: string, u?: string) => {
      const k = (u || name).toLowerCase();
      if (seen.has(k)) return; seen.add(k);
      out.push({ name, url: u });
    };
    const pl = result.promised_link;
    if (pl?.url) push(pl.label || pl.description || "Mentioned link", pl.url);
    for (const l of extractLinks(result.roadmap)) {
      try { push(new URL(l).hostname.replace(/^www\./, ""), l); } catch { push(l, l); }
    }
    for (const tool of result.concept?.tools_mentioned || []) push(tool);
    return out.slice(0, 12);
  })();

  const summary = stripMd(result?.roadmap).slice(0, 320);
  const counts = { resources: resources.length };
  const ytDur = ytMeta?.duration ? formatDuration(ytMeta.duration) : null;
  const igName = (igMeta?.username || "techwithyash").replace(/^@/, "");
  const igTitle = igMeta?.title || (igLoading ? "Loading preview..." : "5 AI Tools You Must Try in 2025!");
  const ytTitle = ytMeta?.title || (ytLoading ? "Loading preview..." : "Build a Modern Website with React.js in 10 Minutes");
  const ytChannel = ytMeta?.uploader || "CodeWithHarry";

  return (
    <main className="min-h-screen relative overflow-x-clip pb-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden" aria-hidden>
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-25 blur-3xl" style={{ background: "#3B82F6" }} />
        <motion.div animate={{ y: [0, 20, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute -top-16 right-[-6rem] w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: "#1D4ED8" }} />
      </div>

      <div className="relative max-w-xl mx-auto px-5">
        <Header />

        <AnimatePresence mode="wait" initial={false}>
          {/* ── INPUT VIEW (IDLE + PREVIEW) ── */}
          {(stage === "idle" || stage === "preview") && (
            <motion.div key="input-view" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: EASE }}
              className={`flex flex-col pt-6 ${stage === "preview" ? "gap-3.5" : "items-center gap-6"}`}>
              
              <TopBadge text="FAST DOWNLOADER · OPTIONAL AI" />
              
              <div className="text-center mt-1">
                <h1 className={`leading-tight font-extrabold tracking-tight ${stage === 'preview' ? 'text-[2rem]' : 'text-[2.6rem] md:text-5xl'}`}>
                  Paste a link.<br /><span className="shimmer-text">Get everything.</span>
                </h1>
                {stage === "idle" && (
                  <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08, ease: EASE }}
                    className="text-[var(--text-secondary)] text-[15px] leading-relaxed max-w-md mx-auto mt-4">
                    Fast Instagram & YouTube downloader. Need hidden resources too? Find Resources runs the full AI breakdown — Instagram only.
                  </motion.p>
                )}
              </div>

              <div className="w-full">
                <SmartInput value={url} onChange={onUrl} onSubmit={onDownload} loading={busy} platform={platform} sweepKey={sweep} error={error} />
              </div>

              <AnimatePresence mode="wait">
                {stage === "idle" && (
                  <motion.div key="cards" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }} className="w-full">
                    <PlatformCards />
                  </motion.div>
                )}
                {stage === "preview" && platform && (
                  <motion.div key="preview-expand" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: EASE }} className="w-full flex flex-col gap-3.5">
                    <DetectionBanner platform={platform} />
                    {platform === "instagram" ? (
                      <IgPreview title={igTitle} creator={igName} thumb={igMeta?.thumbnail_url} duration={igDuration ? formatDuration(igDuration) : "0:27"} tags={tagsFrom(igMeta?.title || "")} views={igMeta?.view_count ? formatViews(igMeta.view_count) : null} uploadAge="2 days ago" />
                    ) : (
                      <>
                        <YtPreview title={ytTitle} channel={ytChannel} thumb={ytMeta?.thumbnail} duration={ytDur} meta={ytMeta?.view_count ? `${formatViews(ytMeta.view_count)} · 1 month ago` : "1 month ago"} views={null} />
                        <YtOptions quality={ytQuality} onQuality={(q) => { if (q === "thumb") downloadThumb(); else setYtQuality(q); }} />
                      </>
                    )}
                    <div className="pb-20 md:pb-0">
                      <GradientButton onClick={onDownload} loading={busy} label="Download">
                        {!busy && (<svg className="w-4 h-4 transition-transform duration-180 group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>)}
                        Download
                      </GradientButton>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* sticky mobile action for preview */}
              <AnimatePresence>
                {stage === "preview" && (
                  <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} transition={{ duration: 0.35, ease: EASE }} className="md:hidden fixed bottom-0 inset-x-0 z-40 px-5 pt-2 bg-gradient-to-t from-[#F8F7FB] via-[#F8F7FB] to-transparent safe-bottom" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
                    <GradientButton onClick={onDownload} loading={busy} label="Download">Download</GradientButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── DOWNLOADING ── */}
          {stage === "downloading" && (
            <motion.div key="downloading" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: EASE }} className="pt-8">
              <DownloadProgress title={dlTitle} meta={dlMeta} thumb={dlThumb} progress={progress} wide={platform === "youtube"} />
              <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-5 pt-2 bg-gradient-to-t from-[#F8F7FB] via-[#F8F7FB] to-transparent" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
                <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] !rounded-full px-5 py-3 text-center text-sm font-bold tabular-nums">{Math.round(progress)}% · Downloading...</div>
              </div>
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {stage === "success" && (
            <motion.div key="success" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: EASE }} className="pt-8 flex flex-col gap-3.5">
              <SuccessCheck />
              <div className="text-center">
                <h2 className="text-xl font-extrabold tracking-tight">Video downloaded<br />successfully!</h2>
                <p className="text-[13px] text-[var(--text-muted)] mt-1">{platform === "youtube" ? "Your video is ready for offline viewing." : "Your reel is ready for offline viewing."}</p>
              </div>
              {platform === "youtube" ? (
                <>
                  <DownloadedCard title={ytTitle} thumb={ytMeta?.thumbnail} wide meta={`${ytSize ? formatMB(ytSize) + " · " : "156 MB · "}1080p · ${ytDur || "10:24"}`} />
                  <GradientButton onClick={() => { if (ytBlob) { const a = document.createElement("a"); a.href = ytBlob; a.download = ytFile; a.click(); } else onDownload(); }} label="Download MP4">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Download .mp4
                  </GradientButton>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button onClick={downloadMp3} disabled={busy} className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] !rounded-2xl px-3 py-3 text-[13px] font-bold flex items-center justify-center gap-1.5 gr-press min-h-[48px]">🎵 Download .mp3</button>
                    <button onClick={downloadThumb} className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] !rounded-2xl px-3 py-3 text-[13px] font-bold flex items-center justify-center gap-1.5 gr-press min-h-[48px]">🖼️ Download thumbnail</button>
                  </div>
                  <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-4 space-y-1">
                    {[
                      { icon: "🎬", l: "MP4 Video", r: `${ytSize ? formatMB(ytSize) : "156 MB"} · 1080p`, fn: () => { if (ytBlob) { const a = document.createElement("a"); a.href = ytBlob; a.download = ytFile; a.click(); } } },
                      { icon: "🎧", l: "MP3 Audio", r: `${mp3Size ? formatMB(mp3Size) : "28 MB"} · 320 kbps`, fn: downloadMp3 },
                      { icon: "🖼️", l: "Thumbnail", r: `${thumbSize ? formatMB(thumbSize) : "1.2 MB"} · JPG`, fn: downloadThumb },
                    ].map((row) => (
                      <div key={row.l} className="flex items-center gap-3 py-2.5 border-b border-black/5 last:border-0">
                        <span className="text-lg" aria-hidden>{row.icon}</span>
                        <span className="flex-1 min-w-0"><span className="block text-[13px] font-bold">{row.l}</span><span className="block text-xs text-[var(--text-muted)]">{row.r}</span></span>
                        <button onClick={row.fn} aria-label={`Download ${row.l}`} className="w-10 h-10 rounded-full flex items-center justify-center text-[#2563EB] hover:bg-blue-50 min-w-[44px] min-h-[44px]">
                          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                        </button>
                      </div>
                    ))}
                    <div className="rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] p-3 flex gap-2 mt-2">
                      <span aria-hidden>💡</span>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed"><span className="font-bold">Tip</span><br />You can also download YouTube Shorts and playlists using the same link.</p>
                    </div>
                  </div>
                  <button onClick={reset} className="text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--brand-solid)] py-3 min-h-[44px]">Decode another →</button>
                </>
              ) : (
                <>
                  <DownloadedCard title={dlTitle} meta={`${ytSize ? "" : "14.2 MB · "}1080×1920 · ${igDuration ? formatDuration(igDuration) : "00:27"}`} thumb={dlThumb} />
                  <GradientButton onClick={() => { if (token) { const a = document.createElement("a"); a.href = getDownloadUrl(token); a.setAttribute("download", ""); a.click(); } }} label="Download MP4">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Download .mp4
                  </GradientButton>
                  <div className="rounded-3xl border border-[#BFDBFE] bg-[#F0F9FF] p-5 text-center">
                    <p className="text-sm font-bold flex items-center justify-center gap-1.5">✨ Need the hidden resources from this Reel?</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 mb-3.5">Find links, get AI breakdown, detect comment bait and more.</p>
                    <GradientButton shimmer onClick={onAnalyze} label="Find Resources">
                      Find Resources
                      <svg className="w-4 h-4 transition-transform duration-180 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" /></svg>
                    </GradientButton>
                  </div>
                  {error && <p role="alert" className="text-[13px] text-[var(--accent-red)] text-center">{error}</p>}
                </>
              )}
            </motion.div>
          )}

          {/* ── ANALYZING ── */}
          {stage === "analyzing" && (
            <motion.div key="analyzing" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: EASE }} className="pt-8 flex flex-col gap-5">
              <div className="text-center">
                <p className="font-extrabold text-lg flex items-center justify-center gap-1.5">✨ {aiIdx < 3 ? "Analyzing Reel..." : "Finding hidden resources..."}</p>
                <p className="text-[13px] text-[var(--text-muted)] mt-1">{aiIdx < 3 ? "Running AI analysis to find hidden resources." : "This may take 1–2 minutes. You can keep this tab open."}</p>
              </div>
              <AnalysisLiveCards active={aiIdx} progress={aiPct} />
              <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-5">
                <AnalysisTimeline active={aiIdx} />
              </div>
            </motion.div>
          )}

          {/* ── REPORT ── */}
          {stage === "report" && result && (
            <motion.div key="report" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="pt-6 flex flex-col gap-4">
              <button onClick={reset} className="self-start text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-solid)] min-h-[44px]">← Decode another</button>
              <ReportTabs tab={reportTab} onTab={setReportTab} counts={counts} />
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={reportTab} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.2 }}>
                  {reportTab === "Overview" && (
                    <div className="flex flex-col gap-3.5">
                      <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-4 flex gap-3.5">
                        <div className="shrink-0 w-[88px] aspect-[9/16] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
                          {dlThumb || igMeta?.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={dlThumb || igMeta?.thumbnail_url || ""} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold leading-snug line-clamp-3">{result.concept?.topic || dlTitle}</p>
                          <p className="text-[13px] text-[var(--text-secondary)] mt-1">@{igName}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(result.concept?.key_concepts || ["Tutorial", "AI Tools"]).slice(0, 3).map((t) => (
                              <span key={t} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{t}</span>
                            ))}
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-2">14.2 MB · 00:27</p>
                        </div>
                      </div>
                      <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-4">
                        <p className="text-sm font-bold flex items-center gap-1.5">📄 Quick Summary</p>
                        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mt-2">{summary || "The creator introduces popular AI tools for productivity, content creation and coding."}</p>
                      </div>
                    </div>
                  )}
                  {reportTab === "Resources" && <ResourceList resources={resources} />}
                  {reportTab === "Transcript" && (
                    <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-5">
                      <p className="text-sm font-bold mb-2">Transcript</p>
                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">{transcript || stripMd(result.roadmap) || "Transcript unavailable for this reel."}</p>
                    </div>
                  )}
                  {reportTab === "Tools" && (
                    <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-5">
                      <p className="text-sm font-bold mb-3">Tools mentioned</p>
                      <div className="flex flex-wrap gap-2">
                        {(result.concept?.tools_mentioned?.length ? result.concept.tools_mentioned : ["No tools detected"]).map((t) => (
                          <span key={t} className="text-[13px] font-semibold px-3.5 py-2 rounded-full bg-[#DBEAFE] text-[var(--brand-solid)]">{t}</span>
                        ))}
                      </div>
                      {(result.concept?.key_concepts?.length) ? (
                        <><p className="text-sm font-bold mt-5 mb-3">Key concepts</p>
                        <div className="flex flex-wrap gap-2">
                          {result.concept.key_concepts.map((t) => (
                            <span key={t} className="text-xs px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{t}</span>
                          ))}
                        </div></>
                      ) : null}
                    </div>
                  )}
                  {reportTab === "Breakdown" && (
                    <RoadmapDisplay roadmap={result.roadmap || ""} blocks={result.blocks} fromCache={result.from_cache || false} skipFirst={true} />
                  )}
                </motion.div>
              </AnimatePresence>
              {token && (
                <GradientButton onClick={() => { const a = document.createElement("a"); a.href = getDownloadUrl(token); a.setAttribute("download", ""); a.click(); }} label="Download video">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Download video
                </GradientButton>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="w-full py-10 mt-10 text-center border-t border-black/5">
          <p className="text-xs text-[var(--text-muted)] tracking-wide">VidSave — No follows. No comments. No waiting.</p>
        </footer>
      </div>
    </main>
  );
}
