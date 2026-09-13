"""Table-driven tests for the rule-first content classifier (Phase 6).

Covers the three rules against fixture `concept` dicts:
  teaser signal present / narrative-only / near-empty.
"""
import pytest

from content_classifier import (
    ENTERTAINMENT_COMMENTARY,
    PURE_ENTERTAINMENT,
    TEASER_TUTORIAL,
    classify,
    normalize_content_type,
)


def _concept(**overrides):
    base = {
        "topic": "",
        "what_creator_shows": "",
        "what_creator_withholds": "none",
        "target_audience": "",
        "tools_mentioned": [],
        "key_concepts": [],
    }
    base.update(overrides)
    return base


@pytest.mark.unit
@pytest.mark.parametrize(
    "concept,transcript",
    [
        # Withheld secret → teaser
        (_concept(what_creator_withholds="the exact prompt he used, only revealed in comments"), "short clip"),
        # Named tools → teaser
        (_concept(what_creator_withholds="none", tools_mentioned=["CapCut", "Premiere Pro"]), ""),
        # Key concepts → teaser
        (_concept(what_creator_withholds="", key_concepts=["hook retention", "pattern interrupt"]), ""),
    ],
)
def test_rule1_teaser_signal(concept, transcript):
    result = classify(concept, transcript)
    assert result.content_type == TEASER_TUTORIAL
    assert result.confidence == pytest.approx(0.9)


@pytest.mark.unit
@pytest.mark.parametrize(
    "concept,transcript",
    [
        # Long spoken transcript, nothing withheld → commentary
        (_concept(topic="A breakdown of that viral movie edit"), " ".join(["word"] * 60)),
        # Rich on-screen description counts as signal even with short transcript
        (_concept(topic="Cinematic fan edit", what_creator_shows="x" * 200), "nice edit"),
    ],
)
def test_rule2_narrative_commentary(concept, transcript):
    result = classify(concept, transcript)
    assert result.content_type == ENTERTAINMENT_COMMENTARY


@pytest.mark.unit
def test_rule3_pure_entertainment_near_empty():
    concept = _concept(topic="funny dance trend", what_creator_shows="person dancing")
    result = classify(concept, "wow nice")
    assert result.content_type == PURE_ENTERTAINMENT
    assert isinstance(result.genre_tags, list)


@pytest.mark.unit
def test_rule3_genre_tags_inferred():
    concept = _concept(topic="funny lip-sync skit")
    result = classify(concept, "")
    assert result.content_type == PURE_ENTERTAINMENT
    assert "comedy" in result.genre_tags or "lip-sync" in result.genre_tags


@pytest.mark.unit
def test_handles_none_inputs():
    result = classify({}, "")
    assert result.content_type == PURE_ENTERTAINMENT


@pytest.mark.unit
@pytest.mark.parametrize(
    "value,expected",
    [
        ("teaser_tutorial", "teaser_tutorial"),
        ("entertainment_commentary", "entertainment_commentary"),
        ("pure_entertainment", "pure_entertainment"),
        (None, "entertainment_commentary"),
        ("", "entertainment_commentary"),
        ("meme_explainer", "entertainment_commentary"),  # unknown → safe default
    ],
)
def test_normalize_content_type(value, expected):
    assert normalize_content_type(value) == expected
