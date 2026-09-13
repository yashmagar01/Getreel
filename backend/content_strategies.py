"""Pluggable content strategies — Strategy + Registry pattern.

Adding a new genre = one new file + one `register()` line.
Zero edits to `main.py`, the classifier, or existing strategies (Open/Closed).

Each strategy returns:
    {"content_type": str, "blocks": [ {type, title, ...}, ... ]}

Block types understood by the frontend generic renderer:
  - markdown_document  {body}
  - recap_card         {summary, genre_tags}
  - quick_summary      {body}
  - scene_list         {items: [{heading, body}]}
  - technique_list     {items: [{name, body}]}
  - comparison_table   {columns, rows}
  - list_section       {items: [str]}
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Any
import json
import re

from content_classifier import (
    ENTERTAINMENT_COMMENTARY,
    PURE_ENTERTAINMENT,
    TEASER_TUTORIAL,
)

logger = logging.getLogger(__name__)


class ContentStrategy(ABC):
    content_type: str

    @abstractmethod
    def generate(self, concept: dict, transcript: str) -> dict:
        """Returns {"content_type": str, "blocks": [...] }."""
        ...


_REGISTRY: dict[str, ContentStrategy] = {}


def register(strategy: ContentStrategy) -> ContentStrategy:
    _REGISTRY[strategy.content_type] = strategy
    return strategy


def get_strategy(content_type: str) -> ContentStrategy:
    return _REGISTRY.get(content_type, _REGISTRY[ENTERTAINMENT_COMMENTARY])


def registered_types() -> list[str]:
    return list(_REGISTRY.keys())


# ── Strategy A — TeaserRoadmapStrategy (existing behavior, moved not rewritten) ──

class TeaserRoadmapStrategy(ContentStrategy):
    content_type = TEASER_TUTORIAL

    def generate(self, concept: dict, transcript: str) -> dict:
        from roadmap_generator import generate_roadmap  # lazy: keeps import graph light for tests

        roadmap = generate_roadmap(concept)
        return {
            "content_type": self.content_type,
            "blocks": [
                {"type": "markdown_document", "title": "Roadmap", "body": roadmap}
            ],
            # Backward-compat: legacy consumers read `roadmap` directly.
            "roadmap_markdown": roadmap,
        }


register(TeaserRoadmapStrategy())


# ── Strategy B — EntertainmentCommentaryStrategy ──

_COMMENTARY_SYSTEM = """You are an expert media analyst who breaks down entertainment reels (movie edits, memes with a point, storytelling clips, dance/comedy with narrative) into an insightful breakdown.

CRITICAL RULES:
- Describe ONLY what is explicitly present in the transcript / analysis. Do not invent plot points, tools, or resources.
- Do NOT produce tutorial steps, tool lists, or resource links unless they were explicitly mentioned.
- Be honest and specific: name the storytelling / editing techniques you can actually observe.
- Respond ONLY with valid JSON. No markdown, no explanation, just the JSON."""

_COMMENTARY_MODEL = "openai/gpt-oss-120b"


def _commentary_user_prompt(concept: dict, transcript: str) -> str:
    topic = concept.get("topic", "")
    shows = concept.get("what_creator_shows", "")
    audience = concept.get("target_audience", "")
    return f"""Here is the analysis of an entertainment Instagram Reel:

TOPIC: {topic}

WHAT IS SHOWN ON SCREEN:
{shows}

TARGET AUDIENCE: {audience}

TRANSCRIPT (may be short or empty for music-only edits):
{(transcript or "")[:2000]}

Return a JSON object with EXACTLY these keys:
{{
  "quick_summary": "2-3 sentence summary of what this reel is",
  "scenes": [{{"heading": "short scene label", "body": "1-2 sentence description"}}],
  "techniques": [{{"name": "technique name", "body": "how it is used in this reel"}}],
  "comparison": {{"columns": ["...","..."], "rows": [["...","..."]]}} or null (use ONLY when a real-vs-fictional or expectation-vs-reality comparison genuinely applies, else null),
  "closing": "one-sentence synthesis"
}}

