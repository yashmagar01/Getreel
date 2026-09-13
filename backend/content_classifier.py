"""Content classification — rule-first, LLM-last.

Derives a `Classification` from the `concept` dict that `analyze_concept()`
already returns. Costs nothing extra in the common case; falls back to a
lightweight LLM call only when genuinely ambiguous (currently disabled by
default — ambiguous inputs map to the safe `entertainment_commentary` default).

Phases A (observational logging) → C (live routing) of the migration plan.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

TEASER_TUTORIAL = "teaser_tutorial"
ENTERTAINMENT_COMMENTARY = "entertainment_commentary"
PURE_ENTERTAINMENT = "pure_entertainment"

VALID_TYPES = frozenset({TEASER_TUTORIAL, ENTERTAINMENT_COMMENTARY, PURE_ENTERTAINMENT})

_NONE_TOKENS = frozenset({"", "none", "n/a", "na", "nothing", "not applicable", "unknown"})

_GENRE_KEYWORDS: dict[str, list[str]] = {
    "dance": ["dance", "dancing", "choreography", "hook step", "trending step"],
    "comedy": ["funny", "comedy", "meme", "humour", "humor", "skit", "prank", "lip-sync", "lipsync"],
    "lip-sync": ["lip-sync", "lipsync", "lip sync"],
    "movie-edit": ["movie", "cinematic", "edit", "fan edit", "scene"],
    "fashion": ["outfit", "fashion", "ootd", "styling", "makeup", "grwm"],
    "fitness": ["workout", "gym", "fitness", "exercise"],
    "food": ["recipe", "cooking", "food"],
}


@dataclass
class Classification:
    content_type: str
    confidence: float
    genre_tags: list[str] = field(default_factory=list)


def _is_empty_withheld(withheld: str) -> bool:
    return withheld.strip().lower() in _NONE_TOKENS


def _infer_genre_tags(concept: dict, transcript: str) -> list[str]:
    haystack = " ".join([
        str(concept.get("topic") or ""),
        str(concept.get("what_creator_shows") or ""),
        str(concept.get("target_audience") or ""),
        transcript or "",
    ]).lower()
    tags: list[str] = []
    for tag, keywords in _GENRE_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            tags.append(tag)
    return tags


def classify(concept: dict, transcript: str) -> Classification:
    """Rule-first classification.

    Rule 1 — teaser signal present in existing concept extraction → teaser_tutorial.
    Rule 2 — enough spoken content for narrative/commentary value → entertainment_commentary.
    Rule 3 — everything else → pure_entertainment.
    """
    concept = concept or {}
    transcript = transcript or ""

    withheld = str(concept.get("what_creator_withholds") or "").strip().lower()
    tools = concept.get("tools_mentioned") or []
    key_concepts = concept.get("key_concepts") or []

    # Rule 1 — clear teaser signal already present
    if (withheld and withheld not in _NONE_TOKENS) or tools or key_concepts:
        result = Classification(TEASER_TUTORIAL, 0.9, [])
        logger.info(f"[CLASSIFY] teaser_tutorial (withheld={withheld[:60]!r}, tools={len(tools)}, concepts={len(key_concepts)})")
        return result

    # Rule 2 — narrative/commentary value: enough text signal to say something about
    word_count = len(transcript.split())
    # Also count on-screen/narrative description as signal
    shows = str(concept.get("what_creator_shows") or "")
    topic = str(concept.get("topic") or "")
    descriptive_chars = len(shows) + len(topic)
    if word_count > 40 or descriptive_chars > 120:
        result = Classification(ENTERTAINMENT_COMMENTARY, 0.6, [])
        logger.info(f"[CLASSIFY] entertainment_commentary (words={word_count}, desc_chars={descriptive_chars})")
        return result

    # Rule 3 — near-zero text signal: dance / lip-sync / comedy
    tags = _infer_genre_tags(concept, transcript)
    result = Classification(PURE_ENTERTAINMENT, 0.7, tags)
    logger.info(f"[CLASSIFY] pure_entertainment (words={word_count}, tags={tags})")
    return result


def normalize_content_type(value: str | None) -> str:
    """Safe coercion for untrusted stored values → valid content_type."""
    if value in VALID_TYPES:
        return value
    return ENTERTAINMENT_COMMENTARY
