# PitchPulse — Claude Context

## Project Overview
PitchPulse is a FIFA World Cup 2026 real-time intelligence dashboard. Map-inspired UI with live scores, player stats, bracket tracking, AI match insights, and news aggregation.

## Current Status
Discovery phase (March 2026) — no code yet. Planning tech stack, APIs, and design.

## Planned Tech Stack
- **Frontend**: Next.js + TypeScript, Tailwind CSS
- **Map**: Mapbox GL or Leaflet.js
- **Data APIs**: BallDontLie WC2026 API, Sportmonks
- **AI Layer**: OpenAI API or Gemini
- **Backend**: Node.js/Express or FastAPI
- **Database**: PostgreSQL / Supabase
- **Deployment**: Vercel + Railway

## Project Structure (planned)
```
pitchpulse/
├── frontend/
├── backend/
├── ai/
└── docs/
```

## Timeline
- **Alpha** (April 2026): Map + scores + bracket
- **Beta** (May 2026): AI insights + news feed
- **Launch** (June 2026): World Cup kickoff

## Team
- Hamza ([@hamzaelmi068](https://github.com/hamzaelmi068))
- Faiz ([@faizm10](https://github.com/faizm10))

## Git commits

**Required.** Husky + commitlint at the repo root reject non-conventional messages. See root `AGENTS.md` for full project context.

Format: `<type>(<optional scope>): <description>`

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

- Lowercase type; imperative subject; no period at end of subject
- `feat` = new feature; `fix` = bug fix; `chore` = tooling/deps

**Examples:** `feat: add team hub skeleton`, `fix(fotmob): retry test card on first load`, `docs: update README`

When generating or suggesting commit messages, **always** use this format.

## Key Features to Build
1. Interactive map of stadiums/host cities (Canada, Mexico, USA)
2. Live scores & match timelines
3. Group stage + knockout bracket tracker
4. Player stats (goals, assists, cards, xG, heatmaps)
5. AI match predictions and post-match summaries
6. Aggregated news feed
