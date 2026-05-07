import { parseNews } from "@/lib/espn";
import type { ESPNNewsResponse } from "@/types/espn";

export const revalidate = 1800; // cache for 30 minutes

const ESPN_NEWS =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news";

export async function GET() {
  try {
    const res = await fetch(ESPN_NEWS, {
      next: { revalidate },
    });
    if (!res.ok) {
      return Response.json({ error: "Failed to fetch news" }, { status: 502 });
    }
    const data: ESPNNewsResponse = await res.json();
    const allArticles = parseNews(data);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const articles = allArticles.filter((article) => {
      const ts = Date.parse(article.published);
      if (Number.isNaN(ts)) return false;
      return ts >= sevenDaysAgo;
    });
    return Response.json(
      { articles },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
        },
      }
    );
  } catch {
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
