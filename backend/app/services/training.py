"""
World Cup match feature engineering and RandomForest training.

Training uses chronological walk-forward features (no future leakage).
Inference uses all 1930–2018 rows to build team + H2H aggregates.

Review FEATURE_COLUMNS and build_feature_vector() before running train_model().
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score
from sklearn.model_selection import cross_val_predict, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

OutcomeLabel = Literal[0, 1, 2]  # 0=home win, 1=draw, 2=away win

# ── Feature contract (review before fitting) ───────────────────────────────────
FEATURE_COLUMNS: list[str] = [
    # Team strength (tournament matches only, prior to kickoff)
    "home_win_rate_prior",
    "away_win_rate_prior",
    "home_avg_goals_scored_prior",
    "home_avg_goals_conceded_prior",
    "away_avg_goals_scored_prior",
    "away_avg_goals_conceded_prior",
    "home_avg_goal_diff_prior",
    "away_avg_goal_diff_prior",
    # Head-to-head (same two teams, prior meetings)
    "h2h_matches_prior",
    "h2h_home_team_win_rate_prior",  # share of H2H wins for today's home side
    "h2h_draw_rate_prior",
    "h2h_avg_total_goals_prior",
    # Experience
    "home_matches_played_prior",
    "away_matches_played_prior",
    # Derived deltas (home minus away)
    "win_rate_diff",
    "goal_diff_avg_diff",
    "avg_scored_diff",
    # Knockout experience (mean stage weight of prior WC matches)
    "tournament_stage_weight",
]

DEFAULT_PRIOR_MATCHES = 5  # pseudo-count for cold-start teams in training rows
DEFAULT_STAGE_WEIGHT = 1.0  # pseudo-count stage level (group stage)


def stage_weight(stage: str | None) -> float:
    """Map stage label to importance weight (later rounds count more)."""
    if not stage:
        return 1.0
    s = stage.strip().lower()
    if "semi" in s:
        return 2.5
    if "quarter" in s:
        return 2.0
    if "round of 16" in s or "last 16" in s or s in {"r16", "round of sixteen"}:
        return 1.5
    if "final" in s:
        return 3.0
    return 1.0


@dataclass(frozen=True)
class TeamPriorStats:
    matches: int = 0
    weight_sum: float = 0.0
    weighted_wins: float = 0.0
    weighted_draws: float = 0.0
    weighted_losses: float = 0.0
    weighted_goals_for: float = 0.0
    weighted_goals_against: float = 0.0
    stage_weight_sum: float = 0.0

    @property
    def win_rate(self) -> float:
        if self.weight_sum == 0:
            return 0.0
        return self.weighted_wins / self.weight_sum

    @property
    def avg_goals_scored(self) -> float:
        if self.weight_sum == 0:
            return 0.0
        return self.weighted_goals_for / self.weight_sum

    @property
    def avg_goals_conceded(self) -> float:
        if self.weight_sum == 0:
            return 0.0
        return self.weighted_goals_against / self.weight_sum

    @property
    def avg_goal_diff(self) -> float:
        if self.weight_sum == 0:
            return 0.0
        return (self.weighted_goals_for - self.weighted_goals_against) / self.weight_sum

    @property
    def avg_stage_weight(self) -> float:
        if self.matches == 0:
            return 0.0
        return self.stage_weight_sum / self.matches


@dataclass(frozen=True)
class H2HPriorStats:
    matches: int = 0
    home_team_wins: int = 0  # wins for the *current* home team in this fixture
    draws: int = 0
    total_goals: int = 0

    @property
    def home_team_win_rate(self) -> float:
        if self.matches == 0:
            return 0.0
        return self.home_team_wins / self.matches

    @property
    def draw_rate(self) -> float:
        if self.matches == 0:
            return 0.0
        return self.draws / self.matches

    @property
    def avg_total_goals(self) -> float:
        if self.matches == 0:
            return 0.0
        return self.total_goals / self.matches


def load_matches_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    required = {
        "year",
        "date",
        "home_team",
        "away_team",
        "home_goals",
        "away_goals",
        "result",
    }
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"CSV missing columns: {sorted(missing)}")
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["date", "year"]).reset_index(drop=True)
    return df


def label_from_result(result: str) -> OutcomeLabel:
    r = result.strip().upper()
    if r == "H":
        return 0
    if r == "D":
        return 1
    if r == "A":
        return 2
    raise ValueError(f"Unknown result code: {result!r}")


def _apply_pseudo_counts(stats: TeamPriorStats) -> TeamPriorStats:
    """Smooth empty teams during training matrix construction."""
    pseudo = float(DEFAULT_PRIOR_MATCHES)
    third = pseudo / 3.0
    return TeamPriorStats(
        matches=stats.matches + DEFAULT_PRIOR_MATCHES,
        weight_sum=stats.weight_sum + pseudo,
        weighted_wins=stats.weighted_wins + third,
        weighted_draws=stats.weighted_draws + third,
        weighted_losses=stats.weighted_losses + third,
        weighted_goals_for=stats.weighted_goals_for,
        weighted_goals_against=stats.weighted_goals_against,
        stage_weight_sum=stats.stage_weight_sum + pseudo * DEFAULT_STAGE_WEIGHT,
    )


def build_feature_vector(
    home_team: str,
    away_team: str,
    team_stats: dict[str, TeamPriorStats],
    h2h_stats: H2HPriorStats,
    *,
    apply_pseudo_counts: bool = False,
) -> dict[str, float]:
    """
    Build one feature row for (home_team vs away_team).

  Parameters
    ----------
    team_stats : cumulative stats for every team *before* the match being predicted.
    h2h_stats : meetings between this pair before the match (home_team perspective).
    apply_pseudo_counts : use during training row generation to avoid zeros;
                          disable at inference when checking data sufficiency.
    """
    home_raw = team_stats.get(home_team, TeamPriorStats())
    away_raw = team_stats.get(away_team, TeamPriorStats())

    home = _apply_pseudo_counts(home_raw) if apply_pseudo_counts else home_raw
    away = _apply_pseudo_counts(away_raw) if apply_pseudo_counts else away_raw

    features = {
        "home_win_rate_prior": home.win_rate,
        "away_win_rate_prior": away.win_rate,
        "home_avg_goals_scored_prior": home.avg_goals_scored,
        "home_avg_goals_conceded_prior": home.avg_goals_conceded,
        "away_avg_goals_scored_prior": away.avg_goals_scored,
        "away_avg_goals_conceded_prior": away.avg_goals_conceded,
        "home_avg_goal_diff_prior": home.avg_goal_diff,
        "away_avg_goal_diff_prior": away.avg_goal_diff,
        "h2h_matches_prior": float(h2h_stats.matches),
        "h2h_home_team_win_rate_prior": h2h_stats.home_team_win_rate,
        "h2h_draw_rate_prior": h2h_stats.draw_rate,
        "h2h_avg_total_goals_prior": h2h_stats.avg_total_goals,
        "home_matches_played_prior": float(home_raw.matches),
        "away_matches_played_prior": float(away_raw.matches),
        "win_rate_diff": home.win_rate - away.win_rate,
        "goal_diff_avg_diff": home.avg_goal_diff - away.avg_goal_diff,
        "avg_scored_diff": home.avg_goals_scored - away.avg_goals_scored,
        "tournament_stage_weight": home.avg_stage_weight - away.avg_stage_weight,
    }

    if set(features.keys()) != set(FEATURE_COLUMNS):
        raise RuntimeError("FEATURE_COLUMNS out of sync with build_feature_vector")

    return features


def features_to_array(features: dict[str, float]) -> np.ndarray:
    return np.array([features[name] for name in FEATURE_COLUMNS], dtype=np.float64)


def _update_team_stats(
    stats: dict[str, TeamPriorStats],
    team: str,
    goals_for: int,
    goals_against: int,
    outcome: Literal["W", "D", "L"],
    *,
    match_weight: float = 1.0,
) -> None:
    prev = stats.get(team, TeamPriorStats())
    w = match_weight
    stats[team] = TeamPriorStats(
        matches=prev.matches + 1,
        weight_sum=prev.weight_sum + w,
        weighted_wins=prev.weighted_wins + (w if outcome == "W" else 0.0),
        weighted_draws=prev.weighted_draws + (w if outcome == "D" else 0.0),
        weighted_losses=prev.weighted_losses + (w if outcome == "L" else 0.0),
        weighted_goals_for=prev.weighted_goals_for + goals_for * w,
        weighted_goals_against=prev.weighted_goals_against + goals_against * w,
        stage_weight_sum=prev.stage_weight_sum + w,
    )


def _outcome_for_team(home_goals: int, away_goals: int, side: Literal["home", "away"]) -> Literal["W", "D", "L"]:
    if home_goals == away_goals:
        return "D"
    home_win = home_goals > away_goals
    if side == "home":
        return "W" if home_win else "L"
    return "L" if home_win else "W"


def _h2h_key(team_a: str, team_b: str) -> tuple[str, str]:
    return tuple(sorted((team_a, team_b)))


def build_training_matrix(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    """
    Walk-forward feature matrix for all historical matches.

    Each row uses only information available before that match kicked off.
    """
    team_stats: dict[str, TeamPriorStats] = {}
    past_rows: list[dict[str, object]] = []

    rows: list[np.ndarray] = []
    labels: list[OutcomeLabel] = []

    for row in df.itertuples(index=False):
        home_team = row.home_team
        away_team = row.away_team
        past_df = pd.DataFrame(past_rows) if past_rows else pd.DataFrame(columns=df.columns)
        h2h = get_h2h_for_fixture(home_team, away_team, {}, past_df)

        feat = build_feature_vector(
            home_team,
            away_team,
            team_stats,
            h2h,
            apply_pseudo_counts=True,
        )
        rows.append(features_to_array(feat))
        labels.append(label_from_result(row.result))

        # ── advance state with this match (after features recorded) ──
        hg, ag = int(row.home_goals), int(row.away_goals)
        sw = stage_weight(getattr(row, "stage", None))
        _update_team_stats(
            team_stats, home_team, hg, ag, _outcome_for_team(hg, ag, "home"), match_weight=sw
        )
        _update_team_stats(
            team_stats, away_team, ag, hg, _outcome_for_team(hg, ag, "away"), match_weight=sw
        )
        past_rows.append(row._asdict())

    return np.vstack(rows), np.array(labels, dtype=np.int64)


def build_inference_state(df: pd.DataFrame) -> tuple[dict[str, TeamPriorStats], dict[tuple[str, str], H2HPriorStats]]:
    """Aggregate all historical matches for live predictions."""
    team_stats: dict[str, TeamPriorStats] = {}
    h2h_store: dict[tuple[str, str], H2HPriorStats] = {}

    for row in df.itertuples(index=False):
        home_team = row.home_team
        away_team = row.away_team
        hg, ag = int(row.home_goals), int(row.away_goals)
        sw = stage_weight(getattr(row, "stage", None))

        _update_team_stats(
            team_stats, home_team, hg, ag, _outcome_for_team(hg, ag, "home"), match_weight=sw
        )
        _update_team_stats(
            team_stats, away_team, ag, hg, _outcome_for_team(hg, ag, "away"), match_weight=sw
        )

        key = _h2h_key(home_team, away_team)
        prev = h2h_store.get(key, H2HPriorStats())
        home_win = hg > ag
        draw = hg == ag
        # For inference, track wins from the perspective of the first-listed home team
        # in each *stored* fixture; we remap per request in get_h2h_for_fixture.
        h2h_store[key] = H2HPriorStats(
            matches=prev.matches + 1,
            home_team_wins=prev.home_team_wins + (1 if home_win else 0),
            draws=prev.draws + (1 if draw else 0),
            total_goals=prev.total_goals + hg + ag,
        )

    return team_stats, h2h_store


def get_h2h_for_fixture(
    home_team: str,
    away_team: str,
    h2h_store: dict[tuple[str, str], H2HPriorStats],
    df: pd.DataFrame,
) -> H2HPriorStats:
    """
    Recompute H2H from the perspective of today's home_team.

    Stored aggregates are keyed by sorted pair; we replay meetings to count
    wins for the current home side.
    """
    meetings = df[
        ((df["home_team"] == home_team) & (df["away_team"] == away_team))
        | ((df["home_team"] == away_team) & (df["away_team"] == home_team))
    ]
    if meetings.empty:
        return H2HPriorStats()

    home_wins = 0
    draws = 0
    total_goals = 0
    for row in meetings.itertuples(index=False):
        hg, ag = int(row.home_goals), int(row.away_goals)
        total_goals += hg + ag
        if hg == ag:
            draws += 1
        elif row.home_team == home_team:
            home_wins += 1 if hg > ag else 0
        else:
            home_wins += 1 if ag > hg else 0

    return H2HPriorStats(
        matches=len(meetings),
        home_team_wins=home_wins,
        draws=draws,
        total_goals=total_goals,
    )


def has_sufficient_history(
    home_team: str,
    away_team: str,
    team_stats: dict[str, TeamPriorStats],
) -> bool:
    home = team_stats.get(home_team, TeamPriorStats())
    away = team_stats.get(away_team, TeamPriorStats())
    return home.matches > 0 and away.matches > 0


@dataclass
class TrainedModelBundle:
    pipeline: Pipeline
    team_stats: dict[str, TeamPriorStats]
    h2h_store: dict[tuple[str, str], H2HPriorStats]
    matches_df: pd.DataFrame
    feature_columns: list[str]
    cv_accuracy: float | None = None
    cv_f1_home: float | None = None
    cv_f1_draw: float | None = None
    cv_f1_away: float | None = None


def train_model(df: pd.DataFrame, *, random_state: int = 42) -> TrainedModelBundle:
    """
    Fit RandomForest on walk-forward features.

    Do not call until FEATURE_COLUMNS / build_feature_vector are approved.
    """
    x, y = build_training_matrix(df)

    pipeline = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            (
                "clf",
                RandomForestClassifier(
                    n_estimators=400,
                    max_depth=12,
                    min_samples_leaf=4,
                    class_weight="balanced",
                    random_state=random_state,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    cv_scores = cross_val_score(pipeline, x, y, cv=5, scoring="accuracy")
    y_pred = cross_val_predict(pipeline, x, y, cv=5)
    f1_scores = f1_score(y, y_pred, average=None, labels=[0, 1, 2], zero_division=0)

    pipeline.fit(x, y)

    team_stats, h2h_store = build_inference_state(df)

    return TrainedModelBundle(
        pipeline=pipeline,
        team_stats=team_stats,
        h2h_store=h2h_store,
        matches_df=df,
        feature_columns=list(FEATURE_COLUMNS),
        cv_accuracy=float(cv_scores.mean()),
        cv_f1_home=float(f1_scores[0]),
        cv_f1_draw=float(f1_scores[1]),
        cv_f1_away=float(f1_scores[2]),
    )


def save_bundle(bundle: TrainedModelBundle, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, path)


def load_bundle(path: Path) -> TrainedModelBundle:
    return joblib.load(path)
