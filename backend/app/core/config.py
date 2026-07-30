from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    app_env: str = "development"
    app_debug: bool = False
    app_secret_key: str = "development-only-change-me"
    database_url: str = "sqlite:///./flaechenschmiede.db"
    session_cookie_secure: bool = False
    session_cookie_samesite: str = "lax"
    session_lifetime_hours: int = 24
    cors_origins: str = "http://localhost:5173"

    @property
    def parsed_cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
