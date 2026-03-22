# 🧪 Link Resolver Test Results

> **Date:** 22 March 2026  
> **Version:** Post-fix (6 bugs patched)  
> **Tester:** Yash  
> **Harness:** `backend/test_link_resolver.py`

---

## Test Dataset

| # | Reel URL | Expected Layer | Expected Domain |
|---|---|---|---|
| 1 | *(fill after run)* | caption | gumroad.com |
| 2 | *(fill after run)* | caption | notion.so |
| 3 | *(fill after run)* | caption | bit.ly |
| 4 | *(fill after run)* | bio | linktr.ee |
| 5 | *(fill after run)* | bio | beacons.ai |
| 6 | *(fill after run)* | bio | gumroad.com |
| 7 | *(fill after run)* | transcript | gumroad.com |
| 8 | *(fill after run)* | transcript | udemy.com |
| 9 | *(fill after run)* | targeted_search | any |
| 10 | *(fill after run)* | generic_search | any |

---

## Score: Before Fixes (estimated baseline)

> [!NOTE]
> These are estimated pre-fix scores based on code audit. Layer 3 was 0% due to the Instagram scraping bug.

| Layer | Hit Rate | Reason for Failure |
|---|---|---|
| L0 (info dict) | — | Did not exist |
| L1 (caption) | ~60% | Only worked when URL was explicit in caption |
| L2 (transcript) | ~20% | Regex-only, missed natural language hints |
| L3 (bio) | **0%** | Instagram scraping returns React shell — always empty |
| L4 (targeted) | ~40% | No retry on DDG rate limits |
| L5 (generic) | ~50% | Query too broad — returned SEO spam |
| **Overall** | **~3–4/10** | **30–40% hit rate** |

---

## Score: After Fixes

> Fill this table in after running `python test_link_resolver.py` with real URLs.

| Layer | Hit Rate | Notes |
|---|---|---|
| L0 (info dict) | __ / 10 | |
| L1 (caption) | __ / 10 | |
| L2 regex | __ / 10 | |
| L2 LLM | __ / 10 | |
| L3 (bio via ytdlp) | __ / 10 | |
| L4 (targeted) | __ / 10 | |
| L5 (generic) | __ / 10 | |
| **Overall** | **__ / 10** | **__ %** |

---

## Bug Fixes Applied

| Bug | Fix Applied | Impact |
|---|---|---|
| BUG 1: No Layer 0 | Added `_check_info_dict()` — mines yt-dlp metadata before any network calls | Catches bio links that yt-dlp already fetched |
| BUG 2: Regex-only transcript | Added `_check_transcript_llm()` — Groq LLM extracts verbally-hinted resources | Catches "go to my Gumroad", "free Notion template" etc. |
| BUG 3: Instagram scraping broken | Replaced `httpx.get(instagram.com)` with yt-dlp info dict read | Layer 3 is now functional |
| BUG 4: Layer 3 ignored info dict | Layer 3 now reads `uploader_url`/`channel_url` from info dict | High-value fix — yt-dlp often has the bio URL |
| BUG 5: No DDG retry | Added `_safe_ddg_search()` with exponential backoff (2s, 4s, 8s) | Layers 4/5 no longer silently fail on rate limits |
| BUG 6: Generic query too broad | Added `withheld_kw` to Layer 5 query | More specific results, less SEO spam |

---

## How to Run

```powershell
cd c:\Users\Yash\OneDrive\Desktop\Getreel\reel-decoder\backend
.\venv\Scripts\activate
python test_link_resolver.py
```

> [!IMPORTANT]
> You must populate `TEST_REELS` in `test_link_resolver.py` with real Instagram reel URLs before running.
> Replace `PLACEHOLDER_*` values with actual URLs.

Raw JSON output is saved to `TEST_RESULTS_RAW.json` automatically.

---

## Observations (fill after run)

### Most Common Failure Reason
*(e.g., "Layer 3 still fails because yt-dlp doesn't return uploader_url for Indian creators")*

### Surprising Findings
*(e.g., "Layer 0 caught 4/10 reels — most creators had external links in the info dict")*

### Next Steps
*(e.g., "Consider adding Wayback Machine fallback for bio layer")*
