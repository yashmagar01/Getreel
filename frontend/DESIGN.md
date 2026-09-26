# GetReel Design System v2 — Single Source of Truth

> GetReel structure + GetReel identity. This file overrides `TOKENS.md`
> (legacy) and any Figma drift. If a value isn't here, reuse the closest
> token below — never invent one. Backend untouched.

Version: 2.0 · Language: Modern Minimal SaaS · Stack: Next.js 16 + React 19 + Tailwind v4 + Framer Motion 13

## 0. Where things live (actual files, not aspirational)

| What | File |
|---|---|
| Tokens (`:root`) + keyframes/utilities | `frontend/app/globals.css` |
| All canonical UI (SmartInput, previews, buttons, timelines, tabs, lists) | `frontend/components/states.tsx` |
| Screen orchestration (idle→preview→downloading→success→analyzing→report) | `frontend/app/page.tsx` |
| Font loading (Inter) | `frontend/app/layout.tsx` |
| API contracts (SSE stages, metadata) | `frontend/lib/api.ts` |
| Bottom nav | `frontend/components/BottomNav.tsx` |
| Legacy (`ui/Card`, `LinkInputCard`, `UrlInput`, …) | `frontend/components/ui/*` — DEPRECATED, do not use in new screens |

Do not create `design/tokens.ts`, `colors.ts`, `motion.ts` — CSS vars in
`globals.css` are the tokens. Do not split `states.tsx` without reason.

## 1. Core principle — screen hierarchy (never reorder)

```
Hero → Primary Action → Live Feedback → Result → Optional Advanced Actions
```

First screen = headline + input + download only. AI (`Find Resources`) appears
exclusively on the IG success card. YT never mentions AI.

## 2. Platform flows

**Instagram:** paste → preview (`IgPreview`) → Download → success card → optional `Find Resources` → analyzing (`AnalysisLiveCards` + `AnalysisTimeline`) → report tabs.
**YouTube:** paste → preview (`YtPreview` + `YtOptions`) → Download → success (`DownloadedCard` + MP4/MP3/thumbnail rows) → done. No AI copy anywhere on YT paths.

Platform detection: `detectPlatform()` in `states.tsx` — `INSTAGRAM_RE` (`instagram.com/reel|p|reels`) / `YOUTUBE_RE` (`youtube.com/watch|shorts|playlist`, `youtu.be`). Nothing else is a valid URL.

## 3. Brand

Personality: fast, intelligent, trustworthy, premium, calm. Follow GetReel Dribbble Case Study exactly. Solid white backgrounds, Dark Gray text, and Vibrant Blue. Brand gradient is reserved for CTAs,
progress fills, active tabs — never body text or surfaces. Exact matching of GetReel case study rules.

## 4. Color tokens (`globals.css :root` — exact values)

```css
--brand-gradient: linear-gradient(135deg, #3B82F6, #1D4ED8);
--brand-solid:    #2563EB;   /* text/icons/outline accents, focus rings */
--brand-dim:      rgba(255,77,141,0.08);
--brand-border:   rgba(255,77,141,0.28);

--bg-primary: #F8F7FB;  --bg-secondary: #FFFFFF;  --bg-card: #FFFFFF;
--bg-elevated: #F3F2F7; --bg-hover: #EFEAF6;
--bg-soft-coral: #FFF3F1; --bg-soft-pink: #FFE8EF;

--border-subtle: rgba(17,18,19,0.06);  --border-default: rgba(17,18,19,0.08);
--border-hover:  rgba(17,18,19,0.14);  --border-active: rgba(17,18,19,0.22);
--card-border: rgba(17,18,31,0.07);

--text-primary: #14141F; --text-secondary: #55556A; --text-tertiary: #76768A;
--text-muted: #9CA3AF;   --text-placeholder: #B9B9C7;

--accent-info: #4A90D9; --accent-green: #22C55E; --accent-red: #EF4444;
--accent-amber: #F59E0B; --accent-purple: #8B5CF6;
```

Platform accents (icons/badges only, never CTAs): IG `#E1306C` stroke /
`#F0FDF4`+`#BBF7D0` banner; YT `#FF0000` fill / `#FEF2F2`+`#FECACA` banner;
verified check `#1D9BF0`; link blue `#2563EB`; tip box `bg #FFFBEB` + border `#FDE68A`.

## 5. Typography — Inter only

Loaded via `next/font/google` as `--font-inter`; `body { font-family: var(--font-inter), Inter, system-ui… }`.
Hero `2.6rem/1.05 extrabold` (preview variant `2rem`), H2 `xl extrabold`,
card title `15px bold`, body `13–15px regular`, caption `12px`, label `10–11px bold uppercase tracking 0.14em`.
Headings `110–125%`, body `150%`. Gradient headline span uses `.shimmer-text`.
Rule: never introduce another font; Jakarta references in old docs are void.

