# ai-service/main.py
"""
FastAPI entry point untuk AI Service (Business Intelligence).
Jalankan: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
import sys
from pathlib import Path

# Tambah parent dir ke path agar import relatif bekerja
sys.path.insert(0, str(Path(__file__).resolve().parent))

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
from database import close_connection
from api.router import bi_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown lifecycle."""
    print("\n=== AI Service (BI) Starting ===")
    # Test koneksi DB
    try:
        import database
        database.get_client()
        print("MongoDB connection OK")
    except Exception as e:
        print(f"WARNING: MongoDB connection failed: {e}")
        print("Endpoints akan return error sampai DB tersedia.")

    yield

    # Cleanup
    close_connection()
    print("\n=== AI Service (BI) Stopped ===")


app = FastAPI(
    title="AI Service - Business Intelligence",
    description="Rule-based BI engine untuk Aplikasi Kasir. Analisis data penjualan, cash flow, anomali, dan rekomendasi bisnis.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount semua BI endpoints di bawah /bi
app.include_router(bi_router, prefix="/bi")


# Health check
@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "AI Service BI",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    try:
        import database
        client = database.get_client()
        client.admin.command("ping")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "database": db_status,
    }