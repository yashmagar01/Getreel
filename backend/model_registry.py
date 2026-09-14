# backend/model_registry.py - Single source of truth for fallback tiers

TIERS = {
    "concept_vision":           [("Groq", "qwen/qwen3.6-27b")],
    "concept_text_fallback":    [("Groq", "openai/gpt-oss-120b"), ("Gemini", "models/gemini-3.8-flash")],
    "link_hints":               [("Groq", "openai/gpt-oss-120b"), ("Gemini", "models/gemini-3.8-flash")],
    "roadmap":                  [("Gemini", "models/gemini-3.8-flash"), ("Groq", "openai/gpt-oss-120b")],
    "entertainment_commentary": [("Gemini", "models/gemini-3.8-flash"), ("Groq", "openai/gpt-oss-120b")],
}
