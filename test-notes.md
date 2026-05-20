# PitchPulse — Match Page Test Notes

**Last updated:** May 2026  
**Reference match:** Houston Dynamo FC vs St. Louis CITY SC — US Open Cup QF  
**ESPN game ID:** `401871127` · **FotMob match ID:** `5425228`

---

## Page Layout (top to bottom)

This is the reference layout used for all match pages. Every section is live-data-driven unless noted.

```
┌─────────────────────────────────────────────────────┐
│ HEADER                                              │
│  ← Tests  |  MLS · R2  |  [ESPN]  [+ FOTMOB]       │
│                            Updated Xs ago  [REFRESH]│
├─────────────────────────────────────────────────────┤
│ SCORE HERO                                          │
│  [Logo]  St. Louis CITY SC  2  ●PENALTIES  2  HOU   │
│                                    PENS             │
│                              (post-game: shows      │
│                               AFTER PENALTIES       │
│                               4 – 2  ON PENS)       │
├─────────────────────────────────────────────────────┤
│ DATA SOURCES BAR                                    │
│  [ESPN] Events · Stats · News · Leaders             │
│  [FOTMOB] Live clock · Standings                    │
├─────────────────────────────────────────────────────┤
│ PENALTY SHOOTOUT PANEL  (visible during pens + FT)  │
│  ● PENALTY SHOOTOUT              STL 4 – 2 HOU      │
│  STL  ⚽ ⚽ ⚽ ⚽ ○                                   │
│  HOU  ✕ ⚽ ⚽ ✕ ○                                   │
├─────────────────────────────────────────────────────┤
│ KEY EVENTS                                          │
│  Reverse-chronological. Goals highlighted with      │
│  team-colour left border. Score badge when known.   │
├─────────────────────────────────────────────────────┤
│ MATCH STATS                                         │
│  Bar chart per stat line. Top 10 stats by priority. │
├─────────────────────────────────────────────────────┤
│ MATCH / SEASON LEADERS                              │
│  Per team. Shown during live + post-game.           │
├─────────────────────────────────────────────────────┤
│ NEWS                                                │
│  Up to 8 articles from ESPN. Opens in new tab.      │
├─────────────────────────────────────────────────────┤
│ OPEN CUP BRACKET                                    │
│  QF grid (current game highlighted). R16 collapsed. │
│  Upcoming rounds (SF, Final) shown as placeholders. │
├─────────────────────────────────────────────────────┤
│ MLS STANDINGS                                       │
│  East + West. Live = projected "if result stands".  │
│  Qual colours from FotMob when available.           │
├─────────────────────────────────────────────────────┤
│ RAW API RESPONSE  (collapsible <details>)           │
└─────────────────────────────────────────────────────┘
```

---

## Data Sources

### Primary — ESPN

**Base URL:** `https://site.api.espn.com/apis/site/v2/sports/soccer/{league}/summary?event={gameId}`

| League slug | Used for |
|---|---|
| `usa.open` | US Open Cup |
| `usa.1` | MLS regular season |

**What ESPN provides:**
- Score, status, period, clock (`displayClock`)
- Team info (name, logo, colour, abbreviation)
- Commentary feed → key events (goals, cards, subs, shots)
- Penalty shootout kicks via period-5 commentary events (`penalty---scored` / `penalty---missed`)
- Boxscore stats
- Match leaders
- News articles (up to 8)
- Standings (Eastern + Western Conference)
- Venue + broadcast info
- Open Cup bracket (via separate scoreboard endpoint)

**ESPN penalty slug quirk:**  
ESPN uses triple-dashes: `penalty---scored`, `penalty---missed`.  
The route normalises these to `penalty-scored` / `penalty-missed` before returning them.  
Period-5 events = shootout kicks. Period-2 spot kicks (in-game penalties) share the same slugs — the shootout panel filters by `period === 5` to avoid mixing them.

**Bracket endpoints used:**
```
/scoreboard?dates=20260519-20260520   → QF round
/scoreboard?dates=20260428-20260430   → R16 round
```
These dates are hardcoded for the HOU-STL test. For World Cup, bracket rounds will need their own date ranges.

---

### Supplementary — FotMob

**Base URL (league feed):** `https://www.fotmob.com/api/data/leagues?id={leagueId}`

| League | FotMob ID |
|---|---|
| US Open Cup | `9441` |
| MLS regular season | `130` |

