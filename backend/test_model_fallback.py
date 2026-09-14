import pytest
from providers import complete_with_fallback, LLMProvider
import model_registry
import time

class MockProvider(LLMProvider):
    def __init__(self, name, throws=False, throws_msg=""):
        self._name = name
        self.throws = throws
        self.throws_msg = throws_msg
        self.last_model = None

    @property
    def name(self) -> str:
        return self._name

    def complete(self, system_prompt: str, user_prompt: str, max_tokens: int = 1000, temperature: float = 0, model: str = None) -> str:
        self.last_model = model
        if self.throws:
            raise Exception(self.throws_msg)
        return "Mock response long enough to pass."

def test_fallback_skips_missing_configs():
    model_registry.TIERS["test_tier"] = [("MissingProv", "m1"), ("Groq", "openai/gpt-oss-120b")]
    prov = MockProvider("Groq")
    chain = [prov]
    
    res = complete_with_fallback(chain, "", "", "test_tier")
    assert res == "Mock response long enough to pass."
    assert prov.last_model == "openai/gpt-oss-120b"

def test_fatal_error_does_not_retry():
    # 404 should move down immediately
    model_registry.TIERS["test_tier2"] = [("Groq", "fake"), ("Gemini", "real")]
    groq = MockProvider("Groq", throws=True, throws_msg="404 models/fake decommissioned")
    gem = MockProvider("Gemini")
    
    res = complete_with_fallback([groq, gem], "", "", "test_tier2")
    assert gem.last_model == "real"

def test_circuit_breaker(monkeypatch):
    # Shorten time requirement just to see logic 
    model_registry.TIERS["test_cb"] = [("Groq", "fail_model")]
    groq = MockProvider("Groq", throws=True, throws_msg="abnormally short response")
    
    # 1st
    with pytest.raises(Exception):
        complete_with_fallback([groq], "", "", "test_cb")
    # 2nd
    with pytest.raises(Exception):
        complete_with_fallback([groq], "", "", "test_cb")
    # 3rd
    with pytest.raises(Exception):
        complete_with_fallback([groq], "", "", "test_cb")
        
    groq.last_model = None  # Reset tracking
    
    # 4th - should completely skip invoking complete()
    with pytest.raises(Exception) as exc:
        complete_with_fallback([groq], "", "", "test_cb")
        
    assert groq.last_model is None
    assert "skipped by circuit breaker" in str(exc.value)

