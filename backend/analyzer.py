import os
import json
import logging
from providers import build_chain, complete_with_fallback

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert content analyst specializing in reverse-engineering social media "teaser content".
Your job is to analyze an Instagram Reel's transcript and visual frames and identify:
1. Exactly what skill, trick, or tool the creator is teaching
2. What specific information the creator is withholding to force engagement
3. What a viewer would actually need to know, install, or do to achieve the same result independently

CRITICAL RULES (Phase 0 anti-hallucination fix):
- Extract ONLY information EXPLICITLY present in the transcript or visible on screen
- Do NOT infer, extrapolate, guess, or add context not present in the content
- Do NOT generate brand names, product names, or terms unless they were literally spoken or shown
- If you are uncertain whether a term was explicitly stated, OMIT IT
- Return empty lists rather than guessed values
- NEVER hallucinate URLs, domains, or resource names
- Your output must be 100% grounded in what was explicitly said or shown

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
  "topic": "one-sentence description of what skill/tool/trick is being shown",
  "what_creator_shows": "what the creator actually demonstrates or reveals",
  "what_creator_withholds": "what the creator is NOT telling viewers (the thing they make you follow/comment to get)",
  "target_audience": "who would benefit from this",
  "tools_mentioned": ["list", "of", "tools", "apps", "or", "websites", "mentioned"],
  "key_concepts": ["list", "of", "core", "concepts", "viewer", "needs", "to", "understand"]
}}

Respond ONLY with valid JSON. No markdown fences, no extra text."""

    logger.info(f"Analyzing concept via provider chain ({len(chain)} providers available)...")

    # Try Groq first for multimodal (it's the only one that supports image input currently)
    groq_chain = [p for p in chain if p.name == "Groq"]
    if groq_chain and frames_b64:
        try:
            from groq import Groq
            api_key = os.getenv("GROQ_API_KEY")
            client = Groq(api_key=api_key)
            content = []
            for b64_str in frames_b64[:4]:
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64_str}"}
                })
            content.append({"type": "text", "text": user_prompt})

            response = client.chat.completions.create(
                model="llama-3.2-90b-vision-preview",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": content},
                ],
                max_tokens=1000,
                temperature=0,
            )
            raw = response.choices[0].message.content.strip()
            return _parse_concept_json(raw)
        except Exception as e:
            logger.warning(f"Groq multimodal failed: {e}. Falling back to text-only chains.")

    # Fallback: text-only via any provider
    raw = complete_with_fallback(
        chain, SYSTEM_PROMPT, user_prompt,
        max_tokens=1000, temperature=0,
    )

    return _parse_concept_json(raw)


def _parse_concept_json(raw: str) -> dict:
    if raw.startswith("```"):
        lines = raw.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw = "\n".join(lines).strip()

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
