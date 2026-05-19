import { NextRequest } from "next/server";

// ── Config ────────────────────────────────────────────────────────────────────

const FOTMOB_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.fotmob.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

const EPL_LEAGUE_ID = 47;

// FotMob matchId → ESPN event ID for the same fixture.
// The FotMob matchDetails endpoint is protected by Cloudflare Turnstile
// (requires a browser-generated token), so we use ESPN for events/stats/news.
const FOTMOB_TO_ESPN: Record<string, string> = {
  "4813739": "740960", // Chelsea vs Tottenham Hotspur, GW37 2025-26
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  if (lt.long && lt.long !== "") return lt.long;
  return lt.short?.replace(/‎/g, "").replace(/'/g, "'") ?? "";
}

// ── ESPN events/stats/news parser ─────────────────────────────────────────────

const NOTABLE_TYPES = new Set([
  "goal", "own-goal", "penalty-scored", "penalty-missed",
  "yellow-card", "red-card", "yellow-red-card",
  "substitution", "shot-on-target",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEspnExtras(data: any) {
  // ── Key events from commentary[].play ────────────────────────────────────
  const seenPlayIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyEvents: any[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of (data.commentary ?? []) as any[]) {
    const p = item.play;
    if (!p?.id) continue;
    const typeSlug: string = p.type?.type ?? "";
    if (!p.scoringPlay && !NOTABLE_TYPES.has(typeSlug)) continue;
    if (seenPlayIds.has(String(p.id))) continue;
    seenPlayIds.add(String(p.id));

    keyEvents.push({
      id: String(p.id),
      clock: p.clock?.displayValue ?? "",
      period: p.period?.number ?? 1,
      typeSlug,
      typeText: p.type?.text ?? typeSlug,
      text: p.shortText ?? p.text ?? "",
      fullText: item.text ?? p.text ?? "",
      scoringPlay: p.scoringPlay ?? false,
      teamName: p.team?.displayName ?? "",
      homeScore: p.homeScore ?? null,
      awayScore: p.awayScore ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      participants: (p.participants ?? []).map((pt: any) => ({
        athlete: pt.athlete?.displayName ?? pt.athlete?.shortName ?? "",
        team: p.team?.displayName ?? "",
      })),
    });
  }

  // ── Box stats ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boxTeams: any[] = data.boxscore?.teams ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teamStats = boxTeams.map((bt: any) => ({
    teamId: String(bt.team?.id ?? ""),
    teamName: bt.team?.displayName ?? bt.team?.name ?? "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stats: (bt.statistics ?? []).map((s: any) => ({
      name: s.name ?? s.label ?? "",
      label: s.label ?? s.name ?? "",
      displayValue: s.displayValue ?? String(s.value ?? ""),
    })),
  }));

  // ── News ──────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newsRaw: any[] = data.news?.articles ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const news = newsRaw.slice(0, 8).map((a: any) => {
    const link: string =
      a.links?.web?.href && a.links.web.href !== "#"
        ? a.links.web.href
        : a.links?.mobile?.href && a.links.mobile.href !== "#"
        ? a.links.mobile.href
        : `https://www.espn.com/soccer/story/_/id/${a.id ?? a.dataSourceIdentifier}`;
    return {
      id: String(a.id ?? a.dataSourceIdentifier ?? Math.random()),
      headline: a.headline ?? "",
      description: a.description ?? "",
      published: a.published ?? a.lastModified ?? "",
      image: a.images?.[0]?.url ?? null,
      link,
      source: a.byline ?? "ESPN",
    };
  });

  // ── Leaders ───────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadersRaw: any[] = data.leaders ?? [];
  const isMatchLeaders = true; // always match leaders for in-game ESPN data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teamLeaders = leadersRaw.map((block: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categories = (block.leaders ?? []).map((cat: any) => {
      const top = cat.leaders?.[0] ?? {};
      const rawValue = top.displayValue;
      if (rawValue == null || rawValue === "" || rawValue === "null") return null;
      const athleteName: string =
        top.athlete?.fullName ?? top.athlete?.displayName ?? top.athlete?.shortName ?? top.athlete?.lastName ?? "";
      if (!athleteName) return null;
      return {
        category: cat.displayName ?? cat.name ?? "",
        value: String(rawValue),
        athlete: { name: athleteName, id: String(top.athlete?.id ?? "") },
      };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).filter(Boolean).slice(0, 4) as any[];

    return {
      teamId: String(block.team?.id ?? ""),
      teamName: block.team?.displayName ?? "",
      teamLogo: block.team?.logos?.[0]?.href ?? block.team?.logo ?? "",
      categories,
    };
  });

  return { keyEvents, teamStats, news, teamLeaders, isMatchLeaders };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  // Fetch FotMob league data and optionally ESPN in parallel
  const espnEventId = FOTMOB_TO_ESPN[matchId];

  const [fotmobRes, espnRes] = await Promise.allSettled([
    fetch(
      `https://www.fotmob.com/api/data/leagues?id=${EPL_LEAGUE_ID}`,
      { headers: FOTMOB_HEADERS, next: { revalidate: 0 } }
    ),
    espnEventId
      ? fetch(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=${espnEventId}`,
          { next: { revalidate: 0 } }
        )
      : Promise.reject(new Error("No ESPN ID mapped")),
  ]);

  // FotMob is required — bail if it failed
  if (fotmobRes.status === "rejected" || !fotmobRes.value.ok) {
    return Response.json({ error: "FotMob league fetch failed" }, { status: 502 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fotmob: any = await fotmobRes.value.json();

  // ── Parse FotMob ─────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allMatches: any[] = fotmob?.fixtures?.allMatches ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fixture = allMatches.find((m: any) => String(m.id) === String(matchId));

  if (!fixture) {
    return Response.json({ error: "Match not found in FotMob Premier League fixtures" }, { status: 404 });
  }

  const status = fixture.status ?? {};
  const state = parseState(status);
  const liveClock = parseLiveClock(status);

  const scoreStr: string = status.scoreStr ?? "";
  const scoreParts = scoreStr.split("-").map((s: string) => s.trim());
  const homeScoreStr = scoreParts[0] ?? (state === "pre" ? "-" : "0");
  const awayScoreStr = scoreParts[1] ?? (state === "pre" ? "-" : "0");

  const homeTeam = {
    id: String(fixture.home?.id ?? ""),
    name: fixture.home?.name ?? "Home",
    shortName: fixture.home?.shortName ?? fixture.home?.name ?? "Home",
    logo: teamLogo(fixture.home?.id),
    score: homeScoreStr,
    // ESPN team IDs filled in below if available
    espnId: "",
    color: "#034694", // Chelsea default blue
    abbreviation: "CHE",
  };

  const awayTeam = {
    id: String(fixture.away?.id ?? ""),
    name: fixture.away?.name ?? "Away",
    shortName: fixture.away?.shortName ?? fixture.away?.name ?? "Away",
    logo: teamLogo(fixture.away?.id),
    score: awayScoreStr,
    espnId: "",
    color: "#132257", // Spurs default navy
    abbreviation: "TOT",
  };

  // ── Parse ESPN extras ────────────────────────────────────────────────────
  let espnExtras: ReturnType<typeof parseEspnExtras> | null = null;
  let espnEventIdUsed: string | null = null;

  if (espnRes.status === "fulfilled" && espnRes.value.ok) {
    try {
      const espnData = await espnRes.value.json();
      espnExtras = parseEspnExtras(espnData);
      espnEventIdUsed = espnEventId ?? null;

      // Enrich team colours/abbreviations from ESPN
      const comp = espnData?.header?.competitions?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const espnHome = comp?.competitors?.find((c: any) => c.homeAway === "home");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const espnAway = comp?.competitors?.find((c: any) => c.homeAway === "away");
      if (espnHome?.team) {
        homeTeam.espnId = String(espnHome.team.id ?? "");
        homeTeam.color = espnHome.team.color ? `#${espnHome.team.color}` : homeTeam.color;
        homeTeam.abbreviation = espnHome.team.abbreviation ?? homeTeam.abbreviation;
      }
      if (espnAway?.team) {
        awayTeam.espnId = String(espnAway.team.id ?? "");
        awayTeam.color = espnAway.team.color ? `#${espnAway.team.color}` : awayTeam.color;
        awayTeam.abbreviation = espnAway.team.abbreviation ?? awayTeam.abbreviation;
      }
    } catch {
      // ESPN parse failure is non-fatal
    }
  }

  // ── Standings ────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableData: any[] = fotmob?.table ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableRows: any[] = tableData[0]?.data?.table?.all ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // ── Projected standings ──────────────────────────────────────────────────
  const homeScoreInt = parseInt(homeScoreStr, 10);
  const awayScoreInt = parseInt(awayScoreStr, 10);
  const canProject = state !== "pre" && !isNaN(homeScoreInt) && !isNaN(awayScoreInt) && standings.length > 0;

  const projectedStandings = canProject
    ? standings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort((a: any, b: any) => b.projectedPoints - a.projectedPoints || b.projectedGd - a.projectedGd)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((row: any, i: number) => ({ ...row, projectedRank: i + 1, rankChange: row.rank - (i + 1) }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : standings.map((row: any) => ({
        ...row, projectedPoints: row.points, projectedGd: row.gd,
        projectedRank: row.rank, rankChange: 0,
      }));

  // ── Halftime detection ───────────────────────────────────────────────────
  // FotMob represents halftime in several ways depending on the match.
  // Check every known indicator so the clock freezes correctly.
  const halfs = status.halfs ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawStatus: any = status;
  const isHalftime =
    state === "in" &&
    (halfs.halfTimeStarted === true ||
      String(rawStatus.statusCategory ?? "").toLowerCase() === "ht" ||
      String(rawStatus.type ?? "").toLowerCase() === "ht" ||
      String(rawStatus.longName ?? "").toLowerCase().includes("half time") ||
      String(rawStatus.shortName ?? "").toUpperCase() === "HT" ||
      // Between halves: first started but second not yet
      (halfs.firstHalfStarted === true && halfs.secondHalfStarted === false &&
        // Only treat as halftime when the raw liveTime suggests a reset (< 2 min)
        // because during normal first-half play firstHalfStarted is also true
        (() => {
          const lt = status.liveTime;
          if (!lt) return false;
          const raw = lt.long ?? lt.short ?? "";
          // "HT" literal
          if (String(raw).toUpperCase().includes("HT")) return true;
          // Clock near zero in "M:SS" or "MM:SS" format while events exist past 40'
          const parts = String(raw).replace(/[^\d:]/g, "").split(":");
          if (parts.length === 2) {
            const mins = parseInt(parts[0], 10);
            return mins === 0;
          }
          return false;
        })()));

  // ── Status label ─────────────────────────────────────────────────────────
  let statusDetail = "";
  if (state === "post") statusDetail = "Full Time";
  else if (isHalftime) statusDetail = "Half Time";
  else if (state === "in") {
    if (halfs.secondHalfStarted) statusDetail = "2nd Half";
    else if (halfs.firstHalfStarted) statusDetail = "1st Half";
    else statusDetail = "In Progress";
  } else if (status.utcTime) {
    statusDetail = new Date(status.utcTime).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });
  }

  return Response.json({
    match: {
      id: matchId,
      espnEventId: espnEventIdUsed,
      league: "Premier League",
      leagueId: EPL_LEAGUE_ID,
      source: espnExtras ? "fotmob+espn" : "fotmob",
      round: fixture.round ?? "",
      date: status.utcTime ?? "",
      state,
      isHalftime,
      statusDetail,
      liveClock: isHalftime ? "" : liveClock,
      homeTeam,
      awayTeam,
      // ESPN-sourced extras (null if ESPN unavailable)
      keyEvents: espnExtras?.keyEvents ?? [],
      teamStats: espnExtras?.teamStats ?? [],
      news: espnExtras?.news ?? [],
      teamLeaders: espnExtras?.teamLeaders ?? [],
      isMatchLeaders: espnExtras?.isMatchLeaders ?? false,
      // FotMob-sourced standings
      standings,
      projectedStandings,
    },
  });
}
