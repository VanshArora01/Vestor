from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str
    secret_key: str
    redis_url: str
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    access_token_expire_days: int = 7
    database_echo: bool = False

    # Market data (I4) — periodically refreshed; not real-time.
    market_data_refresh_hour_ist: int = 19
    market_data_refresh_minute_ist: int = 0
    market_data_redis_ttl_seconds: int = 900
    market_data_stale_after_minutes: int = 60
    market_data_provider_timeout_seconds: float = 8.0

    # Portfolio snapshots (I6) — daily observation time in Asia/Kolkata.
    portfolio_snapshot_hour_ist: int = 19
    portfolio_snapshot_minute_ist: int = 10

    # Setu Sandbox (B0)
    setu_client_id: str
    setu_client_secret: str
    setu_product_instance_id: str
    setu_base_url: str = "https://fiu-sandbox.setu.co"

    # Vestor AI (Advisor) — keys stay server-side only
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    groq_api_key: str | None = None
    groq_model: str = "openai/gpt-oss-120b"
    ai_enable_groq_fallback: bool = True
    ai_request_timeout_seconds: float = 30.0
    ai_max_history_messages: int = 20

    # Setu Consent Config (B1)
    setu_consent_fi_types: str = "DEPOSIT"
    setu_consent_types: str = "SUMMARY,TRANSACTIONS"
    setu_consent_fetch_type: str = "PERIODIC"
    setu_consent_frequency: str = "DAILY"
    setu_consent_data_life_unit: str = "MONTH"
    setu_consent_data_life_value: int = 6

    @property
    def cors_origins_list(self) -> list[str]:
        configured_origins = [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return list(dict.fromkeys([*configured_origins, "https://vestor-front.onrender.com"]))


@lru_cache
def get_settings() -> Settings:
    return Settings()
