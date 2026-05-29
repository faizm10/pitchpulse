import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch(
    'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings',
    { next: { revalidate: 60 } }
  );
  if (!res.ok) return NextResponse.json({ groups: [] }, { status: 502 });

  const data = await res.json();
  const children: any[] = data.children ?? [];

  const groups = children.map((child: any) => {
    const entries: any[] = child.standings?.entries ?? [];
    const rows = entries.map((entry: any) => {
      const stat = (name: string) =>
        entry.stats?.find((s: any) => s.name === name)?.value ?? 0;
      return {
        team: {
          id: entry.team?.id,
          name: entry.team?.displayName,
          abbreviation: entry.team?.abbreviation,
          logo: entry.team?.logos?.[0]?.href ?? null,
        },
        played: Math.round(stat('gamesPlayed')),
        wins: Math.round(stat('wins')),
        draws: Math.round(stat('ties')),
        losses: Math.round(stat('losses')),
        gd: Math.round(stat('pointDifferential')),
        pts: Math.round(stat('points')),
        rank: Math.round(stat('rank')),
      };
    }).sort((a: any, b: any) => a.rank - b.rank);

    return {
      name: child.name as string,
      abbreviation: child.abbreviation as string,
      rows,
    };
  });

  return NextResponse.json({ groups });
}
