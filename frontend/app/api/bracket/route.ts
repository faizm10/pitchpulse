import { parseScoreboard } from "@/lib/espn";
import type { ESPNScoreboardResponse } from "@/types/espn";

export const revalidate = 60;

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

const KNOCKOUT_DATES = "20260628-20260719";

const SLUG_TO_ROUND: Record<string, string> = {
  "round-of-32":  "R32",
  "round-of-16":  "R16",
  "quarterfinals": "QF",
  "semifinals":    "SF",
  "final":         "F",
};

export async function GET() {
  try {
    const url = new URL(ESPN_SCOREBOARD);
    url.searchParams.set("dates", KNOCKOUT_DATES);
    url.searchParams.set("limit", "100");

    const res = await fetch(url.toString(), { next: { revalidate } });
    if (!res.ok) return Response.json({ error: "Failed" }, { status: 502 });

    const data: ESPNScoreboardResponse = await res.json();
    const matches = parseScoreboard(data);

    // Group matches by round
    const bracket: Record<string, any[]> = {
      R32: [], R16: [], QF: [], SF: [], F: [],
    };

    for (const event of data.events ?? []) {
      const slug = event.season?.slug ?? "";
      const round = SLUG_TO_ROUND[slug];
      if (!round) continue;

      const match = matches.find((m) => m.id === event.id);
      if (!match) continue;

      bracket[round].push({
        id: match.id,
        a: match.homeTeam.abbreviation || null,
        b: match.awayTeam.abbreviation || null,
        aName: match.homeTeam.name,
        bName: match.awayTeam.name,
        score: match.state !== "pre"
          ? [Number(match.homeTeam.score), Number(match.awayTeam.score)]
          : null,
        status: match.state === "in" ? "live"
          : match.state === "post" ? "ft"
          : "upcoming",
        displayClock: match.displayClock,
        date: match.date,
        venue: match.venue,
      });
    }

    return Response.json({ bracket });
  } catch (err) {
    console.error("[/api/bracket]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}