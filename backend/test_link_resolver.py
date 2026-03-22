import os
import sys
import json
import time
import tempfile
import shutil
import logging


# ── Setup ─────────────────────────────────────────────────────────────────────


# Load .env before importing anything that reads env vars
from dotenv import load_dotenv
load_dotenv()


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("test_link_resolver")


# Import the pipeline modules
from downloader import download_reel
from transcriber import transcribe_audio
from analyzer import analyze_concept
from frame_extractor import extract_frames
from link_finder import (
    find_promised_link,
    _check_comments,
    _check_info_dict,
    _check_caption,
    _check_transcript,
    _check_creator_bio,
    _check_targeted_search,
    _check_generic_search,
    is_junk_url,
)



# ── TEST DATASET ──────────────────────────────────────────────────────────────
# YASH: Replace each PLACEHOLDER URL with a real Instagram reel URL.
# Keep the description, expected_layer, and expected_domain_hint annotations
# accurate for your chosen reel — this helps interpret the score report.


TEST_REELS = [
    # ── Group A: Link IS in the caption ──────────────────────────────────────
    {
        "url": "https://www.instagram.com/reel/DUHkGtFkQ74/",
        "description": "Reel where creator puts resource link directly in caption (discount link)",
        "expected_layer": "caption",
        "expected_domain_hint": "thefeed.com",  # discount link via caption text
    },
    {
        "url": "https://www.instagram.com/reel/DCh71HqSbFJ/",
        "description": "Reel where creator puts product / resource link directly in caption",
        "expected_layer": "caption",
        "expected_domain_hint": "amazon.com",  # product-style caption link
    },
    {
        "url": "https://www.instagram.com/reel/DVAzu2pk7lJ/",
        "description": "Shopping / outfit reel with 'Shop the look — link in caption'",
        "expected_layer": "caption",
        "expected_domain_hint": "firstcryindia.com",  # brand hinted in caption
    },
    # ── Group B: Creator says "link in bio" ───────────────────────────────────
    {
        "url": "https://www.instagram.com/reel/DWIarSWACKz/",
        "description": "Creator says 'New Video Out link in bio' to push traffic to external link",
        "expected_layer": "bio",
        "expected_domain_hint": "youtube.com",
    },
    {
        "url": "https://www.instagram.com/reel/DVUphq9kVMd/",
        "description": "Creator says 'New video out now' and uses #linkinbio #linkinstory",
        "expected_layer": "bio",
        "expected_domain_hint": "youtube.com",
    },
    {
        "url": "https://www.instagram.com/reel/DWHaZV5D6N0/",
        "description": "Short teaser where creator says new video out, 'link in my bio'",
        "expected_layer": "bio",
        "expected_domain_hint": "youtube.com",
    },
    # ── Group C: Creator mentions platform verbally ───────────────────────────
    {
        "url": "https://www.instagram.com/reel/DVzMnxACS7Y/",
        "description": "Creator talks about new IG feature adding clickable links to reels, mentions linking profiles/reels",
        "expected_layer": "transcript",
        "expected_domain_hint": "instagram.com",
    },
    {
        "url": "https://www.instagram.com/reel/DTiy8MKEqux/",
        "description": "Creator verbally explains adding clickable links using Edits app, mentions linking profiles and reels",
        "expected_layer": "transcript",
        "expected_domain_hint": "instagram.com",
    },
    # ── Group D: Worst case — link is completely hidden ───────────────────────
    {
        "url": "https://www.instagram.com/reel/DVPopaCDIRG/",
        "description": "Promotion video saying link in bio; actual external URL not visible in caption text",
        "expected_layer": "targeted_search",
        "expected_domain_hint": "any",
    },
    {
        "url": "https://www.instagram.com/reel/DVLa4JekmEA/",
        "description": "DJ content teaser; user must infer resource from creator/profile, no explicit URL in caption",
        "expected_layer": "generic_search",
        "expected_domain_hint": "any",
    },
]



# ── Per-reel test runner ───────────────────────────────────────────────────────


