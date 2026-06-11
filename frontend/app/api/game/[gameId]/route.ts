import { NextRequest } from "next/server";

// ── Config ────────────────────────────────────────────────────────────────────

const FOTMOB_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.fotmob.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

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
  "goal", "own-goal",
  "penalty-scored", "penalty-missed",
  "penalty---scored", "penalty---missed",
  "yellow-card", "red-card", "yellow-red-card", "substitution", "shot-on-target",
]);

function normalizeTypeSlug(slug: string): string {
  if (slug === "penalty---scored") return "penalty-scored";
  if (slug === "penalty---missed") return "penalty-missed";
  return slug;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildKeyEvent(p: any, overrideText?: string): object | null {
  if (!p?.id) return null;
  const rawSlug: string = p.type?.type ?? p.type?.name ?? "";
  const typeSlug = normalizeTypeSlug(rawSlug);
  if (!p.scoringPlay && !NOTABLE_TYPES.has(rawSlug) && !NOTABLE_TYPES.has(typeSlug)) return null;
  return {
    id: String(p.id),
    sequence: p.sequence ?? 0,
    clock: p.clock?.displayValue ?? "",
    period: p.period?.number ?? 1,
    typeSlug,
    typeText: p.type?.text ?? p.type?.name ?? typeSlug,
    text: p.shortText ?? p.text ?? "",
    fullText: overrideText ?? p.text ?? "",
    scoringPlay: p.scoringPlay ?? false,
    teamName: p.team?.displayName ?? "",
    homeScore: p.homeScore ?? null,
    awayScore: p.awayScore ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    participants: (p.participants ?? []).map((pt: any) => ({
      athlete: pt.athlete?.displayName ?? pt.athlete?.shortName ?? pt.athlete?.lastName ?? "",
      team: p.team?.displayName ?? "",
    })),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseEspnExtras(data: any) {
  const seenPlayIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyEvents: any[] = [];

  function ingest(ev: object | null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!ev) return;
    const id = (ev as any).id;
    if (!id || seenPlayIds.has(id)) return;
    seenPlayIds.add(id);
    keyEvents.push(ev);
  }

  // Source 1: commentary[] — each item wraps a play object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of (data.commentary ?? []) as any[]) {
    ingest(buildKeyEvent(item.play, item.text));
  }

  // Source 2: scoringPlays[] — direct play objects for goals/penalties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (data.scoringPlays ?? []) as any[]) {
    ingest(buildKeyEvent(p));
  }

  // Source 3: plays[] — flat list ESPN sometimes returns
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (data.plays ?? []) as any[]) {
    ingest(buildKeyEvent(p));
  }

  // Source 4: header competition plays / timeline
  const compPlays =
    data.header?.competitions?.[0]?.plays ??
    data.header?.competitions?.[0]?.timeline ??
    [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of compPlays as any[]) {
    ingest(buildKeyEvent(p));
  }

  keyEvents.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));

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

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const searchParams = req.nextUrl.searchParams;

  const espnLeague = searchParams.get("league") ?? "fifa.world";
  const fotmobLeagueId = searchParams.get("fotmob")
    ? parseInt(searchParams.get("fotmob")!, 10)
    : null;

  const fetches: Promise<Response | null>[] = [
    fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${espnLeague}/summary?event=${gameId}`,
      { next: { revalidate: 0 } }
    ),
    fotmobLeagueId != null
      ? fetch(
          `https://www.fotmob.com/api/data/leagues?id=${fotmobLeagueId}`,
          { headers: FOTMOB_HEADERS, next: { revalidate: 0 } }
        )
      : Promise.resolve(null),
  ];

  const [espnRes, fotmobRes] = await Promise.allSettled(fetches);

  if (espnRes.status === "rejected" || !espnRes.value?.ok) {
    return Response.json({ error: "ESPN fetch failed" }, { status: 502 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const espnData: any = await espnRes.value!.json();
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

  const isExtraTimeHalftime =
    statusTypeName === "STATUS_HALFTIME_ET" ||
    statusDetail.toLowerCase().includes("et halftime") ||
    statusDetail.toLowerCase().includes("extra time halftime");

  const isHalftime =
    !isExtraTimeHalftime &&
    (statusTypeName === "STATUS_HALFTIME" ||
      statusDetail.toLowerCase().includes("halftime"));

  const isExtraTime =
    state === "in" &&
    !isExtraTimeHalftime &&
    (statusTypeName === "STATUS_FIRST_HALF_EXTRA_TIME" ||
      statusTypeName === "STATUS_SECOND_HALF_EXTRA_TIME" ||
      (period >= 3 && period < 5));

  const isPenaltyShootout =
    statusTypeName === "STATUS_PENALTY_SHOOTOUT" ||
    statusTypeName === "STATUS_SHOOTOUT" ||
    period === 5 ||
    statusDetail.toLowerCase().includes("penalty shootout");

  const hadPenaltyShootout =
    isPenaltyShootout ||
    statusTypeName === "STATUS_FINAL_PEN" ||
    statusDetail.toLowerCase().includes("pens") ||
    statusDetail.toLowerCase().includes("after penalties");

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

  const venue = {
    name: espnData.gameInfo?.venue?.fullName ?? competition.venue?.fullName ?? "",
    city: espnData.gameInfo?.venue?.address?.city ?? competition.venue?.address?.city ?? "",
    state: espnData.gameInfo?.venue?.address?.state ?? "",
    country: espnData.gameInfo?.venue?.address?.country ?? "",
  };
  const broadcast = (espnData.broadcasts?.[0]?.names ?? []).join(", ");

  const extras = parseEspnExtras(espnData);

  // Penalty shootout score from period-5 events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let penScore: { home: number; away: number } | null = null;
  if (hadPenaltyShootout) {
    const shootoutKicks = extras.keyEvents.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ev: any) => ev.period === 5 && (ev.typeSlug === "penalty-scored" || ev.typeSlug === "penalty-missed")
    );
    if (shootoutKicks.length > 0) {
      let homeGoals = 0, awayGoals = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const kick of shootoutKicks) {
        if (kick.typeSlug !== "penalty-scored") continue;
        const t: string = (kick.teamName ?? "").toLowerCase();
        const hn = homeTeam.name.toLowerCase();
        const isHome =
          t.includes(hn) || hn.includes(t) ||
          t.includes(homeTeam.abbreviation.toLowerCase());
        if (isHome) homeGoals++; else awayGoals++;
      }
      penScore = { home: homeGoals, away: awayGoals };
    }
  }

  // ── Standings (group stage) ───────────────────────────────────────────────
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
  const clockSuppressed = isHalftime || isExtraTimeHalftime || isPenaltyShootout;

  function applyEtOffset(rawClock: string): string {
    if (!rawClock || !isExtraTime) return rawClock;
    let secs = 0;
    if (rawClock.includes(":")) {
      const [m, s] = rawClock.split(":");
      secs = parseInt(m, 10) * 60 + parseInt(s, 10);
    } else {
      secs = parseInt(rawClock, 10) * 60;
    }
    if (isNaN(secs)) return rawClock;
    const etBase = period === 3 ? 90 : 105;
    if (secs < etBase * 60) secs += etBase * 60;
    return `${Math.floor(secs / 60)}'`;
  }

  let liveClock = clockSuppressed ? "" : applyEtOffset(displayClock);
  let fotmobMatchId: string | null = null;
  let source = "espn";

  if (
    fotmobLeagueId != null &&
    fotmobRes.status === "fulfilled" &&
    fotmobRes.value != null &&
    (fotmobRes.value as Response).ok
  ) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fotmob: any = await (fotmobRes.value as Response).json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allMatches: any[] = fotmob?.fixtures?.allMatches ?? [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fixture = allMatches.find((m: any) =>
        fuzzyTeamMatch(m.home?.name ?? "", homeTeam.name) &&
        fuzzyTeamMatch(m.away?.name ?? "", awayTeam.name)
      );

      if (fixture) {
        fotmobMatchId = String(fixture.id);
        source = "espn+fotmob";

        const fStatus = fixture.status ?? {};

        if (fStatus.started && !fStatus.finished && !clockSuppressed) {
          const lt = fStatus.liveTime;
          const raw = lt?.long ?? lt?.short ?? "";
          const cleaned = String(raw).replace(/‎/g, "").replace(/'/g, "'");
          if (cleaned && cleaned.toUpperCase() !== "HT" && cleaned.toUpperCase() !== "ET") {
            liveClock = applyEtOffset(cleaned);
          }
        }

        const fShort = String(fStatus.liveTime?.short ?? "").toUpperCase();
        const fHalfs = fStatus.halfs ?? {};
        const fotmobSuppressed =
          fHalfs.halfTimeStarted === true ||
          String(fStatus.statusCategory ?? "").toLowerCase() === "ht" ||
          fShort.includes("HT") ||
          fShort === "PEN" ||
          fShort === "PENS";
        if (fotmobSuppressed) liveClock = "";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableRows: any[] = fotmob?.table?.[0]?.data?.table?.all ?? [];
        const qualMap = new Map<string, string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const row of tableRows) {
          if (row.qualColor) {
            const teamName: string = row.name ?? row.shortName ?? "";
            qualMap.set(teamName.toLowerCase(), row.qualColor);
          }
        }
        for (const group of standingsGroups) {
          for (const row of group.rows) {
            const key = row.name.toLowerCase();
            if (qualMap.has(key)) row.qualColor = qualMap.get(key) ?? null;
          }
        }

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

  // ── Competition metadata ──────────────────────────────────────────────────
  const leagueName: string = espnData.header?.league?.name ?? espnLeague;
  const seasonNote: string = espnData.header?.competitions?.[0]?.notes?.[0]?.headline ?? "";

  // ── Head-to-head ─────────────────────────────────────────────────────────
  const h2hRaw: any[] = espnData.headToHeadGames ?? [];
  // ESPN gives one entry per team, both covering same games. Deduplicate by event id using the first team's list.
  const h2hTeamEntry = h2hRaw[0] ?? null;
  const headToHead = (h2hTeamEntry?.events ?? []).map((e: any) => {
    const isHome = e.homeTeamId === h2hTeamEntry?.team?.id;
    return {
      id: e.id,
      date: e.gameDate,
      score: e.score,
      homeScore: e.homeTeamScore,
      awayScore: e.awayTeamScore,
      result: e.gameResult as 'W' | 'L' | 'D',
      competition: e.competitionName,
      round: e.roundName ?? '',
      homeTeam: isHome
        ? { name: h2hTeamEntry.team.displayName, abbreviation: h2hTeamEntry.team.abbreviation, logo: h2hTeamEntry.team.logo }
        : { name: e.opponent.displayName, abbreviation: e.opponent.abbreviation, logo: e.opponent.logo },
      awayTeam: isHome
        ? { name: e.opponent.displayName, abbreviation: e.opponent.abbreviation, logo: e.opponent.logo }
        : { name: h2hTeamEntry.team.displayName, abbreviation: h2hTeamEntry.team.abbreviation, logo: h2hTeamEntry.team.logo },
    };
  }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return Response.json({
    match: {
      id: gameId,
      source,
      fotmobMatchId,
      league: leagueName,
      seasonNote,
      date: competition.date ?? "",
      state,
      isHalftime,
      isExtraTime,
      isExtraTimeHalftime,
      isPenaltyShootout,
      hadPenaltyShootout,
      penScore,
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
      headToHead,
    },
  });
}
