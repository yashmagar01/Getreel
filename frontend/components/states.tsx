"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ponytail: one shared UI file — mockup components, no new deps, motion only.

export type Platform = "instagram" | "youtube" | null;

export const INSTAGRAM_RE = /instagram\.com\/(reel|p|reels)\/([A-Za-z0-9_-]+)/;
export const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|shorts\/|playlist\?list=)|youtu\.be\/)([A-Za-z0-9_-]+)/;

export function detectPlatform(url: string): Platform {
  const t = url.trim();
  if (INSTAGRAM_RE.test(t)) return "instagram";
  if (YOUTUBE_RE.test(t)) return "youtube";
  return null;
}

export function formatDuration(s?: number | null): string | null {
  if (s == null || !isFinite(s as number)) return null;
  const n = Math.max(0, Math.round(s as number));
  const h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), sec = n % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatViews(v?: number | null): string | null {
  if (v == null) return null;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M views`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K views`;
  return `${v} views`;
}

export function formatMB(b?: number | null): string | null {
  if (b == null) return null;
  const mb = b / 1e6;
  return mb >= 100 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

const EASE = [0.22, 1, 0.36, 1] as const;

// ── Header ────────────────────────────────────────────────────────────────
export function Header() {
  return (
    <header className="w-full max-w-xl mx-auto flex items-center justify-between px-1 pt-6">
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-[8px] flex items-center justify-center text-white" style={{ background: "var(--brand-gradient)" }} aria-hidden>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
          </svg>
        </span>
        <span className="font-bold text-[17px] tracking-tight">
          <span className="text-black">Get</span><span style={{ color: "var(--brand-solid)" }}>Reel</span>
        </span>
      </div>
      <span className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)]" aria-hidden>
        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      </span>
    </header>
  );
}

export function TopBadge({ text }: { text: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[var(--brand-border)] text-[10px] font-bold tracking-[0.14em] uppercase text-[var(--brand-solid)] shadow-[var(--shadow-sm)]">
      <span className="text-[11px]" aria-hidden>⚡</span>{text}
    </motion.div>
  );
}

export function Hero({ sub }: { sub: string }) {
  return (
    <div className="text-center">
      <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}
        className="text-[2.6rem] leading-[1.05] md:text-5xl font-extrabold tracking-tight text-balance">
        Paste a link.<br /><span className="shimmer-text">Get everything.</span>
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08, ease: EASE }}
        className="text-[var(--text-secondary)] text-[15px] leading-relaxed max-w-md mx-auto mt-4">{sub}</motion.p>
    </div>
  );
}

// ── SmartInput ────────────────────────────────────────────────────────────
const ROTATING = ["Paste Instagram Reel...", "Paste YouTube Short...", "Paste YouTube Video...", "We'll handle the rest."];