## 6. Spacing (8px grid — no arbitrary values)

`xs 4 · sm 8 · md 16 · lg 24 · xl 32 · 2xl 48 · 3xl 64`.
In code: card padding `p-4` (16) / `p-5` (20, timelines only), gaps `gap-3.5`
(14) between stacked cards, `gap-2.5` (10) inside grids, page `max-w-xl px-5`,
section top `pt-6/8`, sticky mobile bar `px-5 pb max(12px, safe-area)`.
Background blobs: `h-[480px]`, `w-96 h-96 blur-3xl opacity-20/25` — decorative only.

## 7. Radius + shadow (canonical — code wins over prose)

```css
--radius-sm: 10px;  /* chips, duration badges */
--radius-md: 14px;  /* thumbs, inner rows */
--radius-lg: 20px;  /* ALL cards */
--radius-xl: 24px;  /* large containers (reserved) */
--radius-pill: 9999px; /* ALL buttons, pills, tabs, progress track */
--shadow-sm: 0 1px 3px rgba(20,20,40,.05), 0 1px 2px rgba(20,20,40,.04);
--shadow-md: 0 6px 18px rgba(20,20,40,.07), 0 2px 6px rgba(20,20,40,.05);
--shadow-lg: 0 16px 40px rgba(20,20,40,.10), 0 4px 10px rgba(20,20,40,.06);
--shadow-brand: 0 6px 20px rgba(255,77,141,.32); /* gradient CTAs only */
--shadow-premium: 0 12px 32px rgba(20,20,40,.07); /* card default via arbitrary class */
```

Card pattern: `bg-white rounded-[20px] border border-black/[0.07] shadow-[premium]`.
Input: `rounded-[18px]`. Never use `rounded-3xl`/ad-hoc shadows.

## 8. Motion — Framer Motion only, ≤350ms

```ts
const EASE = [0.22, 1, 0.36, 1] as const; // every transition
// screen enter: { opacity: 0, y: 16 } → { opacity: 1, y: 0 }, 0.35s EASE, AnimatePresence mode="wait"
// tab content: x ±14, 0.2s · press: whileTap scale 0.97, 0.12s · hover lift: translateY(-2px), 180ms
// success pop: spring stiffness 300 damping 18 · glow pulse keyframes gr-glow 2.2s
```

CSS utilities in `globals.css`: `.gr-progress-fill` (gradient travel 1.6s +
width 0.4s), `.gr-input-glow.gr-sweep` (0.6s on platform change),
`.gr-check-draw` (0.45s), `.gr-confetti` (1.1s), `.gr-cta-shimmer`
(shimmer 2.6s + glow 2.2s), `.gr-lift`/`.gr-press`. `prefers-reduced-motion`
kills all animation. Never swap components without `AnimatePresence`.

## 9. Components (props/states — implement exactly)

- **SmartInput** (`states.tsx`): form `rounded-[18px] border brand-border shadow brand`,
  platform icon morph (`AnimatePresence`, 180ms), rotating placeholder
  (`ROTATING[4]`, 2200ms, hidden when value present), Paste button → clear-×
  toggle, `min-h-[44px]`, error `<p role="alert" accent-red>`. Sweep via `sweepKey`.
- **GradientButton**: full-width pill `min-h-[48px] 15px bold white`,
  `background: var(--brand-gradient)` + `var(--shadow-brand)`, `hover opacity .92`,
  loading spinner, `shimmer` variant only for Find Resources. Always `aria-label`.
- **PlatformBadge/TopBadge**: pill `10px uppercase tracking .14em brand-solid`,
  white bg + brand border. Texts: `Fast Downloader · Optional AI` (IG),
  `Fast Download · YouTube` (YT).
- **DetectionBanner**: IG green / YT red tints (§4), 8px icon disc + check disc.
- **PlatformPreview**: `IgPreview` (104px 9/16 thumb + duration badge, title 2-line,
  @creator + verified, views line, ≤3 tags) / `YtPreview` (16:9 thumb + duration,
  title, channel, meta). Expand animation `y 24 → 0`, 250ms.
- **YtOptions**: rows Video 1080p MP4 / Audio MP3 320kbps / Thumbnail JPG;
  selected `ring-2 brand-solid`, rows `min-h-[52px] rounded-2xl`.
- **DownloadCard/DownloadProgress**: title + meta + thumb, gradient progressbar
  (`role=progressbar`), % tabular, 4-step stepper (Validating/Downloading/
  Merging/Done; thresholds 25/60/88; current pulses 1.4s), waiting note card.
- **ProgressTimeline/AnalysisTimeline**: 6 steps (§11), rail `left-[15px]`,
  discs 32px (done green ✓ / current gradient pulse / todo elevated),
  stagger `delay i*0.05`, 250ms.
