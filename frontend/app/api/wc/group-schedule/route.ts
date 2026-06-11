import { NextResponse } from 'next/server';
import { VENUES } from '@/data/venues';

// ESPN city (lowercase substring) → our venue ID
const CITY_TO_VENUE: [string, string][] = [
  ['east rutherford', 'metlife'],
  ['new jersey', 'metlife'],
  ['inglewood', 'sofi'],
  ['arlington', 'att'],
  ['santa clara', 'levis'],
  ['miami gardens', 'hardrock'],
  ['atlanta', 'mercedesbenz'],
  ['seattle', 'lumen'],
  ['houston', 'nrg'],
  ['kansas city', 'arrowhead'],
  ['philadelphia', 'lincoln'],
  ['foxborough', 'gillette'],
  ['toronto', 'bmo'],
  ['vancouver', 'bcplace'],
  ['mexico city', 'azteca'],
  ['guadalajara', 'akron'],
  ['monterrey', 'bbva'],
];

// ESPN venue name (lowercase substring) → our venue ID (fallback)
const VENUE_NAME_TO_ID: [string, string][] = [
  ['metlife', 'metlife'],
  ['sofi', 'sofi'],
  ["at&t", 'att'],
  ["levi's", 'levis'],
  ['hard rock', 'hardrock'],
  ['mercedes-benz', 'mercedesbenz'],
  ['lumen field', 'lumen'],
  ['nrg', 'nrg'],
  ['arrowhead', 'arrowhead'],
  ['lincoln financial', 'lincoln'],
  ['gillette', 'gillette'],
  ['bmo field', 'bmo'],
  ['bc place', 'bcplace'],
  ['azteca', 'azteca'],
  ['akron', 'akron'],
  ['bbva', 'bbva'],
];

function resolveVenueId(city: string, venueName: string): string | null {
  const lc = city.toLowerCase();
  for (const [key, id] of CITY_TO_VENUE) {
    if (lc.includes(key)) return id;
  }
  const ln = venueName.toLowerCase();
  for (const [key, id] of VENUE_NAME_TO_ID) {
    if (ln.includes(key)) return id;
  }
  return null;
}

const venueById = new Map(VENUES.map((v) => [v.id, v]));

export interface GroupStageEntry {
  venueId: string;
  venueName: string;
  city: string;
  opponent: string;
  opponentCode: string;
  date: string;
}

export type LiveSchedule = Record<string, GroupStageEntry[]>;

export async function GET() {
  // WC2026 group stage: June 11 – June 26
  const url =
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard' +
    '?dates=20260611-20260626&limit=200';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let events: any[] = [];
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      events = json.events ?? [];
    }
  } catch {
    // fall through — return empty schedule; client falls back to static data
  }

  const schedule: LiveSchedule = {};

  for (const evt of events) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comp = (evt.competitions as any[])?.[0];
    if (!comp) continue;

    const espnCity: string = comp.venue?.address?.city ?? '';
    const espnVenueName: string = comp.venue?.fullName ?? '';
    const venueId = resolveVenueId(espnCity, espnVenueName);
    if (!venueId) continue;

    const venue = venueById.get(venueId);
    if (!venue) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const home = (comp.competitors as any[])?.find((c) => c.homeAway === 'home');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const away = (comp.competitors as any[])?.find((c) => c.homeAway === 'away');
    if (!home || !away) continue;

    const homeCode: string = home.team?.abbreviation ?? '';
    const awayCode: string = away.team?.abbreviation ?? '';
    const homeName: string = home.team?.displayName ?? homeCode;
    const awayName: string = away.team?.displayName ?? awayCode;
    const date = new Date(comp.date ?? evt.date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });

    if (homeCode) {
      if (!schedule[homeCode]) schedule[homeCode] = [];
      schedule[homeCode].push({ venueId, venueName: venue.name, city: venue.city, opponent: awayName, opponentCode: awayCode, date });
    }
    if (awayCode) {
      if (!schedule[awayCode]) schedule[awayCode] = [];
      schedule[awayCode].push({ venueId, venueName: venue.name, city: venue.city, opponent: homeName, opponentCode: homeCode, date });
    }
  }

  for (const code of Object.keys(schedule)) {
    schedule[code].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }

  return NextResponse.json({ schedule });
}
