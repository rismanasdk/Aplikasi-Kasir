from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers.bi import router as bi_router

settings = get_settings()

app = FastAPI(
    title="AI Service",
    version="1.0.0",
    description="Business Intelligence Analysis Engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bi_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "AI Service is running"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}