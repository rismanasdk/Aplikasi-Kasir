# ai-service/database.py
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import config

_client: MongoClient | None = None
_db = None


def get_client() -> MongoClient:
    """Return singleton MongoClient."""
    global _client
    if _client is None:
        if not config.MONGO_URI:
            raise RuntimeError("MONGO_URI tidak ditemukan. Set di .env")
        _client = MongoClient(
            config.MONGO_URI,
            server_api=ServerApi("1"),
            maxPoolSize=20,
            minPoolSize=5,
        )
        # Test koneksi
        _client.admin.command("ping")
        print("MongoDB Connected dari ai-service")
    return _client


def get_db():
    """Return database instance."""
    global _db
    if _db is None:
        client = get_client()
        # Ambil nama db dari URI, fallback ke test
        db_name = "Aplikasi_Kasir"
        try:
            parsed = config.MONGO_URI.split("/")[-1].split("?")[0]
            if parsed:
                db_name = parsed
        except Exception:
            pass
        _db = client[db_name]
    return _db


def get_collection(name: str):
    """Return collection by name."""
    return get_db()[name]


def close_connection():
    """Close MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None