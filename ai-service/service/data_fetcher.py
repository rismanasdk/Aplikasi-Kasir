from datetime import datetime
from typing import Any

import config
from database import get_collection


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            if len(value) == 10 and value.count("-") == 2:
                return datetime.fromisoformat(value + "T00:00:00")
            return datetime.fromisoformat(value)
        except ValueError:
            try:
                return datetime.fromisoformat(value.replace(" ", "T"))
            except ValueError:
                return None
    return None


def _normalize_range(start: Any, end: Any) -> tuple[datetime, datetime]:
    now = datetime.now()
    start_date = _parse_datetime(start) if start is not None else None
    end_date = _parse_datetime(end) if end is not None else None

    if start_date is None and end_date is None:
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = now
    elif start_date is None and end_date is not None:
        start_date = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif end_date is None and start_date is not None:
        end_date = start_date.replace(hour=23, minute=59, second=59, microsecond=999999)

    if start_date > end_date:
        start_date, end_date = end_date, start_date

    start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)

    return start_date, end_date


def _find_documents(collection_name: str, query: dict | None = None) -> list[dict]:
    try:
        collection = get_collection(collection_name)
        if collection is None:
            return []
        return list(collection.find(query or {}))
    except Exception:
        return []


def _find_one_document(collection_name: str, query: dict | None = None) -> dict | None:
    try:
        collection = get_collection(collection_name)
        if collection is None:
            return None
        return collection.find_one(query or {})
    except Exception:
        return None


def get_period(start: Any = None, end: Any = None) -> tuple[datetime, datetime]:
    return _normalize_range(start, end)


def fetch_transactions(start: datetime | None = None, end: datetime | None = None) -> list[dict]:
    query = {"status": "selesai"}
    if start is not None or end is not None:
        range_query: dict[str, datetime] = {}
        if start is not None:
            range_query["$gte"] = start
        if end is not None:
            range_query["$lte"] = end
        query["tanggal_transaksi"] = range_query
    return _find_documents(config.COLLECTION_TRANSAKSI, query)


def fetch_pengeluaran(start: datetime | None = None, end: datetime | None = None) -> list[dict]:
    query: dict[str, Any] = {}
    if start is not None or end is not None:
        range_query: dict[str, datetime] = {}
        if start is not None:
            range_query["$gte"] = start
        if end is not None:
            range_query["$lte"] = end
        query["tanggal"] = range_query
    return _find_documents(config.COLLECTION_PENGELUARAN, query)


def fetch_settings() -> dict:
    result = _find_one_document(config.COLLECTION_SETTINGS, {})
    return result if result is not None else {}


def fetch_modal_utama() -> dict:
    result = _find_one_document(config.COLLECTION_MODAL_UTAMA, {})
    return result if result is not None else {}


def fetch_barang() -> list[dict]:
    return _find_documents(config.COLLECTION_BARANG)


def fetch_bahan_baku() -> list[dict]:
    return _find_documents(config.COLLECTION_BAHAN_BAKU)


def fetch_kewajiban() -> list[dict]:
    return _find_documents(config.COLLECTION_KEWAJIBAN)
