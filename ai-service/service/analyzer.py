# ai-service/service/analyzer.py
"""
Core analysis engine. Pure Pandas + Numpy, rule-based.
Semua fungsi menerima list[dict] (dari data_fetcher) dan return dict/DF.
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import numpy as np
import pandas as pd

TZ = ZoneInfo("Asia/Jakarta")


# ============================================================
#  Utility helpers
# ============================================================
def _to_df_transaksi(data: list[dict]) -> pd.DataFrame:
    """Flatten transaksi + barang_dibeli ke DataFrame per-item."""
    rows = []
    for t in data:
        tgl = t.get("tanggal_transaksi")
        if isinstance(tgl, datetime):
            tgl_str = tgl.strftime("%Y-%m-%d")
            jam = tgl.hour
        elif isinstance(tgl, str):
            tgl_str = tgl[:10]
            jam = 0
        else:
            tgl_str = ""
            jam = 0

        for item in (t.get("barang_dibeli") or []):
            rows.append({
                "tanggal": tgl_str,
                "jam": jam,
                "nomor_transaksi": t.get("nomor_transaksi", ""),
                "metode_pembayaran": t.get("metode_pembayaran", ""),
                "status": t.get("status", ""),
                "kode_barang": item.get("kode_barang", ""),
                "nama_barang": item.get("nama_barang", ""),
                "jumlah": float(item.get("jumlah", 0)),
                "harga_satuan": float(item.get("harga_satuan", 0)),
                "harga_beli": float(item.get("harga_beli", 0)),
                "subtotal": float(item.get("subtotal", 0)),
                "total_harga": float(t.get("total_harga", 0)),
            })
    return pd.DataFrame(rows)


def _to_df_transaksi_level(data: list[dict]) -> pd.DataFrame:
    """DataFrame per transaksi (bukan per item)."""
    rows = []
    for t in data:
        tgl = t.get("tanggal_transaksi")
        if isinstance(tgl, datetime):
            tgl_str = tgl.strftime("%Y-%m-%d")
            jam = tgl.hour
        elif isinstance(tgl, str):
            tgl_str = tgl[:10]
            jam = 0
        else:
            tgl_str = ""
            jam = 0

        rows.append({
            "tanggal": tgl_str,
            "jam": jam,
            "nomor_transaksi": t.get("nomor_transaksi", ""),
            "metode_pembayaran": t.get("metode_pembayaran", ""),
            "status": t.get("status", ""),
            "total_harga": float(t.get("total_harga", 0)),
            "jumlah_item": len(t.get("barang_dibeli", [])),
        })
    return pd.DataFrame(rows)


def _format_rp(nilai: float) -> str:
    """Format angka ke Rupiah string."""
    if nilai >= 1_000_000_000:
        return f"Rp {nilai/1_000_000_000:,.2f} M"
    if nilai >= 1_000_000:
        return f"Rp {nilai/1_000_000:,.1f} jt"
    if nilai >= 1_000:
        return f"Rp {nilai/1_000:,.1f} rb"
    return f"Rp {nilai:,.0f}"


def _pct(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return round((numerator / denominator) * 100, 2)


def _trend_text(persen: float) -> str:
    if persen > 2:
        return "naik"
    if persen < -2:
        return "turun"
    return "stabil"


def _z_score(series: pd.Series) -> pd.Series:
    """Hitung z-score, handle zero std."""
    mean = series.mean()
    std = series.std()
    if std == 0 or np.isnan(std):
        return pd.Series([0.0] * len(series), index=series.index)
    return (series - mean) / std


# ============================================================
#  1. Ringkasan Bisnis
# ============================================================
def analisis_ringkasan(
    df_item: pd.DataFrame,
    df_trx: pd.DataFrame,
    total_pengeluaran: float,
    target_omzet: float,
    total_pendapatan_lalu: float = 0,
) -> dict:
    if df_item.empty:
        return {"total_pendapatan": 0, "total_transaksi": 0, "insight_text": "Tidak ada data transaksi."}

    total_pendapatan = float(df_item["subtotal"].sum()) or float(df_trx["total_harga"].sum())
    total_hpp = float((df_item["harga_beli"] * df_item["jumlah"]).sum())
    total_laba_kotor = total_pendapatan - total_hpp
    total_laba_bersih = total_laba_kotor - total_pengeluaran
    total_transaksi = int(df_trx["nomor_transaksi"].nunique()) if not df_trx.empty else 0
    rata_rata = total_pendapatan / total_transaksi if total_transaksi > 0 else 0
    margin = _pct(total_laba_bersih, total_pendapatan)
    pencapaian = _pct(total_pendapatan, target_omzet)
    pertumbuhan = _pct(total_pendapatan - total_pendapatan_lalu, total_pendapatan_lalu) if total_pendapatan_lalu > 0 else 0

    # Top / Bottom produk
    produk = (
        df_item.groupby("nama_barang")
        .agg(
            jumlah_terjual=("jumlah", "sum"),
            pendapatan=("subtotal", "sum"),
            hpp_total=("harga_beli", lambda x: (x * df_item.loc[x.index, "jumlah"]).sum()),
        )
        .reset_index()
    )
    produk["laba_kotor"] = produk["pendapatan"] - produk["hpp_total"]
    produk["margin_persen"] = produk.apply(lambda r: _pct(r["laba_kotor"], r["pendapatan"]), axis=1)

    top_produk = produk.nlargest(5, "pendapatan").to_dict("records")
    bottom_produk = produk.nsmallest(3, "pendapatan").to_dict("records")

    # Metode pembayaran
    metode = (
        df_trx.groupby("metode_pembayaran")["total_harga"]
        .agg(["sum", "count"])
        .reset_index()
        .rename(columns={"sum": "total", "count": "jumlah"})
    )
    metode["persen"] = metode.apply(lambda r: _pct(r["total"], total_pendapatan), axis=1)

    # Narasi
    trend_word = "naik" if pertumbuhan > 0 else "turun" if pertumbuhan < 0 else "stabil"
    narasi = (
        f"Total pendapatan sebesar {_format_rp(total_pendapatan)} dari {total_transaksi} transaksi "
        f"dengan rata-rata {_format_rp(rata_rata)} per transaksi. "
        f"Laba bersih {_format_rp(total_laba_bersih)} (margin {margin}%). "
        f"Pencapaian target omzet: {pencapaian}%."
    )
    if total_pendapatan_lalu > 0:
        narasi += f" Pendapatan {trend_word} {abs(pertumbuhan)}% dibanding periode sebelumnya."

    return {
        "total_pendapatan": total_pendapatan,
        "total_hpp": total_hpp,
        "total_laba_kotor": total_laba_kotor,
        "total_pengeluaran": total_pengeluaran,
        "total_laba_bersih": total_laba_bersih,
        "total_transaksi": total_transaksi,
        "rata_rata_transaksi": round(rata_rata),
        "laba_bersih_margin_persen": margin,
        "target_omzet": target_omzet,
        "pencapaian_target_persen": pencapaian,
        "pertumbuhan_vs_periode_lalu_persen": pertumbuhan,
        "top_produk": top_produk,
        "bottom_produk": bottom_produk,
        "metode_pembayaran": metode.to_dict("records"),
        "insight_text": narasi,
    }


# ============================================================
#  2-4. Insight (harian / mingguan / bulanan)
# ============================================================
def analisis_insight(
    df_item: pd.DataFrame,
    df_trx: pd.DataFrame,
    df_item_lalu: pd.DataFrame,
    tipe: str,
    periode_label: str,
) -> dict:
    highlight = []
    narasi_parts = []

    if df_trx.empty:
        return {
            "tipe": tipe, "periode_label": periode_label,
            "highlight": [], "ringkasan_narasi": "Tidak ada data transaksi periode ini.",
            "rekomendasi_cepat": [],
        }

    total_pendapatan = float(df_trx["total_harga"].sum())
    total_transaksi = int(df_trx["nomor_transaksi"].nunique())
    rata_rata = total_pendapatan / total_transaksi if total_transaksi > 0 else 0
    total_qty = int(df_item["jumlah"].sum()) if not df_item.empty else 0

    # --- Pendapatan ---
    pendapatan_lalu = float(df_item_lalu["subtotal"].sum()) if not df_item_lalu.empty else 0
    delta_pendapatan = _pct(total_pendapatan - pendapatan_lalu, pendapatan_lalu) if pendapatan_lalu > 0 else 0
    highlight.append({
        "label": "Total Pendapatan",
        "value": _format_rp(total_pendapatan),
        "trend": _trend_text(delta_pendapatan),
        "persen": delta_pendapatan,
        "deskripsi": f"{'Naik' if delta_pendapatan > 0 else 'Turun'} {abs(delta_pendapatan)}% vs periode lalu",
    })

    # --- Transaksi ---
    trx_lalu = int(df_item_lalu.groupby("nomor_transaksi").ngroups) if not df_item_lalu.empty else 0
    delta_trx = _pct(total_transaksi - trx_lalu, trx_lalu) if trx_lalu > 0 else 0
    highlight.append({
        "label": "Jumlah Transaksi",
        "value": str(total_transaksi),
        "trend": _trend_text(delta_trx),
        "persen": delta_trx,
        "deskripsi": f"Rata-rata {_format_rp(rata_rata)}/transaksi",
    })

    # --- Jam Ramai ---
    if not df_trx.empty:
        jam_agg = (
            df_trx.groupby("jam")
            .agg(jumlah_transaksi=("nomor_transaksi", "nunique"), total_omzet=("total_harga", "sum"))
            .reset_index()
            .sort_values("total_omzet", ascending=False)
        )
        jam_ramai = jam_agg.head(5).to_dict("records")
    else:
        jam_ramai = []

    # --- Produk Terlaris ---
    if not df_item.empty:
        produk_agg = (
            df_item.groupby("nama_barang")
            .agg(jumlah_terjual=("jumlah", "sum"), pendapatan=("subtotal", "sum"))
            .reset_index()
            .sort_values("pendapatan", ascending=False)
        )
        produk_terlaris = produk_agg.head(5).to_dict("records")

        # --- Produk Naik / Turun ---
        if not df_item_lalu.empty:
            curr = df_item.groupby("nama_barang")["jumlah"].sum()
            prev = df_item_lalu.groupby("nama_barang")["jumlah"].sum()
            combined = pd.DataFrame({"periode_ini": curr, "periode_lalu": prev}).fillna(0)
            combined["delta"] = _pct(combined["periode_ini"] - combined["periode_lalu"], combined["periode_lalu"].replace(0, 1))
            produk_naik = combined.nlargest(3, "delta").reset_index().to_dict("records")
            produk_turun = combined.nsmallest(3, "delta").reset_index().to_dict("records")
        else:
            produk_naik = []
            produk_turun = []
    else:
        produk_terlaris = []
        produk_naik = []
        produk_turun = []

    # --- Metode Populer ---
    if not df_trx.empty:
        metode_agg = (
            df_trx.groupby("metode_pembayaran")
            .agg(jumlah=("nomor_transaksi", "count"), total=("total_harga", "sum"))
            .reset_index()
            .sort_values("total", ascending=False)
        )
        metode_populer = metode_agg.to_dict("records")
    else:
        metode_populer = []

    # --- Narasi ---
    jam_peak = jam_ramai[0]["jam"] if jam_ramai else "-"
    narasi = (
        f"Periode {periode_label}: pendapatan {_format_rp(total_pendapatan)} dari {total_transaksi} transaksi "
        f"dengan {total_qty} item terjual. Jam tersibuk: {jam_peak}."
    )
    if produk_terlaris:
        narasi += f" Produk terlaris: {produk_terlaris[0]['nama_barang']}."

    # --- Rekomendasi cepat ---
    rekomendasi = []
    if delta_pendapatan < -10:
        rekomendasi.append("Pendapatan turun signifikan, perlu evaluasi promo atau jam operasional.")
    if produk_turun:
        for p in produk_turun[:2]:
            rekomendasi.append(f"Produk '{p['nama_barang']}' turun {abs(p.get('delta', 0))}%, pertimbangkan promo.")
    if not rekomendasi:
        rekomendasi.append("Performa stabil, pertahankan strategi saat ini.")

    return {
        "tipe": tipe,
        "periode_label": periode_label,
        "highlight": highlight,
        "jam_ramai": jam_ramai,
        "produk_terlaris": produk_terlaris,
        "produk_naik": produk_naik,
        "produk_turun": produk_turun,
        "metode_populer": metode_populer,
        "ringkasan_narasi": narasi,
        "rekomendasi_cepat": rekomendasi,
    }


# ============================================================
#  5. Analisis Penyebab Penjualan Turun
# ============================================================
def analisis_penurunan(
    df_item: pd.DataFrame,
    df_item_lalu: pd.DataFrame,
    df_trx: pd.DataFrame,
    df_trx_lalu: pd.DataFrame,
    threshold: float = 15.0,
) -> dict:
    pendapatan_ini = float(df_item["subtotal"].sum()) if not df_item.empty else 0
    pendapatan_lalu = float(df_item_lalu["subtotal"].sum()) if not df_item_lalu.empty else 0

    if pendapatan_lalu == 0:
        return {
            "terdeteksi": False,
            "penurunan_total_persen": 0,
            "faktor_utama": [],
            "narasi": "Tidak cukup data periode lalu untuk perbandingan.",
            "saran": ["Kumpulkan lebih banyak data untuk analisis."],
        }

    penurunan_pct = _pct(pendapatan_ini - pendapatan_lalu, pendapatan_lalu)
    terdeteksi = penurunan_pct < -threshold

    if not terdeteksi:
        return {
            "terdeteksi": False,
            "penurunan_total_persen": penurunan_pct,
            "faktor_utama": [],
            "narasi": f"Tidak terdeteksi penurunan signifikan. Perubahan: {penurunan_pct}%.",
            "saran": [],
        }

    faktor = []
    saran = []

    # Faktor 1: Jumlah transaksi
    trx_ini = int(df_trx["nomor_transaksi"].nunique()) if not df_trx.empty else 0
    trx_lalu = int(df_trx_lalu["nomor_transaksi"].nunique()) if not df_trx_lalu.empty else 0
    delta_trx = _pct(trx_ini - trx_lalu, trx_lalu) if trx_lalu > 0 else 0
    faktor.append({
        "faktor": "Jumlah Transaksi",
        "deskripsi": f"Transaksi turun {abs(delta_trx)}% ({trx_lalu} → {trx_ini})",
        "dampak": "tinggi" if abs(delta_trx) > 20 else "sedang" if abs(delta_trx) > 10 else "rendah",
        "nilai": delta_trx,
    })
    if delta_trx < -15:
        saran.append("Tingkatkan promosi atau cek apakah ada masalah operasional yang mengurangi kunjungan pelanggan.")

    # Faktor 2: Rata-rata nilai transaksi (basket size)
    avg_ini = pendapatan_ini / trx_ini if trx_ini > 0 else 0
    avg_lalu = pendapatan_lalu / trx_lalu if trx_lalu > 0 else 0
    delta_avg = _pct(avg_ini - avg_lalu, avg_lalu) if avg_lalu > 0 else 0
    faktor.append({
        "faktor": "Rata-rata Nilai Transaksi",
        "deskripsi": f"Basket size {'turun' if delta_avg < 0 else 'naik'} {abs(delta_avg)}% ({_format_rp(avg_lalu)} → {_format_rp(avg_ini)})",
        "dampak": "tinggi" if abs(delta_avg) > 15 else "sedang" if abs(delta_avg) > 8 else "rendah",
        "nilai": delta_avg,
    })
    if delta_avg < -10:
        saran.append("Nilai transaksi menurun. Pertimbangkan upselling atau bundle promo.")

    # Faktor 3: Per produk
    if not df_item.empty and not df_item_lalu.empty:
        curr = df_item.groupby("nama_barang")["jumlah"].sum().reset_index().rename(columns={"jumlah": "qty_ini"})
        prev = df_item_lalu.groupby("nama_barang")["jumlah"].sum().reset_index().rename(columns={"jumlah": "qty_lalu"})
        merged = curr.merge(prev, on="nama_barang", how="outer").fillna(0)
        merged["perubahan_persen"] = merged.apply(
            lambda r: _pct(r["qty_ini"] - r["qty_lalu"], r["qty_lalu"]) if r["qty_lalu"] > 0 else 0, axis=1
        )
        merged = merged.sort_values("perubahan_persen")
        produk_turun_list = merged[merged["perubahan_persen"] < -10].head(10).to_dict("records")

        # Faktor kategori
        if "kode_barang" in df_item.columns and "kode_barang" in df_item_lalu.columns:
            # Kita perlu data barang untuk kategori — skip jika tidak ada
            pass
    else:
        produk_turun_list = []

    faktor.append({
        "faktor": "Penurunan per Produk",
        "deskripsi": f"{len(produk_turun_list)} produk mengalami penurunan penjualan >10%",
        "dampak": "tinggi" if len(produk_turun_list) > 5 else "sedang",
        "nilai": len(produk_turun_list),
        "detail": produk_turun_list[:5],
    })

    narasi = (
        f"Penjualan turun {abs(penurunan_pct)}% dibanding periode lalu. "
        f"Faktor utama: "
    )
    faktor_dampak = sorted(faktor, key=lambda x: {"tinggi": 0, "sedang": 1, "rendah": 2}.get(x["dampak"], 3))
    narasi += ", ".join([f["faktor"] for f in faktor_dampak[:2]]) + "."

    return {
        "terdeteksi": True,
        "penurunan_total_persen": penurunan_pct,
        "faktor_utama": faktor,
        "perbandingan_per_produk": produk_turun_list[:10],
        "perbandingan_per_kategori": [],
        "narasi": narasi,
        "saran": saran if saran else ["Evaluasi faktor-faktor di atas dan sesuaikan strategi penjualan."],
    }


# ============================================================
#  6. Analisis Cash Flow
# ============================================================
def analisis_cashflow(
    df_trx: pd.DataFrame,
    pengeluaran_list: list[dict],
    riwayat_modal: list[dict],
    saldo_kas_terkini: float,
) -> dict:
    if df_trx.empty:
        return {"total_pemasukan": 0, "total_pengeluaran": 0, "narasi": "Tidak ada data transaksi."}

    # Pemasukan per hari (dari transaksi selesai)
    pemasukan_harian = df_trx.groupby("tanggal")["total_harga"].sum().reset_index()
    pemasukan_harian.columns = ["tanggal", "pemasukan"]

    # Pengeluaran per hari
    peng_df = pd.DataFrame(pengeluaran_list)
    if not peng_df.empty:
        peng_df["tanggal"] = pd.to_datetime(peng_df["tanggal"]).dt.strftime("%Y-%m-%d")
        pengeluaran_harian = peng_df.groupby("tanggal")["jumlah"].sum().reset_index()
        pengeluaran_harian.columns = ["tanggal", "pengeluaran"]
    else:
        pengeluaran_harian = pd.DataFrame(columns=["tanggal", "pengeluaran"])

    # Merge
    merged = pemasukan_harian.merge(pengeluaran_harian, on="tanggal", how="outer").fillna(0).sort_values("tanggal")
    merged["net_cash_flow"] = merged["pemasukan"] - merged["pengeluaran"]

    # Tambah dari riwayat modal (pemasukan/pengeluaran non-transaksi)
    for r in riwayat_modal:
        tgl = r.get("tanggal", "")
        if isinstance(tgl, datetime):
            tgl = tgl.strftime("%Y-%m-%d")
        tipe = r.get("tipe", "")
        jumlah = float(r.get("jumlah", 0))
        mask = merged["tanggal"] == tgl
        if mask.any():
            if tipe == "pemasukan":
                merged.loc[mask, "pemasukan"] += jumlah
            elif tipe in ("pengeluaran", "prive"):
                merged.loc[mask, "pengeluaran"] += jumlah
                merged.loc[mask, "net_cash_flow"] -= jumlah
        else:
            new_row = {"tanggal": tgl, "pemasukan": jumlah if tipe == "pemasukan" else 0,
                       "pengeluaran": jumlah if tipe in ("pengeluaran", "prive") else 0,
                       "net_cash_flow": jumlah if tipe == "pemasukan" else -jumlah}
            merged = pd.concat([merged, pd.DataFrame([new_row])], ignore_index=True)

    merged = merged.sort_values("tanggal").reset_index(drop=True)
    merged["saldo_kumulatif"] = merged["net_cash_flow"].cumsum() + saldo_kas_terkini

    total_pemasukan = float(merged["pemasukan"].sum())
    total_pengeluaran = float(merged["pengeluaran"].sum())
    net = total_pemasukan - total_pengeluaran
    jumlah_hari = max(len(merged), 1)

    # Trend
    if len(merged) >= 3:
        x = np.arange(len(merged))
        y = merged["net_cash_flow"].values.astype(float)
        slope = np.polyfit(x, y, 1)[0]
        trend = "positif" if slope > 0 else "negatif" if slope < 0 else "stabil"
    else:
        trend = "stabil"

    detail = merged.to_dict("records")

    narasi = (
        f"Total pemasukan {_format_rp(total_pemasukan)}, pengeluaran {_format_rp(total_pengeluaran)}, "
        f"net cash flow {_format_rp(net)}. Saldo kas terkini: {_format_rp(saldo_kas_terkini)}. "
        f"Trend cash flow: {trend}."
    )

    return {
        "total_pemasukan": total_pemasukan,
        "total_pengeluaran": total_pengeluaran,
        "net_cash_flow": net,
        "rata_pemasukan_harian": round(total_pemasukan / jumlah_hari),
        "rata_pengeluaran_harian": round(total_pengeluaran / jumlah_hari),
        "saldo_kas_terkini": saldo_kas_terkini,
        "detail_harian": detail,
        "trend": trend,
        "narasi": narasi,
    }


# ============================================================
#  7. Analisis Pengeluaran
# ============================================================
def analisis_pengeluaran(
    pengeluaran_list: list[dict],
    total_pendapatan: float,
    pengeluaran_lalu_list: list[dict] | None = None,
) -> dict:
    df = pd.DataFrame(pengeluaran_list)
    if df.empty:
        return {"total_pengeluaran": 0, "narasi": "Tidak ada data pengeluaran."}

    total_pengeluaran = float(df["jumlah"].sum())
    rasio = _pct(total_pengeluaran, total_pendapatan)

    # Breakdown per kategori
    kat = (
        df.groupby("nama_kategori")["jumlah"]
        .agg(["sum", "count", "mean"])
        .reset_index()
        .rename(columns={"sum": "total", "count": "jumlah_transaksi", "mean": "rata_per_transaksi"})
    )
    kat["persen_dari_total"] = kat.apply(lambda r: _pct(r["total"], total_pengeluaran), axis=1)
    kat = kat.sort_values("total", ascending=False)

    # Pengeluaran terbesar (item individual)
    terbesar = df.nlargest(5, "jumlah")[["nama_kategori", "keterangan", "jumlah", "tanggal"]].to_dict("records")

    # Trend mingguan
    if "tanggal" in df.columns:
        df["tanggal"] = pd.to_datetime(df["tanggal"])
        df["minggu"] = df["tanggal"].dt.isocalendar().week.astype(str)
        df["tahun_minggu"] = df["tanggal"].dt.strftime("%Y-W%V")
        trend = df.groupby("tahun_minggu")["jumlah"].sum().reset_index()
        trend.columns = ["periode", "total"]
        trend = trend.sort_values("periode")
        trend_list = trend.to_dict("records")
    else:
        trend_list = []

    # Perbandingan vs periode lalu
    perbandingan = {}
    if pengeluaran_lalu_list:
        df_lalu = pd.DataFrame(pengeluaran_lalu_list)
        if not df_lalu.empty:
            total_lalu = float(df_lalu["jumlah"].sum())
            delta = _pct(total_pengeluaran - total_lalu, total_lalu) if total_lalu > 0 else 0
            perbandingan = {
                "total_periode_lalu": total_lalu,
                "total_periode_ini": total_pengeluaran,
                "perubahan_persen": delta,
            }

    # Narasi
    top_kat = kat.iloc[0]["nama_kategori"] if len(kat) > 0 else "-"
    top_kat_pct = kat.iloc[0]["persen_dari_total"] if len(kat) > 0 else 0
    narasi = (
        f"Total pengeluaran {_format_rp(total_pengeluaran)}, {rasio}% dari pendapatan. "
        f"Kategori terbesar: {top_kat} ({top_kat_pct}%)."
    )
    if perbandingan and perbandingan.get("perubahan_persen", 0) > 10:
        narasi += f" Pengeluaran naik {perbandingan['perubahan_persen']}% vs periode lalu."

    saran = []
    if rasio > 40:
        saran.append("Rasio pengeluaran terhadap pendapatan sangat tinggi (>40%). Evaluasi efisiensi operasional.")
    if perbandingan and perbandingan.get("perubahan_persen", 0) > 15:
        saran.append("Pengeluaran meningkat tajam. Review item pengeluaran terbesar untuk potensi penghematan.")
    if len(kat) > 0 and kat.iloc[0]["persen_dari_total"] > 50:
        saran.append(f"Kategori '{top_kat}' mendominasi pengeluaran. Pertimbangkan negosiasi atau alternatif.")

    return {
        "total_pengeluaran": total_pengeluaran,
        "rasio_pengeluaran_pendapatan": rasio,
        "breakdown_per_kategori": kat.to_dict("records"),
        "trend_mingguan": trend_list,
        "pengeluaran_terbesar": terbesar,
        "perbandingan_vs_periode_lalu": perbandingan,
        "narasi": narasi,
        "saran": saran,
    }


# ============================================================
#  8. Deteksi Anomali Transaksi
# ============================================================
def deteksi_anomali(
    df_trx: pd.DataFrame,
    threshold_z: float = 2.5,
) -> dict:
    if df_trx.empty:
        return {"total_diperiksa": 0, "narasi": "Tidak ada transaksi untuk dianalisis."}

    total = len(df_trx)

    # Statistik normal
    rata_harga = float(df_trx["total_harga"].mean())
    std_harga = float(df_trx["total_harga"].std())
    median_harga = float(df_trx["total_harga"].median())
    q1 = float(df_trx["total_harga"].quantile(0.25))
    q3 = float(df_trx["total_harga"].quantile(0.75))

    rata_item = float(df_trx["jumlah_item"].mean())
    std_item = float(df_trx["jumlah_item"].std())

    stats = {
        "rata_rata_harga": round(rata_harga),
        "std_harga": round(std_harga),
        "rata_rata_item": round(rata_item, 1),
        "std_item": round(std_item, 1),
        "median_harga": round(median_harga),
        "q1_harga": round(q1),
        "q3_harga": round(q3),
    }

    # Z-score
    if std_harga > 0:
        df_trx = df_trx.copy()
        df_trx["z_harga"] = _z_score(df_trx["total_harga"])
    else:
        df_trx = df_trx.copy()
        df_trx["z_harga"] = 0.0

    if std_item > 0:
        df_trx["z_item"] = _z_score(df_trx["jumlah_item"])
    else:
        df_trx["z_item"] = 0.0

    # IQR untuk total_harga
    iqr = q3 - q1
    batas_bawah = q1 - 1.5 * iqr
    batas_atas = q3 + 1.5 * iqr

    # Deteksi anomali
    anomali_list = []
    for _, row in df_trx.iterrows():
        alasan = []
        skor = 0.0

        if abs(row["z_harga"]) > threshold_z:
            alasan.append(f"Nilai transaksi {'jauh di atas' if row['z_harga'] > 0 else 'jauh di bawah'} rata-rata (z={row['z_harga']:.1f})")
            skor = max(skor, abs(row["z_harga"]))

        if abs(row["z_item"]) > threshold_z:
            alasan.append(f"Jumlah item {'jauh di atas' if row['z_item'] > 0 else 'jauh di bawah'} rata-rata (z={row['z_item']:.1f})")
            skor = max(skor, abs(row["z_item"]))

        if row["total_harga"] > batas_atas:
            alasan.append(f"Melebihi batas atas IQR ({_format_rp(batas_atas)})")
            skor = max(skor, 3.0)
        elif row["total_harga"] < batas_bawah and row["total_harga"] > 0:
            alasan.append(f"Di bawah batas bawah IQR ({_format_rp(batas_bawah)})")
            skor = max(skor, 3.0)

        # Jam tidak wajar (di bawah jam 6 atau di atas jam 23)
        if row["jam"] < 6 or row["jam"] >= 23:
            alasan.append(f"Transaksi di jam tidak wajar ({row['jam']}:00)")
            skor = max(skor, 2.0)

        if alasan:
            anomali_list.append({
                "nomor_transaksi": row["nomor_transaksi"],
                "tanggal": row["tanggal"],
                "total_harga": row["total_harga"],
                "jumlah_item": int(row["jumlah_item"]),
                "jenis_anomali": "nilai_abnormal" if abs(row.get("z_harga", 0)) > threshold_z else "volume_abnormal" if abs(row.get("z_item", 0)) > threshold_z else "waktu_tidak_wajar",
                "skor_anomali": round(skor, 2),
                "alasan": "; ".join(alasan),
            })

    # Jam tidak wajar summary
    jam_anomali = (
        df_trx[(df_trx["jam"] < 6) | (df_trx["jam"] >= 23)]
        .groupby("jam")
        .agg(jumlah=("nomor_transaksi", "count"))
        .reset_index()
        .to_dict("records")
    )

    narasi = (
        f"Diperiksa {total} transaksi, ditemukan {len(anomali_list)} anomali "
        f"({_pct(len(anomali_list), total)}%). "
    )
    if anomali_list:
        top_anomali = max(anomali_list, key=lambda x: x["skor_anomali"])
        narasi += f"Anomali tertinggi: {top_anomali['nomor_transaksi']} (skor {top_anomali['skor_anomali']})."

    return {
        "total_diperiksa": total,
        "jumlah_anomali": len(anomali_list),
        "tingkat_anomali_persen": _pct(len(anomali_list), total),
        "statistik_normal": stats,
        "anomali_terdeteksi": anomali_list,
        "jam_tidak_wajar": jam_anomali,
        "narasi": narasi,
    }


# ============================================================
#  9. Deteksi Risiko Cash Flow
# ============================================================
def deteksi_risiko_cashflow(
    saldo_kas: float,
    avg_pengeluaran_harian: float,
    avg_pemasukan_harian: float,
    kewajiban_list: list[dict],
) -> dict:
    risiko = []
    skor = 0.0

    # 1. Cash Runway
    if avg_pengeluaran_harian > 0:
        runway = saldo_kas / avg_pengeluaran_harian
    else:
        runway = 999.9

    if runway < 7:
        risiko.append({
            "tipe_risiko": "Cash Runway Rendah",
            "tingkat": "tinggi",
            "deskripsi": f"Saldo kas hanya cukup untuk {runway:.0f} hari operasional",
            "nilai": runway,
            "saran": "Prioritaskan peningkatan pemasukan atau kurangi pengeluaran segera.",
        })
        skor += 40
    elif runway < 14:
        risiko.append({
            "tipe_risiko": "Cash Runway Terbatas",
            "tingkat": "sedang",
            "deskripsi": f"Saldo kas cukup untuk {runway:.0f} hari operasional",
            "nilai": runway,
            "saran": "Monitor cash flow harian dan pertimbangkan cadangan dana darurat.",
        })
        skor += 20

    # 2. Saldo negatif / sangat rendah
    if saldo_kas < 0:
        risiko.append({
            "tipe_risiko": "Saldo Negatif",
            "tingkat": "tinggi",
            "deskripsi": f"Saldo kas negatif: {_format_rp(saldo_kas)}",
            "nilai": saldo_kas,
            "saran": "Segera tambah modal atau cari pendanaan darurat.",
        })
        skor += 50
    elif saldo_kas < 50000:
        risiko.append({
            "tipe_risiko": "Saldo Kritis",
            "tingkat": "tinggi",
            "deskripsi": f"Saldo kas sangat rendah: {_format_rp(saldo_kas)}",
            "nilai": saldo_kas,
            "saran": "Saldo di bawah Rp 50.000. Segera top up untuk operasional.",
        })
        skor += 35
    elif saldo_kas < 500000:
        risiko.append({
            "tipe_risiko": "Saldo Rendah",
            "tingkat": "sedang",
            "deskripsi": f"Saldo kas rendah: {_format_rp(saldo_kas)}",
            "nilai": saldo_kas,
            "saran": "Pertimbangkan menambah saldo cadangan.",
        })
        skor += 15

    # 3. Cash flow negatif (pengeluaran > pemasukan)
    if avg_pengeluaran_harian > avg_pemasukan_harian and avg_pemasukan_harian > 0:
        defisit = avg_pengeluaran_harian - avg_pemasukan_harian
        risiko.append({
            "tipe_risiko": "Cash Flow Negatif",
            "tingkat": "tinggi",
            "deskripsi": f"Rata-rata pengeluaran harian ({_format_rp(avg_pengeluaran_harian)}) melebihi pemasukan ({_format_rp(avg_pemasukan_harian)})",
            "nilai": defisit,
            "saran": "Evaluasi pengeluaran dan cari cara meningkatkan penjualan.",
        })
        skor += 30

    # 4. Kewajiban jatuh tempo
    total_kewajiban_30hari = sum(float(k.get("sisa_jumlah", 0)) for k in kewajiban_list)
    if total_kewajiban_30hari > 0:
        kemampuan_bayar = (saldo_kas / total_kewajiban_30hari * 100) if total_kewajiban_30hari > 0 else 999
        if kemampuan_bayar < 50:
            risiko.append({
                "tipe_risiko": "Kewajiban Jatuh Tempo",
                "tingkat": "tinggi",
                "deskripsi": f"Total kewajiban 30 hari: {_format_rp(total_kewajiban_30hari)}, kemampuan bayar: {kemampuan_bayar:.0f}%",
                "nilai": total_kewajiban_30hari,
                "saran": "Prioritaskan pembayaran kewajiban dan negosiasi jadwal jika perlu.",
            })
            skor += 25
        elif kemampuan_bayar < 100:
            risiko.append({
                "tipe_risiko": "Kewajiban Jatuh Tempo",
                "tingkat": "sedang",
                "deskripsi": f"Total kewajiban 30 hari: {_format_rp(total_kewajiban_30hari)}",
                "nilai": total_kewajiban_30hari,
                "saran": "Siapkan dana untuk pembayaran kewajiban yang akan jatuh tempo.",
            })
            skor += 10

    # Skor max 100, clamp
    skor = min(skor, 100)

    if skor >= 60:
        status = "bahaya"
    elif skor >= 30:
        status = "waspada"
    else:
        status = "aman"

    # Narasi
    if status == "aman":
        narasi = f"Kondisi kas sehat. Cash runway {runway:.0f} hari dengan saldo {_format_rp(saldo_kas)}."
    elif status == "waspada":
        narasi = f"Kondisi kas perlu diwaspadai. Cash runway {runway:.0f} hari. {len(risiko)} risiko terdeteksi."
    else:
        narasi = f"Kondisi kas bahaya! Cash runway hanya {runway:.0f} hari. Segera ambil tindakan."

    return {
        "saldo_kas_terkini": saldo_kas,
        "cash_runway_hari": round(runway, 1),
        "avg_pengeluaran_harian": round(avg_pengeluaran_harian),
        "avg_pemasukan_harian": round(avg_pemasukan_harian),
        "kewajiban_jatuh_tempo_30hari": [
            {"nama": k.get("nama", ""), "sisa_jumlah": float(k.get("sisa_jumlah", 0)),
             "jatuh_tempo": k.get("jatuh_tempo", "").isoformat() if isinstance(k.get("jatuh_tempo"), datetime) else str(k.get("jatuh_tempo", "")),
             "kategori": k.get("kategori", "")}
            for k in kewajiban_list
        ],
        "daftar_risiko": risiko,
        "skor_risiko": skor,
        "status_keseluruhan": status,
        "narasi": narasi,
    }


# ============================================================
#  10. Rekomendasi Bisnis Otomatis
# ============================================================
def generate_rekomendasi(
    df_item: pd.DataFrame,
    df_trx: pd.DataFrame,
    barang_list: list[dict],
    saldo_kas: float,
    total_pengeluaran: float,
    total_pendapatan: float,
    kewajiban_list: list[dict],
) -> dict:
    rekomendasi = []

    # --- STOK ---
    for b in barang_list:
        stok = int(b.get("stok", 0))
        stok_min = int(b.get("stok_minimal", 0))
        nama = b.get("nama_barang", "")
        if stok <= stok_min and stok_min > 0:
            prioritas = "tinggi" if stok == 0 else "sedang"
            rekomendasi.append({
                "kategori": "stok",
                "prioritas": prioritas,
                "judul": f"Stok {nama} {'habis' if stok == 0 else 'hampir habis'}",
                "deskripsi": f"Sisa stok: {stok}, minimum: {stok_min}",
                "aksi": f"Restok {nama} segera. Stok habis berarti kehilangan potensi penjualan.",
                "dampak_potensial": "Menghindari kehilangan penjualan dan menjaga ketersediaan produk.",
            })

    # --- PRODUK ---
    if not df_item.empty:
        produk = (
            df_item.groupby("nama_barang")
            .agg(jumlah=("jumlah", "sum"), pendapatan=("subtotal", "sum"))
            .reset_index()
        )
        produk["laba_per_item"] = produk["pendapatan"] / produk["jumlah"].replace(0, 1)

        # Produk tidak laku
        produk_tidak_laku = produk[produk["jumlah"] <= 1]
        for _, row in produk_tidak_laku.iterrows():
            rekomendasi.append({
                "kategori": "produk",
                "prioritas": "sedang",
                "judul": f"Produk '{row['nama_barang']}' kurang laku",
                "deskripsi": f"Hanya {row['jumlah']} unit terjual",
                "aksi": "Evaluasi apakah produk masih layak dijual, atau perlu promosi khusus.",
                "dampak_potensial": "Efisiensi menu dan fokus pada produk yang lebih menguntungkan.",
            })

        # Margin rendah
        if "harga_beli" in df_item.columns and "harga_satuan" in df_item.columns:
            margin_df = df_item.groupby("nama_barang").agg(
                avg_harga_beli=("harga_beli", "mean"),
                avg_harga_jual=("harga_satuan", "mean"),
            ).reset_index()
            margin_df["margin"] = ((margin_df["avg_harga_jual"] - margin_df["avg_harga_beli"]) / margin_df["avg_harga_jual"] * 100).round(1)
            low_margin = margin_df[margin_df["margin"] < 20]
            for _, row in low_margin.iterrows():
                rekomendasi.append({
                    "kategori": "harga",
                    "prioritas": "sedang",
                    "judul": f"Margin '{row['nama_barang']}' rendah ({row['margin']}%)",
                    "deskripsi": f"Harga beli: {row['avg_harga_beli']}, harga jual: {row['avg_harga_jual']}",
                    "aksi": "Pertimbangkan menaikkan harga jual atau negosiasi harga bahan baku.",
                    "dampak_potensial": f"Meningkatkan margin ke minimal 30% bisa menambah profit signifikan.",
                })

    # --- PENGELUARAN ---
    if total_pendapatan > 0:
        rasio = _pct(total_pengeluaran, total_pendapatan)
        if rasio > 35:
            rekomendasi.append({
                "kategori": "pengeluaran",
                "prioritas": "tinggi" if rasio > 50 else "sedang",
                "judul": f"Rasio pengeluaran tinggi ({rasio}%)",
                "deskripsi": f"Pengeluaran {_format_rp(total_pengeluaran)} dari {_format_rp(total_pendapatan)} pendapatan",
                "aksi": "Review semua kategori pengeluaran dan identifikasi yang bisa dipotong.",
                "dampak_potensial": f"Mengurangi pengeluaran 10% saja bisa hemat {_format_rp(total_pengeluaran * 0.1)}/bulan.",
            })

    # --- OPERASIONAL ---
    if saldo_kas < 500000:
        rekomendasi.append({
            "kategori": "operasional",
            "prioritas": "tinggi",
            "judul": "Saldo kas rendah",
            "deskripsi": f"Saldo kas saat ini: {_format_rp(saldo_kas)}",
            "aksi": "Segera tambah modal atau tunda pengeluaran non-esensial.",
            "dampak_potensial": "Mencegah gangguan operasional akibat kekurangan kas.",
        })

    # --- KEWAJIBAN ---
    for k in kewajiban_list:
        if k.get("jatuh_tempo"):
            jt = k.get("jatuh_tempo")
            if isinstance(jt, datetime):
                sisa_hari = (jt - datetime.now(TZ)).days
                if 0 <= sisa_hari <= 7:
                    rekomendasi.append({
                        "kategori": "operasional",
                        "prioritas": "tinggi",
                        "judul": f"Kewajiban '{k.get('nama', '')}' jatuh tempo {sisa_hari} hari lagi",
                        "deskripsi": f"Sisa: {_format_rp(k.get('sisa_jumlah', 0))}",
                        "aksi": "Siapkan dana pembayaran dan pastikan saldo mencukupi.",
                        "dampak_potensial": "Menghindari denda keterlambatan dan menjaga reputasi.",
                    })

    # Sort by prioritas
    prioritas_order = {"tinggi": 0, "sedang": 1, "rendah": 2}
    rekomendasi.sort(key=lambda x: prioritas_order.get(x["prioritas"], 3))

    ringkasan = f"Ditemukan {len(rekomendasi)} rekomendasi"
    tinggi_count = sum(1 for r in rekomendasi if r["prioritas"] == "tinggi")
    if tinggi_count > 0:
        ringkasan += f", {tinggi_count} bersifat prioritas tinggi yang perlu segera ditindaklanjuti."

    return {
        "total_rekomendasi": len(rekomendasi),
        "rekomendasi": rekomendasi,
        "ringkasan": ringkasan,
    }