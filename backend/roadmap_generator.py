import logging
from providers import build_chain, complete_with_fallback

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert instructor and analyst who specializes in breaking down social media videos into comprehensive guides.

If the video teased a skill or trick, your job is to fill in EXACTLY what the creator left out — use the specific details provided, name the real tools mentioned, and reconstruct the actual technique being hidden.
If the video is purely entertainment (like a cinematic movie edit, meme, or commentary), your job is to explain the context, the editing techniques used, or the psychological impact of the video.

CRITICAL RULES:
- Adapt the content to make sense for the video (e.g., if it's a movie edit, explain the editing style and story context).
- Do NOT replace specific details with generic alternatives.
- The "What You'll Need" section must only list tools actually relevant to this specific topic (e.g., video editors for a movie edit, or 'none' if inapplicable).
- You MUST format your response in clean Markdown using EXACTLY the 5 sections requested in the prompt, even if you have to adapt their meaning slightly."""


def generate_roadmap(concept: dict) -> str:
    """
    Multi-provider roadmap generation.
    Falls back across Groq → Gemini → OpenAI → Anthropic.
    """
    chain = build_chain()
    if not chain:
        raise Exception("No AI providers configured (need at least GROQ_API_KEY or GOOGLE_API_KEY).")

    topic = concept.get("topic") or concept.get("skill_taught", "Unknown topic")
    shows = concept.get("what_creator_shows") or concept.get("trick_or_tool", "")
    withheld = concept.get("what_creator_withholds") or concept.get("withheld_information", "Not specified")
    audience = concept.get("target_audience", "general audience")
    tools = concept.get("tools_mentioned") or []
    key_concepts = concept.get("key_concepts") or []

    user_prompt = f"""Here is the full analysis of an Instagram Reel that was reverse-engineered:

TOPIC: {topic}

WHAT THE CREATOR ACTUALLY SHOWS/HINTS AT:
{shows}

WHAT THE CREATOR DELIBERATELY WITHHELD (this is the core of what you must fill in):
{withheld}

TARGET AUDIENCE: {audience}

SPECIFIC TOOLS/TECHNOLOGIES MENTIONED IN THE REEL:
{tools}

KEY CONCEPTS THE VIEWER NEEDS TO UNDERSTAND:
{key_concepts}

Now write a complete, actionable guide that gives the viewer FULL INDEPENDENCE —
they should not need to follow the creator, comment anything, or wait for a DM.

Use exactly these 5 sections:

## What This Reel Is Actually Teaching
(One focused paragraph — be specific about the exact technique, not a generic description)

## What You'll Need
(Only tools directly relevant to THIS topic — no generic dev tools unless mentioned)

## Step-by-Step Guide
(Numbered steps that directly reconstruct what was withheld. If specific named
prompts/techniques were identified, include them by name and reconstruct their content)

## Common Mistakes to Avoid
(Pitfalls specific to this exact technique, not generic advice)

## Free Resources to Learn More
(Specific docs, channels, or resources relevant to the exact tools and concepts mentioned)"""

    logger.info(f"Generating roadmap via provider chain ({len(chain)} providers available)...")

    roadmap = complete_with_fallback(
        chain, SYSTEM_PROMPT, user_prompt,
        max_tokens=2000, temperature=0.4,
    )

    if not roadmap:
        raise Exception("AI returned an empty roadmap response.")

    logger.info(f"Roadmap generated. Length: {len(roadmap)} chars")
    return roadmap