export function SmartInput({ value, onChange, onSubmit, loading, platform, sweepKey, error }: {
  value: string; onChange: (v: string) => void; onSubmit: () => void;
  loading: boolean; platform: Platform; sweepKey: number; error?: string;
}) {
  const [rot, setRot] = useState(0);
  useEffect(() => {
    if (value.trim() || platform) return;
    const t = setInterval(() => setRot((r) => (r + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, [value, platform]);

  return (
    <div className="w-full">
      <motion.form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}
        className={`bg-white rounded-[18px] border border-[rgba(255,77,141,0.35)] shadow-[0_8px_28px_rgba(255,77,141,0.14)] focus-within:border-[rgba(255,77,141,0.6)] transition-colors gr-input-glow flex items-center gap-2 pl-4 pr-2 py-2 ${sweepKey > 0 ? "gr-sweep" : ""}`}
        style={{ borderRadius: 18 }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={platform ?? "none"} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.18 }} className="shrink-0" aria-hidden>
            {platform === "instagram" ? (
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth={1.8}><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" strokeWidth={2.5} /></svg>
            ) : platform === "youtube" ? (
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a2.994 2.994 0 0 0-2.108-2.12C19.527 3.6 12 3.6 12 3.6s-7.527 0-9.39.466A2.994 2.994 0 0 0 .502 6.186 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .502 5.814 2.994 2.994 0 0 0 2.108 2.12C4.473 20.4 12 20.4 12 20.4s7.527 0 9.39-.466a2.994 2.994 0 0 0 2.108-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
            ) : (
              <svg className="w-[18px] h-[18px] text-[var(--brand-solid)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
            )}
          </motion.span>
        </AnimatePresence>
        <div className="flex-1 relative min-w-0">
          <input value={value} onChange={(e) => onChange(e.target.value)} disabled={loading}
            aria-label="Video URL" autoComplete="off" spellCheck={false}
            className="w-full bg-transparent text-sm outline-none py-2.5 min-w-0 text-[var(--text-primary)] min-h-[44px]"
            placeholder={undefined} />
          {!value && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-[var(--text-placeholder)] pointer-events-none truncate max-w-full" aria-hidden>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={rot} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.25 }}>{ROTATING[rot]}</motion.span>
              </AnimatePresence>
            </span>
          )}
        </div>
        {value ? (
          <button type="button" onClick={() => onChange("")} aria-label="Clear input"
            className="shrink-0 w-7 h-7 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)] flex items-center justify-center hover:text-[var(--text-primary)] min-w-[28px]">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        ) : (
          <button type="button" onClick={async () => { try { onChange(await navigator.clipboard.readText()); } catch {} }}
            className="shrink-0 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--brand-solid)] px-1 min-h-[44px]">Paste</button>
        )}
      </motion.form>
      {error && <p role="alert" className="text-[13px] text-[var(--accent-red)] mt-2 px-1">{error}</p>}
    </div>
  );
}

// ── Platform cards / badges ───────────────────────────────────────────────
export function PlatformCards() {
  const items = [
    { id: "ig", label: "Instagram", sub: "Reels & Posts", ring: "#E1306C", icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth={1.8} className="w-6 h-6"><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" strokeWidth={2.5} /></svg>) },
    { id: "yt", label: "YouTube", sub: "Videos & Shorts", ring: "#FF0000", icon: (
      <svg viewBox="0 0 24 24" fill="#FF0000" className="w-6 h-6"><path d="M23.498 6.186a2.994 2.994 0 0 0-2.108-2.12C19.527 3.6 12 3.6 12 3.6s-7.527 0-9.39.466A2.994 2.994 0 0 0 .502 6.186 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .502 5.814 2.994 2.994 0 0 0 2.108 2.12C4.473 20.4 12 20.4 12 20.4s7.527 0 9.39-.466a2.994 2.994 0 0 0 2.108-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>) },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12, ease: EASE }} className="grid grid-cols-2 gap-3 w-full">
      {items.map((c) => (
        <div key={c.id} className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] gr-lift flex items-center gap-3 px-4 py-3.5">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.ring}14` }}>{c.icon}</span>
          <span><span className="block text-sm font-bold leading-tight">{c.label}</span><span className="block text-xs text-[var(--text-muted)]">{c.sub}</span></span>
        </div>
      ))}
    </motion.div>
  );
}

export function DetectionBanner({ platform }: { platform: Exclude<Platform, null> }) {
  const ig = platform === "instagram";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }}
      className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 border"
      style={ig ? { background: "#F0FDF4", borderColor: "#BBF7D0" } : { background: "#FEF2F2", borderColor: "#FECACA" }}>
      <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: ig ? "#DCFCE7" : "#FEE2E2" }} aria-hidden>
        {ig ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth={2}><rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /></svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#DC2626"><path d="M23.498 6.186a2.994 2.994 0 0 0-2.108-2.12C19.527 3.6 12 3.6 12 3.6s-7.527 0-9.39.466A2.994 2.994 0 0 0 .502 6.186 31.3 31.3 0 0 0 0 12a31.3 31.3 0 0 0 .502 5.814 2.994 2.994 0 0 0 2.108 2.12C4.473 20.4 12 20.4 12 20.4s7.527 0 9.39-.466a2.994 2.994 0 0 0 2.108-2.12A31.3 31.3 0 0 0 24 12a31.3 31.3 0 0 0-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-bold" style={{ color: ig ? "#15803D" : "#B91C1C" }}>
          {ig ? "Instagram Reel detected" : "YouTube Video detected"}</span>
        <span className="block text-xs" style={{ color: ig ? "#16A34A" : "#DC2626" }}>
          {ig ? "Hidden resources may be available." : "Fast download ready."}</span>
      </span>
      <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: ig ? "#22C55E" : "#FECACA" }} aria-hidden>
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </span>
    </motion.div>
  );
}