def test_reel(reel: dict, temp_dir: str) -> dict:
    """
    Run the full pipeline + per-layer isolation test for a single reel.
    Returns a result dict with all layer outputs.
    """
    url = reel["url"]
    print(f"\n{'='*70}")
    print(f"🎬 TESTING: {url}")
    print(f"   Expected: Layer={reel['expected_layer']} | Domain={reel['expected_domain_hint']}")
    print(f"{'='*70}")


    result = {
        "reel_url": url,
        "description": reel["description"],
        "expected_layer": reel["expected_layer"],
        "expected_domain_hint": reel["expected_domain_hint"],
        "info_summary": {},
        "transcript_preview": "",
        "layer_results": {
            "comments": None,
            "info_dict": None,
            "caption": None,
            "transcript": None,
            "bio": None,
            "targeted_search": None,
            "generic_search": None,
        },
        "final_result": None,
        "winner_layer": None,
        "error": None,
        "time_seconds": 0,
    }


    start = time.time()


    # ── Step 1: Download reel ─────────────────────────────────────────────────
    print("\n📥 Step 1: Downloading reel...")
    try:
        reel_temp = os.path.join(temp_dir, url.split("/reel/")[1].split("/")[0][:20])
        os.makedirs(reel_temp, exist_ok=True)
        download_result = download_reel(url, reel_temp)
        info = download_result["info"]
        video_path = download_result["video_path"]
        audio_path = download_result["audio_path"]
    except Exception as e:
        result["error"] = f"Download failed: {e}"
        print(f"❌ Download failed: {e}")
        return result


    # ── Step 2: Print info dict summary ──────────────────────────────────────
    info_summary = {
        k: v for k, v in info.items()
        if k in ["description", "uploader", "uploader_id", "uploader_url",
                 "channel_url", "webpage_url", "comment_count", "duration", "tags"]
    }
    # Truncate long description
    if "description" in info_summary and info_summary["description"]:
        info_summary["description"] = info_summary["description"][:300] + "..."
    result["info_summary"] = info_summary


    print("\n📋 yt-dlp Info Dict (key fields):")
    print(json.dumps(info_summary, indent=2, default=str))


    # ── Step 3: Transcribe ────────────────────────────────────────────────────
    print("\n🎙️  Step 2: Transcribing audio...")
    try:
        transcript = transcribe_audio(audio_path)
        result["transcript_preview"] = transcript[:400]
        print(f"\n📝 Transcript ({len(transcript)} chars):\n{transcript[:400]}")
    except Exception as e:
        transcript = ""
        result["error"] = f"Transcription failed: {e}"
        print(f"⚠️  Transcription failed: {e}")


    # ── Step 4: Extract frames + analyze concept ──────────────────────────────
    concept = {"topic": "unknown", "what_creator_withholds": "", "tools_mentioned": []}
    try:
        frames = extract_frames(video_path, reel_temp)
        concept = analyze_concept(transcript, frames)
        print(f"\n🧠 Concept extracted: {concept.get('topic', 'N/A')}")
    except Exception as e:
        print(f"⚠️  Concept analysis failed (using fallback): {e}")


    # ── Step 5: Per-layer isolation tests ─────────────────────────────────────
    print("\n" + "─"*50)
    print("🔬 LAYER-BY-LAYER ISOLATION TEST")
    print("─"*50)

    comments = info.get("comments") or []
    uploader_id = info.get("uploader_id", "")

    print("\n[L-1] Comments:")
    try:
        result["layer_results"]["comments"] = _check_comments(comments, uploader_id)
        print(f"     → {result['layer_results']['comments']}")
    except Exception as e:
        print(f"     → ERROR: {e}")

    print("\n[L0] Info Dict:")
    try:
        result["layer_results"]["info_dict"] = _check_info_dict(info)
        print(f"     → {result['layer_results']['info_dict']}")
    except Exception as e:
        print(f"     → ERROR: {e}")


    print("\n[L1] Caption:")
    try:
        result["layer_results"]["caption"] = _check_caption(info)
        print(f"     → {result['layer_results']['caption']}")
    except Exception as e:
        print(f"     → ERROR: {e}")


    print("\n[L2] Transcript (regex + LLM):")
    try:
        result["layer_results"]["transcript"] = _check_transcript(transcript)
        print(f"     → {result['layer_results']['transcript']}")
    except Exception as e:
        print(f"     → ERROR: {e}")


    print("\n[L3] Creator Bio (yt-dlp info dict):")
    try:
        result["layer_results"]["bio"] = _check_creator_bio(info, concept)
        print(f"     → {result['layer_results']['bio']}")
    except Exception as e:
        print(f"     → ERROR: {e}")


    print("\n[L4] Targeted DuckDuckGo Search:")
    try:
        result["layer_results"]["targeted_search"] = _check_targeted_search(info, concept)
        print(f"     → {result['layer_results']['targeted_search']}")
    except Exception as e:
        print(f"     → ERROR: {e}")


    print("\n[L5] Generic DuckDuckGo Search:")
    try:
        result["layer_results"]["generic_search"] = _check_generic_search(concept)
        print(f"     → {result['layer_results']['generic_search']}")
    except Exception as e:
        print(f"     → ERROR: {e}")


    # ── Step 6: Full pipeline result ──────────────────────────────────────────
    print("\n" + "─"*50)
    print("🔗 FULL PIPELINE RESULT:")
    print("─"*50)
    try:
        full_result = find_promised_link(info, transcript, concept, comments=comments)
        result["final_result"] = full_result
        if full_result:
            result["winner_layer"] = full_result.get("source", "unknown")
            print(f"✅ FOUND via [{full_result.get('source')}]: {full_result.get('url')}")
        else:
            print("❌ No link found across all layers")
    except Exception as e:
        result["error"] = f"find_promised_link failed: {e}"
        print(f"❌ ERROR: {e}")


    result["time_seconds"] = round(time.time() - start, 1)
    print(f"\n⏱️  Time: {result['time_seconds']}s")
    return result



