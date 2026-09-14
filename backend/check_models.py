import os
import sys
import json
import logging
import requests

from model_registry import TIERS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

def check_models():
    # Load env variables (assume running from backend dir with .env)
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GOOGLE_API_KEY")

    live_models = {"Groq": set(), "Gemini": set()}

    # 1. Groq Models
    if groq_key:
        try:
            resp = requests.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {groq_key}"},
                timeout=10
            )
            resp.raise_for_status()
            data = resp.json()
            for m in data.get("data", []):
                live_models["Groq"].add(m["id"])
            logger.info(f"Loaded {len(live_models['Groq'])} Groq models.")
        except Exception as e:
            logger.error(f"Failed to fetch Groq models: {e}")
    else:
        logger.warning("GROQ_API_KEY not found. Skipping Groq live check.")

    
    # 2. Gemini Models
    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            # Fetch explicitly through the latest client
            for m in client.models.list():
                # To maintain compatibility with our registry mapping "models/gemini-..."
                live_models["Gemini"].add(m.name)
            logger.info(f"Loaded {len(live_models['Gemini'])} Gemini models.")
        except Exception as e:
            logger.error(f"Failed to fetch Gemini models: {e}")
# 3. Validation
    has_errors = False
    logger.info("--- Validating model_registry.py ---")
    for tier, entries in TIERS.items():
        for provider, model in entries:
            # Check only if we successfully fetched that provider's list
            if provider in live_models and len(live_models[provider]) > 0:
                if model in live_models[provider]:
                    logger.info(f"[PASS] {tier} | {provider} | {model}")
                else:
                    logger.error(f"[FAIL] {tier} | {provider} | {model} - NOT FOUND in live list!")
                    has_errors = True
            else:
                logger.warning(f"[SKIP] {tier} | {provider} | {model} - Unable to verify due to missing API key / connection issue.")

    if has_errors:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    check_models()