// ── Buttons ───────────────────────────────────────────────────────────────
export function GradientButton({ children, onClick, loading, className = "", shimmer = false, label }: {
  children: React.ReactNode; onClick?: () => void; loading?: boolean; className?: string; shimmer?: boolean; label?: string;
}) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
      onClick={onClick} disabled={loading} aria-label={label}
      className={`group w-full min-h-[48px] rounded-full text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:opacity-[0.92] disabled:opacity-60 ${shimmer ? "gr-cta-shimmer" : ""} ${className}`}
      style={shimmer ? undefined : { background: "var(--brand-gradient)", boxShadow: "var(--shadow-brand)" }}>
      {loading && <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent spinner" aria-hidden />}
      <span className="inline-flex items-center gap-2">{children}</span>
    </motion.button>
  );
}

// ── Preview cards ─────────────────────────────────────────────────────────
function Thumb({ src, alt, ratio = "aspect-[9/16]", badge }: { src?: string | null; alt: string; ratio?: string; badge?: string }) {
  return (
    <div className={`relative shrink-0 w-[104px] ${ratio} rounded-xl overflow-hidden bg-[var(--bg-elevated)] border border-black/5`} aria-hidden={!(src)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="w-full h-full object-cover" loading="eager" referrerPolicy="no-referrer" crossOrigin="anonymous" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white text-2xl font-extrabold" style={{ background: "var(--brand-gradient)" }}>{alt.charAt(0) || "G"}</div>
      )}
      {badge && <span className="absolute bottom-1.5 right-1.5 text-[10px] font-bold text-white bg-black/70 px-1.5 py-0.5 rounded-md tabular-nums">{badge}</span>}
    </div>
  );
}

export function IgPreview({ title, creator, thumb, duration, tags, views, uploadAge }: {
  title: string; creator: string; thumb?: string | null; duration?: string | null; tags: string[]; views?: string | null; uploadAge?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }} className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-4 flex gap-3.5">
      <Thumb src={thumb} alt={title} badge={duration ?? undefined} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold leading-snug line-clamp-2">{title}</p>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 flex items-center gap-1 truncate">
          <span className="w-5 h-5 rounded-full bg-[var(--bg-elevated)] inline-flex items-center justify-center text-[10px] shrink-0" aria-hidden>👤</span>
          <span className="truncate">@{creator}</span>
          <svg className="w-3.5 h-3.5 text-[#1D9BF0] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified"><path d="M12 2l2.4 2.4 3.3-.5.9 3.2 3 1.5-1.4 3.1 1.4 3.1-3 1.5-.9 3.2-3.3-.5L12 21.9l-2.4-2.4-3.3.5-.9-3.2-3-1.5L3.8 12 2.4 8.9l3-1.5.9-3.2 3.3.5z" /><path fill="#fff" d="M10.6 14.6l-3-3 1.4-1.4 1.6 1.6 4.4-4.4 1.4 1.4z" /></svg>
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">{views ? views : "12.4M views"} · {uploadAge || "2 days ago"}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]">{t}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function YtPreview({ title, channel, thumb, duration, meta, views }: {
  title: string; channel: string; thumb?: string | null; duration?: string | null; meta: string; views?: string | null;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: EASE }} className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-3.5">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={title} className="w-full h-full object-cover" loading="eager" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white font-extrabold p-6 text-center" style={{ background: "var(--brand-gradient)" }}>{title}</div>
        )}
        {duration && <span className="absolute bottom-2 right-2 text-[11px] font-bold text-white bg-black/75 px-1.5 py-0.5 rounded-md tabular-nums">{duration}</span>}
      </div>
      <p className="text-[15px] font-bold leading-snug mt-3 line-clamp-2">{title}</p>
      <p className="text-[13px] text-[var(--text-secondary)] mt-1 truncate">{channel}</p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">{views ? `${views} · ` : ""}{meta}</p>
    </motion.div>
  );
}

