import { teams } from '@/lib/data';
import { VENUES } from '@/data/venues';
import type { JourneyStop, JourneyState, JourneyScenario, LiveSchedule } from '@/types/journey';

const venueById = new Map(VENUES.map((v) => [v.id, v]));

// Group team order — determines round-robin pairings:
// MD1: [0]v[1] + [2]v[3]  @ venue[0]
// MD2: [0]v[2] + [1]v[3]  @ venue[1]
// MD3: [0]v[3] + [1]v[2]  @ venue[2]
const GROUP_TEAMS: Record<string, [string, string, string, string]> = {
  A: ['MEX', 'KOR', 'RSA', 'CZE'],
  B: ['CAN', 'QAT', 'BIH', 'SUI'],
  C: ['BRA', 'MAR', 'SCO', 'HAI'],
  D: ['USA', 'TUR', 'PAR', 'AUS'],
  E: ['GER', 'CIV', 'ECU', 'CUW'],
  F: ['JPN', 'NED', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'KSA', 'CPV', 'URU'],
  I: ['FRA', 'IRQ', 'NOR', 'SEN'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COL', 'COD', 'UZB'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};

// 3 venues per group, one per matchday
const GROUP_VENUES: Record<string, [string, string, string]> = {
  A: ['azteca', 'nrg', 'sofi'],
  B: ['bmo', 'gillette', 'att'],
  C: ['mercedesbenz', 'hardrock', 'bcplace'],
  D: ['sofi', 'levis', 'lumen'],
  E: ['att', 'nrg', 'azteca'],
  F: ['lumen', 'bcplace', 'arrowhead'],
  G: ['metlife', 'lincoln', 'gillette'],
  H: ['akron', 'bbva', 'hardrock'],
  I: ['levis', 'sofi', 'bmo'],
  J: ['metlife', 'mercedesbenz', 'nrg'],
  K: ['att', 'arrowhead', 'lincoln'],
  L: ['gillette', 'metlife', 'sofi'],
};

const MD_DATES = ['Jun 12, 2026', 'Jun 18, 2026', 'Jun 24, 2026'];

// Projected knockout venue path per group × scenario: [R32, R16, QF, SF, Final]
// SF1 = AT&T Dallas, SF2 = MetLife NJ, Final = MetLife NJ
const KNOCKOUT_PATHS: Record<string, { first: string[]; second: string[] }> = {
  A: { first: ['nrg', 'att', 'sofi', 'att', 'metlife'], second: ['azteca', 'nrg', 'mercedesbenz', 'metlife', 'metlife'] },
  B: { first: ['bmo', 'gillette', 'metlife', 'metlife', 'metlife'], second: ['gillette', 'lincoln', 'mercedesbenz', 'att', 'metlife'] },
  C: { first: ['mercedesbenz', 'hardrock', 'sofi', 'att', 'metlife'], second: ['hardrock', 'mercedesbenz', 'lincoln', 'metlife', 'metlife'] },
  D: { first: ['sofi', 'levis', 'lumen', 'att', 'metlife'], second: ['levis', 'sofi', 'arrowhead', 'att', 'metlife'] },
  E: { first: ['att', 'nrg', 'sofi', 'att', 'metlife'], second: ['nrg', 'att', 'mercedesbenz', 'metlife', 'metlife'] },
  F: { first: ['lumen', 'bcplace', 'sofi', 'att', 'metlife'], second: ['bcplace', 'lumen', 'arrowhead', 'att', 'metlife'] },
  G: { first: ['metlife', 'lincoln', 'gillette', 'metlife', 'metlife'], second: ['lincoln', 'metlife', 'mercedesbenz', 'att', 'metlife'] },
  H: { first: ['akron', 'bbva', 'nrg', 'att', 'metlife'], second: ['bbva', 'hardrock', 'mercedesbenz', 'att', 'metlife'] },
  I: { first: ['levis', 'sofi', 'lumen', 'att', 'metlife'], second: ['sofi', 'levis', 'arrowhead', 'att', 'metlife'] },
  J: { first: ['metlife', 'mercedesbenz', 'lincoln', 'metlife', 'metlife'], second: ['mercedesbenz', 'metlife', 'gillette', 'metlife', 'metlife'] },
  K: { first: ['att', 'arrowhead', 'nrg', 'att', 'metlife'], second: ['arrowhead', 'att', 'mercedesbenz', 'metlife', 'metlife'] },
  L: { first: ['gillette', 'metlife', 'mercedesbenz', 'metlife', 'metlife'], second: ['metlife', 'gillette', 'sofi', 'att', 'metlife'] },
};

const KNOCKOUT_STAGES = ['R32', 'R16', 'QF', 'SF', 'F'] as const;
const KNOCKOUT_DATES = ['Jun 29, 2026', 'Jul 4, 2026', 'Jul 9, 2026', 'Jul 14, 2026', 'Jul 19, 2026'];
const KNOCKOUT_ROUND_NAMES: Record<string, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-final',
  SF: 'Semi-final',
  F: 'Final',
};

function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcStageProbabilities(formScore: number, scenario: JourneyScenario): Record<string, number> {
  // formScore: 0.0-1.0 (W=3, D=1, L=0 out of 15)
  const adj = 0.5 + formScore * 0.5;
  const gsBase = scenario === 'first' ? 0.72 : 0.52;
  const gsAdv = Math.min(0.95, gsBase * adj * 1.4);
  const r32 = gsAdv * 0.55 * adj;
  const r16 = r32 * 0.55 * adj;
  const qf = r16 * 0.55;
  const sf = qf * 0.55;
  const f = sf * 0.55;
  return {
    GS: 1.0,
    R32: Math.min(0.9, gsAdv),
    R16: Math.min(0.7, r32),
    QF: Math.min(0.5, r16),
    SF: Math.min(0.35, qf),
    F: Math.min(0.2, sf),
    W: Math.min(0.12, f),
  };
}

export function buildJourney(
  teamCode: string,
  scenario: JourneyScenario,
  liveSchedule: LiveSchedule | null = null,
): JourneyState | null {
  const team = teams[teamCode];
  if (!team) return null;

  const group = team.group;
  const groupTeams = GROUP_TEAMS[group];
  const groupVenues = GROUP_VENUES[group];
  if (!groupTeams || !groupVenues) return null;

  // ── Group stage stops ─────────────────────────────────────────────────────
  // Prefer live ESPN schedule data; fall back to static pairings
  const liveEntries = liveSchedule?.[teamCode];
  const groupStops: JourneyStop[] = [];

  if (liveEntries && liveEntries.length > 0) {
    // Real data from ESPN — use it directly
    liveEntries.forEach((entry, idx) => {
      const venue = venueById.get(entry.venueId);
      if (!venue) return;
      groupStops.push({
        venueId: entry.venueId,
        venueName: venue.name,
        city: venue.city,
        coords: [venue.longitude, venue.latitude],
        opponent: entry.opponent,
        opponentCode: entry.opponentCode,
        date: entry.date,
        stage: 'GS',
        confirmed: true,
        matchday: idx + 1,
      });
    });
  } else {
    // Static fallback — round-robin pairings from GROUP_TEAMS / GROUP_VENUES
    const pos = groupTeams.indexOf(teamCode as never);
    if (pos === -1) return null;

    const mdMatchups: Array<[number, number][]> = [
      [[0, 1], [2, 3]],
      [[0, 2], [1, 3]],
      [[0, 3], [1, 2]],
    ];

    for (let md = 0; md < 3; md++) {
      const venueId = groupVenues[md];
      const venue = venueById.get(venueId);
      if (!venue) continue;

      const myMatchup = mdMatchups[md].find((m) => m[0] === pos || m[1] === pos);
      if (!myMatchup) continue;

      const opponentPos = myMatchup[0] === pos ? myMatchup[1] : myMatchup[0];
      const opponentCode = groupTeams[opponentPos];
      const opponent = teams[opponentCode];

      groupStops.push({
        venueId,
        venueName: venue.name,
        city: venue.city,
        coords: [venue.longitude, venue.latitude],
        opponent: opponent?.name ?? opponentCode,
        opponentCode,
        date: MD_DATES[md],
        stage: 'GS',
        confirmed: true,
        matchday: md + 1,
      });
    }
  }

  // Projected knockout path
  const knockoutVenueIds = KNOCKOUT_PATHS[group]?.[scenario] ?? [];
  const knockoutStops: JourneyStop[] = knockoutVenueIds
    .map((venueId, i): JourneyStop | null => {
      const venue = venueById.get(venueId);
      if (!venue) return null;
      const stage = KNOCKOUT_STAGES[i];
      return {
        venueId,
        venueName: venue.name,
        city: venue.city,
        coords: [venue.longitude, venue.latitude],
        opponent: `${KNOCKOUT_ROUND_NAMES[stage]} Opponent`,
        opponentCode: '???',
        date: KNOCKOUT_DATES[i],
        stage,
        confirmed: false,
      };
    })
    .filter((s): s is JourneyStop => s !== null);

  const allStops = [...groupStops, ...knockoutStops];

  let totalDistanceKm = 0;
  for (let i = 1; i < allStops.length; i++) {
    const [lng1, lat1] = allStops[i - 1].coords;
    const [lng2, lat2] = allStops[i].coords;
    totalDistanceKm += haversine(lng1, lat1, lng2, lat2);
  }

  const cities = new Set(allStops.map((s) => s.city));
  const stadiums = new Set(allStops.map((s) => s.venueId));

  const formScore =
    team.form.reduce((acc, r) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0) / 15;

  const stageProbabilities = calcStageProbabilities(formScore, scenario);
  const narrative = buildNarrative(team.name, allStops, Math.round(totalDistanceKm));

  return {
    teamCode,
    stops: allStops,
    totalDistanceKm: Math.round(totalDistanceKm),
    citiesCount: cities.size,
    stadiumsCount: stadiums.size,
    narrative,
    scenario,
    stageProbabilities,
  };
}

function buildNarrative(teamName: string, stops: JourneyStop[], distanceKm: number): string {
  const groupStops = stops.filter((s) => s.stage === 'GS');
  const cities = groupStops.map((s) => s.city.split(',')[0]);
  const finalStop = stops.find((s) => s.stage === 'F');
  const finalCity = finalStop?.city.split(',')[0] ?? 'East Rutherford';

  const allUniqueCities = [...new Set(stops.map((s) => s.city.split(',')[0]))];
  const cityList =
    allUniqueCities.length > 2
      ? `${allUniqueCities.slice(0, -1).join(', ')} and ${allUniqueCities[allUniqueCities.length - 1]}`
      : allUniqueCities.join(' and ');

  return (
    `${teamName} begin their 2026 World Cup in ${cities[0] ?? 'their opening city'}, ` +
    `with group stage stops also in ${cities.slice(1).join(' and ')}. ` +
    `Their projected path to glory winds through ${cityList}, ` +
    `covering roughly ${distanceKm.toLocaleString()} km across North America. ` +
    `Should they reach the final, the journey ends in ${finalCity} — ` +
    `home of the 2026 FIFA World Cup Final.`
  );
}

export { KNOCKOUT_ROUND_NAMES };
