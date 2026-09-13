# GetReel Design Tokens

Single source of truth for every color, radius, shadow, and font variable used in the app.
All tokens live in `app/globals.css` `:root` and are consumed via `var(--token-name)`.

---

## Surface Tokens

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#F5F6FA` | Page background |
| `--bg-secondary` | `#FFFFFF` | Section backgrounds |
| `--bg-card` | `#FFFFFF` | Card/panel surfaces |
| `--bg-elevated` | `#FAFAFA` | Slightly raised surfaces (step rows, list items) |
| `--bg-hover` | `#F0F1F8` | Hover state fills, empty-state backgrounds |

## Border Tokens

| Token | Value | Usage |
|---|---|---|
| `--border-subtle` | `rgba(0,0,0,0.06)` | Hairline separators |
| `--border-default` | `rgba(0,0,0,0.10)` | Default card/input borders |
| `--border-hover` | `rgba(0,0,0,0.16)` | Hovered border |
| `--border-active` | `rgba(0,0,0,0.24)` | Focused/active border |

## Text Tokens

| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#111213` | Body copy, headings |
| `--text-secondary` | `#4B4B58` | Descriptions, secondary labels |
| `--text-tertiary` | `#767676` | Captions, tertiary info |
| `--text-muted` | `#9CA3AF` | Helper text, disabled labels |
| `--text-placeholder` | `#C4C4C4` | Input placeholder text |

## Brand Tokens

| Token | Value | Usage |
|---|---|---|
| `--brand-gradient` | `linear-gradient(135deg, #FF876E, #FF4785)` | Primary CTA fills, progress bars, badges |
| `--brand-solid` | `#FE6A78` | Text-color brand accents, icon strokes |
| `--brand-dim` | `rgba(254,106,120,0.10)` | Tinted hover/active backgrounds |
| `--brand-border` | `rgba(254,106,120,0.25)` | Bordered elements with brand tint |

> **Rule:** Use `--brand-gradient` for filled CTA buttons and progress bars only.
> Use `--brand-solid` for text, icon colors, and outline accents.
> Use `--brand-dim` / `--brand-border` for tinted surfaces — never as button fills.

## Status / Info Accents
*(Intentionally kept separate from brand so CTAs stand out)*

| Token | Value | Usage |
|---|---|---|
| `--accent-info` | `#4A90D9` | Status indicators, info badges |
| `--accent-green` | `#22c55e` | Success states |
| `--accent-red` | `#ef4444` | Error states, mistakes list |
| `--accent-amber` | `#f59e0b` | Warnings, medium confidence |
| `--accent-purple` | `#8B5CF6` | Spare / future use |

## Radius Scale

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `8px` | Small chips, badges |
| `--radius-md` | `12px` | List rows, inner cards |
| `--radius-lg` | `16px` | Main cards, modals |
| `--radius-xl` | `20px` | Large containers |
| `--radius-pill` | `9999px` | Buttons, pills, dots |

## Shadow Scale

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06)…` | Default card shadow |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)…` | Elevated / hovered cards |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.10)…` | Modals, overlays |
| `--shadow-brand` | `0 4px 16px rgba(254,106,120,0.25)` | Brand-colored CTA shadow |

## Typography

| Variable | Font | Weights | Usage |
|---|---|---|---|
| `--font-jakarta` | Plus Jakarta Sans | 400, 500, 600, 700 | All UI text |

> Font is loaded via `next/font/google` in `app/layout.tsx` and applied globally on `body`.

---

## Component → Token Map (quick reference)

| Component | Key tokens used |
|---|---|
| `Card.tsx` | `--bg-card`, `--border-default`, `--radius-lg`, `--shadow-sm/md`, `--brand-dim`, `--brand-border` |
| `PrimaryButton.tsx` | `--brand-gradient`, `--shadow-brand`, `--brand-solid`, `--brand-dim`, `--radius-pill` |
| `ProgressBar.tsx` | `--brand-gradient`, `--accent-info`, `--radius-pill` |
| `MediaListRow.tsx` | `--bg-card`, `--brand-dim`, `--brand-border`, `--radius-md`, `--border-default` |
| `LoadingState.tsx` | `--brand-gradient`, `--brand-solid`, `--brand-dim`, `--brand-border` |
| `LinkInputCard.tsx` | `--brand-border`, `--brand-solid`, `--brand-dim`, `--border-default`, `--radius-pill` |

---

## Adding New Tokens

1. Add to `:root` in `app/globals.css`.
2. Document here with value + usage.
3. Never introduce ad-hoc hex colors in component JSX — always reference a token.
