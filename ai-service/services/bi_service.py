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

            raw_json = self._extract_json_candidate(raw_response)
            if raw_json is not None:
                try:
                    parsed = json.loads(raw_json)
                except json.JSONDecodeError:
                    cleaned = raw_json.replace("\n", " ").replace("\r", " ")
                    try:
                        parsed = json.loads(cleaned)
                    except json.JSONDecodeError:
                        raise ValueError(
                            "AI response contains JSON-like content but parsing failed. "
                            "The response may be truncated or malformed. "
                            f"Raw response snippet: {snippet}"
                        ) from exc
            else:
                raise ValueError(
                    "AI response did not contain a JSON object. "
                    "This can happen if the model returned markdown/code fences or the response was truncated. "
                    "Try increasing AI_MAX_TOKENS or AI_TIMEOUT, and ensure the prompt asks for plain JSON. "
                    f"Raw response snippet: {snippet}"
                ) from exc

        return RingkasanResponse.model_validate(parsed)

    def _extract_json_candidate(self, raw_response: str) -> str | None:
        if not raw_response:
            return None

        # First try to find a complete JSON object inside the response.
        complete_match = re.search(r"\{[\s\S]*\}", raw_response)
        if complete_match:
            return complete_match.group(0)

        # If the response ends abruptly, try to salvage a truncated JSON object by closing braces/brackets.
        start_match = re.search(r"\{[\s\S]*$", raw_response)
        if not start_match:
            return None

        candidate = start_match.group(0)
        candidate = self._close_json(candidate)
        return candidate

    @staticmethod
    def _close_json(raw_json: str) -> str:
        open_braces = raw_json.count("{")
        close_braces = raw_json.count("}")
        open_brackets = raw_json.count("[")
        close_brackets = raw_json.count("]")

        if close_braces < open_braces:
            raw_json += "}" * (open_braces - close_braces)
        if close_brackets < open_brackets:
            raw_json += "]" * (open_brackets - close_brackets)

        return raw_json
