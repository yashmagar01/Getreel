import os
import logging
from groq import Groq

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert technical instructor who specializes in taking vague social media
tips and converting them into complete, beginner-friendly guides.

The user has analyzed an Instagram Reel where a creator teased a skill or trick but deliberately
withheld the actual instructions. Your job is to fill in EXACTLY what the creator left out —
use the specific details provided, name the real tools mentioned, reconstruct the actual
technique being hidden.

CRITICAL RULES:
- If the concept extraction identifies specific named prompts, techniques, or tools — USE THOSE EXACT NAMES
- Do NOT replace specific details with generic alternatives
- The "What You'll Need" section must only list tools actually relevant to this specific topic
- The Step-by-Step Guide must directly address what was withheld, not general background knowledge
- Be specific. If the creator mentioned 5 prompts, reconstruct all 5 as best you can from context.

Format your response in clean Markdown with exactly these 5 sections."""


def generate_roadmap(concept: dict) -> str:
    """
    Use Groq Llama 3.3 70B to generate a complete how-to guide from a concept analysis dict.

    Args:
        concept: Dict from analyzer.py with fields: topic, what_creator_shows,
                 what_creator_withholds, target_audience, tools_mentioned, key_concepts

    Returns:
        Complete roadmap as a Markdown string.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY environment variable is not set.")

    client = Groq(api_key=api_key)

    # Extract each field clearly so Groq can't miss the withheld information
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

    logger.info("Sending to Groq Llama 3.3 70B for roadmap generation...")

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=2000,
            temperature=0.4,
        )
    except Exception as e:
        raise Exception(f"Groq Llama roadmap generation failed: {str(e)}")

    roadmap = response.choices[0].message.content.strip()

    if not roadmap:
        raise Exception("Groq returned an empty roadmap response.")

    logger.info(f"Roadmap generated. Length: {len(roadmap)} chars")
    return roadmap
