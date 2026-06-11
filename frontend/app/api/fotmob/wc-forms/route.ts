import { isFotmobEnabled } from "@/lib/fotmob/client";
import { getLeagueOverviewCached } from "@/lib/fotmob/parse-team";
import { fetchResolvedTeamForm } from "@/lib/fotmob/parse-form";
import { listMappedTeams } from "@/lib/fotmob/team-map";
import type { FormResult } from "@/lib/types";

export const revalidate = 300;

export async function GET() {
  if (!isFotmobEnabled()) {
    return Response.json({ error: "FotMob disabled" }, { status: 503 });
  }

  try {
    const overview = await getLeagueOverviewCached();
    const fixtures = overview.fixtures;

    const entries = listMappedTeams();
    const resolved = await Promise.all(
      entries.map(async (entry) => {
        try {
          const form = await fetchResolvedTeamForm(entry.fotmobId, fixtures);
          return { code: entry.code, form };
        } catch (err) {
          console.warn(`[wc-forms] ${entry.code} (${entry.fotmobId}):`, err);
          return { code: entry.code, form: [] as FormResult[] };
        }
      })
    );

    const forms: Record<string, FormResult[]> = {};
    for (const { code, form } of resolved) {
      if (form.length > 0) forms[code] = form;
    }

    return Response.json({ forms });
  } catch (err) {
    console.error("[/api/fotmob/wc-forms]", err);
    return Response.json({ error: "Failed to fetch forms" }, { status: 502 });
  }
}
