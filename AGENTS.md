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
| Supplemental | FotMob WC league 77 — squads, fixtures, match resolve (`/api/fotmob/*`, `FOTMOB_ENABLED=1`) |
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

- **Env:** `PREDICT_API_URL=http://127.0.0.1:8001`, `FOTMOB_ENABLED=1` in `.env.local` (see `.env.example`)
- **API routes:** `/api/scores`, `/api/standings`, `/api/news`, `/api/match/[id]`, `/api/predict` (proxy to FastAPI); `/api/fotmob/league`, `/api/fotmob/team/[id]`, `/api/fotmob/team-by-code/[code]`, `/api/fotmob/match/resolve`

### Live (ESPN + ML)

- Live scores (home rail, `/matches`, map markers)
- Group standings (`/standings`)
- News feed (`/news`)
- Match detail (`/match/[id]`) — ESPN summary
- AI prediction bars + typewriter narrative (`MatchPrediction`, `lib/predict.ts`)
- Interactive map with stadium markers (`DashboardMap`, `StadiumMarkers`)
- Home rail live summary (first live match → predict)
- Team hubs (`/team/[code]`) — FotMob squads + WC fixtures; player profiles (`/player/[id]?team=`)
- Match detail FotMob block — group/fixture context; xG when matchDetails is reachable

### Still mock / placeholder

- Knockout bracket (`/bracket`) — `lib/data.ts`
- Player stats leaderboard (`/stats`) — `lib/data.ts` (team squads are live via FotMob)
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

## Git commits

**Required.** Husky runs [commitlint](https://commitlint.js.org/) on every commit (`commitlint.config.js` at repo root). Messages that do not match are rejected.

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Rules when writing or suggesting commit messages:**

- Lowercase type; imperative subject (`add` not `added`); no trailing period on the subject
- `feat` = new capability; `fix` = bug fix; `chore` = tooling/deps; `docs` = documentation only
- Optional scope: area of change (`frontend`, `backend`, `api`, etc.)

**Examples:**

```
feat: add halftime HT display on test-match page
fix(api): retry fotmob league fetch on cold start
docs: document husky and commitlint setup
chore: add root package.json for git hooks
```

When the user asks you to commit or draft a commit message, **always** use this format.

## Near-Term Backlog

1. Regenerate CSV from Kaggle for real knockout `stage` labels (stage-weight feature)
2. Wire bracket and stats to live APIs — see [.codex/plans/fotmob-integration.md](.codex/plans/fotmob-integration.md) (FotMob, league id 77)
3. Align stadium detail pages with `data/venues.ts`
4. ESPN play-by-play for match timeline
5. Persist My World Cup preferences beyond localStorage
