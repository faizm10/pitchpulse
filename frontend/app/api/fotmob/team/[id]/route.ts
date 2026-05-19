import { isFotmobEnabled } from "@/lib/fotmob/client";
import { fetchTeamProfile } from "@/lib/fotmob/parse-team";
import { getCodeForFotmobId } from "@/lib/fotmob/team-map";

export const revalidate = 3600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isFotmobEnabled()) {
    return Response.json({ error: "FotMob disabled" }, { status: 503 });
  }

  const { id } = await params;
  const teamId = Number(id);
  if (!Number.isFinite(teamId)) {
    return Response.json({ error: "Invalid team id" }, { status: 400 });
  }

  try {
    const profile = await fetchTeamProfile(teamId);
    const code = getCodeForFotmobId(teamId);
    return Response.json({ profile, code });
  } catch (err) {
    console.error("[/api/fotmob/team]", err);
    return Response.json(
      {
        error: "Failed to fetch team",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
