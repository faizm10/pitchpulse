#!/usr/bin/env python3
"""
Fit RandomForest after reviewing app/services/training.py features.

Usage (from backend/):
  python scripts/train_model.py
  python scripts/train_model.py --dry-run   # only print feature matrix shape
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.config import get_settings  # noqa: E402
from app.services.training import (  # noqa: E402
    FEATURE_COLUMNS,
    build_training_matrix,
    load_matches_csv,
    save_bundle,
    train_model,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Build feature matrix only; do not fit or save model",
    )
    args = parser.parse_args()

    settings = get_settings()
    df = load_matches_csv(settings.data_path)
    print(f"Loaded {len(df)} matches from {settings.data_path}")
    print(f"Feature columns ({len(FEATURE_COLUMNS)}):")
    for name in FEATURE_COLUMNS:
        print(f"  - {name}")

    x, y = build_training_matrix(df)
    print(f"Training matrix: X={x.shape}, y={y.shape}")
    counts = {i: int((y == i).sum()) for i in range(3)}
    print(f"Class balance (H/D/A): {[counts[i] for i in range(3)]}")

    if args.dry_run:
        print("Dry run complete — no model saved.")
        return 0

    print("\nTraining RandomForest (5-fold CV)...")
    bundle = train_model(df)
    save_bundle(bundle, settings.model_path)
    print(f"\nSaved model -> {settings.model_path}")

    print("\n-- Model performance (5-fold CV) --")
    if bundle.cv_accuracy is not None:
        print(f"  Accuracy (mean): {bundle.cv_accuracy:.4f}")
    if bundle.cv_f1_home is not None:
        print(f"  F1 — Home win: {bundle.cv_f1_home:.4f}")
        print(f"  F1 — Draw:     {bundle.cv_f1_draw:.4f}")
        print(f"  F1 — Away win: {bundle.cv_f1_away:.4f}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