- **SuccessCard**: `SuccessCheck` (68px green disc + check-draw + 14 confetti) +
  headline (`Video/Reel downloaded successfully!`) + `DownloadedCard` +
  primary MP4 + platform extras. IG extras = ResourceCTA only;
  YT extras = 2-btn grid (MP3/thumbnail) + 3-row file list + tip box.
- **ResourceCTA**: `border #FFD9E4 bg #FFF0F4 rounded-3xl p-5 center`,
  copy verbatim: "✨ Need the hidden resources from this Reel? / Find links, get AI
  breakdown, detect comment bait and more." + shimmer GradientButton.
- **AnalysisTimeline cards**: `AnalysisLiveCards` — gradient bar + % + 4 mini-cards
  (Transcript/Frame/Caption/Comments: Complete green / Processing brand / Pending muted)
  + Did-you-know tip box (verbatim caption/comment/bio/bait copy).
- **ReportTabs**: pill row, active gets `layoutId="report-tab"` gradient 200ms;
  tabs `Overview Resources Transcript Tools Breakdown` (Resources shows `· n`).
  Content crossfades `x ±14`, 200ms. Overview = 88px-thumb summary card + Quick
  Summary; Resources = `ResourceList`; Transcript = `max-h-96 scroll`;
  Tools = pink pills + concepts; Breakdown = `RoadmapDisplay skipFirst`.
- **ResourceList**: header 🔗 + count pill (green), rows numbered pink disc,
  blue URL truncate, external-link 36px hit area, stagger `delay i*0.06`,
  empty state "No links found…".
- **VideoPlayer**: no custom player — native `<video controls>` wherever playback
  is needed + download actions beside it. No new player chrome.
- **DownloadsList**: not yet built — when built: filter All/Complete/Failed,
  rows thumb + size + status + progress, same card pattern. Do not freelance columns.
- **BottomNavigation** (`BottomNav.tsx`): mobile-only (`md:hidden fixed bottom-0 z-50`),
  Home/Download/History, `min-h-[56px]`, active brand-solid + gradient 24px underline,
  `safe-area-inset-bottom`, `aria-current`.
- **Modal**: `bg-card rounded 28px border card-border shadow-lg`, backdrop
  `blur 12px black/40`, spring in. (No modal in current flow — use this when adding one.)
- **Toast**: bottom-right desktop / above bottom-nav mobile, Success/Error/Info
  (green/red/info disc), slide+fade 250ms, auto-dismiss 4s, `role=status/alert`.
  Current code uses inline `role=alert` error text — keep until Toast exists.

## 10. Page states (`app/page.tsx` — do not add stages)

`idle → preview → downloading → success` (both) `→ analyzing → report` (IG only).
`AnimatePresence mode="wait"` around all; error returns to `preview`/`success`
with message. Sticky mobile Download pill on `preview`; sticky % pill on
`downloading`. Footer verbatim: "GetReel &mdash; No follows. No comments. No waiting."

## 11. AI step mapping (UI-only; backend SSE untouched)

```ts
// states.tsx aiIndexFor()
rate_limit|cache|download → 0 Preparing · transcribe → 1 Transcript
frames|analyze → 2 Analyzing · link → 3 Hidden links · classify → 4 Comment bait · roadmap → 5 Report
```
`aiPct = (idx+1)/6*100`. Labels in `AI_STEPS`/`LIVE_CARDS` are verbatim — do not reword.

## 12. Responsive

Single column `max-w-xl` on all breakpoints (no 1200px 2-col — that spec is void).
`html, body { overflow-x: hidden; overflow-x: clip; }` — page never scrolls
horizontally (kills extension-injected overflow); inner scrollers exempt.
Tablet = stretched cards. Mobile = full-width, 44px targets, sticky bottom
actions, `safe-area-inset-bottom`, `overflow-x-clip`, truncations + `line-clamp-2/3`.

## 13. Accessibility (non-negotiable)

Keyboard-operable inputs/buttons/tabs (`role=tablist/tab`, `aria-selected`);
`:focus-visible 2px brand-solid offset 2px`; `aria-label` on icon-only buttons;
`role=alert/status`; `prefers-reduced-motion` respected; touch targets ≥44px
(icon-only ≥36px inside 44px row).

## 14. Tailwind v4 mapping

Reference vars, not hex: `bg-[var(--bg-card)] text-[var(--text-secondary)]
border-[var(--brand-border)] shadow-[var(--shadow-sm)] rounded-[20px]`.
Brand gradient via `.bg-brand-gradient`, text via `.text-brand`. No new color
utilities; no arbitrary hex in JSX.

## 15. OpenCode agent rules

1. Read this file + `globals.css` + `states.tsx` before touching UI.
2. Never add deps for what Framer Motion/CSS already do.
3. Never copy GetReel blue or add screens outside §10 flows.
4. Every new UI reuses §9 components/tokens; deviations need explicit user sign-off.
5. `// ponytail:` marks deliberate simplifications with ceiling + upgrade path.
