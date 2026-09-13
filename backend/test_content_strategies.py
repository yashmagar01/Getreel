"""Tests for the pluggable content strategies + registry (Phase 6).

- Teaser fixture → existing roadmap behaviour unchanged (regression guard).
- Entertainment-commentary fixture (Chitti-style narrative input) → scene
  breakdown + comparison table blocks (LLM layer mocked).
- Pure-entertainment fixture → `recap_card` and ZERO calls to the expensive
  model (cost-control regression test).
"""
import json

import pytest

import content_strategies as strategies
from content_strategies import get_strategy, registered_types


@pytest.mark.unit
def test_registry_has_all_three_types():
    assert set(registered_types()) == {
        "teaser_tutorial",
        "entertainment_commentary",
        "pure_entertainment",
    }


@pytest.mark.unit
def test_get_strategy_unknown_falls_back_to_commentary():
    assert get_strategy("meme_explainer").content_type == "entertainment_commentary"


@pytest.mark.unit
def test_teaser_strategy_wraps_existing_roadmap(monkeypatch):
    """Phase B parity: teaser path output identical to generate_roadmap()."""
    import roadmap_generator

    monkeypatch.setattr(
        roadmap_generator, "generate_roadmap", lambda concept: "## Roadmap\nGuide body"
    )
    strategy = get_strategy("teaser_tutorial")
    result = strategy.generate({"topic": "AI photo editing"}, "transcript")
    assert result["content_type"] == "teaser_tutorial"
    assert result["blocks"] == [
        {"type": "markdown_document", "title": "Roadmap", "body": "## Roadmap\nGuide body"}
    ]
    assert result["roadmap_markdown"] == "## Roadmap\nGuide body"


COMMENTARY_LLM_JSON = json.dumps({
    "quick_summary": "A cinematic fan edit of Chitti the robot set to a trending sound.",
    "scenes": [
        {"heading": "Opening hook", "body": "Close-up of Chitti's eyes lighting up."},
        {"heading": "Climax beat-drop", "body": "Action montage synced to the drop."},
    ],
    "techniques": [
        {"name": "Beat-sync cutting", "body": "Cuts land exactly on the kick drum."},
        {"name": "Speed ramping", "body": "Slow-mo into the punch moment."},
    ],
    "comparison": {
        "columns": ["What's shown", "Reality"],
        "rows": [["Robot with emotions", "CGI and choreography"]],
    },
    "closing": "A textbook beat-sync fan edit.",
})


@pytest.mark.unit
def test_commentary_strategy_structured_blocks(monkeypatch):
    import providers

    monkeypatch.setattr(providers, "build_chain", lambda: [object()])
    monkeypatch.setattr(
        providers, "complete_with_fallback", lambda *a, **k: COMMENTARY_LLM_JSON
    )
    strategy = get_strategy("entertainment_commentary")
    concept = {
        "topic": "Chitti robot fan edit",
        "what_creator_shows": "Cinematic montage of Chitti action scenes synced to music",
        "target_audience": "movie-edit fans",
    }
    result = strategy.generate(concept, "Chitti Robo super scenes edit")
    assert result["content_type"] == "entertainment_commentary"
    by_type = {b["type"]: b for b in result["blocks"]}
    assert "quick_summary" in by_type
    assert by_type["scene_list"]["items"][0]["heading"] == "Opening hook"
    assert by_type["technique_list"]["items"][0]["name"] == "Beat-sync cutting"
    assert by_type["comparison_table"]["rows"] == [["Robot with emotions", "CGI and choreography"]]


@pytest.mark.unit
def test_commentary_strategy_no_providers_raises(monkeypatch):
    import providers

    monkeypatch.setattr(providers, "build_chain", lambda: [])
    with pytest.raises(Exception, match="No AI providers"):
        get_strategy("entertainment_commentary").generate({"topic": "x"}, "y")


@pytest.mark.unit
def test_pure_entertainment_makes_zero_llm_calls(monkeypatch):
    """Cost-control regression test: the cheap path must never touch the model."""
    import providers

    def _forbidden(*args, **kwargs):
        raise AssertionError("expensive model must not be called for pure entertainment")

    monkeypatch.setattr(providers, "build_chain", _forbidden)
    monkeypatch.setattr(providers, "complete_with_fallback", _forbidden)

    strategy = get_strategy("pure_entertainment")
    concept = {"topic": "Funny lip-sync skit", "target_audience": "comedy fans"}
    result = strategy.generate(concept, "haha")
    assert result["content_type"] == "pure_entertainment"
    assert len(result["blocks"]) == 1
    block = result["blocks"][0]
    assert block["type"] == "recap_card"
    assert "no hidden resource" in block["summary"]
    assert isinstance(block["genre_tags"], list)


@pytest.mark.unit
def test_strategies_return_blocks_list():
    for content_type in registered_types():
        strategy = get_strategy(content_type)
        assert hasattr(strategy, "generate")
        assert strategy.content_type == content_type
