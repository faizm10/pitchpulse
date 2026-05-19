# FotMob integration plan — PitchPulse

**Status:** Planned  
**Last updated:** 2026-05-18  
**Owner:** Frontend / data layer  
**WC league id:** `77` (FIFA World Cup on FotMob)

## Goal

Add FotMob as a **second live data source** for features ESPN does not cover well: squads, lineups, xG, player ratings, rich tournament stats, and knockout fixtures. **Do not replace ESPN** for scoreboard, news, or primary match headers.

## Strategy

```text
ESPN (existing)  → /api/scores, /api/news, /api/standings, /api/match/[id]
FotMob (new)     → /api/fotmob/* (proxied, normalized)
FastAPI (existing) → /api/predict → ML win/draw/loss
Mock (retire gradually) → bracket, stats, team squads in lib/data.ts
```

**Base URL (unofficial):** `https://www.fotmob.com/api/`  
**Docs reference:** [sportly FotMob README](https://github.com/pseudo-r/sportly/blob/master/docs/fotmob/README.md), [Public-FotMob-API](https://github.com/pseudo-r/Public-FotMob-API)

**Legal:** No official FotMob developer API. Use server-side proxy only; document unofficial status in README. Not for commercial production without permission.

---

## Phase 0 — Spike & endpoint catalog

**Duration:** 1–2 days  
**Exit:** Documented working endpoints + sample JSON committed under `.codex/fixtures/fotmob/` (optional, small snippets only).

### Tasks

1. Open [FotMob WC overview](https://www.fotmob.com/en-GB/leagues/77/overview) → DevTools → Network → filter `fotmob.com/api`.
2. Record exact URLs for: league overview, matches by date, match detail, team page, player page.
3. Add `frontend/scripts/fotmob-probe.mjs`:
   - Accept `--date YYYYMMDD`, `--league 77`, `--match <id>`.
   - Send browser-like headers (`User-Agent`, `Accept: application/json`).
   - Print top-level JSON keys and HTTP status.
4. Verify calls work from Node (not browser) through a throwaway route or script.
5. Save 2–3 example responses (redacted) for parser development.

### Acceptance criteria

- [ ] `league?id=77` (or discovered equivalent) returns 200 with table/fixture data during test window.
- [ ] At least one `match` response includes `content.lineup` or `content.stats` (xG).
- [ ] Spike notes appended to **Endpoint catalog** section below.

### Endpoint catalog (fill during spike)

| Purpose | URL / function | Notes |
|---------|----------------|-------|
| WC league | `league?id=77` | Standings + fixtures |
| Matches by day | `matches?date=YYYYMMDD` | All leagues; filter WC |
| Match detail | `matchDetails?matchId=` | Lineups, xG, ratings |
| Team | `team?id=` | Squad, fixtures |
| Player | `playerDetails?id=` | Profile, stats |
| Search | `search?term=` | Resolve names → ids |

---

## Phase 1 — Data layer

**Duration:** 2–3 days  
**Exit:** All FotMob traffic goes through Next.js API routes; no client-side FotMob URLs.

### New files

```text
frontend/
├── types/fotmob.ts              # Raw shapes + normalized PitchPulse types
├── lib/fotmob/
│   ├── client.ts                # fetch with headers, error handling
│   ├── parse-league.ts
│   ├── parse-match.ts
│   ├── parse-team.ts
│   ├── parse-player.ts
│   └── parse-matches-day.ts
├── data/fotmob-team-map.json    # espn abbrev / name → fotmobTeamId
└── app/api/fotmob/
    ├── league/route.ts          # GET ?id=77
    ├── matches/route.ts         # GET ?date=YYYYMMDD
    ├── match/[id]/route.ts
    ├── team/[id]/route.ts
    └── player/[id]/route.ts
```

### Conventions (match existing ESPN routes)

- Proxy only from `app/api/fotmob/*`; never call FotMob from React components directly.
- `export const revalidate = 60` for live data; `300` for squads.
- Return normalized JSON; keep raw payload behind `?debug=1` in dev only if needed.
- Log errors with `[fotmob/...]` prefix like `[/api/scores]`.
- Feature flag: `FOTMOB_ENABLED=1` in `.env.local`; routes return 503 when off.

### Normalized types (`types/fotmob.ts`)

Define stable shapes consumed by UI:

```ts
// Examples — adjust after spike
export interface FotmobLeagueOverview {
  leagueId: number;
  name: string;
  table: FotmobTableRow[];
  fixtures: FotmobFixture[];
}

export interface FotmobMatchDetail {
  matchId: number;
  home: FotmobTeamRef;
  away: FotmobTeamRef;
  status: "pre" | "live" | "ft";
  score: { home: number; away: number };
  xg?: { home: number; away: number };
  lineups?: { home: FotmobLineup; away: FotmobLineup };
  incidents?: FotmobIncident[];
  playerRatings?: FotmobPlayerRating[];
}

export interface FotmobTeamProfile {
  teamId: number;
  name: string;
  squad: FotmobSquadMember[];
  recentFixtures?: FotmobFixture[];
}

export interface FotmobPlayerProfile {
  playerId: number;
  name: string;
  position?: string;
  stats?: Record<string, number | string>;
}
```

---

## Phase 2 — ID mapping

**Duration:** parallel with Phase 1–3  
**Exit:** Match and team pages can resolve FotMob ids for WC teams.

### Sources

| ID type | ESPN | FotMob |
|---------|------|--------|
| Match | `event` id in scoreboard | `matchId` in matches day / league |
| Team | `team.id` on competitor | `team.id` in league table / match |

### Mapping approach

1. **Static map** — `frontend/data/fotmob-team-map.json`:
   ```json
   { "MEX": { "name": "Mexico", "fotmobId": 0, "espnAbbrev": "MEX" } }
   ```
   Populate 48 teams via script using `search` + manual verify.

2. **Heuristic match** — Same calendar day + home/away names (fuzzy normalize accents).

3. **Reuse backend aliases** — Align with `backend/app/data/team_aliases.json` for display names used in predictions.

### Match linking algorithm

```
1. Load ESPN match from /api/match/[espnId] → home/away names, date
2. Load FotMob matches for that date
3. Find WC league block (id 77) or filter by tournament
4. Match pair (home, away) → fotmobMatchId
5. Cache espnEventId → fotmobMatchId in memory or short TTL KV (optional v2)
```

### Acceptance criteria

- [ ] Map covers all Group A teams as proof; expand to 48 before launch.
- [ ] Unmapped teams degrade gracefully (ESPN-only UI).

---

## Phase 3 — Feature wiring

### 3a — Match detail (priority: high)

**Files:** `components/MatchDetail.tsx`, `app/api/match/[id]/route.ts` (optional merge route)

| Data | Source |
|------|--------|
| Score, status, venue, teams | ESPN (unchanged) |
| xG, lineups, incidents, ratings | FotMob |

**Implementation:**

1. After ESPN detail loads, resolve `fotmobMatchId` via date + team names.
2. `fetch('/api/fotmob/match/' + fotmobMatchId)`.
3. Set `SHOW_EXTENDED_STATS = true`; render xG row and lineup section.
4. Timeline from `incidents` if ESPN play-by-play unavailable.

**Acceptance criteria:**

- [ ] Live/finished WC match shows xG when FotMob returns it.
- [ ] Failure on FotMob does not break ESPN match page.

---

### 3b — Team hub (GitHub #13)

**New route:** `app/team/[code]/page.tsx` + `components/TeamHub.tsx`

| Section | FotMob API |
|---------|------------|
| Header (flag, name, group) | Static map + ESPN standings |
| Squad | `team/[fotmobId]` |
| Season / WC stats | `league/77` stats slice or team block |
| Fixtures | `league/77` filtered by team |

**Entry points:**

- Standings row click → `/team/[code]`
- My World Cup → “View squad”
- Stats leaderboard → team flag

**Acceptance criteria:**

- [ ] `/team/MEX` shows squad list (name, position, number).
- [ ] Player row links to `/player/[id]` (Phase 3c).

---

### 3c — Player detail

**New route:** `app/player/[id]/page.tsx`

- `GET /api/fotmob/player/[id]`
- WC stats, club, position; link back to team hub.

---

### 3d — Stats page (replace mock)

**File:** `components/Stats.tsx`

- Replace `topScorers` / `topAssists` from `lib/data.ts` with FotMob league 77 stats endpoint (discover path in spike).
- Keep layout; swap data source only.

**Acceptance criteria:**

- [ ] `/stats` shows real tournament leaders when FotMob has data.

---

### 3e — Bracket (replace mock)

**File:** `components/Bracket.tsx`, retire `bracket` from `lib/data.ts` for knockout rounds

- Build rounds from `league/77` fixtures or `matches?date=` across knockout window.
- Map `round` / `stage` labels from FotMob fields.
- Live badge: cross-reference ESPN scoreboard state when `espnEventId` known.

**Acceptance criteria:**

- [ ] Knockout tree reflects FotMob fixture list; TBD slots before draws.

---

## Phase 4 — Polish & ops

| Task | Notes |
|------|-------|
| Skeletons (#14) | `TeamHubSkeleton`, `FotmobMatchExtrasSkeleton` |
| Caching | League 77: 5–15 min; match live: 30s; squad: 1h |
| README | Add “Data sources” table: ESPN + FotMob (unofficial) |
| AGENTS.md | Update “Still mock” list as features ship |
| Analytics (#11) | `fotmob_match_loaded`, `team_hub_view`, `player_view` |
| Deploy (#10) | No new service; env `FOTMOB_ENABLED` on Vercel |

---

## Implementation order (recommended)

```text
Week 1:  Phase 0 spike → Phase 1 league + matches routes + types
Week 2:  Phase 2 team map (8 teams) → match route → Match detail xG/lineups
Week 3:  Team hub + player route → Standings links
Week 4:  Stats + Bracket → full team map → skeletons + README
```

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Endpoint breaks | Feature flag; ESPN fallback; monitor probe script in CI (optional) |
| Rate limits | Aggressive `revalidate`; never N+1 match calls on standings |
| ToS / legal | README disclaimer; plan licensed API before monetization |
| ID mismatch | Static map + manual QA for 48 teams |
| Empty pre-tournament | Mock fallback or “Squad available when tournament starts” |

---

## Out of scope

- Replacing ESPN scoreboard or news
- FotMob transfers, TV listings, world news (unless ESPN news fails)
- Python `sportly` in production path (scripts/probes only)
- Backend FastAPI changes for FotMob

---

## Related GitHub issues

| Issue | Relationship |
|-------|----------------|
| #13 Team hub | Primary consumer of `team` + `player` routes |
| #14 Skeletons | Loading states for new pages |
| #11 Analytics | Instrument new routes |
| #10 Deploy | Env vars only |
| #12 Standings colors | Independent; add team link to hub |

---

## Definition of done (integration complete)

- [ ] `FOTMOB_ENABLED` documented in `frontend/.env.example`
- [ ] All FotMob access via `app/api/fotmob/*` + `lib/fotmob/*`
- [ ] Match detail shows xG and lineups for mapped WC matches
- [ ] Team hub + player pages live for all 48 teams
- [ ] `/stats` and `/bracket` use FotMob instead of `lib/data.ts` mocks
- [ ] README and AGENTS.md updated
- [ ] Endpoint catalog section above filled from spike
