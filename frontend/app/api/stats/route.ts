export const revalidate = 300;

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

async function fetchStat(view: string) {
  try {
    const res = await fetch(`${BASE}/statistics?view=${view}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error(`[API] Error fetching view ${view}:`, err);
    return null;
  }
}

export async function GET() {
  try {
    const [scoring, discipline] = await Promise.all([
      fetchStat("scoring"),
      fetchStat("discipline"),
    ]);

    return Response.json(
      { scoring, discipline },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
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