# ── Score Report ──────────────────────────────────────────────────────────────


def generate_score_report(test_results: list[dict]):
    total = len(test_results)
    found_any = [r for r in test_results if r["final_result"] is not None]
    errors = [r for r in test_results if r.get("error")]


    # Layer hit counts (isolation test)
    layer_hits = {
        "comments": 0, "info_dict": 0, "caption": 0, "transcript": 0,
        "bio": 0, "targeted_search": 0, "generic_search": 0,
    }
    for r in test_results:
        for layer, val in r.get("layer_results", {}).items():
            if val is not None:
                layer_hits[layer] += 1


    # Winner layer distribution (what actually resolved in full pipeline)
    winner_counts: dict[str, int] = {}
    for r in test_results:
        if r.get("winner_layer"):
            winner_counts[r["winner_layer"]] = winner_counts.get(r["winner_layer"], 0) + 1


    print("\n\n" + "="*60)
    print("📊 LINK RESOLVER SCORE REPORT")
    print("="*60)
    print(f"Total reels tested:    {total}")
    print(f"Errors (skip):         {len(errors)}")
    print(f"Any link found:        {len(found_any)}/{total}  ({len(found_any)/max(total,1)*100:.0f}%)")


    print("\n── Layer hit rates (isolation, per-layer) ───────────────────")
    for layer, count in layer_hits.items():
        bar = "█" * count + "░" * (total - count)
        print(f"  L{list(layer_hits.keys()).index(layer)}: {layer:20s}: {count}/{total}  {bar}")


    print("\n── Winner layer distribution (full pipeline) ────────────────")
    if winner_counts:
        for layer, count in sorted(winner_counts.items(), key=lambda x: -x[1]):
            print(f"  {layer:20s}: {count} reels")
    else:
        print("  (no links found)")


    print("\n── Failing reels ────────────────────────────────────────────")
    failing = [r for r in test_results if r["final_result"] is None and not r.get("error")]
    for r in failing:
        print(f"  ❌ {r['reel_url'][:80]}")
        print(f"     Expected: {r['expected_layer']} | domain hint: {r['expected_domain_hint']}")
        print(f"     Caption len: {len(r['info_summary'].get('description','') or '')}")
        print(f"     Transcript: {len(r.get('transcript_preview',''))} chars")


    if errors:
        print("\n── Errors ────────────────────────────────────────────────────")
        for r in errors:
            print(f"  💥 {r['reel_url'][:80]}")
            print(f"     {r['error']}")


    print("="*60)
    return {
        "total": total,
        "found": len(found_any),
        "hit_rate": round(len(found_any) / max(total, 1) * 100),
        "layer_hits": layer_hits,
    }



# ── Main ──────────────────────────────────────────────────────────────────────


def main():
    print("🔬 Reel Decoder — Link Resolver Test Harness")
    print("─"*60)


    # Filter out placeholder URLs
    runnable = [r for r in TEST_REELS if not r["url"].startswith("PLACEHOLDER")]


    if not runnable:
        print("\n⚠️  No real URLs found in TEST_REELS!")
        print("   Open test_link_resolver.py and replace PLACEHOLDER_* values")
        print("   with real Instagram Reel URLs before running.\n")
        sys.exit(1)


    print(f"📋 Running tests for {len(runnable)}/{len(TEST_REELS)} reels")
    print(f"   (Skipping {len(TEST_REELS) - len(runnable)} placeholder entries)\n")


    temp_dir = tempfile.mkdtemp(prefix="reel_test_")
    all_results = []


    try:
        for i, reel in enumerate(runnable, 1):
            print(f"\n🎯 [{i}/{len(runnable)}] Starting test...")
            result = test_reel(reel, temp_dir)
            all_results.append(result)
            # Brief pause between reels to avoid rate limits
            if i < len(runnable):
                print("\n⏸️  Pausing 3s before next reel (rate limit protection)...")
                time.sleep(3)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


    # Save raw results as JSON
    results_path = os.path.join(os.path.dirname(__file__), "..", "TEST_RESULTS_RAW.json")
    with open(results_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f"\n💾 Raw results saved to: TEST_RESULTS_RAW.json")


    # Print score report
    generate_score_report(all_results)



if __name__ == "__main__":
    main()
