import type { FotmobFixture, FotmobSquadMember, FotmobTeamProfile } from "@/types/fotmob";
import { parseLeagueOverview } from "./parse-league";
import { fetchLeagueRaw, FOTMOB_WC_LEAGUE_ID } from "./client";
import { parseSquadMemberExtended } from "./parse-squad";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSquad(raw: any): FotmobSquadMember[] {
  const squadRoot = raw?.squad;
  const sections = squadRoot?.squad ?? squadRoot;
  if (!Array.isArray(sections)) return [];

  const out: FotmobSquadMember[] = [];
  for (const section of sections) {
    const title = String(section?.title ?? "");
    if (title === "coach") continue;
    const members = section?.members ?? [];
    for (const m of members) {
      out.push(parseSquadMemberExtended(m));
    }
  }
  return out;
}

function fixturesForTeam(
  fixtures: FotmobFixture[],
  teamId: number
): FotmobFixture[] {
  return fixtures.filter(
    (f) => f.home.id === teamId || f.away.id === teamId
  );
}

export function parseTeamProfile(
  raw: Record<string, unknown>,
  teamId: number,
  leagueFixtures: FotmobFixture[] = []
): FotmobTeamProfile {
  const details = raw.details as {
    name?: string;
    country?: string;
    fifaRanking?: { rank?: number; points?: number; updated?: string };
    primaryLeagueName?: string;
  } | undefined;
  return {
    teamId,
    name: String(details?.name ?? ""),
    countryCode: details?.country ? String(details.country) : undefined,
    fifaRank: details?.fifaRanking?.rank != null ? Number(details.fifaRanking.rank) : undefined,
    fifaPoints:
      details?.fifaRanking?.points != null ? Number(details.fifaRanking.points) : undefined,
    groupLabel: details?.primaryLeagueName
      ? String(details.primaryLeagueName)
      : undefined,
    squad: parseSquad(raw),
    fixtures: fixturesForTeam(leagueFixtures, teamId),
  };
}

let leagueCache: { at: number; overview: ReturnType<typeof parseLeagueOverview> } | null =
  null;
const LEAGUE_CACHE_MS = 5 * 60 * 1000;

export async function getLeagueOverviewCached() {
  const now = Date.now();
  if (leagueCache && now - leagueCache.at < LEAGUE_CACHE_MS) {
    return leagueCache.overview;
  }
  const raw = await fetchLeagueRaw(FOTMOB_WC_LEAGUE_ID);
  const overview = parseLeagueOverview(raw, FOTMOB_WC_LEAGUE_ID);
  leagueCache = { at: now, overview };
  return overview;
}

export async function fetchTeamProfile(teamId: number): Promise<FotmobTeamProfile> {
  const { fetchTeamRaw } = await import("./client");
  const [raw, overview] = await Promise.all([
    fetchTeamRaw(teamId),
    getLeagueOverviewCached(),
  ]);
  return parseTeamProfile(raw, teamId, overview.fixtures);
}
