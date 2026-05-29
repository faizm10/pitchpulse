import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get("date") ?? formatDate(new Date());
  const days = Math.min(parseInt(searchParams.get("days") ?? "1", 10), 7);

  const dates = buildDateRange(date, days);
  const dateParam = dates.length === 1 ? dates[0] : `${dates[0]}-${dates[dates.length - 1]}`;

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${dateParam}&limit=100`;

  let espnData: Record<string, unknown>;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return Response.json({ error: `ESPN scoreboard returned ${res.status}` }, { status: 502 });
    espnData = await res.json();
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 502 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events: any[] = (espnData as any).events ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches = events.map((evt: any) => {
    const comp = evt.competitions?.[0] ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const home = comp.competitors?.find((c: any) => c.homeAway === "home") ?? comp.competitors?.[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const away = comp.competitors?.find((c: any) => c.homeAway === "away") ?? comp.competitors?.[1];

    const statusObj = comp.status ?? {};
    const state: "pre" | "in" | "post" = statusObj?.type?.state ?? "pre";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function teamInfo(c: any) {
      const t = c?.team ?? {};
      return {
        id: String(t.id ?? ""),
        name: t.displayName ?? t.name ?? "TBD",
        abbreviation: t.abbreviation ?? "TBD",
        logo: t.logos?.[0]?.href ?? t.logo ?? `https://a.espncdn.com/i/teamlogos/soccer/500/${t.id}.png`,
        score: state !== "pre" ? (c?.score != null ? String(c.score) : "0") : null,
        winner: c?.winner ?? false,
        color: t.color ? `#${t.color}` : "#888888",
      };
    }

    const venue = comp.venue ?? {};
    const group = evt.season?.type === 2 ? (evt.seasonType?.name ?? "") : "";

    return {
      id: String(evt.id ?? ""),
      date: comp.date ?? evt.date ?? "",
      state,
      statusDetail: statusObj?.type?.detail ?? statusObj?.type?.description ?? "",
      displayClock: statusObj?.displayClock ?? "",
      period: statusObj?.period ?? 1,
      homeTeam: teamInfo(home),
      awayTeam: teamInfo(away),
      venue: {
        name: venue.fullName ?? "",
        city: venue.address?.city ?? "",
        country: venue.address?.country ?? "",
      },
      group,
      note: evt.notes?.[0]?.headline ?? "",
      broadcast: (comp.broadcasts?.[0]?.names ?? []).join(", "),
    };
  });

  return Response.json({ matches, fetchedAt: new Date().toISOString() });
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function buildDateRange(start: string, days: number): string[] {
  const result: string[] = [];
  const base = parseDate(start);
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    result.push(formatDate(d));
  }
  return result;
}

function parseDate(s: string): Date {
  if (s.length === 8) return new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`);
  return new Date(s);
}
