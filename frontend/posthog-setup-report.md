<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into PitchPulse. Here is a summary of every change made:

**Infrastructure**
- `lib/posthog.ts` — updated to use the `/ingest` reverse proxy, added `capture_exceptions: true`, `defaults: '2026-01-30'`, and `debug` in development.
- `lib/posthog-server.ts` — new server-side PostHog client using `posthog-node`, used by API routes.
- `next.config.js` — added `/ingest/static/*`, `/ingest/array/*`, and `/ingest/*` rewrites for the reverse proxy so events route through your own domain, bypassing ad-blockers.
- `.env.local` — `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` set with your project credentials.
- `posthog-node` installed as a production dependency for server-side tracking.

**Events instrumented** — 13 events across 10 files:

| Event | Description | File |
|---|---|---|
| `match_viewed` | Fires once when a match page first loads with data. Top of the match-detail funnel. | `app/match/[id]/page.tsx` |
| `match_refreshed` | Fires when the user clicks the manual Refresh button on a match page. | `app/match/[id]/page.tsx` |
| `match_news_article_clicked` | Fires when a user opens a news article from the match detail news section. | `app/match/[id]/page.tsx` |
| `match_list_filter_changed` | Fires when the user changes the All / Live / Upcoming / Full time filter on the matches list. | `components/MatchesList.tsx` |
| `match_list_match_clicked` | Fires when a user clicks a match row in the list to navigate to its detail page. | `components/MatchesList.tsx` |
| `prediction_viewed` | Fires when the AI prediction widget renders a successful result. Carries win/draw percentages and model name. | `components/MatchPrediction.tsx` |
| `news_article_clicked` | Fires when a user clicks any article on the standalone News page. | `components/News.tsx` |
| `player_profile_viewed` | Fires once a player profile finishes loading. | `components/PlayerProfile.tsx` |
| `team_hub_viewed` | Fires once a team hub page finishes loading. | `components/TeamHub.tsx` |
| `bracket_viewed` | Fires when the knockout bracket page mounts. | `components/Bracket.tsx` |
| `my_wc_team_set` | Fires when the user picks or changes their favourite team on the My World Cup page. | `components/MyWorldCup.tsx` |
| `tweak_changed` | Fires when the user changes an appearance setting (look, density, map style, type, AI summaries). | `components/TweaksPanel.tsx` |
| `server_predict_requested` | Server-side event fired every time `/api/predict` is called, capturing success/failure outcome. | `app/api/predict/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behaviour, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/462943/dashboard/1690368)
- [Match engagement (30 days)](https://us.posthog.com/project/462943/insights/rqSmy1ef) — Daily unique users viewing matches vs. clicking from the list
- [Match detail conversion funnel](https://us.posthog.com/project/462943/insights/8IXS63y3) — match_viewed → prediction_viewed → match_news_article_clicked
- [Feature exploration trend](https://us.posthog.com/project/462943/insights/APsvyUHM) — Daily usage of bracket, team hubs, and player profiles
- [AI prediction requests (server)](https://us.posthog.com/project/462943/insights/MszaKmiz) — Server-side prediction demand, broken down by success/failure
- [App personalisation activity](https://us.posthog.com/project/462943/insights/KozgxXK1) — Team selections and appearance tweaks as signals of deep engagement

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
