from __future__ import annotations

import numpy as np

from app.models.schemas import PredictResponse
from app.services.team_names import normalize_team_name
from app.services.training import (
    FEATURE_COLUMNS,
    TrainedModelBundle,
    build_feature_vector,
    features_to_array,
    get_h2h_for_fixture,
    has_sufficient_history,
)

MODEL_VERSION = "random_forest_v1"


def _equal_low_confidence(home: str, away: str) -> PredictResponse:
    home_p, draw_p, away_p = 0.34, 0.33, 0.33
    return PredictResponse(
        home_team=home,
        away_team=away,
        home_win_probability=home_p,
        draw_probability=draw_p,
        away_win_probability=away_p,
        model=MODEL_VERSION,
        confidence="low",
        reason="insufficient_historical_data",
        narrative=(
            f"Limited World Cup history for {home} vs {away} — "
            f"model leans slightly home ({home_p:.0%}) with no strong edge."
        ),
        h2h_matches_prior=0,
        features_used=list(FEATURE_COLUMNS),
    )


def _format_narrative(
    home: str,
    away: str,
    home_p: float,
    draw_p: float,
    away_p: float,
    h2h_matches: int,
) -> str:
    leader = home
    leader_p = home_p
    if away_p >= home_p and away_p >= draw_p:
        leader = away
        leader_p = away_p
    elif draw_p >= home_p and draw_p >= away_p:
        return (
            f"Model makes this a tight call — draw leads at {draw_p:.0%} "
            f"after {h2h_matches} prior World Cup meetings between {home} and {away}."
        )

    h2h_clause = (
        f" based on {h2h_matches} historical meetings"
        if h2h_matches > 0
        else " from World Cup form through 2018"
    )
    return f"Model gives {leader} a {leader_p:.0%} chance to win{h2h_clause}."


class MatchPredictor:
    def __init__(self, bundle: TrainedModelBundle | None = None) -> None:
        self._bundle = bundle

    @property
    def is_loaded(self) -> bool:
        return self._bundle is not None

    @property
    def training_rows(self) -> int | None:
        if not self._bundle:
            return None
        return len(self._bundle.matches_df)

    def load(self, bundle: TrainedModelBundle) -> None:
        self._bundle = bundle

    def predict(self, home_team: str, away_team: str) -> PredictResponse:
        home = normalize_team_name(home_team)
        away = normalize_team_name(away_team)

        if not self._bundle:
            raise RuntimeError("Model not loaded. Run scripts/train_model.py first.")

        team_stats = self._bundle.team_stats
        df = self._bundle.matches_df

        if not has_sufficient_history(home, away, team_stats):
            return _equal_low_confidence(home, away)

        h2h = get_h2h_for_fixture(home, away, self._bundle.h2h_store, df)
        features = build_feature_vector(home, away, team_stats, h2h, apply_pseudo_counts=False)
        x = features_to_array(features).reshape(1, -1)

        proba = self._bundle.pipeline.predict_proba(x)[0]
        classes = list(self._bundle.pipeline.named_steps["clf"].classes_)
        # classes_ order matches label encoding 0,1,2
        idx = {int(c): i for i, c in enumerate(classes)}
        home_p = float(proba[idx[0]])
        draw_p = float(proba[idx[1]])
        away_p = float(proba[idx[2]])

        total = home_p + draw_p + away_p
        if total > 0:
            home_p, draw_p, away_p = home_p / total, draw_p / total, away_p / total

        confidence = "high" if h2h.matches >= 1 else "low"
        reason = None if confidence == "high" else "limited_head_to_head"

        return PredictResponse(
            home_team=home,
            away_team=away,
            home_win_probability=round(home_p, 4),
            draw_probability=round(draw_p, 4),
            away_win_probability=round(away_p, 4),
            model=MODEL_VERSION,
            confidence=confidence,
            reason=reason,
            narrative=_format_narrative(home, away, home_p, draw_p, away_p, h2h.matches),
            h2h_matches_prior=h2h.matches,
            features_used=list(FEATURE_COLUMNS),
        )