**What FotMob adds:**
- More granular live clock (e.g. `"87'"` vs ESPN's blunter `"87:00"`)
- `liveTime.short` (e.g. `"Pen"`, `"HT"`) used to suppress clock during breaks
- Qual colours for standings rows
- Team logos (fallback when ESPN CDN logos are placeholders)

**FotMob matchDetails — currently blocked:**  
`fotmob.com/api/matchDetails?matchId={id}` returns 404 for all variants tested (with and without Referer, ccode, x-mas headers). The league feed endpoint works fine. PK data is sourced from ESPN period-5 events instead.

---

## Clock Logic

| Match phase | Clock behaviour |
|---|---|
| Regular time (1H / 2H) | FotMob `liveTime.long` preferred, ESPN `displayClock` fallback. Interpolated client-side every 1s between API polls. |
| Halftime | Clock suppressed — centre shows `HT` |
| ET 1H (period 3) | ESPN resets clock to `0:00` — route adds 90-min offset → shows `90'–105'` |
| ET 2H (period 4) | Same, 105-min offset → `105'–120'` |
| ET Halftime | Clock suppressed — centre shows `ET HT` |
| Penalty shootout (period 5) | Clock suppressed — centre shows `PENS` / `PENALTIES` |
| Full time | No clock |

FotMob's `liveTime.short === "Pen"` or `"HT"` also suppresses the clock as a secondary guard.

---

## Score Hero States

Five distinct states rendered in the centre column:

| State | Label | Sub-label |
|---|---|---|
| Regular halftime | `HT` | `HALF TIME` |
| ET halftime | `ET HT` | `ET HALF TIME` |
| Penalty shootout live | `PENS` | `● PENALTIES` |
| Live (regular or ET) | `{clock}` | `● LIVE` or `● ET LIVE` |
| Pre-match | `VS` | Kickoff time / countdown |
| Full time (normal) | — | `FULL TIME` or ESPN detail |
| Full time (after pens) | `4 – 2 / ON PENS` | `AFTER PENALTIES` |

---

## Penalty Shootout Panel

Shown when `hadPenaltyShootout === true` (both while live and after the final whistle).

**Data flow:**
1. ESPN period-5 commentary events → normalised to `penalty-scored` / `penalty-missed`
2. Sorted by `sequence` field (ESPN commentary order — all share `120'` clock so sequence is the only ordering key)
3. Split by team via fuzzy name match (handles `"St. Louis CITY SC"` vs `"STL"`)
4. Dots rendered: ⚽ green = scored, ✕ red = missed/saved, ○ faded = pending slot

**PK goal celebration:**  
Each new `penalty-scored` event in period 5 fires the goal overlay animation (same as a regular goal). Triggered on next poll after the kick is taken.

**`penScore` (route-computed):**  
The route counts period-5 `penalty-scored` events by team and returns `penScore: { home, away }`. This is used by both the ScoreHero post-game display and the match card on the tests index.

---

## What Needs Manual Configuration Per Match

These are the hardcoded values that must be updated whenever a new game is added:

### 1. `MLS_GAME_CONFIG` — `frontend/app/test-mls/[slug]/page.tsx`
```ts
const MLS_GAME_CONFIG: Record<string, { gameId: string }> = {
  'atl-orl': { gameId: '401871128' },
  'hou-stl': { gameId: '401871127' },
};
```
Slug must match the URL (`/test-mls/{slug}`). `gameId` is the ESPN event ID — found in the ESPN scoreboard API or by inspecting any ESPN match URL.

### 2. `TEST_GAMES` registry — `frontend/app/tests/page.tsx`
```ts
{
  slug: 'mls-hou-stl',
  href: '/test-mls/hou-stl',
  source: 'espn',
  matchId: '401871127',
  apiPath: '/api/test-mls/401871127',
  league: 'MLS',
  round: 'R2',
}
```
One entry per match card shown on the `/tests` index page.

### 3. `EPL_VENUES` (map pins) — `frontend/app/tests/page.tsx`
```ts
'mls-hou-stl': {
  name: 'Shell Energy Stadium',
  city: 'Houston, TX',
  longitude: -95.3510,
  latitude: 29.7522,
}
```
Coordinates for the map pin. Must match the `slug` key in `TEST_GAMES`.

### 4. `MLS_GAME_SQUADS` (goal celebration lookup) — `frontend/lib/goal-notification.ts`
```ts
'hou-stl': {
  home: [{ id: 'herrera', name: 'Héctor Herrera', number: 16, flag: '🇲🇽' }, ...],
  away: [{ id: 'löwen', name: 'Eduard Löwen', number: 10, flag: '🇩🇪' }, ...],
}
```
Used to enrich the goal overlay with jersey number and flag emoji. If a scorer isn't found here the overlay still works — it falls back to the raw name from ESPN. Not strictly required but improves the visual.

### 5. Open Cup bracket date ranges — `frontend/app/api/test-mls/[gameId]/route.ts`
```ts
fetch(`.../scoreboard?dates=20260519-20260520`)   // QF
fetch(`.../scoreboard?dates=20260428-20260430`)   // R16
```
These are fetched alongside the main ESPN summary. For World Cup, swap in the appropriate group-stage / knockout date ranges.

### 6. FotMob league ID — `frontend/app/api/test-mls/[gameId]/route.ts`
```ts
const MLS_FOTMOB_ID = 9441; // US Open Cup
```
Change per competition. MLS regular season = `130`. FotMob league IDs can be found from `fotmob.com/api/data/leagues?id={id}` by trying IDs or inspecting FotMob URLs.

---

## World Cup 2026 Planning Notes

### ESPN
- Confirm the league slug for FIFA World Cup 2026. Likely `fifa.world` or `wc.2026` — verify once ESPN publishes the event schedule.
- ESPN game IDs will be available from the scoreboard endpoint once fixtures are announced.
- Group stage bracket will need multiple scoreboard date ranges (one per matchday).

### FotMob
- World Cup FotMob league ID will need to be found (check `fotmob.com/leagues` for "FIFA World Cup").
- The `matchDetails` endpoint is currently blocked — rely on the league feed for clock + status. If FotMob unblocks it in the future, full event timeline (goals, cards, lineups) becomes available without needing ESPN.

### Bracket / Tournament Structure
- World Cup has Group Stage → R16 → QF → SF → Final. Each round needs its own scoreboard date range in the route.
- The current `openCupBracket` shape (rounds array) should extend cleanly — just add more round entries.
- Consider a knockout-tree visual rather than a flat list for the latter stages.

### Manual work per match at World Cup
At minimum, per game you need:
1. ESPN game ID
2. ESPN league slug confirmed
3. Venue coordinates (48 venues → can preload all from a venues data file)
4. Squad list per team for goal overlay enrichment (optional but nice)

Venues can be pre-seeded in a `data/wc2026-venues.ts` file before the tournament starts so map pins need zero manual config at game time.

### Polling
- `POLL_LIVE = 12s` (current). Fine for World Cup — may want to drop to 8s for knockout games.
- `POLL_IDLE = 30s` for pre/post-match. Can extend to 60s post-match to reduce load.
