import type {
  FotmobFixture,
  FotmobGroupTable,
  FotmobLeagueOverview,
  FotmobTableRow,
  FotmobTeamRef,
} from "@/types/fotmob";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTeamRef(t: any): FotmobTeamRef {
  return {
    id: Number(t?.id ?? 0),
    name: String(t?.name ?? ""),
    shortName: t?.shortName ? String(t.shortName) : undefined,
  };
}

function parseScoresStr(scoresStr: string): { gf: number; ga: number } {
  const [a, b] = scoresStr.split("-").map((s) => parseInt(s.trim(), 10));
  if (Number.isNaN(a) || Number.isNaN(b)) return { gf: 0, ga: 0 };
  return { gf: a, ga: b };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseTableRow(row: any, rank: number): FotmobTableRow {
  const { gf, ga } = parseScoresStr(String(row?.scoresStr ?? "0-0"));
  return {
    rank,
    teamId: Number(row?.id ?? 0),
    name: String(row?.name ?? ""),
    shortName: String(row?.shortName ?? row?.name ?? ""),
    played: Number(row?.played ?? 0),
    wins: Number(row?.wins ?? 0),
    draws: Number(row?.draws ?? 0),
    losses: Number(row?.losses ?? 0),
    goalsFor: gf,
    goalsAgainst: ga,
    goalDifference: Number(row?.goalConDiff ?? gf - ga),
    points: Number(row?.pts ?? 0),
    qualColor: row?.qualColor ? String(row.qualColor) : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGroupTables(raw: any): FotmobGroupTable[] {
  const tables = raw?.table?.[0]?.data?.tables;
  if (!Array.isArray(tables)) return [];

  return tables.map((groupBlock, index) => {
    const rows = groupBlock?.table?.all ?? [];
    const letter = String.fromCharCode(65 + index);
    return {
      group: letter,
      rows: rows.map((row: unknown, i: number) =>
        parseTableRow(row, i + 1)
      ),
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFixtureStatus(status: any): "pre" | "live" | "ft" {
  if (status?.finished) return "ft";
  if (status?.started) return "live";
  return "pre";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFixtures(raw: any): FotmobFixture[] {
  const list =
    raw?.fixtures?.allMatches ??
    raw?.fixtures?.matches ??
    raw?.overview?.matches ??
    [];
  if (!Array.isArray(list)) return [];

  return list.map((fx) => {
    const home = parseTeamRef(fx?.home);
    const away = parseTeamRef(fx?.away);
    const state = parseFixtureStatus(fx?.status);
    const homeScore = fx?.home?.score != null ? Number(fx.home.score) : undefined;
    const awayScore = fx?.away?.score != null ? Number(fx.away.score) : undefined;

    return {
      matchId: String(fx?.id ?? ""),
      round: fx?.round != null ? String(fx.round) : undefined,
      roundName: fx?.roundName,
      group: fx?.group ? String(fx.group) : undefined,
      utcTime: fx?.status?.utcTime ? String(fx.status.utcTime) : undefined,
      status: state,
      home,
      away,
      score:
        homeScore != null && awayScore != null
          ? { home: homeScore, away: awayScore }
          : undefined,
    };
  });
}

export function parseLeagueOverview(

  raw: Record<string, unknown>,
  leagueId: number
): FotmobLeagueOverview {
  const details = raw.details as { name?: string; selectedSeason?: string } | undefined;
  return {
    leagueId,
    name: String(details?.name ?? "World Cup"),
    season: String(details?.selectedSeason ?? "2026"),
    groups: parseGroupTables(raw),
    fixtures: parseFixtures(raw),
  };
}
