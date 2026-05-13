# PitchPulse — Next.js + TypeScript

A real-time, map-first intelligence dashboard for the FIFA World Cup 2026.
Original design — not affiliated with FIFA.

## Stack

- **Next.js 14** (App Router)
- **TypeScript** (strict)
- **React 18**
- Plain CSS with custom properties (no Tailwind, no UI lib)
- Mock data in `lib/data.ts` — swap for a real API later

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Project layout

```
nextjs/
├── app/
│   ├── layout.tsx              # root layout + font/styles
│   ├── globals.css             # design tokens + base styles
│   ├── page.tsx                # / — map home
│   ├── matches/page.tsx        # /matches
│   ├── bracket/page.tsx        # /bracket
│   ├── stats/page.tsx          # /stats
│   ├── news/page.tsx           # /news
│   ├── mywc/page.tsx           # /mywc — pick your team
│   ├── match/[id]/page.tsx     # /match/:id
│   ├── stadium/[id]/page.tsx   # /stadium/:id
│   └── country/[code]/page.tsx # /country/:code (CA, US, MX)
│
├── components/
│   ├── Providers.tsx           # TweaksContext + MyTeamContext
│   ├── Topbar.tsx              # global nav
│   ├── TweaksPanel.tsx         # floating tweaks panel
│   ├── Shared.tsx              # Flag, Logo, FormDots, BackBar, …
│   ├── MapView.tsx             # cartographic dot-grid hero map
│   ├── Rail.tsx                # live matches, AI summary, pulses, table
│   ├── MatchesList.tsx
│   ├── Bracket.tsx
│   ├── Stats.tsx
│   ├── News.tsx
│   ├── MatchDetail.tsx
│   ├── StadiumView.tsx         # 3D flip card
│   ├── CountryView.tsx
│   └── MyWorldCup.tsx
│
└── lib/
    ├── types.ts                # TypeScript types
    └── data.ts                 # mock data (stadiums, teams, matches, …)
```

## Design system

- **Looks** (`data-look="atlas"`): `atlas` (cream paper, default), `broadcast` (dark mode), `festival` (warm)
- **Type pairs** (`data-type`): `editorial` (default), `modernist`, `mono`
- **Density** (`data-density`): `cozy`, `compact`

The look/type/density attributes are set on `<html>` from the Tweaks panel and read by CSS variables in `globals.css`.

## What to swap when going live

| File | Replace with |
|---|---|
| `lib/data.ts` | Real sports-data API (`fetch` in server components) |
| `MapView.tsx` SVG | Mapbox GL or Leaflet renderer |
| AI narrative strings | OpenAI / Gemini streamed completion |
| `MyTeamContext` localStorage | User account preference |

## Notes

- All match results, scores, and player events are **fictional**.
- Team and host city names are real, public facts.
- No FIFA marks or branded assets are used.
