import { NextRequest } from "next/server";

const FOTMOB_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.fotmob.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

// FotMob Premier League id
const EPL_LEAGUE_ID = 47;

function teamLogo(teamId: string | number): string {
  return `https://images.fotmob.com/image_resources/logo/teamlogo/${teamId}.png`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseState(status: any): "pre" | "in" | "post" {
  if (!status) return "pre";
  if (status.finished) return "post";
  if (status.started || status.ongoing) return "in";
  return "pre";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLiveClock(status: any): string {
  if (!status?.liveTime) return "";
  const lt = status.liveTime;
  // liveTime.long is "MM:SS", liveTime.short is "M'" with zero-width spaces
  if (lt.long && lt.long !== "") return lt.long;
  return lt.short?.replace(/‎/g, "") ?? "";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  try {
    const res = await fetch(
      `https://www.fotmob.com/api/data/leagues?id=${EPL_LEAGUE_ID}`,
      { headers: FOTMOB_HEADERS, next: { revalidate: 0 } }
    );

    if (!res.ok) {
      return Response.json({ error: `FotMob returned ${res.status}` }, { status: 502 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await res.json();

    // ── Find the specific match ──────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allMatches: any[] = raw?.fixtures?.allMatches ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fixture = allMatches.find((m: any) => String(m.id) === String(matchId));

    if (!fixture) {
      return Response.json({ error: "Match not found in Premier League fixtures" }, { status: 404 });
    }

    const status = fixture.status ?? {};
    const state = parseState(status);
    const liveClock = parseLiveClock(status);

    // Score
    const scoreStr: string = status.scoreStr ?? "";
    const scoreParts = scoreStr.split("-").map((s: string) => s.trim());
    const homeScore = scoreParts[0] ?? (state === "pre" ? "-" : "0");
    const awayScore = scoreParts[1] ?? (state === "pre" ? "-" : "0");

    const homeTeam = {
      id: String(fixture.home?.id ?? ""),
      name: fixture.home?.name ?? "Home",
      shortName: fixture.home?.shortName ?? fixture.home?.name ?? "Home",
      logo: teamLogo(fixture.home?.id),
      score: homeScore,
    };

    const awayTeam = {
      id: String(fixture.away?.id ?? ""),
      name: fixture.away?.name ?? "Away",
      shortName: fixture.away?.shortName ?? fixture.away?.name ?? "Away",
      logo: teamLogo(fixture.away?.id),
      score: awayScore,
    };

    // ── Standings ─────────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableData: any[] = raw?.table ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableRows: any[] = tableData[0]?.data?.table?.all ?? [];

    const standings = tableRows.map((row: any) => ({
      teamId: String(row.id ?? ""),
      name: row.name ?? "",
      shortName: row.shortName ?? row.name ?? "",
      logo: teamLogo(row.id),
      rank: row.idx ?? 0,
      played: row.played ?? 0,
      wins: row.wins ?? 0,
      draws: row.draws ?? 0,
      losses: row.losses ?? 0,
      points: row.pts ?? 0,
      gd: row.goalConDiff ?? 0,
      scoresStr: row.scoresStr ?? "",
      qualColor: row.qualColor ?? null,
    })).sort((a: any, b: any) => a.rank - b.rank);

    // ── Projected standings ───────────────────────────────────────────────────
    const homeScoreInt = parseInt(homeScore, 10);
    const awayScoreInt = parseInt(awayScore, 10);
    const canProject = state !== "pre" && !isNaN(homeScoreInt) && !isNaN(awayScoreInt) && standings.length > 0;

    const projectedStandings = canProject
      ? standings
          .map((row: any) => {
            let ptsDelta = 0, gdDelta = 0;
            if (row.teamId === homeTeam.id) {
              if (homeScoreInt > awayScoreInt) { ptsDelta = 3; gdDelta = homeScoreInt - awayScoreInt; }
              else if (homeScoreInt === awayScoreInt) { ptsDelta = 1; }
              else { gdDelta = homeScoreInt - awayScoreInt; }
            } else if (row.teamId === awayTeam.id) {
              if (awayScoreInt > homeScoreInt) { ptsDelta = 3; gdDelta = awayScoreInt - homeScoreInt; }
              else if (awayScoreInt === homeScoreInt) { ptsDelta = 1; }
              else { gdDelta = awayScoreInt - homeScoreInt; }
            }
            return { ...row, projectedPoints: row.points + ptsDelta, projectedGd: row.gd + gdDelta };
          })
          .sort((a: any, b: any) => b.projectedPoints - a.projectedPoints || b.projectedGd - a.projectedGd)
          .map((row: any, i: number) => ({
            ...row,
            projectedRank: i + 1,
            rankChange: row.rank - (i + 1),
          }))
      : standings.map((row: any) => ({
          ...row,
          projectedPoints: row.points,
          projectedGd: row.gd,
          projectedRank: row.rank,
          rankChange: 0,
        }));

    // ── Period label ──────────────────────────────────────────────────────────
    let statusDetail = "";
    if (state === "post") statusDetail = "Full Time";
    else if (state === "in") {
      const halfs = status.halfs ?? {};
      if (halfs.secondHalfStarted) statusDetail = "2nd Half";
      else if (halfs.firstHalfStarted) statusDetail = "1st Half";
      else statusDetail = "In Progress";
    } else {
      // Pre-match: format kickoff time
      if (status.utcTime) {
        statusDetail = new Date(status.utcTime).toLocaleString("en-US", {
          weekday: "short", month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit", timeZoneName: "short",
        });
      }
    }

    return Response.json({
      match: {
        id: matchId,
        league: "Premier League",
        leagueId: EPL_LEAGUE_ID,
        source: "fotmob",
        round: fixture.round ?? "",
        date: status.utcTime ?? "",
        state,
        statusDetail,
        liveClock,
        homeTeam,
        awayTeam,
        standings,
        projectedStandings,
      },
    });
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch FotMob data", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
