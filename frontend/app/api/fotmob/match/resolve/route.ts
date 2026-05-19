import { isFotmobEnabled } from "@/lib/fotmob/client";
import { resolveFotmobMatch } from "@/lib/fotmob/match-resolve";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isFotmobEnabled()) {
    return Response.json({ error: "FotMob disabled" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const home = searchParams.get("home");
  const away = searchParams.get("away");
  const date = searchParams.get("date") ?? undefined;

  if (!home || !away) {
    return Response.json(
      { error: "home and away query params required" },
      { status: 400 }
    );
  }

  try {
    const extras = await resolveFotmobMatch(home, away, date);
    if (!extras) {
      return Response.json({ extras: null, matched: false });
    }
    return Response.json({ extras, matched: true });
  } catch (err) {
    console.error("[/api/fotmob/match/resolve]", err);
    return Response.json(
      {
        error: "Failed to resolve match",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
