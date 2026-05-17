# PitchPulse — Codex Context

## Project Overview

PitchPulse is a FIFA World Cup 2026 real-time intelligence dashboard: map-first UI with live scores, standings, news, match detail, and ML match predictions (home / draw / away).

## Current Status

Active development — frontend and prediction backend are implemented. ESPN powers live data; a FastAPI service serves Random Forest predictions trained on World Cup history (1930–2018).

## Repository Layout

```
pitchpulse/
├── frontend/          # Next.js 14 app (TypeScript, plain CSS, MapLibre GL)
├── backend/           # FastAPI prediction API (Python 3.10+)
├── .codex/            # Planning notes and prompts
└── AGENTS.md
```

## Tech Stack

| Layer | Implementation |
|-------|----------------|
| Frontend | Next.js 14, React 18, TypeScript, plain CSS (no Tailwind) |
| Map | MapLibre GL + Carto basemaps; 16 venues in `frontend/data/venues.ts` |
| Live data | ESPN public site API (proxied via Next.js `app/api/*` routes) |
| Predictions | FastAPI + scikit-learn RandomForest (`backend/`) |
| ML data | `backend/app/data/world_cup_matches.csv` (1930–2018 tournament matches) |

## Backend (`backend/`)

- **Framework:** FastAPI, stateless, runs on **port 8001** by default
- **Model:** Random Forest, 3-class (home win / draw / away win)
- **Features:** 18 (team form, weighted goals, H2H, stage-weighted history, etc.) — see `app/services/training.py`
- **Training:** Offline via `python scripts/train_model.py`; artifact at `app/models/artifacts/world_cup_rf.joblib`
- **Startup:** Loads trained artifact from disk (`TRAIN_ON_STARTUP=0` by default)
- **Endpoints:** `GET /health`, `POST /predict` (team names normalized via `app/data/team_aliases.json`)
- **Low confidence:** Teams with no WC history → 0.34 / 0.33 / 0.33 with `confidence: "low"`

## Frontend (`frontend/`)

- **Env:** `PREDICT_API_URL=http://127.0.0.1:8001` in `.env.local`
- **API routes:** `/api/scores`, `/api/standings`, `/api/news`, `/api/match/[id]`, `/api/predict` (proxy to FastAPI)

### Live (ESPN + ML)

- Live scores (home rail, `/matches`, map markers)
- Group standings (`/standings`)
- News feed (`/news`)
- Match detail (`/match/[id]`) — ESPN summary
- AI prediction bars + typewriter narrative (`MatchPrediction`, `lib/predict.ts`)
- Interactive map with stadium markers (`DashboardMap`, `StadiumMarkers`)
- Home rail live summary (first live match → predict)

### Still mock / placeholder

- Knockout bracket (`/bracket`) — `lib/data.ts`
- Player stats (`/stats`) — `lib/data.ts`
- Stadium pages (`/stadium/[id]`) — mock `StadiumView`; map uses `data/venues.ts`
- Country host pages — mock `CountryView`
- Match timeline & possession blocks — hidden in `MatchDetail` until ESPN play-by-play
- Topbar live count, goal pulses, parts of home rail — still demo data

## Run Locally

**Terminal 1 — prediction API**

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/train_model.py   # if artifact missing
uvicorn app.main:app --reload --port 8001
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install
# create frontend/.env.local with PREDICT_API_URL=http://127.0.0.1:8001
npm run dev
```

Open http://localhost:3000

## Team

- Hamza ([@hamzaelmi068](https://github.com/hamzaelmi068))
- Faiz ([@faizm10](https://github.com/faizm10))

## Near-Term Backlog

1. Regenerate CSV from Kaggle for real knockout `stage` labels (stage-weight feature)
2. Wire bracket and stats to live APIs
3. Align stadium detail pages with `data/venues.ts`
4. ESPN play-by-play for match timeline
5. Persist My World Cup preferences beyond localStorage
