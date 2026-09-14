import os
import json
import logging
from providers import build_chain, complete_with_fallback
from model_registry import TIERS

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert content analyst specializing in reverse-engineering social media content.
Your job is to analyze an Instagram Reel's transcript and visual frames. The content may be a "teaser/tutorial" or just pure "entertainment/edit" (like a movie edit or meme).
Identify:
1. Exactly what is being shown (e.g., a skill, trick, tool, OR a cinematic edit/meme).
2. What specific information the creator is withholding (if it's a teaser). If it's just entertainment, say "None".
3. What a viewer would actually need to know or understand about the content.

CRITICAL RULES:
- Extract ONLY information EXPLICITLY present in the transcript or visible on screen.
- If the video is not a tutorial (e.g., a movie edit), do NOT force it to be one. Describe what it actually is.
- Do NOT infer, extrapolate, guess, or add context not present in the content.
- Do NOT generate brand names, product names, or terms unless they were literally spoken or shown.
- If you are uncertain whether a term was explicitly stated, OMIT IT.
- Return empty strings or empty lists rather than guessed values.
- NEVER hallucinate URLs, domains, or resource names.
- Your output must be 100% grounded in what was explicitly said or shown.

Respond ONLY with a valid JSON object. No markdown, no explanation, just the JSON."""


def analyze_concept(transcript: str, frames_b64: list[str]) -> dict:
    """
    Multi-provider concept extraction from transcript + frames.
    Falls back across Groq → Gemini → OpenAI → Anthropic.
    """
    chain = build_chain()
    if not chain:
        raise Exception("No AI providers configured (need at least GROQ_API_KEY or GOOGLE_API_KEY).")

    user_prompt = f"""Analyze this Instagram Reel. Here is the full transcript of what the creator said:

<transcript>
{transcript}
</transcript>

Based on the transcript and the video frames above, return a JSON object with exactly these fields:
{{
  "topic": "one-sentence description of what the video is about (e.g., teaching a skill, or an emotional movie edit)",
  "what_creator_shows": "what the creator actually demonstrates or shows on screen",
  "what_creator_withholds": "what the creator is withholding (if any) or 'None'",
  "target_audience": "who would enjoy or benefit from this",
  "tools_mentioned": ["list", "of", "tools", "apps", "brands", "or", "websites", "mentioned", "leave empty if none"],
  "key_concepts": ["list", "of", "core", "concepts", "viewer", "needs", "to", "understand"]
}}

Respond ONLY with valid JSON. No markdown fences, no extra text."""

    logger.info(f"Analyzing concept via provider chain ({len(chain)} providers available)...")

    
    # Multimodal Vision Analysis 
    vision_tier = TIERS["concept_vision"]
    if frames_b64:
        for provider_name, model_id in vision_tier:
            try:
                content = []
                for b64_str in frames_b64[:3]:
                    content.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64_str}"}
                    })
                content.append({"type": "text", "text": user_prompt})

                if provider_name == "Nvidia":
                    from openai import OpenAI
                    client = OpenAI(
                        base_url="https://integrate.api.nvidia.com/v1",
                        api_key=os.getenv("NVIDIA_API_KEY")
                    )
                    response = client.chat.completions.create(
                        model=model_id,
                        messages=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": content},
                        ],
                        max_tokens=800,
                        temperature=0,
                    )
                    raw = response.choices[0].message.content.strip()
                    logger.info(f"Nvidia multimodal success with {model_id}")
                    return _parse_concept_json(raw)
                    
                elif provider_name == "Groq":
                    from groq import Groq
                    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
                    response = client.chat.completions.create(
                        model=model_id,
                        messages=[
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": content},
                        ],
                        max_tokens=800,
                        temperature=0,
                    )
                    raw = response.choices[0].message.content.strip()
                    logger.info(f"Groq multimodal success with {model_id}")
                    return _parse_concept_json(raw)
                    
            except Exception as e:
                logger.warning(f"{provider_name} multimodal failed: {e}. Falling back to next vision model.")

    # Fallback: text-only via any provider
    raw = complete_with_fallback(
        chain, SYSTEM_PROMPT, user_prompt,
        tier="concept_text_fallback",
        max_tokens=1000, temperature=0,
    )

    return _parse_concept_json(raw)


def _parse_concept_json(raw: str) -> dict:
    raw = raw.strip()
    
    # Strip markdown fences if present anywhere
    if "```" in raw:
        # Try to find exactly what's inside the first ```json ... ``` or just ``` ... ``` block
        import re
        match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL | re.IGNORECASE)
        if match:
            raw = match.group(1).strip()

    # Sometimes LLMs put text before the opening brace
    start_idx = raw.find("{")
    end_idx = raw.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        raw = raw[start_idx:end_idx+1]
        
    try:
        concept = json.loads(raw)
    except json.JSONDecodeError as e:
        raise Exception(f"AI returned malformed JSON: {str(e)}. Raw: {raw[:300]}")

    required_keys = [
        "topic", "what_creator_shows", "what_creator_withholds",
        "target_audience", "tools_mentioned", "key_concepts"
    ]
    missing = [k for k in required_keys if k not in concept]
    if missing:
        raise Exception(f"AI response missing required fields: {missing}")

    logger.info(f"Concept extracted: {concept.get('topic', 'unknown')}")
    return concept
