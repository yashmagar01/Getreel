import os
import json
import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class LLMProvider:
    """Protocol for an LLM completion provider."""

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000, temperature: float = 0) -> str:
        ...

    @property
    def name(self) -> str:
        ...


# ── Groq ───────────────────────────────────────────────────────────────────────

class GroqProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")

    @property
    def name(self) -> str:
        return "Groq"

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000, temperature: float = 0, model: str = None) -> str:
        from groq import Groq
        client = Groq(api_key=self.api_key)
        response = client.chat.completions.create(
            model=model or "llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()


# ── Gemini ──────────────────────────────────────────────────────────────────────

class GeminiProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")

    @property
    def name(self) -> str:
        return "Gemini"

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000, temperature: float = 0, model: str = None) -> str:
        import google.generativeai as genai
        genai.configure(api_key=self.api_key)
        safety_settings = [
            {"category": c, "threshold": "BLOCK_NONE"}
            for c in ["HARM_CATEGORY_HARASSMENT", "HARM_CATEGORY_HATE_SPEECH",
                      "HARM_CATEGORY_SEXUALLY_EXPLICIT", "HARM_CATEGORY_DANGEROUS_CONTENT"]
        ]
        model_id = model or "models/gemini-3.6-flash"
        gen_model = genai.GenerativeModel(
            model_id,
            system_instruction=system_prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=max_tokens,
                temperature=temperature,
            ),
            safety_settings=safety_settings,
        )
        response = gen_model.generate_content(user_prompt)
        return response.text.strip()


# ── OpenAI ──────────────────────────────────────────────────────────────────────

class OpenAIProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")

    @property
    def name(self) -> str:
        return "OpenAI"

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000, temperature: float = 0, model: str = None) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=self.api_key)
        response = client.chat.completions.create(
            model=model or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()


# ── Anthropic ───────────────────────────────────────────────────────────────────

class AnthropicProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    @property
    def name(self) -> str:
        return "Anthropic"

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000, temperature: float = 0, model: str = None) -> str:
        from anthropic import Anthropic
        client = Anthropic(api_key=self.api_key)
        response = client.messages.create(
            model=model or "claude-3-haiku-20240307",
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.content[0].text.strip()


# ── Fallback Chain ──────────────────────────────────────────────────────────────

def build_chain() -> list[LLMProvider]:
    """Build available provider chain ordered by reliability/cost."""
    chain = []

    groq = GroqProvider()
    if groq.api_key:
        chain.append(groq)

    gemini = GeminiProvider()
    if gemini.api_key:
        chain.append(gemini)

    oai = OpenAIProvider()
    if oai.api_key:
        chain.append(oai)

    anth = AnthropicProvider()
    if anth.api_key:
        chain.append(anth)

    return chain


def complete_with_fallback(
    chain: list[LLMProvider],
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 1000,
    temperature: float = 0,
    model: str = None,
) -> str:
    """Try each provider in the chain. Returns first success. Raises if all fail."""
    last_error = None
    for provider in chain:
        try:
            result = provider.complete(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                model=model,
            )
            logger.info(f"[PROVIDER] {provider.name} — success ({len(result)} chars)")
            return result
        except Exception as e:
            logger.warning(f"[PROVIDER] {provider.name} — failed: {e}")
            last_error = e
            continue

    raise Exception(f"All AI providers failed. Last error: {last_error}")
