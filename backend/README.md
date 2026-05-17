# PitchPulse — Prediction API (FastAPI)

Stateless Python service that serves **three-way** match predictions (home / draw / away) from World Cup history **1930–2018**.

## Data source

**Primary (recommended):** [FIFA World Cup on Kaggle](https://www.kaggle.com/datasets/abecklas/fifa-world-cup) by A. Becklas.

1. Install the [Kaggle CLI](https://github.com/Kaggle/kaggle-api) and configure `~/.kaggle/kaggle.json`.
2. From `backend/`:

```bash
mkdir -p data/raw
kaggle datasets download -d abecklas/fifa-world-cup -p data/raw --unzip
# Expect: data/raw/matches_1930_2014.csv
python scripts/prepare_data.py
```

**Fallback:** If no Kaggle file is present, `scripts/prepare_data.py` builds the same shape from [martj42/international_results](https://github.com/martj42/international_results) (FIFA World Cup rows, year ≤ 2018, ~900 matches).

**Committed file:** `app/data/world_cup_matches.csv` — cleaned, sorted, columns:

| Column | Description |
|--------|-------------|
| `year` | Tournament year |
| `date` | ISO date |
| `stage` | Stage label |
| `home_team` / `away_team` | Canonical team names |
| `home_goals` / `away_goals` | Full-time goals |
| `result` | `H` / `D` / `A` (home perspective) |
| `neutral` | Neutral venue flag |
| `city` / `country` | Venue metadata |

## Setup

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Review features before training

Open `app/services/training.py` and confirm:

- `FEATURE_COLUMNS` (17 features)
- `build_feature_vector()` — team form, goal rates, H2H, deltas
- Walk-forward training in `build_training_matrix()` (no leakage)

Dry-run (no fit):

```bash
python scripts/train_model.py --dry-run
```

## Train and run

```bash
python scripts/train_model.py
uvicorn app.main:app --reload --port 8000
```

Or set `TRAIN_ON_STARTUP=1` in `.env` (not recommended until features are approved).

### Test standalone

```bash
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/predict ^
  -H "Content-Type: application/json" ^
  -d "{\"home_team\": \"Brazil\", \"away_team\": \"Germany\"}"
```

## API

### `GET /health`

```json
{ "status": "ok", "model_loaded": true, "training_rows": 900 }
```

### `POST /predict`

**Request**

```json
{ "home_team": "Brazil", "away_team": "Portugal" }
```

**Response**

```json
{
  "home_team": "Brazil",
  "away_team": "Portugal",
  "home_win_probability": 0.52,
  "draw_probability": 0.24,
  "away_win_probability": 0.24,
  "model": "random_forest_v1",
  "confidence": "high",
  "reason": null,
  "narrative": "Model gives Brazil a 52% chance to win based on 7 historical meetings.",
  "features_used": ["home_win_rate_prior", "..."]
}
```

**Low confidence** (team missing from 1930–2018 data): equal thirds, `"confidence": "low"`, `"reason": "insufficient_historical_data"`.

Team names are normalized via `app/data/team_aliases.json` (ESPN display names → CSV names).

## Project layout

```
backend/
├── requirements.txt
├── app/
│   ├── main.py
│   ├── config.py
│   ├── api/routes/
│   ├── models/
│   │   ├── schemas.py
│   │   ├── predictor.py
│   │   └── artifacts/          # world_cup_rf.joblib (after train)
│   ├── services/
│   │   ├── training.py         # features + fit
│   │   └── team_names.py
│   └── data/
│       ├── world_cup_matches.csv
│       └── team_aliases.json
└── scripts/
    ├── prepare_data.py
    └── train_model.py
```

## Docker (later)

`app.main:app` and a single `MODEL_PATH` volume mount are enough to add a `Dockerfile` without restructuring.
