from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    AI_PROVIDER: str = "openai"
    AI_API_KEY: str = ""
    AI_MODEL: str = "gpt-4.1-mini"
    AI_TEMPERATURE: float = 0.2
    AI_MAX_TOKENS: int = 1500
    AI_TIMEOUT: int = 30

    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    CORS_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:5000"
    )

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()