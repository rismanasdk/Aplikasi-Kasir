from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from clients.ai_client import AIClient, build_ai_client
from config import get_settings
from models.bi_models import (
    RingkasanRequest,
    RingkasanResponse,
    CashflowRequest,
    CashflowResponse,
    ProdukRequest,
    ProdukResponse,
    PersediaanRequest,
    PersediaanResponse,
    KeuanganRequest,
    KeuanganResponse,
    ForecastRequest,
    ForecastResponse,
    AnomalyRequest,
    AnomalyResponse,
    ExecutiveRequest,
    ExecutiveResponse,
)
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
        self.keuangan_renderer = PromptRenderer(Path(__file__).resolve().parent.parent / "prompts" / "bi" / "keuangan.md")
        self.forecast_renderer = PromptRenderer(Path(__file__).resolve().parent.parent / "prompts" / "bi" / "forecast.md")
        self.anomaly_renderer = PromptRenderer(Path(__file__).resolve().parent.parent / "prompts" / "bi" / "anomaly.md")
        self.executive_renderer = PromptRenderer(Path(__file__).resolve().parent.parent / "prompts" / "bi" / "executive.md")

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

    async def analyze_keuangan(self, payload: KeuanganRequest) -> KeuanganResponse:
        data = self._build_keuangan_metrics(payload)
        prompt = self.keuangan_renderer.render({"data": data})
        try:
            raw_response = await self.ai_client.generate(prompt)
        except Exception:
            return self._build_fallback_keuangan_response(payload)

        try:
            return self._parse_keuangan_response(raw_response)
        except ValueError:
            fallback_prompt = self.keuangan_renderer.render({
                "data": data,
                "retry": True,
            })
            try:
                retry_response = await self.ai_client.generate(fallback_prompt)
            except Exception:
                return self._build_fallback_keuangan_response(payload)
            try:
                return self._parse_keuangan_response(retry_response)
            except ValueError:
                return self._build_fallback_keuangan_response(payload)

    async def analyze_forecast(self, payload: ForecastRequest) -> ForecastResponse:
        data = self._build_forecast_metrics(payload)
        prompt = self.forecast_renderer.render({"data": data})
        try:
            raw_response = await self.ai_client.generate(prompt)
        except Exception:
            return self._build_fallback_forecast_response(payload)

        try:
            return self._parse_forecast_response(raw_response)
        except ValueError:
            fallback_prompt = self.forecast_renderer.render({
                "data": data,
                "retry": True,
            })
            try:
                retry_response = await self.ai_client.generate(fallback_prompt)
            except Exception:
                return self._build_fallback_forecast_response(payload)
            try:
                return self._parse_forecast_response(retry_response)
            except ValueError:
                return self._build_fallback_forecast_response(payload)

    async def analyze_anomaly(self, payload: AnomalyRequest) -> AnomalyResponse:
        data = self._build_anomaly_metrics(payload)
        prompt = self.anomaly_renderer.render({"data": data})
        try:
            raw_response = await self.ai_client.generate(prompt)
        except Exception:
            return self._build_fallback_anomaly_response(payload)

        try:
            return self._parse_anomaly_response(raw_response)
        except ValueError:
            fallback_prompt = self.anomaly_renderer.render({
                "data": data,
                "retry": True,
            })
            try:
                retry_response = await self.ai_client.generate(fallback_prompt)
            except Exception:
                return self._build_fallback_anomaly_response(payload)

    async def analyze_executive(self, payload: 'ExecutiveRequest') -> 'ExecutiveResponse':
        # Build aggregated data for executive prompt
        data = self._build_executive_metrics(payload)
        prompt = self.executive_renderer.render({"data": data})
        try:
            raw_response = await self.ai_client.generate(prompt)
        except Exception:
            return self._build_fallback_executive_response(payload)

        try:
            return self._parse_executive_response(raw_response)
        except ValueError:
            fallback_prompt = self.executive_renderer.render({"data": data, "retry": True})
            try:
                retry_response = await self.ai_client.generate(fallback_prompt)
            except Exception:
                return self._build_fallback_executive_response(payload)
            try:
                return self._parse_executive_response(retry_response)
            except ValueError:
                return self._build_fallback_executive_response(payload)

            try:
                return self._parse_anomaly_response(retry_response)
            except ValueError:
                return self._build_fallback_anomaly_response(payload)

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

    def _build_keuangan_metrics(self, payload: KeuanganRequest) -> dict[str, object]:
        keuangan = payload.keuangan
        pendapatan = float(keuangan.pendapatan or 0)
        hpp = float(keuangan.hpp or 0)
        pengeluaran = float(keuangan.pengeluaran_operasional or 0)
        target = float(keuangan.target_omzet or 0)

        laba_kotor = pendapatan - hpp
        laba_bersih = laba_kotor - pengeluaran

        margin_kotor = round((laba_kotor / pendapatan) * 100) if pendapatan else 0
        margin_bersih = round((laba_bersih / pendapatan) * 100) if pendapatan else 0
        roi = round((laba_bersih / hpp) * 100) if hpp else 0
        bep = None
        if margin_kotor > 0:
            bep = round(pengeluaran / (margin_kotor / 100)) if margin_kotor else None

        persentase_target = round((pendapatan / target) * 100) if target else 0

        return {
            "keuangan": {
                "pendapatan": round(pendapatan, 0),
                "hpp": round(hpp, 0),
                "laba_kotor": round(laba_kotor, 0),
                "pengeluaran_operasional": round(pengeluaran, 0),
                "laba_bersih": round(laba_bersih, 0),
                "margin_kotor": margin_kotor,
                "margin_bersih": margin_bersih,
                "roi": roi,
                "bep": bep,
                "target_omzet": round(target, 0),
                "persentase_target": persentase_target,
            }
        }

    def _build_forecast_metrics(self, payload: ForecastRequest) -> dict[str, object]:
        histori = payload.histori or []
        products = payload.produk or []

        total_penjualan = sum(float(item.total_penjualan or 0) for item in histori)
        jumlah_hari = len({item.tanggal for item in histori if item.tanggal})
        average_daily_sales = total_penjualan / jumlah_hari if jumlah_hari else 0

        sorted_histori = sorted(histori, key=lambda item: item.tanggal)
        recent_sales = [float(item.total_penjualan or 0) for item in sorted_histori[-7:]]
        moving_average_7 = sum(recent_sales) / len(recent_sales) if recent_sales else 0
        forecast_next_day = moving_average_7
        forecast_next_week = forecast_next_day * 7
        forecast_next_month = forecast_next_day * 30

        prev_histori = sorted_histori[-14:-7]
        prev_average = sum(float(item.total_penjualan or 0) for item in prev_histori) / len(prev_histori) if prev_histori else 0
        trend_percentage = 0.0
        if prev_average:
            trend_percentage = ((moving_average_7 - prev_average) / prev_average) * 100

        if not histori:
            trend = "Tidak Ada Data"
            trend_percentage = 0.0
        elif trend_percentage > 5:
            trend = "Naik"
        elif trend_percentage < -5:
            trend = "Turun"
        else:
            trend = "Stabil"

        forecast_products = []
        for product in products:
            total_qty_terjual = float(product.total_qty_terjual or 0)
            average_daily_qty = total_qty_terjual / jumlah_hari if jumlah_hari else 0
            forecast_qty_30_days = average_daily_qty * 30
            stok_sekarang = float(product.stok_sekarang) if product.stok_sekarang is not None else None
            days_until_stockout = None
            if stok_sekarang is not None and average_daily_qty > 0:
                days_until_stockout = stok_sekarang / average_daily_qty

            forecast_products.append({
                "nama": product.nama,
                "forecast_qty": round(forecast_qty_30_days, 0),
                "days_until_stockout": None if days_until_stockout is None else round(days_until_stockout, 0),
            })

        daily_values = [float(item.total_penjualan or 0) for item in histori]
        confidence = 0.0
        if len(daily_values) >= 2:
            mean = sum(daily_values) / len(daily_values)
            variance = sum((value - mean) ** 2 for value in daily_values) / len(daily_values)
            stddev = variance ** 0.5
            confidence = 1 - (stddev / mean) if mean else 0
            confidence = max(0.0, min(1.0, confidence))

        return {
            "forecast": {
                "total_penjualan": round(total_penjualan, 0),
                "jumlah_hari": jumlah_hari,
                "average_daily_sales": round(average_daily_sales, 0),
                "forecast_next_day": round(forecast_next_day, 0),
                "forecast_next_week": round(forecast_next_week, 0),
                "forecast_next_month": round(forecast_next_month, 0),
                "trend": trend,
                "trend_percentage": round(trend_percentage, 1),
                "confidence": round(confidence, 2),
                "products": forecast_products,
            }
        }

    def _build_fallback_keuangan_response(self, payload: KeuanganRequest) -> KeuanganResponse:
        keuangan = payload.keuangan
        pendapatan = float(keuangan.pendapatan or 0)
        hpp = float(keuangan.hpp or 0)
        pengeluaran = float(keuangan.pengeluaran_operasional or 0)
        laba_kotor = pendapatan - hpp
        laba_bersih = laba_kotor - pengeluaran

        status = "Sehat" if laba_bersih >= 0 and pengeluaran <= pendapatan * 0.7 else "Perlu Perhatian"
        insight = [
            f"Pendapatan tercatat sebesar {pendapatan:,.0f}.",
            f"HPP tercatat sebesar {hpp:,.0f} dan pengeluaran operasional sebesar {pengeluaran:,.0f}.",
            f"Laba bersih sementara adalah {laba_bersih:,.0f}.",
        ]
        rekomendasi = [
            "Periksa struktur biaya operasional untuk menjaga margin tetap positif.",
            "Pantau HPP dan harga jual agar margin kotor tidak tergerus.",
            "Bandingkan pendapatan dengan target omzet untuk memastikan pencapaian bisnis.",
        ]
        return KeuanganResponse(
            status=status,
            insight=insight,
            rekomendasi=rekomendasi,
            narasi="Analisis keuangan fallback: AI tidak tersedia atau menghasilkan respons yang tidak valid, sehingga data numerik dasar perlu ditindaklanjuti secara manual."
        )

    def _build_fallback_forecast_response(self, payload: ForecastRequest) -> ForecastResponse:
        data = self._build_forecast_metrics(payload)
        forecast_object = data.get("forecast", {})
        forecast = dict(forecast_object) if isinstance(forecast_object, dict) else {}

        status = "Stabil"
        if forecast.get("trend") == "Naik":
            status = "Optimis"
        elif forecast.get("trend") == "Turun":
            status = "Waspada"

        insight = [
            f"Rata-rata penjualan harian: {forecast.get('average_daily_sales', 0):,.0f}.",
            f"Forecast besok: {forecast.get('forecast_next_day', 0):,.0f}.",
            f"Trend saat ini: {forecast.get('trend', 'Tidak Ada Data')} ({forecast.get('trend_percentage', 0):+.1f}%).",
        ]
        products = forecast.get("products") or []
        if products:
            insight.append(f"Ada {len(products)} produk dengan prediksi kebutuhan stok 30 hari.")

        rekomendasi = [
            "Pantau penjualan harian dan sesuaikan stok untuk produk dengan forecast tinggi.",
            "Siapkan stok tambahan jika trend penjualan menunjukkan kenaikan.",
            "Periksa stok yang hampir habis untuk menghindari kekosongan produk." ,
        ]

        return ForecastResponse(
            status=status,
            insight=insight,
            rekomendasi=rekomendasi,
            narasi="Forecast fallback: AI tidak tersedia atau tidak merespon dengan benar. Gunakan angka prediksi dasar sebagai panduan sementara.",
        )

    def _build_anomaly_metrics(self, payload: AnomalyRequest) -> dict[str, object]:
        def safe_number(value: float | int | None) -> float:
            try:
                if value is None:
                    return 0.0
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        def percent_change(current: float, previous: float) -> float:
            current_value = safe_number(current)
            previous_value = safe_number(previous)
            if previous_value == 0:
                return 0.0
            change = ((current_value - previous_value) / previous_value) * 100
            if change != change or change == float('inf') or change == float('-inf'):
                return 0.0
            return round(change, 1)

        current = payload.current
        previous = payload.previous

        revenue_change = percent_change(current.pendapatan, previous.pendapatan)
        expense_change = percent_change(current.pengeluaran, previous.pengeluaran)
        gross_profit_change = percent_change(current.pendapatan - current.hpp, previous.pendapatan - previous.hpp)
        net_profit_change = percent_change(current.laba_bersih, previous.laba_bersih)
        margin_change = percent_change(current.margin, previous.margin)
        hpp_change = percent_change(current.hpp, previous.hpp)
        inventory_change = percent_change(current.persediaan, previous.persediaan)

        forecast_error = 0.0
        if current.forecast is not None and current.realisasi is not None and current.forecast != 0:
            forecast_error = round(((safe_number(current.realisasi) - safe_number(current.forecast)) / safe_number(current.forecast)) * 100, 1)
            if forecast_error != forecast_error or forecast_error == float('inf') or forecast_error == float('-inf'):
                forecast_error = 0.0

        product_changes = []
        for item in payload.produk or []:
            change = percent_change(item.current_qty, item.previous_qty)
            product_changes.append({
                "kategori": item.nama,
                "perubahan": change,
            })

        anomalies = [
            {"kategori": "Pendapatan", "perubahan": revenue_change},
            {"kategori": "Pengeluaran", "perubahan": expense_change},
            {"kategori": "Laba Kotor", "perubahan": gross_profit_change},
            {"kategori": "Laba Bersih", "perubahan": net_profit_change},
            {"kategori": "Margin", "perubahan": margin_change},
            {"kategori": "HPP", "perubahan": hpp_change},
            {"kategori": "Forecast Error", "perubahan": forecast_error},
            {"kategori": "Persediaan", "perubahan": inventory_change},
        ]
        anomalies.extend(product_changes)

        sorted_anomalies = sorted(anomalies, key=lambda item: abs(item["perubahan"]), reverse=True)
        top_anomaly = [item for item in sorted_anomalies if item.get("perubahan") is not None][:5]

        max_change = max((abs(item["perubahan"]) for item in anomalies), default=0.0)
        if max_change > 50:
            severity = "Tinggi"
        elif max_change >= 20:
            severity = "Sedang"
        else:
            severity = "Normal"

        if max_change > 50:
            status = "Anomali Terdeteksi"
        elif max_change >= 20:
            status = "Perlu Dipantau"
        else:
            status = "Normal"

        return {
            "anomaly": {
                "status": status,
                "revenue_change": revenue_change,
                "expense_change": expense_change,
                "gross_profit_change": gross_profit_change,
                "net_profit_change": net_profit_change,
                "margin_change": margin_change,
                "hpp_change": hpp_change,
                "forecast_error": forecast_error,
                "inventory_change": inventory_change,
                "severity": severity,
                "top_anomaly": top_anomaly,
            }
        }

    def _map_status_to_score(self, status: str | None) -> int:
        if not status:
            return 60
        s = str(status).lower()
        if any(k in s for k in ("sangat", "sehat", "optimis")):
            return 100
        if "baik" in s:
            return 80
        if any(k in s for k in ("cukup", "stabil", "normal")):
            return 60
        if any(k in s for k in ("perlu", "waspada", "peringatan", "perlu dipantau")):
            return 40
        if "kritis" in s:
            return 20
        return 60

    def _build_executive_metrics(self, payload: 'ExecutiveRequest') -> dict[str, object]:
        # Accept payload as Pydantic model; use model_dump() to get raw dict
        try:
            raw = payload.model_dump()
        except Exception:
            raw = payload if isinstance(payload, dict) else {}

        domains = [
            ("ringkasan", 20),
            ("cashflow", 15),
            ("produk", 10),
            ("persediaan", 10),
            ("keuangan", 20),
            ("forecast", 15),
            ("anomaly", 10),
        ]

        scores = {}
        total_weight = 0
        for name, weight in domains:
            value = raw.get(name) if isinstance(raw, dict) else None
            domain_score = None
            if isinstance(value, dict):
                # prefer explicit numeric score
                if "score" in value and isinstance(value.get("score"), (int, float)):
                    domain_score = int(max(0, min(100, int(value.get("score")))))
                elif "status" in value:
                    domain_score = self._map_status_to_score(value.get("status"))
            if domain_score is None:
                # fallback: treat missing domain as None (skip weight)
                domain_score = None

            scores[name] = {"score": domain_score, "weight": weight, "raw": value}
            if domain_score is not None:
                total_weight += weight

        # compute weighted aggregate (normalize by available weights)
        aggregate = 0.0
        if total_weight > 0:
            for name, info in scores.items():
                if info["score"] is not None:
                    aggregate += (info["score"] * (info["weight"] / total_weight))
        else:
            aggregate = 60.0

        business_health_score = round(float(aggregate))

        # derive business health label
        if business_health_score >= 90:
            business_health = "Sangat Baik"
        elif business_health_score >= 75:
            business_health = "Baik"
        elif business_health_score >= 60:
            business_health = "Cukup"
        elif business_health_score >= 40:
            business_health = "Perlu Perhatian"
        else:
            business_health = "Kritis"

        return {
            "executive": {
                "business_health_score": business_health_score,
                "business_health": business_health,
                "domain_scores": scores,
            },
            **raw,
        }

    def _build_fallback_executive_response(self, payload: 'ExecutiveRequest') -> 'ExecutiveResponse':
        metrics = self._build_executive_metrics(payload).get("executive", {})
        score = metrics.get("business_health_score", 60)
        health = metrics.get("business_health", "Cukup")

        # Build simple lists for priorities, opportunities, and risks based on available raw domains
        raw = payload.model_dump() if hasattr(payload, "model_dump") else (payload if isinstance(payload, dict) else {})
        prioritas = []
        peluang = []
        risiko = []
        # priority checks
        anomaly = raw.get("anomaly") or {}
        if isinstance(anomaly, dict):
            sev = anomaly.get("anomaly", {}) if anomaly.get("anomaly") else anomaly
            severity = None
            if isinstance(sev, dict):
                severity = sev.get("severity") or sev.get("status")
            if severity and ("tinggi" in str(severity).lower() or "anomali" in str(severity).lower()):
                prioritas.append("Anomali signifikan terdeteksi pada metrik keuangan atau produk")

        # keuangan
        keu = raw.get("keuangan") or {}
        if isinstance(keu, dict):
            lb = keu.get("laba_bersih") or keu.get("laba_kotor")
            if lb is not None and isinstance(lb, (int, float)) and lb < 0:
                prioritas.append("Laba negatif: periksa margin dan biaya operasional")
            margin = keu.get("margin_bersih") or keu.get("margin")
            if margin is not None and isinstance(margin, (int, float)) and margin < 0:
                prioritas.append("Margin negatif: evaluasi harga dan HPP")

        # cashflow
        cf = raw.get("cashflow") or {}
        if isinstance(cf, dict):
            arus = cf.get("arus_kas_bersih") or cf.get("kas_masuk") and (cf.get("kas_masuk") - cf.get("kas_keluar"))
            if arus is not None and isinstance(arus, (int, float)) and arus < 0:
                prioritas.append("Arus kas negatif: segera atasi defisit kas")

        # persediaan
        per = raw.get("persediaan") or {}
        if isinstance(per, dict):
            habis = per.get("produk_habis") or []
            hampir = per.get("produk_hampir_habis") or []
            if (isinstance(habis, list) and len(habis) > 0) or (isinstance(hampir, list) and len(hampir) > 0):
                prioritas.append("Stok kritis: beberapa produk habis atau hampir habis")

        # forecast
        fo = raw.get("forecast") or {}
        if isinstance(fo, dict):
            conf = fo.get("confidence")
            trend = fo.get("trend") or ""
            if conf is not None and isinstance(conf, (int, float)) and conf < 0.5:
                prioritas.append("Forecast memiliki tingkat kepercayaan rendah")
            if isinstance(trend, str) and trend.lower() == "turun":
                risiko.append("Forecast menurun: waspadai potensi penurunan penjualan")

        # peluang
        if isinstance(fo, dict) and fo.get("trend") == "Naik":
            peluang.append("Forecast naik: peluang peningkatan penjualan")
        if isinstance(cf, dict) and (cf.get("arus_kas_bersih") is not None and cf.get("arus_kas_bersih") > 0):
            peluang.append("Arus kas positif: peluang ekspansi atau investasi operasional kecil")
        if isinstance(keu, dict) and (keu.get("margin_bersih") is not None and keu.get("margin_bersih") > 0):
            peluang.append("Margin positif: fokus pada produk berkontribusi tinggi untuk meningkatkan profit")

        # risks: basic checks
        if isinstance(keu, dict) and (keu.get("pendapatan") is not None and keu.get("pendapatan") < (keu.get("target_omzet") or 0)):
            risiko.append("Pendapatan di bawah target")
        if isinstance(cf, dict) and (cf.get("kas") is not None and cf.get("kas") <= 0):
            risiko.append("Saldo kas rendah atau nol")

        # dedupe and limit to 5
        def take_unique(items):
            out = []
            for it in items:
                if it not in out:
                    out.append(it)
                if len(out) >= 5:
                    break
            return out

        prioritas = take_unique(prioritas)
        peluang = take_unique(peluang)
        risiko = take_unique(risiko)

        highlights = []
        if peluang:
            highlights.append(f"Peluang utama: {peluang[0]}")
        if prioritas:
            highlights.append(f"Prioritas utama: {prioritas[0]}")
        if risiko:
            highlights.append(f"Risiko utama: {risiko[0]}")

        executive_summary = f"Skor kesehatan bisnis: {score} ({health})."

        return ExecutiveResponse(
            status=health,
            executive_summary=executive_summary,
            prioritas=prioritas,
            peluang=peluang,
            risiko=risiko,
            aksi_minggu_ini=["Tinjau prioritas pertama dan ambil tindakan cepat."],
            narasi="Ringkasan eksekutif fallback: AI tidak tersedia sehingga hasil agregasi dasar disajikan."
        )

    def _parse_executive_response(self, raw_response: str) -> 'ExecutiveResponse':
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
                raise ValueError("Executive AI response did not contain a JSON object.") from exc

        return ExecutiveResponse.model_validate(parsed)

    def _build_fallback_anomaly_response(self, payload: AnomalyRequest) -> AnomalyResponse:
        metrics = self._build_anomaly_metrics(payload).get("anomaly", {})
        status = metrics.get("status", "Normal")
        top_anomaly = metrics.get("top_anomaly", []) or []

        insight = [
            f"Perubahan pendapatan: {metrics.get('revenue_change', 0):+.1f}%.",
            f"Perubahan pengeluaran: {metrics.get('expense_change', 0):+.1f}%.",
            f"Perubahan margin: {metrics.get('margin_change', 0):+.1f}%.",
        ]
        if top_anomaly:
            anomaly_names = ", ".join(str(item.get("kategori", "")) for item in top_anomaly[:3])
            insight.append(f"Top anomali: {anomaly_names}.")

        rekomendasi = [
            "Periksa kategori dengan perubahan terbesar untuk menemukan penyebab anomali.",
            "Bandingkan performa periode ini dengan periode sebelumnya pada metrik utama.",
            "Tindaklanjuti produk atau persediaan yang menunjukkan deviasi signifikan.",
        ]

        return AnomalyResponse(
            status=status,
            insight=insight,
            rekomendasi=rekomendasi,
            narasi="Analisis anomaly fallback: AI tidak tersedia atau menghasilkan respons tidak valid, sehingga hasil perhitungan dasar digunakan sebagai panduan sementara."
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

    def _parse_keuangan_response(self, raw_response: str) -> KeuanganResponse:
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
                raise ValueError("Keuangan AI response did not contain a JSON object.") from exc

        return KeuanganResponse.model_validate(parsed)

    def _parse_forecast_response(self, raw_response: str) -> ForecastResponse:
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
                raise ValueError("Forecast AI response did not contain a JSON object.") from exc

        return ForecastResponse.model_validate(parsed)

    def _parse_anomaly_response(self, raw_response: str) -> AnomalyResponse:
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
                raise ValueError("Anomaly AI response did not contain a JSON object.") from exc

        return AnomalyResponse.model_validate(parsed)

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
