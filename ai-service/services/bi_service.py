from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from clients.ai_client import AIClient, build_ai_client
from config import get_settings
from models.bi_models import RingkasanRequest, RingkasanResponse
from utils.prompt_renderer import PromptRenderer
import logging
import re


class BusinessIntelligenceService:
    def __init__(self, ai_client: AIClient | None = None) -> None:
        self.settings = get_settings()
        self.ai_client = ai_client or build_ai_client(self.settings)
        self.prompt_renderer = PromptRenderer(Path(__file__).resolve().parent.parent / "prompts" / "bi_ringkasan.md")

    async def analyze_ringkasan(self, payload: RingkasanRequest) -> RingkasanResponse:
        prompt = self.prompt_renderer.render({"data": payload.model_dump()})
        raw_response = await self.ai_client.generate(prompt)
        return self._parse_response(raw_response)

    def _parse_response(self, raw_response: str) -> RingkasanResponse:
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError as exc:
            # Log the raw response for debugging (truncate long responses)
            snippet = (raw_response or "")[:10000]
            logging.debug("AI raw response (truncated): %s", snippet)

            # Attempt to extract a JSON object from the response body (handles code fences or extra text)
            m = re.search(r"\{[\s\S]*\}", raw_response or "")
            if m:
                raw_json = m.group(0)
                try:
                    parsed = json.loads(raw_json)
                except Exception:
                    # Try a relaxed parse: remove control newlines which models may inject
                    cleaned = raw_json.replace("\n", " ").replace("\r", " ")
                    try:
                        parsed = json.loads(cleaned)
                    except Exception:
                        raise ValueError(f"AI response contains JSON-like content but parsing failed. Snippet: {snippet}") from exc
            else:
                # No JSON-like object found in the response. Model may have returned truncated or non-JSON output.
                raise ValueError(
                    "AI response did not contain a JSON object. "
                    "This can happen if the model returned markdown/code fences or the response was truncated. "
                    "Try increasing AI_MAX_TOKENS or AI_TIMEOUT, and ensure the prompt asks for plain JSON. "
                    f"Raw response snippet: {snippet}"
                ) from exc

        return RingkasanResponse.model_validate(parsed)
