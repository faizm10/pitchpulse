import { isFotmobEnabled } from "@/lib/fotmob/client";
import { fetchPlayerDetail } from "@/lib/fotmob/parse-player";

export const revalidate = 3600;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isFotmobEnabled()) {
    return Response.json({ error: "FotMob disabled" }, { status: 503 });
  }

  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isFinite(playerId)) {
    return Response.json({ error: "Invalid player id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const team = searchParams.get("team");
  if (!team) {
    return Response.json({ error: "team query param required" }, { status: 400 });
  }

  try {
    const detail = await fetchPlayerDetail(team, playerId);
    if (!detail) {
      return Response.json({ error: "Player not found" }, { status: 404 });
    }
    return Response.json({ detail });
  } catch (err) {
    console.error("[/api/fotmob/player]", err);
    return Response.json(
      {
        error: "Failed to fetch player",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