export function YtOptions({ quality, onQuality }: { quality: string; onQuality: (q: string) => void }) {
  const rows = [
    { v: "best", icon: "🎬", label: "Video quality", val: "1080p (MP4)" },
    { v: "audio", icon: "🎧", label: "Audio only", val: "MP3 (320 kbps)" },
    { v: "thumb", icon: "🖼️", label: "Download thumbnail", val: "JPG (High Quality)" },
  ];
  return (
    <div className="w-full space-y-2">
      {rows.slice(0, 2).map((r) => (
        <button key={r.v} type="button" onClick={() => onQuality(r.v)}
          className={`w-full bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] !rounded-2xl px-4 py-3 flex items-center gap-3 text-left gr-press min-h-[52px] ${quality === r.v ? "ring-2 ring-[var(--brand-solid)]" : ""}`}>
          <span className="text-lg" aria-hidden>{r.icon}</span>
          <span className="flex-1 text-[13px] font-semibold">{r.label}</span>
          <span className="text-xs text-[var(--text-muted)]">{r.val}</span>
          <span className="text-[var(--text-muted)]" aria-hidden>›</span>
        </button>
      ))}
      <button type="button" onClick={() => onQuality("thumb")}
        className="w-full bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] !rounded-2xl px-4 py-3 flex items-center gap-3 text-left gr-press min-h-[52px]">
        <span className="text-lg" aria-hidden>🖼️</span>
        <span className="flex-1 text-[13px] font-semibold">Download thumbnail</span>
        <span className="text-xs text-[var(--text-muted)]">JPG (High Quality)</span>
        <span className="text-[var(--text-muted)]" aria-hidden>›</span>
      </button>
    </div>
  );
}

// ── Downloading ───────────────────────────────────────────────────────────
const DL_STEPS = [
  { label: "Validating", icon: "🔗" },
  { label: "Downloading", icon: "☁️" },
  { label: "Merging", icon: "✂️" },
  { label: "Done", icon: "✓" },
];

