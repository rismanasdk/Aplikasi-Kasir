from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from clients.ai_client import AIClient, build_ai_client
from config import get_settings
from models.bi_models import RingkasanRequest, RingkasanResponse, CashflowRequest, CashflowResponse, ProdukRequest, ProdukResponse, PersediaanRequest, PersediaanResponse
from utils.prompt_renderer import PromptRenderer
import logging
import re


class BusinessIntelligenceService:
    def __init__(self, ai_client: AIClient | None = None) -> None:
        self.settings = get_settings()
        self.ai_client = ai_client or build_ai_client(self.settings)
        self.ringkasan_renderer = PromptRenderer(Path(__file__).resolve().parent.parent / "prompts" / "bi" / "ringkasan.md")
        self.cashflow_renderer = PromptRenderer(Path(__file__).resolve().parent.parent / "prompts" / "bi" / "cashflow.md")
        self.produk_renderer = PromptRenderer(Path(__file__).resolve().parent.parent / "prompts" / "bi" / "produk.md")
        self.persediaan_renderer = PromptRenderer(Path(__file__).resolve().parent.parent / "prompts" / "bi" / "persediaan.md")

    async def analyze_ringkasan(self, payload: RingkasanRequest) -> RingkasanResponse:
        prompt = self.ringkasan_renderer.render({"data": json.dumps(payload.model_dump())})
        try:
            raw_response = await self.ai_client.generate(prompt)
        except Exception:
            return self._build_fallback_ringkasan_response(payload)

        try:
            return self._parse_ringkasan_response(raw_response)
        except ValueError:
            fallback_prompt = self.ringkasan_renderer.render({
                "data": json.dumps(payload.model_dump()),
                "retry": True,
            })
            try:
                retry_response = await self.ai_client.generate(fallback_prompt)
            except Exception:
                return self._build_fallback_ringkasan_response(payload)
            try:
                return self._parse_ringkasan_response(retry_response)
            except ValueError:
                return self._build_fallback_ringkasan_response(payload)

    def _build_fallback_ringkasan_response(self, payload: RingkasanRequest) -> RingkasanResponse:
        ringkasan = payload.ringkasan
        pendapatan = float(ringkasan.total_pendapatan or 0)
        target = float(ringkasan.target or 0)
        laba_bersih = float(ringkasan.total_laba_bersih or 0)

        status = "Sehat" if laba_bersih >= 0 else "Perlu Perhatian"
        progress = (pendapatan / target * 100) if target else 0
        insight = [
            f"Pendapatan tercatat sebesar {pendapatan:,.0f}.",
            f"Laba bersih tercatat sebesar {laba_bersih:,.0f}.",
        ]
        if target:
            insight.append(f"Pencapaian target omzet mencapai {progress:.1f}%.")

        return RingkasanResponse(
            status=status,
            insight=insight,
            rekomendasi=[
                "Tinjau biaya operasional untuk menjaga profitabilitas.",
                "Pantau target omzet secara berkala agar pencapaian tetap terukur.",
            ],
            narasi="Ringkasan AI gagal diproses secara normal, tetapi data numerik dasar telah tercatat dan perlu dipantau secara manual.",
        )

    async def analyze_cashflow(self, payload: CashflowRequest) -> CashflowResponse:
        """Analyze cashflow health and provide insights"""
        prompt = self.cashflow_renderer.render({"data": json.dumps(payload.model_dump())})
        try:
            raw_response = await self.ai_client.generate(prompt)
        except Exception:
            return self._build_fallback_cashflow_response(payload)

        try:
            return self._parse_cashflow_response(raw_response)
        except ValueError:
            fallback_prompt = self.cashflow_renderer.render({
                "data": json.dumps(payload.model_dump()),
                "retry": True,
            })
            try:
                retry_response = await self.ai_client.generate(fallback_prompt)
            except Exception:
                return self._build_fallback_cashflow_response(payload)
            try:
                return self._parse_cashflow_response(retry_response)
            except ValueError:
                return self._build_fallback_cashflow_response(payload)

    async def analyze_produk(self, payload: ProdukRequest) -> ProdukResponse:
        prompt = self.produk_renderer.render({"data": json.dumps(payload.model_dump())})
        try:
            raw_response = await self.ai_client.generate(prompt)
        except Exception:
            return self._build_fallback_produk_response(payload)

        try:
            return self._parse_produk_response(raw_response)
        except ValueError:
            fallback_prompt = self.produk_renderer.render({"data": json.dumps(payload.model_dump()), "retry": True})
            try:
                retry_response = await self.ai_client.generate(fallback_prompt)
            except Exception:
                return self._build_fallback_produk_response(payload)
            try:
                return self._parse_produk_response(retry_response)
            except ValueError:
                return self._build_fallback_produk_response(payload)

    async def analyze_persediaan(self, payload: PersediaanRequest) -> PersediaanResponse:
        prompt = self.persediaan_renderer.render({"data": json.dumps(payload.model_dump())})
        try:
            raw_response = await self.ai_client.generate(prompt)
        except Exception:
            return self._build_fallback_persediaan_response(payload)

        try:
            return self._parse_persediaan_response(raw_response)
        except ValueError:
            fallback_prompt = self.persediaan_renderer.render({"data": json.dumps(payload.model_dump()), "retry": True})
            try:
                retry_response = await self.ai_client.generate(fallback_prompt)
            except Exception:
                return self._build_fallback_persediaan_response(payload)
            try:
                return self._parse_persediaan_response(retry_response)
            except ValueError:
                return self._build_fallback_persediaan_response(payload)

    def _build_fallback_produk_response(self, payload: ProdukRequest) -> ProdukResponse:
        produk = payload.produk
        total_produk = int(produk.total_produk or 0)
        produk_aktif = int(produk.produk_aktif or 0)
        produk_stagnan = int(produk.produk_stagnan or 0)

        status = "sehat" if produk_aktif / (total_produk or 1) > 0.6 else "waspada"
        score = 80 if status == "sehat" else 60

        insight = [
            f"Total produk: {total_produk} (aktif: {produk_aktif}, stagnan: {produk_stagnan}).",
            f"Total produk terjual: {produk.total_produk_terjual} dengan omzet {produk.total_omzet}.",
        ]

        rekomendasi = [
            "Evaluasi produk stagnan: promosi atau hentikan pembelian.",
            "Prioritaskan restock untuk produk top-selling yang stoknya menipis.",
        ]

        return ProdukResponse(
            status=status,
            score=score,
            insight=insight,
            warning=[],
            rekomendasi=rekomendasi,
            narasi="Analisis produk fallback: data ringkasan tersedia tetapi AI tidak merespon dengan benar."
        )

    def _build_fallback_persediaan_response(self, payload: PersediaanRequest) -> PersediaanResponse:
        persediaan = payload.persediaan
        total_stok = int(persediaan.total_stok or 0)
        nilai_persediaan = float(persediaan.nilai_persediaan or 0)
        produk_habis = len(persediaan.produk_habis or [])
        produk_hampir_habis = len(persediaan.produk_hampir_habis or [])

        status = "sehat" if produk_habis == 0 and produk_hampir_habis <= 2 else "waspada"
        score = 80 if status == "sehat" else 60

        insight = [
            f"Total stok tercatat sebesar {total_stok} unit.",
            f"Nilai persediaan mencapai {nilai_persediaan:,.0f}.",
            f"Produk habis: {produk_habis}; produk hampir habis: {produk_hampir_habis}.",
        ]

        return PersediaanResponse(
            status=status,
            score=score,
            insight=insight,
            warning=["Perlu pantau stok yang sudah habis atau mendekati batas minimum."] if produk_habis or produk_hampir_habis else [],
            rekomendasi=[
                "Prioritaskan restock untuk produk yang sudah habis atau hampir habis.",
                "Pantau kategori fast moving agar stok tidak cepat habis.",
            ],
            narasi="Analisis persediaan menggunakan data stok dan penjualan dasar karena layanan AI sedang tidak tersedia atau memberikan respons yang tidak valid."
        )

    def _parse_produk_response(self, raw_response: str) -> ProdukResponse:
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError as exc:
            raw_json = self._extract_json_candidate(raw_response)
            if raw_json is not None:
                try:
                    parsed = json.loads(raw_json)
                except json.JSONDecodeError:
                    cleaned = raw_json.replace("\n", " ").replace("\r", " ")
                    parsed = json.loads(cleaned)
            else:
                raise ValueError("Produk AI response did not contain a JSON object.") from exc

        return ProdukResponse.model_validate(parsed)

    def _parse_persediaan_response(self, raw_response: str) -> PersediaanResponse:
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError as exc:
            raw_json = self._extract_json_candidate(raw_response)
            if raw_json is not None:
                try:
                    parsed = json.loads(raw_json)
                except json.JSONDecodeError:
                    cleaned = raw_json.replace("\n", " ").replace("\r", " ")
                    parsed = json.loads(cleaned)
            else:
                raise ValueError("Persediaan AI response did not contain a JSON object.") from exc

        return PersediaanResponse.model_validate(parsed)

    def _build_fallback_cashflow_response(self, payload: CashflowRequest) -> CashflowResponse:
        """Build fallback response when AI analysis fails"""
        cashflow = payload.cashflow
        kas = float(cashflow.kas or 0)
        kas_masuk = float(cashflow.kas_masuk or 0)
        kas_keluar = float(cashflow.kas_keluar or 0)
        arus_kas_bersih = float(cashflow.arus_kas_bersih or 0)

        # Determine health status
        if kas <= 0:
            status = "kritis"
            score = 10
        elif arus_kas_bersih < 0:
            status = "waspada"
            score = 40
        else:
            status = "sehat"
            score = 75

        insight = [
            f"Saldo kas tersedia sebesar {kas:,.0f}.",
            f"Arus kas bersih mencapai {arus_kas_bersih:,.0f}.",
        ]

        warning = []
        if kas <= 0:
            warning.append("Saldo kas tidak tersedia. Bisnis mengalami kesulitan likuiditas.")
        if arus_kas_bersih < 0:
            warning.append("Pengeluaran melebihi pemasukan. Terjadi defisit arus kas.")

        return CashflowResponse(
            status=status,
            score=score,
            insight=insight,
            warning=warning,
            rekomendasi=[
                "Pantau saldo kas harian untuk memastbyen likuiditas bisnis.",
                "Identifikasi item pengeluaran terbesar dan cari peluang penghematan.",
            ],
            narasi="Analisis cashflow gagal diproses secara normal. Data dasar numerik telah tercatat dan perlu dipantau secara manual."
        )

    def _parse_cashflow_response(self, raw_response: str) -> CashflowResponse:
        """Parse AI response for cashflow analysis"""
        try:
            parsed = json.loads(raw_response)
        except json.JSONDecodeError as exc:
            snippet = (raw_response or "")[:10000]
            logging.debug("Cashflow AI raw response (truncated): %s", snippet)

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
                            "Cashflow AI response contains JSON-like content but parsing failed."
                        ) from exc
            else:
                raise ValueError(
                    "Cashflow AI response did not contain a JSON object."
                ) from exc

        return CashflowResponse.model_validate(parsed)

    def _parse_ringkasan_response(self, raw_response: str) -> RingkasanResponse:
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
