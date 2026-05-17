from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    port: int = 8000
    train_on_startup: bool = False
    model_path: Path = BACKEND_ROOT / "app" / "models" / "artifacts" / "world_cup_rf.joblib"
    data_path: Path = BACKEND_ROOT / "app" / "data" / "world_cup_matches.csv"
    aliases_path: Path = BACKEND_ROOT / "app" / "data" / "team_aliases.json"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
