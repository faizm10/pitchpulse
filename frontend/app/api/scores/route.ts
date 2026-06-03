import { parseScoreboard } from "@/lib/espn";
import type { ESPNScoreboardResponse } from "@/types/espn";

export const revalidate = 60;

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

// WC2026 runs June 11 – July 19. ESPN caps results at ~100 per call so we
// split the tournament into two windows and merge, deduplicating by event id.
const WINDOWS = [
  "20260611-20260625", // group stage rounds 1-2
  "20260626-20260719", // group stage round 3 + all knockout rounds
] as const;

export async function GET() {
  try {
    const responses = await Promise.all(
      WINDOWS.map(dates =>
        fetch(`${BASE}?dates=${dates}`, { next: { revalidate } })
      )
    );

    const seen = new Set<string>();
    const allEvents: ESPNScoreboardResponse["events"] = [];

    for (const res of responses) {
      if (!res.ok) continue;
      const data: ESPNScoreboardResponse = await res.json();
      for (const event of data.events ?? []) {
        if (!seen.has(event.id)) {
          seen.add(event.id);
          allEvents.push(event);
        }
      }
    }

    if (allEvents.length === 0) {
      return Response.json({ error: "Failed to fetch scores" }, { status: 502 });
    }

    // parseScoreboard expects a full response shape — build a minimal one
    const merged: ESPNScoreboardResponse = {
      events: allEvents,
      leagues: [],
      season: { type: 0, year: 2026 },
      day: { date: new Date().toISOString().slice(0, 10) },
    };

    const matches = parseScoreboard(merged);

    return Response.json(
      { matches },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("[/api/scores]", err);
    return Response.json(
      { error: "Internal error", detail: String(err) },
      { status: 500 }
    );
  }
}
