# ai-service/service/data_fetcher.py
"""
Semua query ke MongoDB centralised di sini.
Mengembalikan list of dict (bisa langsung ke DataFrame).
"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import database
import config


TZ = ZoneInfo("Asia/Jakarta")


def _dt(date_str: str) -> datetime:
    """Parse YYYY-MM-DD string ke datetime aware Jakarta."""
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.replace(tzinfo=TZ)


def _today() -> datetime:
    return datetime.now(TZ).replace(hour=0, minute=0, second=0, microsecond=0)


# ============================================================
#  Transaksi
# ============================================================
def fetch_transaksi(
    start: datetime | None = None,
    end: datetime | None = None,
    status: str | list[str] | None = None,
) -> list[dict]:
    """
    Ambil transaksi dengan filter opsional.
    start/end bisa datetime atau YYYY-MM-DD string.
    """
    coll = database.get_collection(config.COLLECTION_TRANSAKSI)
    match: dict = {}

    # Tanggal
    if start or end:
        date_match: dict = {}
        if start:
            date_match["$gte"] = start if isinstance(start, datetime) else _dt(start)
        if end:
            dt_end = end if isinstance(end, datetime) else _dt(end)
            date_match["$lte"] = dt_end.replace(hour=23, minute=59, second=59, microsecond=999999)
        match["tanggal_transaksi"] = date_match

    # Status
    if status:
        if isinstance(status, list):
            match["status"] = {"$in": status}
        else:
            match["status"] = status

    if match:
        cursor = coll.find(match, {"__v": 0})
    else:
        cursor = coll.find({}, {"__v": 0})

    return list(cursor)


def fetch_transaksi_selesai(start: datetime, end: datetime) -> list[dict]:
    """Shortcut: transaksi status selesai saja."""
    return fetch_transaksi(start, end, status="selesai")


# ============================================================
#  Pengeluaran Biaya
# ============================================================
def fetch_pengeluaran(start: datetime, end: datetime) -> list[dict]:
    coll = database.get_collection(config.COLLECTION_PENGELUARAN)
    cursor = coll.find(
        {
            "tanggal": {"$gte": start, "$lte": end},
        },
        {"__v": 0},
    )
    result = list(cursor)

    # Enrich dengan nama kategori dari BiayaOperasional
    kategori_coll = database.get_collection(config.COLLECTION_BIAYA_OPERASIONAL)
    for item in result:
        kat_id = item.get("kategoriId")
        if kat_id:
            kat = kategori_coll.find_one({"_id": kat_id})
            if kat:
                item["nama_kategori"] = kat.get("nama", "Lainnya")
            else:
                item["nama_kategori"] = "Lainnya"
        else:
            item["nama_kategori"] = "Lainnya"

    return result


# ============================================================
#  Barang
# ============================================================
def fetch_barang_all() -> list[dict]:
    coll = database.get_collection(config.COLLECTION_BARANG)
    return list(coll.find({}, {"__v": 0}))


# ============================================================
#  Modal Utama
# ============================================================
def fetch_modal_utama() -> dict | None:
    coll = database.get_collection(config.COLLECTION_MODAL_UTAMA)
    return coll.find_one({}, {"__v": 0})


# ============================================================
#  Kewajiban
# ============================================================
def fetch_kewajiban_aktif() -> list[dict]:
    coll = database.get_collection(config.COLLECTION_KEWAJIBAN)
    return list(
        coll.find(
            {"status": {"$in": ["belum_lunas", "sebagian"]}},
            {"__v": 0},
        )
    )


def fetch_kewajiban_jatuh_tempo(hari_ke_depan: int = 30) -> list[dict]:
    coll = database.get_collection(config.COLLECTION_KEWAJIBAN)
    now = datetime.now(TZ)
    batas = now + timedelta(days=hari_ke_depan)
    return list(
        coll.find(
            {
                "status": {"$in": ["belum_lunas", "sebagian"]},
                "jatuh_tempo": {"$lte": batas, "$gte": now},
            },
            {"__v": 0},
        ).sort("jatuh_tempo", 1)
    )


# ============================================================
#  Settings
# ============================================================
def fetch_settings() -> dict:
    coll = database.get_collection(config.COLLECTION_SETTINGS)
    doc = coll.find_one({}, {"__v": 0})
    return doc or {}


# ============================================================
#  Riwayat Modal (untuk cash flow)
# ============================================================
def fetch_riwayat_modal(start: datetime, end: datetime) -> list[dict]:
    modal = fetch_modal_utama()
    if not modal:
        return []

    riwayat = modal.get("riwayat", [])
    filtered = []
    for r in riwayat:
        tgl = r.get("tanggal")
        if tgl:
            if isinstance(tgl, str):
                tgl = datetime.fromisoformat(tgl)
            if isinstance(tgl, datetime):
                tgl = tgl.replace(tzinfo=TZ) if tgl.tzinfo is None else tgl
                if start <= tgl <= end:
                    filtered.append(r)

    return filtered


# ============================================================
#  Helper: rentang tanggal standar
# ============================================================
def get_range_hari_ini() -> tuple[datetime, datetime]:
    now = _today()
    end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    return now, end


def get_range_minggu_ini() -> tuple[datetime, datetime]:
    now = datetime.now(TZ)
    hari = now.weekday()  # Senin=0
    senin = (now - timedelta(days=hari)).replace(hour=0, minute=0, second=0, microsecond=0)
    minggu = (senin + timedelta(days=6)).replace(hour=23, minute=59, second=59, microsecond=999999)
    return senin, minggu


def get_range_bulan_ini() -> tuple[datetime, datetime]:
    now = datetime.now(TZ)
    awal = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # Akhir bulan
    if now.month == 12:
        akhir = now.replace(year=now.year + 1, month=1, day=1) - timedelta(microseconds=1)
    else:
        akhir = now.replace(month=now.month + 1, day=1) - timedelta(microseconds=1)
    return awal, akhir


def get_range_periode_lalu(bulan: int = 1) -> tuple[datetime, datetime]:
    """Bulan lalu default."""
    now = datetime.now(TZ)
    target_bulan = now.month - bulan
    target_tahun = now.year
    while target_bulan <= 0:
        target_bulan += 12
        target_tahun -= 1

    awal = datetime(target_tahun, target_bulan, 1, tzinfo=TZ)
    if target_bulan == 12:
        akhir = datetime(target_tahun + 1, 1, 1, tzinfo=TZ) - timedelta(microseconds=1)
    else:
        akhir = datetime(target_tahun, target_bulan + 1, 1, tzinfo=TZ) - timedelta(microseconds=1)
    return awal, akhir