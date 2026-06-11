import { isFotmobEnabled } from "@/lib/fotmob/client";
import { getLeagueOverviewCached } from "@/lib/fotmob/parse-team";
import { computeFormFromFixtures } from "@/lib/fotmob/parse-form";
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

    const forms: Record<string, FormResult[]> = {};
    for (const entry of listMappedTeams()) {
      const form = computeFormFromFixtures(entry.fotmobId, fixtures);
      if (form.length > 0) {
        forms[entry.code] = form;
      }
    }

    return Response.json({ forms });
  } catch (err) {
    console.error("[/api/fotmob/wc-forms]", err);
    return Response.json({ error: "Failed to fetch forms" }, { status: 502 });
  }
}
