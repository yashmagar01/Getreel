import os
import json
import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class LLMProvider:
    """Protocol for an LLM completion provider."""

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000, temperature: float = 0, model: str = None) -> str:
        ...

    @property
    def name(self) -> str:
        ...


# ── Groq ───────────────────────────────────────────────────────────────────────

# Best free-tier text model on Groq (Production, strong reasoning).
GROQ_DEFAULT_MODEL = "openai/gpt-oss-120b"
# Groq's vision-capable model (replaces decommissioned llama-3.2-11b-vision-preview).
GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
# Model-ID families that belong to Groq. A caller may pass a model meant for a
# different provider — each provider below only honours IDs in its own family
# and otherwise falls back to its default (prevents e.g. a Groq ID being sent
# to Gemini, which 404s the whole chain).
_GROQ_FAMILIES = (
    "llama-", "openai/gpt-oss", "qwen/", "meta-llama/", "moonshotai/",
    "mistral", "gemma", "groq/", "allam-", "whisper",
)


def _is_groq_model(model: str | None) -> bool:
    mid = (model or "").strip().lower()
    return bool(mid) and mid.startswith(_GROQ_FAMILIES)


class GroqProvider(LLMProvider):
    DEFAULT_MODEL = GROQ_DEFAULT_MODEL

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")

    @property
    def name(self) -> str:
        return "Groq"

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000, temperature: float = 0, model: str = None) -> str:
        from groq import Groq
        client = Groq(api_key=self.api_key)
        model_id = model.strip() if _is_groq_model(model) else self.DEFAULT_MODEL
        response = client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return response.choices[0].message.content.strip()


# ── Gemini ──────────────────────────────────────────────────────────────────────

# Best free-tier model on Google for new API keys (live-verified 2026-09-14:
# gemini-2.5-flash now 404s for new users; the API itself directs to 3.6-flash).
GEMINI_DEFAULT_MODEL = "gemini-3.6-flash"


def _is_gemini_model(model: str | None) -> bool:
    mid = (model or "").strip().lower()
    if mid.startswith("models/"):
        mid = mid[len("models/"):]
    return mid.startswith(("gemini-", "gemma-"))


class GeminiProvider(LLMProvider):
    DEFAULT_MODEL = GEMINI_DEFAULT_MODEL

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY is not set.")

    @property
    def name(self) -> str:
        return "Gemini"

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000, temperature: float = 0, model: str = None) -> str:
        from google import genai
        from google.genai import types
        from google.genai.errors import APIError

        client = genai.Client(api_key=self.api_key)
        
        # Configure model identification without relying on dead strings
        model_id = model.strip() if _is_gemini_model(model) else self.DEFAULT_MODEL
        # New genai drops the "models/" prefix requirement commonly used in generativeai
        if model_id.startswith("models/"):
            model_id = model_id[7:]

        config = types.GenerateContentConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )
        if system_prompt:
            config.system_instruction = system_prompt

        try:
            response = client.models.generate_content(
                model=model_id,
                contents=user_prompt,
                config=config,
            )
            return response.text.strip()
        except APIError as e:
            # Rebrand this to map explicitly to provider Fallback intercept
            err_msg = str(e).lower()
            if "not_found" in err_msg or "404" in err_msg or "deprecated" in err_msg:
                 raise ValueError("404 Not Found")
            raise


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



# ── Nvidia NIM (build.nvidia.com) ────────────────────────────────────────────────

class NvidiaProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.getenv("NVIDIA_API_KEY")

    @property
    def name(self) -> str:
        return "Nvidia"

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000, temperature: float = 0, model: str = None) -> str:
        from openai import OpenAI
        client = OpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=self.api_key
        )
        response = client.chat.completions.create(
            model=model or "meta/llama-3.2-90b-vision-preview",
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

    
    nv = NvidiaProvider()
    if nv.api_key:
        chain.append(nv)

    anth = AnthropicProvider()

    if anth.api_key:
        chain.append(anth)

    return chain


from model_registry import TIERS
import time

# Circuit breaker simple registry: (provider, model) -> list of failure timestamps
_circuit_breaker = {}

def complete_with_fallback(
    chain: list[LLMProvider],
    system_prompt: str,
    user_prompt: str,
    tier: str,
    max_tokens: int = 1000,
    temperature: float = 0,
) -> str:
    """Try each provider in the given registry tier. Returns first success. Raises if all fail."""
    import time
    
    if tier not in TIERS:
        raise ValueError(f"Unknown tier '{tier}' in model_registry.TIERS")

    lookup = {p.name: p for p in chain}
    errors_encountered = []
    
    for provider_name, model_id in TIERS[tier]:
        # Clean up stale circuit breaker tracking and check it
        now = time.time()
        cbreaker_key = (provider_name, model_id)
        if cbreaker_key not in _circuit_breaker:
            _circuit_breaker[cbreaker_key] = []
        _circuit_breaker[cbreaker_key] = [t for t in _circuit_breaker[cbreaker_key] if now - t < 300]
        
        if len(_circuit_breaker[cbreaker_key]) >= 3:
            logger.warning(f"[CIRCUIT_BREAKER] Skipping {provider_name} with {model_id} - failed 3+ times in last 5 mins.")
            errors_encountered.append(f"{provider_name} ({model_id}): skipped by circuit breaker")
            continue
            
        provider = lookup.get(provider_name)
        if not provider:
            errors_encountered.append(f"{provider_name} ({model_id}): skipped (not in chain/no API key)")
            continue

        retries = 1
        while retries >= 0:
            start_t = time.time()
            try:
                result = provider.complete(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    model=model_id,
                )
                
                # Guard against models that return empty/whitespace or hallucinated blank text
                if not result or len(result.strip()) < 5:
                    raise ValueError(f"Empty or abnormally short response ({len(result if result else '')} chars).")
                
                # Check for standard safety refusals
                lower_res = result.strip().lower()
                if "i’m sorry" in lower_res or "i'm sorry" in lower_res or "i am sorry" in lower_res or "i cannot help" in lower_res or "i can't help" in lower_res or "i can’t help" in lower_res:
                    raise ValueError(f"Model refused prompt (Safety/Policy restriction: {result[:50]}...).")
                    
                lat = int((time.time() - start_t) * 1000)
                logger.info(f"[PROVIDER] tier={tier} provider={provider_name} model={model_id} outcome=success latency_ms={lat}")
                return result
                
            except Exception as e:
                lat = int((time.time() - start_t) * 1000)
                err_str = str(e).lower()
                
                # 404 / 410 Gone / Decommissioned - FATAL for this model ID
                if ("404" in err_str or "410" in err_str or "not found" in err_str or "doesn't exist" in err_str
                        or "decommissioned" in err_str or "end of life" in err_str or "gone" in err_str):
                    logger.error(f"[PROVIDER] tier={tier} provider={provider_name} model={model_id} outcome=fatal_error (404/410/Not Found) latency_ms={lat} - skipping")
                    errors_encountered.append(f"{provider_name} ({model_id}): {e}")
                    _circuit_breaker[cbreaker_key].append(time.time())
                    break
                    
                # 429 / Rate Limit
                elif "429" in err_str or "too many requests" in err_str or "resourceexhausted" in err_str:
                    logger.warning(f"[PROVIDER] tier={tier} provider={provider_name} model={model_id} outcome=skipped (Rate Limit) latency_ms={lat}")
                    errors_encountered.append(f"{provider_name} ({model_id}): {e}")
                    break 
                    
                # Length guards
                elif "abnormally short response" in str(e):
                    logger.warning(f"[PROVIDER] tier={tier} provider={provider_name} model={model_id} outcome=failed (Short Output) latency_ms={lat}")
                    errors_encountered.append(f"{provider_name} ({model_id}): {e}")
                    _circuit_breaker[cbreaker_key].append(time.time())
                    break
                    
                # Other errors
                else:
                    if retries > 0:
                        logger.warning(f"[PROVIDER] tier={tier} provider={provider_name} model={model_id} outcome=retrying latency_ms={lat}")
                        time.sleep(1.5)
                        retries -= 1
                        continue
                    else:
                        logger.warning(f"[PROVIDER] tier={tier} provider={provider_name} model={model_id} outcome=failed latency_ms={lat} error={e}")
                        errors_encountered.append(f"{provider_name} ({model_id}): {e}")
                        _circuit_breaker[cbreaker_key].append(time.time())
                        break

    err_summary = " | ".join(errors_encountered)
    raise Exception(f"All tier entries failed for '{tier}'. Attempts: {err_summary}")