export function DownloadProgress({ title, meta, thumb, progress, wide = false }: {
  title: string; meta: string; thumb?: string | null; progress: number; wide?: boolean;
}) {
  const stepIdx = progress < 25 ? 0 : progress < 60 ? 1 : progress < 88 ? 2 : 3;
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="w-full">
      <h2 className="text-xl font-extrabold text-center tracking-tight">{wide ? "Downloading Video..." : "Downloading Reel..."}</h2>
      <p className="text-[13px] text-[var(--text-muted)] text-center mt-1 mb-5">Please wait while we fetch the video.</p>
      <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-4">
        <div className="flex gap-3.5 items-center">
          <Thumb src={thumb} alt={title} ratio={wide ? "aspect-video w-[132px]" : "aspect-[9/16]"} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-snug line-clamp-2">{title}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 tabular-nums">{meta}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full h-2.5 rounded-full bg-black/[0.06] overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full gr-progress-fill" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
          <p className="text-right text-xs font-bold mt-1.5 tabular-nums">{Math.round(progress)}%</p>
        </div>
        <div className="grid grid-cols-4 gap-1 mt-4">
          {DL_STEPS.map((s, i) => {
            const done = i < stepIdx, cur = i === stepIdx;
            return (
              <div key={s.label} className="flex flex-col items-center gap-1.5 text-center">
                <div className="flex items-center w-full">
                  <motion.span animate={cur ? { scale: [1, 1.15, 1] } : {}} transition={{ repeat: cur ? Infinity : 0, duration: 1.4 }}
                    className="mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[13px] shrink-0"
                    style={{ background: done ? "#22C55E" : cur ? "var(--brand-gradient)" : "var(--bg-elevated)", color: done || cur ? "#fff" : "var(--text-muted)" }}>
                    {done ? <span className="gr-pop">✓</span> : s.icon}
                  </motion.span>
                </div>
                <span className={`text-[10px] leading-tight ${cur ? "font-bold text-[var(--text-primary)]" : done ? "font-semibold text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Success + confetti ────────────────────────────────────────────────────
export function Confetti({ n = 14 }: { n?: number }) {
  const parts = useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const d = 34 + ((i * 37) % 30);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d - 10, c: ["#1D4ED8", "#3B82F6", "#22C55E", "#4A90D9", "#F59E0B"][i % 5], s: 5 + ((i * 13) % 4), d: (i % 5) * 0.05 };
  }), [n]);
  return (
    <span className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
      {parts.map((p, i) => (
        <span key={i} className="gr-confetti" style={{ width: p.s, height: p.s, background: p.c, ["--cx" as string]: `${p.x}px`, ["--cy" as string]: `${p.y}px`, animationDelay: `${p.d}s` }} />
      ))}
    </span>
  );
}

export function SuccessCheck() {
  return (
    <div className="relative flex justify-center py-1">
      <Confetti />
      <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="w-[68px] h-[68px] rounded-full flex items-center justify-center shadow-lg" style={{ background: "#22C55E" }}>
        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path className="gr-check-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.span>
    </div>
  );
}

export function DownloadedCard({ title, meta, thumb, wide = false }: { title: string; meta: string; thumb?: string | null; wide?: boolean }) {
  return (
    <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-3.5 flex gap-3.5 items-center">
      <Thumb src={thumb} alt={title} ratio={wide ? "aspect-video w-[132px]" : "aspect-[9/16]"} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold leading-snug line-clamp-2">{title}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1.5 tabular-nums">{meta}</p>
      </div>
    </div>
  );
}

// ── AI journey ────────────────────────────────────────────────────────────
export const AI_STEPS = [
  { key: "prepare", title: "Preparing", desc: "Extracting audio and frames..." },
  { key: "transcript", title: "Transcript", desc: "Converting speech to text..." },
  { key: "analyze", title: "Content", desc: "Detecting topics, tools and key concepts..." },
  { key: "links", title: "Hidden Links", desc: "Checking caption, comments and bio..." },
  { key: "bait", title: "Comment Bait", desc: "Looking for DM triggers..." },
  { key: "report", title: "Report", desc: "Almost done..." },
];

// ponytail: backend SSE stages → 6 mockup steps (UI-only mapping, backend untouched)
export function aiIndexFor(stage: string): number {
  switch (stage) {
    case "rate_limit": case "cache": case "download": return 0;
    case "transcribe": return 1;
    case "frames": case "analyze": return 2;
    case "link": return 3;
    case "classify": return 4;
    case "roadmap": return 5;
    default: return 0;
  }
}

export function AnalysisTimeline({ active }: { active: number }) {
  return (
    <div className="w-full">
      <div className="relative pl-1">
        <span className="absolute left-[15px] top-3 bottom-3 w-px bg-black/10" aria-hidden />
        <div className="space-y-5">
          {AI_STEPS.map((s, i) => {
            const done = i < active, cur = i === active;
            return (
              <motion.div key={s.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }}
                className="relative flex gap-3.5 items-start">
                <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${done ? "text-white" : cur ? "text-white" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}
                  style={done ? { background: "#22C55E" } : cur ? { background: "var(--brand-gradient)" } : undefined}>
                  {done ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path className="gr-check-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : cur ? (
                    <span className="w-3 h-3 rounded-full bg-white pulse-subtle" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-current" />
                  )}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className={`block text-sm ${cur || done ? "font-bold" : "font-medium text-[var(--text-muted)]"}`}>{s.title}</span>
                  <span className="block text-xs text-[var(--text-muted)] mt-0.5">{s.desc}</span>
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const LIVE_CARDS = [
  { key: "transcript", label: "Transcript", icon: "🎙️", doneAfter: 1 },
  { key: "frames", label: "Frame Analysis", icon: "🖼️", doneAfter: 2 },
  { key: "caption", label: "Caption Scan", icon: "📄", doneAfter: 2 },
  { key: "comments", label: "Comment Check", icon: "💬", doneAfter: 4 },
];

export function AnalysisLiveCards({ active, progress }: { active: number; progress: number }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="w-full h-2 rounded-full bg-black/[0.06] overflow-hidden">
          <div className="h-full rounded-full gr-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-bold ml-3 tabular-nums shrink-0">{Math.round(progress)}%</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {LIVE_CARDS.map((c) => {
          const done = active > c.doneAfter, cur = active === c.doneAfter;
          return (
            <motion.div key={c.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
              className={`rounded-2xl border p-2.5 flex flex-col items-center text-center gap-1.5 ${done ? "bg-[#F0FDF4] border-[#BBF7D0]" : cur ? "bg-white border-[var(--brand-border)]" : "bg-white border-black/5"}`}>
              <span className="text-xl" aria-hidden>{c.icon}</span>
              <span className="text-[10px] font-bold leading-tight">{c.label}</span>
              <span className={`text-[9px] font-semibold ${done ? "text-[#16A34A]" : cur ? "text-[var(--brand-solid)]" : "text-[var(--text-muted)]"}`}>
                {done ? "Complete" : cur ? "Processing..." : "Pending"}</span>
            </motion.div>
          );
        })}
      </div>
      <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 mt-3 flex gap-2.5">
        <span className="text-lg shrink-0" aria-hidden>💡</span>
        <span>
          <span className="block text-[13px] font-bold">Did you know?</span>
          <span className="block text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">We check captions, comments, bio and even detect “Comment PROMPT” type bait to find hidden resources.</span>
        </span>
      </div>
    </div>
  );
}

// ── Report ────────────────────────────────────────────────────────────────
export const REPORT_TABS = ["Overview", "Resources", "Transcript", "Tools", "Breakdown"] as const;

export function ReportTabs({ tab, onTab, counts }: { tab: string; onTab: (t: string) => void; counts: Record<string, number> }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Analysis results">
      {REPORT_TABS.map((t) => {
        const active = tab === t;
        return (
          <button key={t} role="tab" aria-selected={active} onClick={() => onTab(t)}
            className={`relative shrink-0 px-4 py-2 rounded-full text-[13px] font-bold min-h-[36px] transition-colors ${active ? "text-white" : "text-[var(--text-secondary)] bg-white border border-black/5"}`}>
            {active && (
              <motion.span layoutId="report-tab" transition={{ duration: 0.2 }} className="absolute inset-0 rounded-full" style={{ background: "var(--brand-gradient)", boxShadow: "var(--shadow-brand)" }} />
            )}
            <span className="relative z-10">{t}{t === "Resources" && counts.resources > 0 ? ` · ${counts.resources}` : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface Resource { name: string; url?: string }

export function ResourceList({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) {
    return (
      <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-6 text-center">
        <p className="text-sm font-bold">No links found</p>
        <p className="text-[13px] text-[var(--text-muted)] mt-1">No specific links were mentioned in this reel.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base" aria-hidden>🔗</span>
        <p className="text-sm font-bold flex-1">Hidden Resources Found</p>
        <span className="text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] px-2.5 py-1 rounded-full">{resources.length} links</span>
      </div>
      <div className="space-y-2.5">
        {resources.map((r, i) => (
          <motion.div key={`${r.name}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.06 }}
            className="bg-white rounded-[20px] border border-black/[0.07] shadow-[0_12px_32px_rgba(20,20,40,0.07)] !rounded-2xl !shadow-none p-3.5 flex items-center gap-3 gr-lift">
            <span className="w-8 h-8 rounded-full bg-[#DBEAFE] text-[var(--brand-solid)] text-[13px] font-extrabold flex items-center justify-center shrink-0">{i + 1}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold truncate">{r.name}</span>
              {r.url && <span className="block text-xs text-[#2563EB] truncate">{r.url}</span>}
            </span>
            {r.url && (
              <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${r.name}`}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#2563EB] hover:bg-blue-50 shrink-0 min-w-[36px] min-h-[36px]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function extractLinks(roadmap?: string): string[] {
  if (!roadmap) return [];
  const found = roadmap.match(/https?:\/\/[^\s)>\]"]+/g) || [];
  return [...new Set(found)].slice(0, 12);
}

export function stripMd(s?: string): string {
  if (!s) return "";
  return s.replace(/```[\s\S]*?```/g, " ").replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/\*\*/g, "").replace(/^[#>\-*]+\s*/gm, "").replace(/`/g, "").replace(/\s+/g, " ").trim();
}
