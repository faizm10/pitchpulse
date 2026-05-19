import { NextRequest } from "next/server";

const LEAGUE_SLUGS = ["eng.1", "esp.1", "ger.1", "fra.1", "ita.1", "usa.1", "fifa.world"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  let raw: Record<string, unknown> | null = null;
  let foundLeague = "";

  for (const slug of LEAGUE_SLUGS) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/summary?event=${gameId}`,
        { next: { revalidate: 0 } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.header?.competitions?.[0]) {
          raw = data;
          foundLeague = slug;
          break;
        }
      }
    } catch {
      // try next slug
    }
  }

  if (!raw) {
    return Response.json(
      { error: "Match not found in any supported league" },
      { status: 404 }
    );
  }

  try {
    const parsed = parseMatchData(raw, gameId, foundLeague);
    return Response.json({ match: parsed, league: foundLeague });
  } catch (err) {
    return Response.json(
      { error: "Parse failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMatchData(data: any, gameId: string, league: string) {
  const competition = data.header?.competitions?.[0];
  const home = competition?.competitors?.find((c: any) => c.homeAway === "home") ?? competition?.competitors?.[0];
  const away = competition?.competitors?.find((c: any) => c.homeAway === "away") ?? competition?.competitors?.[1];

  const status = competition?.status ?? {};
  const state: "pre" | "in" | "post" = status?.type?.state ?? "pre";

  function teamScore(c: any): string {
    if (c?.score?.displayValue) return c.score.displayValue;
    if (c?.score?.value != null) return String(c.score.value);
    if (typeof c?.score === "string") return c.score;
    return state === "pre" ? "-" : "0";
  }

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
    };
  }

  // ── Match events ──────────────────────────────────────────────────────────
  const plays: any[] = data.plays ?? [];
  const keyEvents = plays
    .filter((p: any) => p.scoringPlay || ["28", "27", "52", "51", "1"].includes(String(p.type?.id ?? "")))
    .map((p: any) => ({
      id: String(p.id ?? Math.random()),
      clock: p.clock?.displayValue ?? "",
      period: p.period?.number ?? 1,
      type: p.type?.text ?? p.type?.id ?? "event",
      typeId: String(p.type?.id ?? ""),
      text: p.text ?? p.shortText ?? "",
      scoringPlay: p.scoringPlay ?? false,
      homeScore: p.homeScore ?? null,
      awayScore: p.awayScore ?? null,
      participants: (p.participants ?? []).map((pt: any) => ({
        athlete: pt.athlete?.displayName ?? pt.athlete?.shortName ?? "",
        type: pt.type ?? "",
      })),
    }));

  // ── Boxscore stats ────────────────────────────────────────────────────────
  const boxTeams: any[] = data.boxscore?.teams ?? [];
  const teamStats = boxTeams.map((bt: any) => ({
    teamId: String(bt.team?.id ?? ""),
    teamName: bt.team?.displayName ?? bt.team?.name ?? "",
    stats: (bt.statistics ?? []).map((s: any) => ({
      name: s.name ?? s.label ?? "",
      label: s.label ?? s.name ?? "",
      displayValue: s.displayValue ?? String(s.value ?? ""),
    })),
  }));

  // ── Venue / broadcast ─────────────────────────────────────────────────────
  const venue = {
    name: data.gameInfo?.venue?.fullName ?? competition?.venue?.fullName ?? "",
    city: data.gameInfo?.venue?.address?.city ?? competition?.venue?.address?.city ?? "",
    country: data.gameInfo?.venue?.address?.country ?? competition?.venue?.address?.country ?? "",
  };
  const broadcast = (data.broadcasts?.[0]?.names ?? []).join(", ");

  // ── News ──────────────────────────────────────────────────────────────────
  const newsRaw: any[] = data.news?.articles ?? [];
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

  // ── Standings ─────────────────────────────────────────────────────────────
  const standingGroups: any[] = data.standings?.groups ?? [];
  const standingEntries: any[] = standingGroups[0]?.standings?.entries ?? [];

  const stat = (entry: any, name: string): number =>
    entry.stats?.find((s: any) => s.name === name)?.value ?? 0;

  const standings = standingEntries.map((e: any) => {
    const teamObj = e.team ?? {};
    const logoHref: string =
      e.logo?.[0]?.href ??
      e.logo?.[0] ??
      teamObj.logos?.[0]?.href ??
      `https://a.espncdn.com/i/teamlogos/soccer/500/${e.id}.png`;

    // "overall" stat is a formatted string like "10-5-22" (W-D-L) or similar
    const overallRaw: string = e.stats?.find((s: any) => s.name === "overall")?.displayValue ?? "";

    return {
      teamId: String(e.id ?? ""),
      name: typeof teamObj === "string" ? teamObj : teamObj.displayName ?? teamObj.name ?? String(e.team ?? ""),
      abbreviation: teamObj.abbreviation ?? "",
      logo: logoHref,
      rank: stat(e, "rank"),
      played: stat(e, "gamesPlayed"),
      wins: stat(e, "wins"),
      draws: stat(e, "ties"),
      losses: stat(e, "losses"),
      points: stat(e, "points"),
      gd: stat(e, "pointDifferential"),
      overall: overallRaw,
    };
  }).sort((a: any, b: any) => a.rank - b.rank || b.points - a.points);

  // ── Team leaders ──────────────────────────────────────────────────────────
  // During a live match ESPN returns match leaders (shots, passes, saves in
  // this game). Pre/post it returns season leaders (goals, assists, etc.).
  const leadersRaw: any[] = data.leaders ?? [];
  const isMatchLeaders = state === "in";

  const teamLeaders = leadersRaw.map((block: any) => {
    const categories = (block.leaders ?? [])
      .map((cat: any) => {
        const top = cat.leaders?.[0] ?? {};
        // Skip entries with no numeric value
        const rawValue = top.displayValue;
        if (rawValue == null || rawValue === "" || rawValue === "null") return null;
        // fullName can be null (e.g. Rodri) — fall through all name fields
        const athleteName: string =
          top.athlete?.fullName ??
          top.athlete?.displayName ??
          top.athlete?.shortName ??
          top.athlete?.lastName ??
          "";
        if (!athleteName) return null; // skip completely anonymous entries
        return {
          category: cat.displayName ?? cat.name ?? "",
          value: String(rawValue),
          athlete: {
            name: athleteName,
            id: String(top.athlete?.id ?? ""),
          },
        };
      })
      .filter(Boolean)
      .slice(0, 4);

    return {
      teamId: String(block.team?.id ?? ""),
      teamName: block.team?.displayName ?? "",
      teamLogo: block.team?.logos?.[0]?.href ?? block.team?.logo ?? "",
      categories,
    };
  });

  return {
    id: gameId,
    league,
    date: competition?.date ?? "",
    state,
    statusDetail: status?.type?.detail ?? status?.type?.description ?? "",
    statusShort: status?.type?.shortDetail ?? "",
    displayClock: status?.displayClock ?? "",
    period: status?.period ?? 1,
    homeTeam: buildTeam(home),
    awayTeam: buildTeam(away),
    venue,
    broadcast,
    keyEvents,
    teamStats,
    news,
    standings,
    teamLeaders,
    isMatchLeaders,
  };
}
