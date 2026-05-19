import type { FotmobFixture, FotmobMatchExtras } from "@/types/fotmob";
import { getLeagueOverviewCached } from "./parse-team";
import { fetchMatchDetailsRaw, FotmobError } from "./client";

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  return false;
}

export function findFixture(
  fixtures: FotmobFixture[],
  homeName: string,
  awayName: string,
  dateIso?: string
): FotmobFixture | undefined {
  const day = dateIso?.slice(0, 10);
  return fixtures.find((f) => {
    const homeOk =
      namesMatch(f.home.name, homeName) ||
      (f.home.shortName && namesMatch(f.home.shortName, homeName));
    const awayOk =
      namesMatch(f.away.name, awayName) ||
      (f.away.shortName && namesMatch(f.away.shortName, awayName));
    if (!homeOk || !awayOk) return false;
    if (day && f.utcTime && !f.utcTime.startsWith(day)) return false;
    return true;
  });
}

export async function resolveFotmobMatch(
  homeName: string,
  awayName: string,
  dateIso?: string
): Promise<FotmobMatchExtras | null> {
  const overview = await getLeagueOverviewCached();
  const fixture = findFixture(overview.fixtures, homeName, awayName, dateIso);
  if (!fixture) return null;

  const base: FotmobMatchExtras = {
    matchId: fixture.matchId,
    home: fixture.home,
    away: fixture.away,
    status: fixture.status,
    score: fixture.score,
    group: fixture.group,
    utcTime: fixture.utcTime,
  };

  try {
    const raw = await fetchMatchDetailsRaw(fixture.matchId);
    const content = raw.content as Record<string, unknown> | undefined;
    if (!content) return base;

    const stats = content.stats as {
      Periods?: { All?: { title: string; stats: { title: string; home: string; away: string }[] }[] };
    } | undefined;
    const allStats = stats?.Periods?.All ?? [];
    for (const block of allStats) {
      const xgRow = block.stats?.find(
        (s) => s.title === "Expected goals" || s.title === "xG"
      );
      if (xgRow) {
        base.xg = {
          home: parseFloat(xgRow.home) || 0,
          away: parseFloat(xgRow.away) || 0,
        };
        break;
      }
    }
    return base;
  } catch (e) {
    if (e instanceof FotmobError && e.code === "TURNSTILE_REQUIRED") {
      return {
        ...base,
        unavailableReason:
          "Live lineups and xG are not available from the data provider in this environment.",
      };
    }
    return base;
  }
}

export function getFixtureById(matchId: string): Promise<FotmobMatchExtras | null> {
  return getLeagueOverviewCached().then((overview) => {
    const fixture = overview.fixtures.find((f) => f.matchId === matchId);
    if (!fixture) return null;
    return {
      matchId: fixture.matchId,
      home: fixture.home,
      away: fixture.away,
      status: fixture.status,
      score: fixture.score,
      group: fixture.group,
      utcTime: fixture.utcTime,
    };
  });
}
