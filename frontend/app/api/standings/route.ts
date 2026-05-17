import {
  groupStandingsLabelFromSummary,
  parseStandingsGroupsFromSummary,
} from "@/lib/espn";
import type { ESPNSummaryResponse, ESPNScoreboardResponse } from "@/types/espn";
import type { StandingsGroupBlock, GroupStandingEntry } from "@/types/espn";

export const dynamic = "force-dynamic";

export const revalidate = 60;

const ESPN_SCOREBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const GROUP_STAGE_DATES = "20260611-20260628";
const MAX_GROUPS = 12;
const BATCH = 12;

function firstBlockEntries(summary: ESPNSummaryResponse): GroupStandingEntry[] {
  const blocks = parseStandingsGroupsFromSummary(summary);
  return blocks[0]?.entries ?? [];
}

async function collectAllGroupStandings(): Promise<StandingsGroupBlock[]> {
  const scoreboardUrl = new URL(ESPN_SCOREBOARD);
  scoreboardUrl.searchParams.set("dates", GROUP_STAGE_DATES);
  scoreboardUrl.searchParams.set("limit", "500");

  const boardRes = await fetch(scoreboardUrl.toString(), {
    next: { revalidate },
  });
  if (!boardRes.ok) {
    throw new Error("scoreboard");
  }
  const boardData: ESPNScoreboardResponse = await boardRes.json();
  let events =
    boardData.events?.filter((e) => e.season?.slug === "group-stage") ?? [];

  if (events.length === 0) {
    events =
      boardData.events?.filter(
        (e) => e.season?.slug && e.season.slug !== "round-of-32"
      ) ?? [];
  }

  if (events.length === 0) {
    const fallbackId = boardData.events?.[0]?.id;
    if (!fallbackId) return [];
    const sum = await fetchSummary(fallbackId);
    if (!sum) return [];
    return buildBlocksFromSingleSummary(sum);
  }

  const seenGroupIds = new Set<string>();
  const out: StandingsGroupBlock[] = [];

  function consume(summary: ESPNSummaryResponse | null) {
    if (!summary) return;

    const comp = summary.header?.competitions?.[0];
    const gid = comp?.groups?.id;
    const entries = firstBlockEntries(summary);

    if (!entries.length) return;

    if (!gid) {
      if (out.length === 0) {
        out.push({
          header:
            groupStandingsLabelFromSummary(summary) ??
            "FIFA World Cup standings",
          entries,
        });
      }
      return;
    }

    if (seenGroupIds.has(gid)) return;
    seenGroupIds.add(gid);

    const label = numberToGroupLetter(
      groupStandingsLabelFromSummary(summary) ??
      parseStandingsGroupsFromSummary(summary)[0]?.header ??
      "Standings"
    );
    const order = Number.parseInt(gid, 10);
    out.push({
      header: label,
      entries,
      order: Number.isFinite(order) ? order : undefined,
    });
  }

  for (let i = 0; i < events.length && seenGroupIds.size < MAX_GROUPS; i += BATCH) {
    const chunk = events.slice(i, i + BATCH);
    const summaries = await Promise.all(chunk.map((e) => fetchSummary(e.id)));
    summaries.forEach(consume);
  }

  out.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return out;
}

function buildBlocksFromSingleSummary(
  summary: ESPNSummaryResponse
): StandingsGroupBlock[] {
  const comp = summary.header?.competitions?.[0];
  const entries = firstBlockEntries(summary);
  if (!entries.length) return [];

  const label = numberToGroupLetter(
    groupStandingsLabelFromSummary(summary) ??
    parseStandingsGroupsFromSummary(summary)[0]?.header ??
    "Standings"
  );

  const gid = comp?.groups?.id;
  const order = gid ? Number.parseInt(gid, 10) : undefined;

  return [
    {
      header: label,
      entries,
      order: Number.isFinite(order) ? order : undefined,
    },
  ];
}

async function fetchSummary(
  eventId: string
): Promise<ESPNSummaryResponse | null> {
  try {
    const u = new URL(
      "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary"
    );
    u.searchParams.set("event", eventId);

    const res = await fetch(u.toString(), {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ESPNSummaryResponse;
  } catch {
    return null;
  }
}

const ESPN_ID_TO_ABB: Record<string, string> = {
  "203": "MEX", "467": "RSA", "451": "KOR", "450": "CZE",
  "206": "CAN", "452": "BIH", "4398": "QAT", "475": "SUI",
  "205": "BRA", "2869": "MAR", "2654": "HAI", "580": "SCO",
  "660": "USA", "210": "PAR", "628": "AUS", "465": "TUR",
  "481": "GER", "11678": "CUW", "4789": "CIV", "209": "ECU",
  "449": "NED", "627": "JPN", "466": "SWE", "659": "TUN",
  "459": "BEL", "2620": "EGY", "469": "IRN", "2666": "NZL",
  "164": "ESP", "2597": "CPV", "655": "KSA", "212": "URU",
  "478": "FRA", "654": "SEN", "4375": "IRQ", "464": "NOR",
  "202": "ARG", "624": "ALG", "474": "AUT", "2917": "JOR",
  "482": "POR", "2850": "COD", "2570": "UZB", "208": "COL",
  "448": "ENG", "477": "CRO", "4469": "GHA", "2659": "PAN",
};

export async function GET() {
  try {
    const groups = await collectAllGroupStandings();

    return Response.json(
      { groups },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (err) {
    console.error("[/api/standings]", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

function numberToGroupLetter(label: string): string {
  return label.replace(/Group\s+(\d+)/i, (_, n) => {
    const letter = String.fromCharCode(64 + Number(n));
    return `Group ${letter}`;
  });
}
