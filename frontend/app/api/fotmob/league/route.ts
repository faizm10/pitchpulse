import { fetchLeagueRaw, FOTMOB_WC_LEAGUE_ID, isFotmobEnabled } from "@/lib/fotmob/client";
import { parseLeagueOverview } from "@/lib/fotmob/parse-league";
import { buildTeamMapFromGroups } from "@/lib/fotmob/team-map";

export const revalidate = 300;

export async function GET(req: Request) {
  if (!isFotmobEnabled()) {
    return Response.json({ error: "FotMob disabled" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const leagueId = Number(searchParams.get("id") ?? FOTMOB_WC_LEAGUE_ID);

  try {
    const raw = await fetchLeagueRaw(leagueId);
    const overview = parseLeagueOverview(raw, leagueId);
    const teamMap = buildTeamMapFromGroups(overview.groups);

    return Response.json(
      { overview, teamMap },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (err) {
    console.error("[/api/fotmob/league]", err);
    return Response.json(
      {
        error: "Failed to fetch FotMob league",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
