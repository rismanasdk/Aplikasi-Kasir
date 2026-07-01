from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any
from urllib import response

from openai import AsyncOpenAI
import google.generativeai as genai

from config import get_settings


class AIClient(ABC):
    @abstractmethod
    async def generate(self, prompt: str) -> str:
        raise NotImplementedError


class OpenAIClient(AIClient):
    def __init__(self, settings: Any) -> None:
        self.settings = settings
        self._client = AsyncOpenAI(
            api_key=self.settings.AI_API_KEY,
            timeout=self.settings.AI_TIMEOUT,
        )

    async def generate(self, prompt: str) -> str:
        if not self.settings.AI_API_KEY:
            raise ValueError("AI_API_KEY is required for OpenAI provider")

        response = await self._client.chat.completions.create(
            model=self.settings.AI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional Business Intelligence Analyst for UMKM.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=self.settings.AI_TEMPERATURE,
            max_tokens=self.settings.AI_MAX_TOKENS,
        )

        content = response.choices[0].message.content
        if content is None:
            return ""
        return content


class GeminiClient(AIClient):
    SYSTEM_INSTRUCTION = (
        "You are a professional Business Intelligence Analyst for UMKM."
    )

    def __init__(self, settings: Any) -> None:
        self.settings = settings

        if not self.settings.AI_API_KEY:
            raise ValueError("AI_API_KEY is required for Gemini provider")

        genai.configure(api_key=self.settings.AI_API_KEY)

        # Normalize common human-friendly model names (e.g. "Gemini 2.5 Flash")
        model_name = str(self.settings.AI_MODEL or "").strip()
        if " " in model_name:
            # try a safe normalization (lowercase, spaces -> hyphen)
            model_name_normalized = model_name.lower().replace(" ", "-")
        else:
            model_name_normalized = model_name

        self._model_name = model_name_normalized

        # instantiate GenerativeModel; actual validation may still occur at request time
        self._model = genai.GenerativeModel(
            model_name=self._model_name,
            system_instruction=self.SYSTEM_INSTRUCTION,
        )

    async def generate(self, prompt: str) -> str:
        try:
            response = await self._model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=self.settings.AI_TEMPERATURE,
                    max_output_tokens=self.settings.AI_MAX_TOKENS,
                ),
                request_options={"timeout": self.settings.AI_TIMEOUT},
            )
            print("=" * 100)
            print(response)
            print("=" * 100)
            
            print(response.text)
            print("=" * 100)
            
            return response.text
        except Exception as e:
            # translate provider errors into a clear ValueError for the service layer
            # Common cause: invalid model name format (e.g. human-friendly name with spaces)
            raise ValueError(
                f"Gemini provider error: {e}. Check AI_MODEL value (use provider model id, no spaces)."
            ) from e

        # response may contain text or structured content
        text = getattr(response, "text", None)
        if text is None:
            # try candidates/content field
            try:
                # some versions expose .candidates or .content
                if hasattr(response, "candidates") and response.candidates:
                    return response.candidates[0].content if hasattr(response.candidates[0], "content") else str(response.candidates[0])
                if hasattr(response, "content"):
                    return str(response.content)
            except Exception:
                return ""

        return text


def build_ai_client(settings: Any | None = None) -> AIClient:
    settings = settings or get_settings()
    provider = (settings.AI_PROVIDER or "openai").lower()

    if provider == "openai":
        return OpenAIClient(settings)
    elif provider == "gemini":
        return GeminiClient(settings)

    raise ValueError(f"Unsupported AI provider: {provider}")