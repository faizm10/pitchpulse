# PitchPulse

> Your all-in-one FIFA World Cup 2026 intelligence dashboard.

PitchPulse is a map-first dashboard for the 2026 World Cup: live scores, standings, news, match pages, and ML-powered win/draw/loss predictions — built by football fans, for football fans.

## What's working today

| Area | Status |
|------|--------|
| Interactive map (MapLibre GL, 16 host venues) | Live |
| Live scores & match list | ESPN |
| Group standings | ESPN |
| News feed | ESPN |
| Match detail (teams, score, status, venue) | ESPN |
| AI prediction bars + narrative | FastAPI Random Forest |
| Team squads & fixtures (`/team/[code]`) | FotMob (league 77) |
| Match FotMob extras (group, xG when available) | FotMob |
| Knockout bracket | Mock UI |
| Player stats leaderboard | Mock UI |
| Stadium / country detail pages | Mock UI |
| Match timeline & possession | Hidden (not wired) |

## Tech stack

| Layer | Tools |
|-------|--------|
| Frontend | Next.js 14, TypeScript, plain CSS |
| Map | MapLibre GL |
| Live data | ESPN public API (Next.js API routes) |
| Squads / fixtures | FotMob API via `/api/fotmob/*` (`FOTMOB_ENABLED=1`) |
| Predictions | FastAPI, scikit-learn, pandas (Python 3.10+) |
| ML model | Random Forest, 18 features, 3-class output (home / draw / away) |

The prediction service is **stateless**: it loads a model trained offline from `backend/app/data/world_cup_matches.csv` (World Cup matches 1930–2018). No paid APIs required for the current pipeline.

## Project structure

```
pitchpulse/
├── frontend/                 # Next.js app → http://localhost:3000
│   ├── app/api/              # ESPN proxies + /api/predict → FastAPI
│   ├── components/             # UI (map, match detail, predictions, …)
│   ├── data/venues.ts        # Stadium coordinates for the map
│   └── lib/                  # ESPN parsers, mock data, predict client
├── backend/                  # FastAPI → http://127.0.0.1:8001
│   ├── app/services/         # Feature engineering + training
│   ├── app/models/           # Predictor + saved .joblib artifact
│   └── scripts/              # prepare_data.py, train_model.py
└── AGENTS.md                 # Agent / contributor context
```

## Run locally

You need **two terminals**.

### 1. Prediction API (port 8001)

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
python scripts/train_model.py          # first time only
uvicorn app.main:app --reload --port 8001
```

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
PREDICT_API_URL=http://127.0.0.1:8001
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click a match from the map or Matches page to see ESPN detail plus prediction bars.

### Quick checks

```bash
curl http://127.0.0.1:8001/health
curl -X POST http://127.0.0.1:8001/predict -H "Content-Type: application/json" -d "{\"home_team\":\"Brazil\",\"away_team\":\"Germany\"}"
curl -X POST http://localhost:3000/api/predict -H "Content-Type: application/json" -d "{\"home_team\":\"Brazil\",\"away_team\":\"Germany\"}"
```

## ML pipeline (summary)

- **Training data:** World Cup tournament matches 1930–2018 (`world_cup_matches.csv`)
- **Features:** 18 (win rates, weighted goals, head-to-head, tournament stage weight, …)
- **Output:** `home_win_probability`, `draw_probability`, `away_win_probability`
- **Unknown teams:** Slight home lean (0.34 / 0.33 / 0.33) with `confidence: "low"`

See `backend/README.md` for dataset sources, Kaggle setup, and CV metrics.

## Team

- [Hamza](https://github.com/hamzaelmi068)
- [Faiz](https://github.com/faizm10)

## License

See [LICENSE](LICENSE).
