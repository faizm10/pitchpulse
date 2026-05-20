import { NextRequest } from "next/server";

// ── Config ────────────────────────────────────────────────────────────────────

const FOTMOB_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.fotmob.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

const MLS_FOTMOB_ID = 9441; // FotMob competition ID for US Open Cup

// ── Helpers ───────────────────────────────────────────────────────────────────

function fuzzyTeamMatch(fotmobName: string, espnName: string): boolean {
  if (!fotmobName || !espnName) return false;
  const norm = (s: string) =>
    s.toLowerCase()
      .replace(/\bfc\b|\bsc\b|\baf\b|\bcf\b|\bac\b/gi, "")
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const a = norm(fotmobName), b = norm(espnName);
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const wa = a.split(" ").filter(w => w.length >= 4);
  const wb = b.split(" ").filter(w => w.length >= 4);
  return wa.some(x => wb.includes(x));
}

const NOTABLE_TYPES = new Set([
  "goal", "own-goal", "penalty-scored", "penalty-missed",
  "yellow-card", "red-card", "yellow-red-card", "substitution", "shot-on-target",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEspnExtras(data: any) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leadersRaw: any[] = data.leaders ?? [];
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

  return { keyEvents, teamStats, news, teamLeaders };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fotmobTeamLogo(id: string | number): string {
  return `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`;
}

// ── Open Cup bracket helpers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseScoreboardRound(data: any, currentGameId: string, label: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = data?.events ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return events.map((evt: any) => {
    const comp = evt.competitions?.[0] ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const home = comp.competitors?.find((c: any) => c.homeAway === "home") ?? comp.competitors?.[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const away = comp.competitors?.find((c: any) => c.homeAway === "away") ?? comp.competitors?.[1];
    const statusObj = comp.status ?? {};
    const state: "pre" | "in" | "post" = statusObj?.type?.state ?? "pre";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function bt(c: any) {
      const t = c?.team ?? {};
      const id = String(t.id ?? "");
      return {
        id,
        name: t.displayName ?? t.name ?? "TBD",
        abbreviation: t.abbreviation ?? "TBD",
        logo: `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png`,
        score: state !== "pre" ? (c?.score != null ? String(c.score) : "0") : null,
        winner: c?.winner ?? false,
      };
    }

    return {
      id: String(evt.id ?? ""),
      roundLabel: label,
      homeTeam: bt(home),
      awayTeam: bt(away),
      state,
      statusDetail: statusObj?.type?.detail ?? statusObj?.type?.description ?? "",
      date: comp.date ?? evt.date ?? "",
      isCurrentGame: String(evt.id) === currentGameId,
    };
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  const [espnRes, fotmobRes, qfRes, r16Res] = await Promise.allSettled([
    fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.open/summary?event=${gameId}`,
      { next: { revalidate: 0 } }
    ),
    fetch(
      `https://www.fotmob.com/api/data/leagues?id=${MLS_FOTMOB_ID}`,
      { headers: FOTMOB_HEADERS, next: { revalidate: 0 } }
    ),
    fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.open/scoreboard?dates=20260519-20260520`,
      { next: { revalidate: 60 } }
    ),
    fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/usa.open/scoreboard?dates=20260428-20260430`,
      { next: { revalidate: 3600 } }
    ),
  ]);

  // ESPN is required
  if (espnRes.status === "rejected" || !espnRes.value.ok) {
    return Response.json({ error: "ESPN fetch failed" }, { status: 502 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const espnData: any = await espnRes.value.json();
  const competition = espnData?.header?.competitions?.[0];

  if (!competition) {
    return Response.json({ error: "No competition data in ESPN response" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const home = competition.competitors?.find((c: any) => c.homeAway === "home") ?? competition.competitors?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const away = competition.competitors?.find((c: any) => c.homeAway === "away") ?? competition.competitors?.[1];

  const statusObj = competition.status ?? {};
  const state: "pre" | "in" | "post" = statusObj?.type?.state ?? "pre";
  const statusTypeName: string = statusObj?.type?.name ?? "";
  const statusDetail: string = statusObj?.type?.detail ?? statusObj?.type?.description ?? "";
  const displayClock: string = statusObj?.displayClock ?? "";

  const period: number = statusObj?.period ?? 1;

  // ── Match phase detection from ESPN statusTypeName + period ───────────────
  const isHalftime =
    statusTypeName === "STATUS_HALFTIME" ||
    statusDetail.toLowerCase().includes("halftime");

  const isExtraTimeHalftime =
    statusTypeName === "STATUS_HALFTIME_ET" ||
    statusDetail.toLowerCase().includes("et halftime") ||
    statusDetail.toLowerCase().includes("extra time halftime");

  // Extra time: ESPN uses FIRST/SECOND_HALF_EXTRA_TIME; period 3 = ET1, 4 = ET2
  const isExtraTime =
    state === "in" &&
    !isExtraTimeHalftime &&
    (statusTypeName === "STATUS_FIRST_HALF_EXTRA_TIME" ||
      statusTypeName === "STATUS_SECOND_HALF_EXTRA_TIME" ||
      (period >= 3 && period < 5));

  // Penalty shootout: period 5 or ESPN shootout status
  const isPenaltyShootout =
    statusTypeName === "STATUS_PENALTY_SHOOTOUT" ||
    statusTypeName === "STATUS_SHOOTOUT" ||
    period === 5 ||
    statusDetail.toLowerCase().includes("penalty shootout");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function teamScore(c: any): string {
    if (c?.score?.displayValue) return c.score.displayValue;
    if (c?.score?.value != null) return String(c.score.value);
    if (typeof c?.score === "string") return c.score;
    return state === "pre" ? "-" : "0";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildTeam(c: any) {
    const t = c?.team ?? {};
    return {
      id: String(t.id ?? ""),
      name: t.displayName ?? t.name ?? "TBD",
      abbreviation: t.abbreviation ?? "TBD",
      logo: t.logos?.[0]?.href ?? t.logo ?? "",
      score: teamScore(c),
      color: t.color ? `#${t.color}` : "#888888",
      winner: c?.winner ?? false,
      espnId: String(t.id ?? ""),
    };
  }

  const homeTeam = buildTeam(home);
  const awayTeam = buildTeam(away);

  // Venue & broadcast
  const venue = {
    name: espnData.gameInfo?.venue?.fullName ?? competition.venue?.fullName ?? "",
    city: espnData.gameInfo?.venue?.address?.city ?? competition.venue?.address?.city ?? "",
    state: espnData.gameInfo?.venue?.address?.state ?? "",
  };
  const broadcast = (espnData.broadcasts?.[0]?.names ?? []).join(", ");

  // ESPN extras
  const extras = parseEspnExtras(espnData);

  // ── Standings from ESPN ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const standingGroups: any[] = espnData.standings?.groups ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statVal = (entry: any, name: string): number =>
    entry.stats?.find((s: any) => s.name === name)?.value ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function parseGroup(group: any) {
    const label: string = group.name ?? group.header ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: any[] = group.standings?.entries ?? [];
    return {
      label,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rows: entries.map((e: any) => {
        const teamObj = e.team ?? {};
        const logoHref: string =
          e.logo?.[0]?.href ?? e.logo?.[0] ??
          teamObj.logos?.[0]?.href ??
          `https://a.espncdn.com/i/teamlogos/soccer/500/${e.id}.png`;
        return {
          teamId: String(e.id ?? ""),
          name: typeof teamObj === "string" ? teamObj : teamObj.displayName ?? teamObj.name ?? "",
          abbreviation: teamObj.abbreviation ?? "",
          logo: logoHref,
          rank: statVal(e, "rank"),
          played: statVal(e, "gamesPlayed"),
          wins: statVal(e, "wins"),
          draws: statVal(e, "ties"),
          losses: statVal(e, "losses"),
          points: statVal(e, "points"),
          gd: statVal(e, "pointDifferential"),
          qualColor: null as string | null,
        };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).sort((a: any, b: any) => a.rank - b.rank || b.points - a.points),
    };
  }

  const standingsGroups = standingGroups.slice(0, 2).map(parseGroup);

  // Projected standings per group
  const homeId = homeTeam.id;
  const awayId = awayTeam.id;
  const homeScore = parseInt(homeTeam.score, 10);
  const awayScore = parseInt(awayTeam.score, 10);
  const canProject = state !== "pre" && !isNaN(homeScore) && !isNaN(awayScore);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function projectGroup(rows: any[]) {
    if (!canProject) return rows.map((r: any) => ({ ...r, projectedPoints: r.points, projectedGd: r.gd, projectedRank: r.rank, rankChange: 0 }));
    return rows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => {
        let ptsDelta = 0, gdDelta = 0;
        if (row.teamId === homeId) {
          if (homeScore > awayScore) { ptsDelta = 3; gdDelta = homeScore - awayScore; }
          else if (homeScore === awayScore) { ptsDelta = 1; }
          else { gdDelta = homeScore - awayScore; }
        } else if (row.teamId === awayId) {
          if (awayScore > homeScore) { ptsDelta = 3; gdDelta = awayScore - homeScore; }
          else if (awayScore === homeScore) { ptsDelta = 1; }
          else { gdDelta = awayScore - homeScore; }
        }
        return { ...row, projectedPoints: row.points + ptsDelta, projectedGd: row.gd + gdDelta };
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => b.projectedPoints - a.projectedPoints || b.projectedGd - a.projectedGd)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any, i: number) => ({ ...row, projectedRank: i + 1, rankChange: row.rank - (i + 1) }));
  }

  const standingsGroupsProjected = standingsGroups.map(g => ({ ...g, rows: projectGroup(g.rows) }));

  // ── FotMob enhancement (live clock + qualColors) ──────────────────────────
  // Clear clock during any break or shootout — only show clock during active play
  const clockSuppressed = isHalftime || isExtraTimeHalftime || isPenaltyShootout;

  // ESPN resets its period clock to 0:00 at the start of each ET half.
  // Offset it so we always show the true accumulated match minute:
  //   ET1 (period 3): 90–105'   ET2 (period 4): 105–120'
  function applyEtOffset(rawClock: string): string {
    if (!rawClock || !isExtraTime) return rawClock;
    // Parse the raw value — handles both "MM:SS" and "MM'" formats
    let secs = 0;
    if (rawClock.includes(":")) {
      const [m, s] = rawClock.split(":");
      secs = parseInt(m, 10) * 60 + parseInt(s, 10);
    } else {
      secs = parseInt(rawClock, 10) * 60;
    }
    const etBase = period === 3 ? 90 : 105; // minutes
    // Only offset if the value is below the ET floor (ESPN reset the clock)
    if (secs < etBase * 60) {
      secs += etBase * 60;
    }
    return `${Math.floor(secs / 60)}'`;
  }

  let liveClock = clockSuppressed ? "" : applyEtOffset(displayClock);
  let fotmobMatchId: string | null = null;
  let source = "espn";

  if (fotmobRes.status === "fulfilled" && fotmobRes.value.ok) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fotmob: any = await fotmobRes.value.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allMatches: any[] = fotmob?.fixtures?.allMatches ?? [];

      // Find matching fixture
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fixture = allMatches.find((m: any) =>
        fuzzyTeamMatch(m.home?.name ?? "", homeTeam.name) &&
        fuzzyTeamMatch(m.away?.name ?? "", awayTeam.name)
      );

      if (fixture) {
        fotmobMatchId = String(fixture.id);
        source = "espn+fotmob";
        const fStatus = fixture.status ?? {};

        // FotMob live clock (more granular than ESPN's minute display)
        if (fStatus.started && !fStatus.finished && !clockSuppressed) {
          const lt = fStatus.liveTime;
          const raw = lt?.long ?? lt?.short ?? "";
          const cleaned = String(raw).replace(/‎/g, "").replace(/'/g, "'");
          if (cleaned && cleaned.toUpperCase() !== "HT" && cleaned.toUpperCase() !== "ET") {
            liveClock = applyEtOffset(cleaned);
          }
        }

        // Clear clock for any FotMob-detected break (HT, ET HT, pens)
        const fShort = String(fStatus.liveTime?.short ?? "").toUpperCase();
        const fHalfs = fStatus.halfs ?? {};
        const fotmobSuppressed =
          fHalfs.halfTimeStarted === true ||
          String(fStatus.statusCategory ?? "").toLowerCase() === "ht" ||
          fShort.includes("HT") ||
          fShort === "PEN" ||
          fShort === "PENS";
        if (fotmobSuppressed) liveClock = "";

        // Enrich qualColor from FotMob standings
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableRows: any[] = fotmob?.table?.[0]?.data?.table?.all ?? [];
        const qualMap = new Map<string, string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const row of tableRows) {
          if (row.qualColor) {
            // Match by team name
            const teamName: string = row.name ?? row.shortName ?? "";
            qualMap.set(teamName.toLowerCase(), row.qualColor);
          }
        }

        // Apply qualColors to standings groups
        for (const group of standingsGroups) {
          for (const row of group.rows) {
            const key = row.name.toLowerCase();
            if (qualMap.has(key)) row.qualColor = qualMap.get(key) ?? null;
          }
        }

        // Apply to FotMob team logos if ESPN logos are CDN placeholders
        if (fixture.home?.id && !homeTeam.logo.includes("espncdn")) {
          homeTeam.logo = fotmobTeamLogo(fixture.home.id);
        }
        if (fixture.away?.id && !awayTeam.logo.includes("espncdn")) {
          awayTeam.logo = fotmobTeamLogo(fixture.away.id);
        }
      }
    } catch {
      // FotMob failure is non-fatal
    }
  }

  // ── Open Cup bracket ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let qfMatches: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let r16Matches: any[] = [];

  if (qfRes.status === "fulfilled" && qfRes.value.ok) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qfData: any = await qfRes.value.json();
      qfMatches = parseScoreboardRound(qfData, gameId, "Quarterfinals");
    } catch { /* non-fatal */ }
  }

  if (r16Res.status === "fulfilled" && r16Res.value.ok) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r16Data: any = await r16Res.value.json();
      r16Matches = parseScoreboardRound(r16Data, gameId, "Round of 16");
    } catch { /* non-fatal */ }
  }

  const openCupBracket = {
    rounds: [
      { label: "Quarterfinals", date: "May 19–20, 2026", matches: qfMatches },
      { label: "Round of 16", date: "Apr 28–29, 2026", matches: r16Matches },
    ],
    upcomingRounds: [
      { label: "Semifinals", date: "June 2026" },
      { label: "Final", date: "Oct 1, 2026" },
    ],
  };

  return Response.json({
    match: {
      id: gameId,
      source,
      fotmobMatchId,
      league: "MLS",
      date: competition.date ?? "",
      state,
      isHalftime,
      isExtraTime,
      isExtraTimeHalftime,
      isPenaltyShootout,
      statusDetail: isHalftime
        ? "Half Time"
        : isExtraTimeHalftime
        ? "ET Half Time"
        : statusDetail,
      statusTypeName,
      displayClock,
      liveClock,
      period,
      homeTeam,
      awayTeam,
      venue,
      broadcast,
      keyEvents: extras.keyEvents,
      teamStats: extras.teamStats,
      news: extras.news,
      teamLeaders: extras.teamLeaders,
      isMatchLeaders: state === "in",
      standingsGroups,
      standingsGroupsProjected,
      openCupBracket,
    },
  });
}
