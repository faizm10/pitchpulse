from typing import Literal

from pydantic import BaseModel, Field


ConfidenceLevel = Literal["high", "low"]


class PredictRequest(BaseModel):
    home_team: str = Field(..., min_length=1, examples=["Brazil"])
    away_team: str = Field(..., min_length=1, examples=["Portugal"])


class PredictResponse(BaseModel):
    home_team: str
    away_team: str
    home_win_probability: float = Field(..., ge=0.0, le=1.0)
    draw_probability: float = Field(..., ge=0.0, le=1.0)
    away_win_probability: float = Field(..., ge=0.0, le=1.0)
    model: str
    confidence: ConfidenceLevel
    reason: str | None = None
    narrative: str | None = None
    h2h_matches_prior: int = 0
    features_used: list[str]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    training_rows: int | None = None
