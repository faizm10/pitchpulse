# PitchPulse

⚽ Map-first FIFA World Cup 2026 dashboard. Live scores, standings, news, match detail, and ML win/draw/loss predictions across 16 host venues.

https://github.com/hamzaelmi068/pitchpulse/raw/main/public/demo.mp4

## Stack

Next.js 14, TypeScript, MapLibre GL, ESPN + FotMob APIs, FastAPI, scikit-learn

## Run

```bash
# frontend
cd frontend && npm i && npm run dev

# backend (separate terminal)
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python scripts/train_model.py   # first time only
uvicorn app.main:app --reload --port 8001
```

Open [http://localhost:3000](http://localhost:3000).

## Env

`frontend/.env.local`

```
PREDICT_API_URL=http://127.0.0.1:8001
FOTMOB_ENABLED=1
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

`backend/.env`

```
PORT=8001
TRAIN_ON_STARTUP=0
MODEL_PATH=app/models/artifacts/world_cup_rf.joblib
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Production: set `PREDICT_API_URL=https://pitchpulse-api-dsye.onrender.com` on Vercel. See [AGENTS.md](AGENTS.md) and [backend/README.md](backend/README.md) for deploy, retrain, and API details.

## Team

- [Hamza](https://github.com/hamzaelmi068)
- [Faiz](https://github.com/faizm10)
- [Harishan](https://github.com/HariT10)
