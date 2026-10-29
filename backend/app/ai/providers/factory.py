from __future__ import annotations

from app.ai.providers.base import LLMProvider, ProviderError
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.groq import GroqProvider
from app.core.config import Settings


def build_primary_provider(settings: Settings) -> LLMProvider:
    if not settings.gemini_api_key:
        raise ProviderError("Gemini is not configured", transient=False)
    return GeminiProvider(api_key=settings.gemini_api_key, model=settings.gemini_model)


def build_fallback_provider(settings: Settings) -> LLMProvider | None:
    if not settings.ai_enable_groq_fallback or not settings.groq_api_key:
        return None
    return GroqProvider(api_key=settings.groq_api_key, model=settings.groq_model)
