"""Central backend settings.

Every setting is read from environment variables (or a local `.env` file) in
this one place. Feature code imports `get_settings()` instead of reading
environment variables itself.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_VERSION = "0.1.0"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    app_name: str = "CheckMeOut API"

    @property
    def version(self) -> str:
        return APP_VERSION

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