Respond ONLY with valid JSON."""


class EntertainmentCommentaryStrategy(ContentStrategy):
    content_type = ENTERTAINMENT_COMMENTARY

    def generate(self, concept: dict, transcript: str) -> dict:
        from providers import build_chain, complete_with_fallback

        chain = build_chain()
        if not chain:
            raise Exception("No AI providers configured (need at least GROQ_API_KEY or GOOGLE_API_KEY).")

        logger.info(f"Generating entertainment breakdown via provider chain ({len(chain)} providers)...")
        raw = complete_with_fallback(
            chain, _COMMENTARY_SYSTEM, _commentary_user_prompt(concept, transcript),
            model=_COMMENTARY_MODEL, max_tokens=1800, temperature=0.3,
        )

        data = _parse_json(raw)
        blocks: list[dict[str, Any]] = []
        if data.get("quick_summary"):
            blocks.append({"type": "quick_summary", "title": "Quick Summary", "body": data["quick_summary"]})
        if data.get("scenes"):
            blocks.append({"type": "scene_list", "title": "Scene-by-Scene Breakdown",
                           "items": [{"heading": s.get("heading", ""), "body": s.get("body", "")} for s in data["scenes"]]})
        if data.get("techniques"):
            blocks.append({"type": "technique_list", "title": "Storytelling & Editing Techniques",
                           "items": [{"name": t.get("name", ""), "body": t.get("body", "")} for t in data["techniques"]]})
        comp = data.get("comparison")
        if comp and comp.get("rows"):
            blocks.append({"type": "comparison_table", "title": "What's Real vs What's Shown",
                           "columns": comp.get("columns") or ["Claim", "Reality"],
                           "rows": comp.get("rows")})
        if data.get("closing"):
            blocks.append({"type": "quick_summary", "title": "Takeaway", "body": data["closing"]})

        if not blocks:  # model returned empty JSON — never return an empty page
            blocks.append({"type": "quick_summary", "title": "Quick Summary",
                           "body": str(concept.get("topic") or "An entertainment reel with no further breakdown available.")})

        return {"content_type": self.content_type, "blocks": blocks}


def _parse_json(raw: str) -> dict:
    text = raw.strip()
    if "```" in text:
        m = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
        if m:
            text = m.group(1).strip()
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as e:
        raise Exception(f"Commentary model returned malformed JSON: {e}. Raw: {raw[:300]}")
    return parsed if isinstance(parsed, dict) else {}


register(EntertainmentCommentaryStrategy())


# ── Strategy C — PureEntertainmentStrategy (deliberately cheap: zero LLM calls) ──

class PureEntertainmentStrategy(ContentStrategy):
    content_type = PURE_ENTERTAINMENT

    def generate(self, concept: dict, transcript: str) -> dict:
        concept = concept or {}
        topic = str(concept.get("topic") or "This reel").strip()
        audience = str(concept.get("target_audience") or "").strip()
        genre_tags: list[str] = list(getattr(self, "_genre_tags_override", None) or [])

        if not genre_tags:
            # Best-effort tags without importing classifier internals twice
            try:
                from content_classifier import _infer_genre_tags  # type: ignore
                genre_tags = _infer_genre_tags(concept, transcript)
            except Exception:
                genre_tags = []

        descriptor = ", ".join(genre_tags) if genre_tags else "entertainment clip"
        summary = (
            f"{topic} — a {descriptor} with no hidden resource or tutorial content to extract."
            + (f" Made for {audience}." if audience else "")
        )
        return {
            "content_type": self.content_type,
            "blocks": [
                {
                    "type": "recap_card",
                    "title": "What this reel is",
                    "summary": summary,
                    "genre_tags": genre_tags,
                    "topic": topic,
                    "target_audience": audience,
                }
            ],
        }


register(PureEntertainmentStrategy())
