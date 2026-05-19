import { isFotmobEnabled } from "@/lib/fotmob/client";
import { fetchTeamProfile } from "@/lib/fotmob/parse-team";
import { getTeamMapEntry } from "@/lib/fotmob/team-map";

export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isFotmobEnabled()) {
    return Response.json({ error: "FotMob disabled" }, { status: 503 });
  }

  const { code } = await params;
  const entry = getTeamMapEntry(code);
  if (!entry) {
    return Response.json({ error: "Unknown team code" }, { status: 404 });
  }

  try {
    const profile = await fetchTeamProfile(entry.fotmobId);
    return Response.json({ profile, code: entry.code, mapEntry: entry });
  } catch (err) {
    console.error("[/api/fotmob/team-by-code]", err);
    return Response.json(
      {
        error: "Failed to fetch team",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
