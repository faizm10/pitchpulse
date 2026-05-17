import type {
  ESPNScoreboardResponse,
  ESPNNewsResponse,
  ESPNSummaryResponse,
  Match,
  MatchDetail,
  MatchTeam,
  NewsArticle,
  GroupStandingEntry,
  H2HGame,
  StandingsGroupBlock,
} from "@/types/espn";

const CITY_TO_VENUE_ID: Record<string, string> = {
  "East Rutherford": "metlife",
  Inglewood: "sofi",
  Arlington: "att",
  "Santa Clara": "levis",
  "Miami Gardens": "hardrock",
  Atlanta: "mercedesbenz",
  Seattle: "lumen",
  Houston: "nrg",
  "Kansas City": "arrowhead",
  Philadelphia: "lincoln",
  Foxborough: "gillette",
  Toronto: "bmo",
  Vancouver: "bcplace",
  "Mexico City": "azteca",
  Guadalajara: "akron",
  Monterrey: "bbva",
};

export function matchVenueId(city: string): string | undefined {
  if (CITY_TO_VENUE_ID[city]) return CITY_TO_VENUE_ID[city];
  const found = Object.entries(CITY_TO_VENUE_ID).find(([key]) =>
    city.includes(key)
  );
  return found?.[1];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTeam(competitor: any): MatchTeam {
  const team = competitor?.team ?? {};
  const logo: string = team.logo ?? team.logos?.[0]?.href ?? "";
  return {
    id: String(team.id ?? competitor?.id ?? ""),
    name: team.displayName ?? team.name ?? "TBD",
    abbreviation: team.abbreviation ?? "TBD",
    logo,
    score: String(competitor?.score ?? "0"),
    color: team.color ? `#${team.color}` : "#ffffff",
    winner: competitor?.winner ?? false,
  };
}

export function parseScoreboard(data: ESPNScoreboardResponse): Match[] {
  if (!Array.isArray(data?.events)) return [];

  const results: Match[] = [];

  for (const event of data.events) {
    try {
      const competition = event?.competitions?.[0];
      if (!competition) continue;

      const competitors: unknown[] = competition.competitors ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const home = (competitors as any[]).find((c) => c.homeAway === "home")
        ?? competitors[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const away = (competitors as any[]).find((c) => c.homeAway === "away")
        ?? competitors[1];

      const broadcasts: unknown[] =
        competition.broadcasts ?? (event as unknown as { broadcasts?: unknown[] }).broadcasts ?? [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const broadcast = (broadcasts as any[])[0]?.names?.join(", ");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = event.status ?? (competition as any).status;

      results.push({
        id: event.id,
        date: event.date,
        name: event.name,
        state: status?.type?.state ?? "pre",
        statusDescription: status?.type?.description ?? "Scheduled",
        statusDetail: status?.type?.detail ?? status?.type?.shortDetail ?? "",
        displayClock: status?.displayClock ?? "",
        homeTeam: buildTeam(home),
        awayTeam: buildTeam(away),
        venue: {
          name: competition.venue?.fullName ?? "",
          city: competition.venue?.address?.city ?? "",
          country: competition.venue?.address?.country ?? "",
        },
        broadcast,
        venueId: matchVenueId(competition.venue?.address?.city ?? ""),
      });
    } catch (err) {
      console.error("[parseScoreboard] skipping event", event?.id, err);
    }
  }

  return results;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function standingEntryFromEspnEntry(entry: any): GroupStandingEntry {
  console.log('raw entry:', JSON.stringify(entry).slice(0, 200)); // add this

  const stat = (name: string) =>
    entry.stats?.find((s: { name: string }) => s.name === name)?.value ?? 0;

  const teamObj = typeof entry.team === "object" ? entry.team : null;
  const logoHref: string = teamObj?.logos?.[0]?.href ?? entry.logo?.[0]?.href ?? "";
  
  // Use team.abbreviation directly — never derive from name
  const abbreviation: string =
    teamObj?.abbreviation ?? entry.abbreviation ?? "";
    
  const name: string = teamObj?.displayName ?? teamObj?.name ?? String(entry.team ?? "");

  const goalsFor = stat("pointsFor");
  const goalsAgainst = stat("pointsAgainst");
  const pointDifferential = stat("pointDifferential");

  return {
    teamId: String(teamObj?.id ?? entry.id ?? ""),
    abbreviation,
    name,
    logo: logoHref,
    played: stat("gamesPlayed"),
    wins: stat("wins"),
    draws: stat("ties"),
    losses: stat("losses"),
    goalsFor,
    goalsAgainst,
    points: stat("points"),
    goalDifference:
      goalsFor === 0 && goalsAgainst === 0 ? pointDifferential : undefined,
  };
}

export function parseStandingsGroupsFromSummary(
  data: ESPNSummaryResponse
): StandingsGroupBlock[] {
  const raw = data.standings?.groups ?? [];
  const out: StandingsGroupBlock[] = [];

  for (const group of raw) {
    const header =
      typeof group.header === "string"
        ? group.header
        : "Standings";
    const entries = (group.standings?.entries ?? []).map(
      standingEntryFromEspnEntry
    );
    if (entries.length > 0) {
      out.push({ header, entries });
    }
  }

  return out;
}

export function groupStandingsLabelFromSummary(
  data: ESPNSummaryResponse
): string | null {
  const g = data.header?.competitions?.[0]?.groups;
  if (!g) return null;
  const raw = g.abbreviation ?? g.name ?? g.shortName;
  return raw ? raw.trim().toUpperCase() : null;
}

function competitorScore(c: { score?: { displayValue?: string; value?: number } | null }): string {
  if (c.score?.displayValue != null && c.score.displayValue !== "") {
    return c.score.displayValue;
  }
  if (c.score?.value != null) {
    return String(c.score.value);
  }
  return "–";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseHeadToHeadGames(raw: any[] | undefined): H2HGame[] {
  if (!raw?.length) return [];

  // Legacy: each item is a match with competitors[]
  if (raw[0]?.competitors?.length) {
    const games: H2HGame[] = [];
    for (const g of raw) {
      try {
        const h2hHome = g.competitors.find((c: { homeAway: string }) => c.homeAway === "home");
        const h2hAway = g.competitors.find((c: { homeAway: string }) => c.homeAway === "away");
        if (!h2hHome || !h2hAway) continue;
        games.push({
          id: g.id,
          date: g.date,
          season: g.season?.year ?? 0,
          competition: g.competitions?.[0]?.notes?.[0]?.text ?? "",
          homeTeam: {
            abbreviation: h2hHome.team.abbreviation,
            score: h2hHome.score?.displayValue ?? "–",
          },
          awayTeam: {
            abbreviation: h2hAway.team.abbreviation,
            score: h2hAway.score?.displayValue ?? "–",
          },
          completed: g.competitions?.[0]?.status?.type?.completed ?? true,
        });
      } catch {
        /* skip malformed row */
      }
    }
    return games;
  }

  // Current ESPN format: team blocks with nested events[]
  const games: H2HGame[] = [];
  for (const block of raw) {
    const teamId = String(block.team?.id ?? "");
    const teamAbbr = block.team?.abbreviation ?? "TBD";
    for (const evt of block.events ?? []) {
      try {
        const yearMatch = String(evt.competitionName ?? "").match(/\d{4}/);
        const homeIsBlockTeam = String(evt.homeTeamId) === teamId;
        const homeAbbr = homeIsBlockTeam ? teamAbbr : evt.opponent?.abbreviation ?? "TBD";
        const awayAbbr = homeIsBlockTeam ? evt.opponent?.abbreviation ?? "TBD" : teamAbbr;
        games.push({
          id: String(evt.id),
          date: evt.gameDate ?? evt.date ?? "",
          season: yearMatch ? Number(yearMatch[0]) : 0,
          competition: evt.competitionName ?? evt.leagueName ?? "",
          homeTeam: {
            abbreviation: homeAbbr,
            score: String(evt.homeTeamScore ?? "–"),
          },
          awayTeam: {
            abbreviation: awayAbbr,
            score: String(evt.awayTeamScore ?? "–"),
          },
          completed: true,
        });
      } catch {
        /* skip */
      }
    }
  }
  return games;
}

export function parseSummary(data: ESPNSummaryResponse): MatchDetail {
  const competition = data.header.competitions[0];
  const home = competition.competitors.find((c) => c.homeAway === "home");
  const away = competition.competitors.find((c) => c.homeAway === "away");
  if (!home || !away) {
    throw new Error("Missing home or away competitor in summary");
  }

  function summaryTeam(c: typeof home): MatchTeam {
    return {
      id: c.team.id,
      name: c.team.displayName,
      abbreviation: c.team.abbreviation,
      logo: c.team.logos?.[0]?.href ?? "",
      score: competitorScore(c),
      color: c.team.color ? `#${c.team.color}` : "#ffffff",
      winner: c.winner ?? false,
    };
  }

  const gameInfo = (data as ESPNSummaryResponse & { gameInfo?: { venue?: { fullName?: string; address?: { city?: string; country?: string } } } }).gameInfo
    ?? data.boxscore.gameInfo;
  const venue = {
    name: gameInfo?.venue?.fullName ?? "",
    city: gameInfo?.venue?.address?.city ?? "",
    country: gameInfo?.venue?.address?.country ?? "",
  };

  const broadcast = data.broadcasts?.[0]?.names?.join(", ");

  const pick = data.pickcenter?.[0];
  const odds = pick
    ? {
        provider: pick.provider?.name ?? "DraftKings",
        details: pick.details ?? "",
        overUnder: pick.overUnder ?? 0,
        homeMoneyline: pick.homeTeamOdds?.moneyLine,
        awayMoneyline: pick.awayTeamOdds?.moneyLine,
        drawMoneyline: pick.drawOdds?.moneyLine,
      }
    : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headToHead = parseHeadToHeadGames(data.headToHeadGames as any[] | undefined);

  const groupStandings: GroupStandingEntry[] =
    data.standings?.groups?.[0]?.standings?.entries?.map(
      standingEntryFromEspnEntry
    ) ?? [];

  const news: NewsArticle[] = (data.news?.articles ?? []).map((a) => ({
    id: a.dataSourceIdentifier,
    headline: a.headline,
    description: a.description ?? "",
    published: a.published,
    url: a.links?.web?.href ?? "#",
    image: a.images?.[0]?.url,
    byline: a.byline,
  }));

  const groups = competition.groups as
    | { shortName?: string; name?: string; abbreviation?: string }
    | undefined;

  return {
    id: competition.id,
    group: groups?.shortName ?? groups?.abbreviation ?? groups?.name,
    date: competition.date,
    state: competition.status?.type?.state ?? "pre",
    statusDetail: competition.status?.type?.detail ?? competition.status?.type?.description ?? "",
    displayClock: competition.status?.displayClock ?? "",
    venue,
    homeTeam: summaryTeam(home),
    awayTeam: summaryTeam(away),
    broadcast,
    odds,
    headToHead,
    news,
    groupStandings,
  };
}

export function parseNews(data: ESPNNewsResponse): NewsArticle[] {
  console.log(data.articles[0]);
  return data.articles.map((article) => ({
    id: article.dataSourceIdentifier,
    headline: article.headline,
    description: article.description ?? "",
    published: article.published,
    url: article.links?.web?.href ?? "#",
    image: article.images?.[0]?.url,
    byline: article.byline,
  }));
}
