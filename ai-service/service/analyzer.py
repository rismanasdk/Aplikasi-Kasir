from collections import defaultdict
from datetime import datetime
from typing import Any


def _safe_number(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        if isinstance(value, str):
            return float(value.replace(",", ""))
        return float(value)
    except (TypeError, ValueError):
        return default


def _format_currency(value: float) -> float:
    return round(value, 2)


def _aggregate_transactions(transactions: list[dict]) -> dict:
    total_pendapatan = 0.0
    total_hpp = 0.0
    total_barang_terjual = 0
    payment_groups: dict[str, float] = defaultdict(float)
    products: dict[tuple[str, str], dict] = {}

    for tx in transactions:
        total_pendapatan += _safe_number(tx.get("total_harga"))
        payment_groups[str(tx.get("metode_pembayaran", "unknown"))] += _safe_number(tx.get("total_harga"))

        for item in tx.get("barang_dibeli", []) or []:
            kode = str(item.get("kode_barang", "unknown"))
            nama = str(item.get("nama_barang", "unknown"))
            jumlah = int(_safe_number(item.get("jumlah"), 0))
            harga_satuan = _safe_number(item.get("harga_satuan"))
            harga_beli = _safe_number(item.get("harga_beli"))
            subtotal = _safe_number(item.get("subtotal"))
            total_hpp += harga_beli * jumlah
            total_barang_terjual += jumlah

            key = (kode, nama)
            details = products.setdefault(key, {
                "kode_barang": kode,
                "nama_produk": nama,
                "jumlah_terjual": 0,
                "pendapatan": 0.0,
                "hpp_total": 0.0,
            })
            details["jumlah_terjual"] += jumlah
            details["pendapatan"] += harga_satuan * jumlah
            details["hpp_total"] += harga_beli * jumlah

    product_list = []
    for (kode, nama), stats in products.items():
        laba_kotor = stats["pendapatan"] - stats["hpp_total"]
        product_list.append({
            "kode_barang": kode,
            "nama_produk": nama,
            "jumlah_terjual": stats["jumlah_terjual"],
            "pendapatan": _format_currency(stats["pendapatan"]),
            "hpp_total": _format_currency(stats["hpp_total"]),
            "laba_kotor": _format_currency(laba_kotor),
        })

    sorted_products = sorted(product_list, key=lambda item: (item["pendapatan"], item["jumlah_terjual"]), reverse=True)
    top_produk = sorted_products[:5]
    bottom_produk = sorted(product_list, key=lambda item: (item["pendapatan"], item["jumlah_terjual"]))[:5]

    return {
        "total_pendapatan": _format_currency(total_pendapatan),
        "total_hpp": _format_currency(total_hpp),
        "total_barang_terjual": total_barang_terjual,
        "payment_groups": [
            {"metode": metode, "total": _format_currency(total)}
            for metode, total in sorted(payment_groups.items(), key=lambda item: item[1], reverse=True)
        ],
        "top_produk": top_produk,
        "bottom_produk": bottom_produk,
    }


def _sum_pengeluaran(pengeluaran: list[dict]) -> float:
    return _format_currency(sum(_safe_number(item.get("jumlah")) for item in pengeluaran))


def _build_cashflow(total_pendapatan: float, total_pengeluaran: float, modal: dict[str, Any]) -> dict:
    kas = _safe_number(modal.get("saldo_kas"))
    aset_tetap = _safe_number(modal.get("total_aset_tetap"))
    return {
        "pendapatan": total_pendapatan,
        "pengeluaran": total_pengeluaran,
        "net": _format_currency(total_pendapatan - total_pengeluaran),
        "kas": _format_currency(kas),
        "aset_tetap": _format_currency(aset_tetap),
    }


def _build_stock_summary(barang: list[dict]) -> dict:
    total_items = len(barang)
    total_qty = sum(int(_safe_number(item.get("stok"), 0)) for item in barang)
    return {
        "total_items": total_items,
        "total_quantity": total_qty,
    }


def _build_inventory_value(barang: list[dict], bahan_baku: list[dict]) -> float:
    barang_total = sum(
        _safe_number(item.get("harga_beli")) * _safe_number(item.get("stok"), 0)
        for item in barang
    )
    bahan_total = sum(_safe_number(item.get("total_harga")) for item in bahan_baku)
    return _format_currency(barang_total + bahan_total)


def _build_aset_tetap(modal: dict[str, Any]) -> list[dict]:
    aset_list = modal.get("aset_tetap") or []
    if not isinstance(aset_list, list):
        return []
    return [
        {
            "nama": str(item.get("nama", "")),
            "nilai": _format_currency(_safe_number(item.get("nilai"))),
            "tanggal_pembelian": item.get("tanggal_pembelian"),
            "keterangan": str(item.get("keterangan", "")),
        }
        for item in aset_list
    ]


def build_ringkasan_payload(
    start: datetime,
    end: datetime,
    transactions: list[dict],
    pengeluaran: list[dict],
    settings: dict,
    modal: dict,
    barang: list[dict],
    bahan_baku: list[dict],
    kewajiban: list[dict],
) -> dict:
    summary = _aggregate_transactions(transactions)
    total_pengeluaran = _sum_pengeluaran(pengeluaran)
    total_pendapatan = summary["total_pendapatan"]
    total_hpp = summary["total_hpp"]
    total_laba_kotor = _format_currency(total_pendapatan - total_hpp)
    total_laba_bersih = _format_currency(total_laba_kotor - total_pengeluaran)
    target = _safe_number(settings.get("targetOmzetBulanan"))
    target_progress_pct = _format_currency((total_pendapatan / target) * 100) if target > 0 else 0.0
    inventory_value = _build_inventory_value(barang, bahan_baku)
    total_kewajiban = _format_currency(sum(_safe_number(item.get("sisa_jumlah")) for item in kewajiban))
    aset_tetap = _build_aset_tetap(modal)
    cashflow = _build_cashflow(total_pendapatan, total_pengeluaran, modal)
    stock = _build_stock_summary(barang)
    insight = [
        {
            "label": "Target Omzet Bulanan",
            "value": target,
            "progress_pct": target_progress_pct,
            "description": "Persentase pencapaian target omzet berdasarkan periode saat ini.",
        },
        {
            "label": "Laba Bersih Estimasi",
            "value": total_laba_bersih,
            "description": "Pendapatan dikurangi HPP dan pengeluaran operasional.",
        },
        {
            "label": "Jumlah Transaksi",
            "value": len(transactions),
            "description": "Jumlah transaksi selesai dalam periode.",
        },
    ]
    narrative = (
        f"Ringkasan BI antara {start.strftime('%Y-%m-%d')} dan {end.strftime('%Y-%m-%d')} menunjukkan omzet {total_pendapatan}, "
        f"HPP {total_hpp}, pengeluaran {total_pengeluaran}, dan laba bersih estimasi {total_laba_bersih}. "
        f"Target omzet bulanan adalah {target} dengan capaian {target_progress_pct}%."
    )

    return {
    "period": {
        "start": start.isoformat(),
        "end": end.isoformat(),
    },

    "summary": {
        "pendapatan": total_pendapatan,
        "hpp": total_hpp,
        "laba_kotor": total_laba_kotor,
        "laba_bersih": total_laba_bersih,
        "jumlah_transaksi": len(transactions),
        "barang_terjual": summary["total_barang_terjual"],
        "target": target,
        "target_progress_pct": target_progress_pct,
    },

    "produk": {
        "top": summary["top_produk"],
        "bottom": summary["bottom_produk"],
    },

    "cashflow": cashflow,

    "persediaan": {
        "stock": stock,
        "inventory_value": inventory_value,
    },

    "aset_tetap": {
        "total": sum(item["nilai"] for item in aset_tetap),
        "jumlah": len(aset_tetap),
        "items": aset_tetap,
    },

    "metode_pembayaran": summary["payment_groups"],

    "pengeluaran": {
        "total": total_pengeluaran,
    },

    "kewajiban": {
        "total": total_kewajiban,
    },

    "insight": insight,

    "narrative": narrative,

    "generated_at": datetime.utcnow().isoformat(),
    }
