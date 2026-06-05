import { parseNews } from "@/lib/espn";
import type { ESPNNewsResponse } from "@/types/espn";

export const dynamic = 'force-dynamic';

// Must include league slug — generic /soccer/news doesn't work
const SOCCER_NEWS_ENDPOINTS = [
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news?limit=25",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/news?limit=15",
  "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?limit=15",
];

export async function GET() {
  try {
    const results = await Promise.allSettled(
      SOCCER_NEWS_ENDPOINTS.map(url => fetch(url, { cache: 'no-store' }))
    );

    const allArticles: ReturnType<typeof parseNews> = [];

    for (const result of results) {
      if (result.status === 'rejected') continue;
      const res = result.value;
      if (!res.ok) continue;

      const data: ESPNNewsResponse = await res.json();
      const parsed = parseNews(data) ?? [];
      allArticles.push(...parsed);
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const articles = allArticles.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    console.log(`Total articles after dedup: ${articles.length}`);

    return Response.json(
      { articles },
      { headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
    );
  } catch (err) {
    console.error("Backend error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}