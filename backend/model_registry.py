# backend/model_registry.py - Single source of truth for fallback tiers
# Live-verified 2026-09-26 against Groq /v1/models, Gemini list_models,
# and https://integrate.api.nvidia.com/v1/models. All IDs below returned 200.
# Groq currently ships ZERO vision models — vision goes Gemini first.
# Free-tier order in every tier: fastest free model first.

TIERS = {
    # Vision (multimodal): Gemini handles 3 frames; NVIDIA caps at 1/prompt
    # (cold-starts burn ~60s, so it sits last).
    "concept_vision": [
        ("Gemini", "models/gemini-3.8-flash"),
        ("Nvidia", "meta/llama-3.2-11b-vision-instruct"),
        ("Nvidia", "meta/llama-3.2-90b-vision-instruct"),
    ],
    # Text-only concept extraction.
    "concept_text_fallback": [
        ("Groq", "openai/gpt-oss-120b"),
        ("Gemini", "models/gemini-3.8-flash"),
        ("Nvidia", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"),
        ("Gemini", "models/gemini-3.6-flash"),
    ],
    "link_hints": [
        # ponytail: fast Groq first — NVIDIA reasoning blew the 12s T2 budget
        ("Groq", "openai/gpt-oss-120b"),
        ("Gemini", "models/gemini-3.8-flash"),
        ("Nvidia", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"),
    ],
    "roadmap": [
        ("Groq", "openai/gpt-oss-120b"),
        ("Gemini", "models/gemini-3.8-flash"),
        ("Nvidia", "nvidia/nemotron-3-super-120b-a12b"),
    ],
    "entertainment_commentary": [
        ("Groq", "openai/gpt-oss-120b"),
        ("Gemini", "models/gemini-3.8-flash"),
        ("Nvidia", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"),
    ],
}
