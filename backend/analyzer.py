import os
import json
import logging
from groq import Groq

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert content analyst specializing in reverse-engineering social media "teaser content".
Your job is to analyze an Instagram Reel's transcript and visual frames and identify:
1. Exactly what skill, trick, or tool the creator is teaching
2. What specific information the creator is withholding to force engagement
3. What a viewer would actually need to know, install, or do to achieve the same result independently

Respond ONLY with a valid JSON object. No markdown, no explanation, just the JSON."""


def analyze_concept(transcript: str, frames_b64: list[str]) -> dict:
    """
    Use Groq Llama 4 Scout (multimodal) to extract what the reel is teaching and what it withholds.

    Args:
        transcript: Plain-text transcript of the reel's audio.
        frames_b64: List of base64-encoded JPEG frame strings.

    Returns:
        Dict with keys: topic, what_creator_shows, what_creator_withholds,
                        target_audience, tools_mentioned, key_concepts
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY environment variable is not set.")

    client = Groq(api_key=api_key)

    # Build multimodal content — up to 4 frames (Groq limit), then transcript
    content = []

    for b64_str in frames_b64[:4]:
        content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{b64_str}"
            }
        })

    content.append({
        "type": "text",
        "text": f"""Analyze this Instagram Reel. Here is the full transcript of what the creator said:

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
    })

    logger.info("Sending to Groq Llama 4 Scout for concept extraction...")

    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content},
            ],
            max_tokens=1000,
            temperature=0.3,
        )
    except Exception as e:
        raise Exception(f"Groq concept extraction failed: {str(e)}")

    raw = response.choices[0].message.content.strip()

    # Strip markdown code fences if present
    if raw.startswith("```"):
        lines = raw.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        raw = "\n".join(lines).strip()

    try:
        concept = json.loads(raw)
    except json.JSONDecodeError as e:
        raise Exception(
            f"Groq returned malformed JSON: {str(e)}. Raw response: {raw[:300]}"
        )

    # Validate required keys
    required_keys = [
        "topic", "what_creator_shows", "what_creator_withholds",
        "target_audience", "tools_mentioned", "key_concepts"
    ]
    missing = [k for k in required_keys if k not in concept]
    if missing:
        raise Exception(f"Groq response missing required fields: {missing}")

    logger.info(f"Concept extracted: {concept.get('topic', 'unknown')}")
    return concept
