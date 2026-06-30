# ai-service/config.py
import os
from pathlib import Path
from dotenv import load_dotenv
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

# Load dari ai-service/.env juga kalau ada
_local_env = Path(__file__).resolve().parent / ".env"
if _local_env.exists():
    load_dotenv(_local_env, override=True)


# --- MongoDB ---
MONGO_URI: str = os.getenv("MONGO_URI", os.getenv("MONGODB_URI", ""))

# --- Service ---
AI_SERVICE_HOST: str = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
AI_SERVICE_PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
AI_SERVICE_DEBUG: bool = os.getenv("AI_SERVICE_DEBUG", "false").lower() == "true"

# --- CORS ---
CORS_ORIGINS: list[str] = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000"
).split(",")

# --- Collection names (sesuai Mongoose model di backend) ---
COLLECTION_TRANSAKSI: str = "Data-Transaksi"
COLLECTION_BARANG: str = "Data-Barang"
COLLECTION_LAPORAN: str = "Data-Laporan"
COLLECTION_PENGELUARAN: str = "pengeluaran_biaya"
COLLECTION_BIAYA_OPERASIONAL: str = "BiayaOperasional"
COLLECTION_MODAL_UTAMA: str = "ModalUtama"
COLLECTION_KEWAJIBAN: str = "Kewajiban"
COLLECTION_SETTINGS: str = "Settings"
COLLECTION_BAHAN_BAKU: str = "BahanBaku"

# --- BI Thresholds ---
ANOMALI_ZSCORE_THRESHOLD: float = float(os.getenv("ANOMALI_ZSCORE_THRESHOLD", "2.5"))
PENURUNAN_THRESHOLD_PCT: float = float(os.getenv("PENURUNAN_THRESHOLD_PCT", "15.0"))
CASH_RUNWAY_MIN_DAYS: int = int(os.getenv("CASH_RUNWAY_MIN_DAYS", "7"))