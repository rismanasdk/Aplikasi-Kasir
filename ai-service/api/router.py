from fastapi import APIRouter
from api.ringkasan import router as ringkasan_router

bi_router = APIRouter()
bi_router.include_router(ringkasan_router)
