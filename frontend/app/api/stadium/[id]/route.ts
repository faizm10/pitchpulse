import { NextRequest, NextResponse } from 'next/server';

const WIKIPEDIA_TITLES: Record<string, string> = {
  tor: 'BMO_Field',
  van: 'BC_Place',
  mex: 'Estadio_Azteca',
  gdl: 'Estadio_Akron',
  mty: 'Estadio_BBVA',
  atl: 'Mercedes-Benz_Stadium',
  bos: 'Gillette_Stadium',
  dal: 'AT%26T_Stadium',
  hou: 'NRG_Stadium',
  kan: 'GEHA_Field_at_Arrowhead_Stadium',
  lax: 'SoFi_Stadium',
  mia: 'Hard_Rock_Stadium',
  nyc: 'MetLife_Stadium',
  phi: 'Lincoln_Financial_Field',
  sfo: 'Levi%27s_Stadium',
  sea: 'Lumen_Field',
};

// ESPN venue fullName for each stadium ID
const ESPN_VENUE_NAMES: Record<string, string> = {
  tor: 'BMO Field',
  van: 'BC Place',
  mex: 'Estadio Banorte',
  gdl: 'Estadio Akron',
  mty: 'Estadio BBVA',
  atl: 'Mercedes-Benz Stadium',
  bos: 'Gillette Stadium',
  dal: "AT&T Stadium",
  hou: 'NRG Stadium',
  kan: 'GEHA Field at Arrowhead Stadium',
  lax: 'SoFi Stadium',
  mia: 'Hard Rock Stadium',
  nyc: 'MetLife Stadium',
  phi: 'Lincoln Financial Field',
  sfo: "Levi's Stadium",
  sea: 'Lumen Field',
};

async function fetchWikipedia(title: string) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PitchPulse/1.0 (pitchpulse.app)' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  // Wikipedia serves any width by replacing the size in the thumb URL
  const rawThumb = (data.thumbnail?.source as string) ?? null;
  const thumbnail = rawThumb
    ? rawThumb.replace(/\/\d+px-/, '/1200px-')
    : null;
  return {
    title: data.title as string,
    extract: data.extract as string,
    thumbnail,
    url: data.content_urls?.desktop?.page as string ?? null,
  };
}

async function fetchESPNMatches(venueName: string) {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20261019&limit=200';
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];

  const data = await res.json();
  const events: unknown[] = data.events ?? [];

  return events
    .filter((e: unknown) => {
      const ev = e as Record<string, unknown>;
      const venue = ((ev.competitions as unknown[])?.[0] as Record<string, unknown>)?.venue as Record<string, unknown>;
      return (venue?.fullName as string) === venueName;
    })
    .map((e: unknown) => {
      const ev = e as Record<string, unknown>;
      const comp = (ev.competitions as unknown[])?.[0] as Record<string, unknown>;
      const competitors = (comp?.competitors as unknown[]) ?? [];

      const home = competitors.find((c: unknown) => (c as Record<string, unknown>).homeAway === 'home') as Record<string, unknown> | undefined;
      const away = competitors.find((c: unknown) => (c as Record<string, unknown>).homeAway === 'away') as Record<string, unknown> | undefined;

      const status = comp?.status as Record<string, unknown>;
      const statusType = status?.type as Record<string, unknown>;

      const teamInfo = (t: Record<string, unknown> | undefined) => {
        if (!t) return null;
        const team = t.team as Record<string, unknown>;
        return {
          id: team?.id,
          name: team?.displayName,
          abbreviation: team?.abbreviation,
          logo: (team?.logo as string) ?? null,
          score: t.score as string ?? null,
        };
      };

      const venue = comp?.venue as Record<string, unknown>;

      return {
        id: ev.id as string,
        date: ev.date as string,
        name: ev.name as string,
        state: statusType?.state as string,
        statusDetail: statusType?.shortDetail as string,
        homeTeam: teamInfo(home as Record<string, unknown> | undefined),
        awayTeam: teamInfo(away as Record<string, unknown> | undefined),
        venueName: venue?.fullName as string ?? null,
        venueCity: venue?.city as string ?? null,
      };
    });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wikiTitle = WIKIPEDIA_TITLES[id];
  const venueName = ESPN_VENUE_NAMES[id];

  if (!venueName) {
    return NextResponse.json({ error: 'Unknown stadium' }, { status: 404 });
  }

  const [wikipedia, matches] = await Promise.all([
    wikiTitle ? fetchWikipedia(wikiTitle) : Promise.resolve(null),
    fetchESPNMatches(venueName),
  ]);

  return NextResponse.json({ wikipedia, matches });
}
