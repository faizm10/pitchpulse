import { ESPN_NAME_TO_CODE } from "@/lib/team-codes";

export const revalidate = 600;

const SITE_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";
const CORE_LEADERS = "https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/types/1/leaders";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function countryToCode(flagAlt: string): string {
  return ESPN_NAME_TO_CODE[flagAlt] ?? flagAlt.slice(0, 3).toUpperCase();
}

interface RawLeader {
  value: number;
  displayValue: string;
  athlete?: { $ref?: string };
}

interface EnrichedLeader {
  value: number;
  player: string;
  teamCode: string;
}

async function resolveLeaders(leaders: RawLeader[], limit = 5): Promise<EnrichedLeader[]> {
  const top = leaders.slice(0, limit);
  const athletes = await Promise.all(
    top.map((l) => {
      const ref = l.athlete?.$ref;
      return ref ? fetchJson(ref) : Promise.resolve(null);
    })
  );
  return top.map((l, i) => {
    const a = athletes[i];
    return {
      value: l.value,
      player: a?.displayName ?? a?.shortName ?? "Unknown",
      teamCode: a ? countryToCode(a.flag?.alt ?? a.citizenship ?? "") : "UNK",
    };
  });
}

export async function GET() {
  try {
    const [scoring, coreData] = await Promise.all([
      fetchJson(`${SITE_BASE}/statistics?view=scoring`),
      fetchJson(CORE_LEADERS),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categories: any[] = coreData?.categories ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCat = (name: string): RawLeader[] =>
      categories.find((c: any) => c.name === name)?.leaders ?? [];

    const [yellowCards, redCards, saves, shotsOnTarget] = await Promise.all([
      resolveLeaders(getCat("yellowCards")),
      resolveLeaders(getCat("redCards")),
      resolveLeaders(getCat("saves")),
      resolveLeaders(getCat("shotsOnTarget")),
    ]);

    return Response.json(
      { scoring, discipline: { yellowCards, redCards, saves, shotsOnTarget } },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        },
      }
    );
  } catch (err) {
    console.error("[/api/stats]", err);
    return Response.json(
      { error: "Failed to fetch stats", detail: String(err) },
      { status: 502 }
    );
  }
}
