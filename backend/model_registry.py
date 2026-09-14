# backend/model_registry.py - Single source of truth for fallback tiers

TIERS = {
    "concept_vision":           [("Nvidia", "meta/llama-3.2-90b-vision-preview"), ("Groq", "meta-llama/llama-3.2-11b-vision-preview"), ("Groq", "qwen/qwen3.6-27b")],
    "concept_text_fallback":    [("Nvidia", "meta/llama-3.2-90b-vision-preview"), ("Groq", "openai/gpt-oss-120b"), ("Gemini", "models/gemini-3.8-flash")],
    "link_hints":               [("Nvidia", "meta/llama-3.2-90b-vision-preview"), ("Groq", "openai/gpt-oss-120b"), ("Gemini", "models/gemini-3.8-flash")],
    "roadmap":                  [("Nvidia", "meta/llama-3.2-90b-vision-preview"), ("Groq", "openai/gpt-oss-120b")],
    "entertainment_commentary": [("Nvidia", "meta/llama-3.2-90b-vision-preview"), ("Gemini", "models/gemini-3.8-flash"), ("Groq", "openai/gpt-oss-120b")],
}
