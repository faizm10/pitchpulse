import { isFotmobEnabled } from "@/lib/fotmob/client";
import { getFixtureById } from "@/lib/fotmob/match-resolve";

export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isFotmobEnabled()) {
    return Response.json({ error: "FotMob disabled" }, { status: 503 });
  }

  const { id } = await params;

  try {
    const extras = await getFixtureById(id);
    if (!extras) {
      return Response.json({ error: "Match not found" }, { status: 404 });
    }
    return Response.json({ extras });
  } catch (err) {
    console.error("[/api/fotmob/match]", err);
    return Response.json(
      {
        error: "Failed to fetch match",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
