import json
from functools import lru_cache
from pathlib import Path

from app.config import get_settings


@lru_cache
def load_aliases() -> dict[str, str]:
    path = get_settings().aliases_path
    with path.open(encoding="utf-8") as f:
        raw = json.load(f)
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def normalize_team_name(name: str) -> str:
    """Map ESPN / user input to canonical CSV team name."""
    cleaned = name.strip()
    if not cleaned:
        return cleaned
    aliases = load_aliases()
    if cleaned in aliases:
        return aliases[cleaned]
    # case-insensitive fallback
    lower_map = {k.lower(): v for k, v in aliases.items()}
    hit = lower_map.get(cleaned.lower())
    if hit:
        return hit
    return cleaned
