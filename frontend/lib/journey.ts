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

// Projected knockout path per group × scenario: [R32, R16, QF, SF, Final]
// Verified against the official FIFA WC2026 bracket (Wikipedia, June 2026)
//
// R32 matchups with dates:
//   M73 Jun 28 RuA–RuB@sofi    M74 Jun 29 WE–3rd@gillette   M75 Jun 29 WF–RuC@bbva
//   M76 Jun 29 WC–RuF@nrg      M77 Jun 30 WI–3rd@metlife    M78 Jun 30 RuE–RuI@att
//   M79 Jun 30 WA–3rd@azteca   M80 Jul 1  WL–3rd@mercedesbenz
//   M81 Jul 1  WD–3rd@levis    M82 Jul 1  WG–3rd@lumen      M83 Jul 2 RuK–RuL@bmo
//   M84 Jul 2  WH–RuJ@sofi     M85 Jul 2  WB–3rd@bcplace    M86 Jul 3 WJ–RuH@hardrock
//   M87 Jul 3  WK–3rd@arrowhead M88 Jul 3 RuD–RuG@att
//
// R16: M89(M74×M77)Jul4@lincoln  M90(M73×M75)Jul4@nrg     M91(M76×M78)Jul5@metlife
//      M92(M79×M80)Jul5@azteca   M93(M83×M84)Jul6@att     M94(M81×M82)Jul6@lumen
//      M95(M86×M88)Jul7@mercedesbenz  M96(M85×M87)Jul7@bcplace
// QF:  M97(M89×M90)Jul9@gillette  M98(M93×M94)Jul10@sofi
//      M99(M91×M92)Jul11@hardrock  M100(M95×M96)Jul11@arrowhead
// SF:  M101(M97×M98)Jul14@att   M102(M99×M100)Jul15@mercedesbenz
// Final: M104 Jul19@metlife
//
// 3rd-place eligible slots per group (verified against PitchPulse bracket page):
//   Bracket 3rd labels: M74(3AB) M77(3CD) M79(3CE) M80(3EH) M81(3BE) M82(3AE) M85(3EF) M87(3DE)
//   A → M74(3AB) or M82(3AE) → use M74 @ Gillette Jun29
//   B → M74(3AB) or M81(3BE) → use M74 @ Gillette Jun29
//   C → M77(3CD) or M79(3CE) → use M77 @ MetLife Jun30
//   D → M77(3CD) or M87(3DE) → use M77 @ MetLife Jun30
//   E → M79(3CE), M80(3EH), M81(3BE), M82(3AE), M85(3EF), M87(3DE) → use M80 @ MercedesBenz Jul1
//   F → M85(3EF) only       → use M85 @ BCPlace Jul2
//   H → M80(3EH) only       → use M80 @ MercedesBenz Jul1
//   G, I, J, K, L → NOT in any bracket 3rd-place slot (paths are shown but extremely unlikely)

type KnockoutStop = { venue: string; date: string };

const KNOCKOUT_PATHS: Record<string, { first: KnockoutStop[]; second: KnockoutStop[]; third: KnockoutStop[] }> = {
  // Winner A: M79(Jun30)→M92(Jul5)→M99(Jul11)→M102(Jul15)→F | Runner-up A: M73(Jun28)→M90(Jul4)→M97(Jul9)→M101(Jul14)→F
  A: {
    first:  [{ venue: 'azteca',       date: 'Jun 30, 2026' }, { venue: 'azteca',       date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'sofi',         date: 'Jun 28, 2026' }, { venue: 'nrg',          date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    third:  [{ venue: 'gillette',     date: 'Jun 29, 2026' }, { venue: 'lincoln',      date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner B: M85(Jul2)→M96(Jul7)→M100(Jul11)→M102(Jul15)→F | Runner-up B: M73(Jun28)→M90(Jul4)→M97(Jul9)→M101(Jul14)→F
  B: {
    first:  [{ venue: 'bcplace',      date: 'Jul 2, 2026'  }, { venue: 'bcplace',      date: 'Jul 7, 2026'  }, { venue: 'arrowhead',   date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'sofi',         date: 'Jun 28, 2026' }, { venue: 'nrg',          date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    third:  [{ venue: 'gillette',     date: 'Jun 29, 2026' }, { venue: 'lincoln',      date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner C: M76(Jun29)→M91(Jul5)→M99(Jul11)→M102(Jul15)→F | Runner-up C: M75(Jun29)→M90(Jul4)→M97(Jul9)→M101(Jul14)→F
  C: {
    first:  [{ venue: 'nrg',          date: 'Jun 29, 2026' }, { venue: 'metlife',      date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'bbva',         date: 'Jun 29, 2026' }, { venue: 'nrg',          date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    // 3rd C → M77(3CD) @ MetLife Jun30 → M89 @ Lincoln → M97 @ Gillette → M101 @ AT&T → F
    third:  [{ venue: 'metlife',      date: 'Jun 30, 2026' }, { venue: 'lincoln',      date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner D: M81(Jul1)→M94(Jul6)→M98(Jul10)→M101(Jul14)→F | Runner-up D: M88(Jul3)→M95(Jul7)→M100(Jul11)→M102(Jul15)→F
  D: {
    first:  [{ venue: 'levis',        date: 'Jul 1, 2026'  }, { venue: 'lumen',        date: 'Jul 6, 2026'  }, { venue: 'sofi',        date: 'Jul 10, 2026' }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'att',          date: 'Jul 3, 2026'  }, { venue: 'mercedesbenz', date: 'Jul 7, 2026'  }, { venue: 'arrowhead',   date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    // 3rd D → M77(3CD) @ MetLife Jun30 → M89 @ Lincoln → M97 @ Gillette → M101 @ AT&T → F
    third:  [{ venue: 'metlife',      date: 'Jun 30, 2026' }, { venue: 'lincoln',      date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner E: M74(Jun29)→M89(Jul4)→M97(Jul9)→M101(Jul14)→F | Runner-up E: M78(Jun30)→M91(Jul5)→M99(Jul11)→M102(Jul15)→F
  E: {
    first:  [{ venue: 'gillette',     date: 'Jun 29, 2026' }, { venue: 'lincoln',      date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'att',          date: 'Jun 30, 2026' }, { venue: 'metlife',      date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    third:  [{ venue: 'mercedesbenz', date: 'Jul 1, 2026'  }, { venue: 'azteca',       date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner F: M75(Jun29)→M90(Jul4)→M97(Jul9)→M101(Jul14)→F | Runner-up F: M76(Jun29)→M91(Jul5)→M99(Jul11)→M102(Jul15)→F
  F: {
    first:  [{ venue: 'bbva',         date: 'Jun 29, 2026' }, { venue: 'nrg',          date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'nrg',          date: 'Jun 29, 2026' }, { venue: 'metlife',      date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    // 3rd F → M85(3EF) @ BCPlace Jul2 → M96 @ BCPlace → M100 @ Arrowhead → M102 @ MercedesBenz → F
    third:  [{ venue: 'bcplace',      date: 'Jul 2, 2026'  }, { venue: 'bcplace',      date: 'Jul 7, 2026'  }, { venue: 'arrowhead',   date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner G: M82(Jul1)→M94(Jul6)→M98(Jul10)→M101(Jul14)→F | Runner-up G: M88(Jul3)→M95(Jul7)→M100(Jul11)→M102(Jul15)→F
  G: {
    first:  [{ venue: 'lumen',        date: 'Jul 1, 2026'  }, { venue: 'lumen',        date: 'Jul 6, 2026'  }, { venue: 'sofi',        date: 'Jul 10, 2026' }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'att',          date: 'Jul 3, 2026'  }, { venue: 'mercedesbenz', date: 'Jul 7, 2026'  }, { venue: 'arrowhead',   date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    third:  [{ venue: 'metlife',      date: 'Jun 30, 2026' }, { venue: 'lincoln',      date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner H: M84(Jul2)→M93(Jul6)→M98(Jul10)→M101(Jul14)→F | Runner-up H: M86(Jul3)→M95(Jul7)→M100(Jul11)→M102(Jul15)→F
  H: {
    first:  [{ venue: 'sofi',         date: 'Jul 2, 2026'  }, { venue: 'att',          date: 'Jul 6, 2026'  }, { venue: 'sofi',        date: 'Jul 10, 2026' }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'hardrock',     date: 'Jul 3, 2026'  }, { venue: 'mercedesbenz', date: 'Jul 7, 2026'  }, { venue: 'arrowhead',   date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    // 3rd H → M80(3EH) @ MercedesBenz Jul1 → M92 @ Azteca → M99 @ HardRock → M102 @ MercedesBenz → F
    third:  [{ venue: 'mercedesbenz', date: 'Jul 1, 2026'  }, { venue: 'azteca',       date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner I: M77(Jun30)→M89(Jul4)→M97(Jul9)→M101(Jul14)→F | Runner-up I: M78(Jun30)→M91(Jul5)→M99(Jul11)→M102(Jul15)→F
  I: {
    first:  [{ venue: 'metlife',      date: 'Jun 30, 2026' }, { venue: 'lincoln',      date: 'Jul 4, 2026'  }, { venue: 'gillette',    date: 'Jul 9, 2026'  }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'att',          date: 'Jun 30, 2026' }, { venue: 'metlife',      date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    third:  [{ venue: 'azteca',       date: 'Jun 30, 2026' }, { venue: 'azteca',       date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner J: M86(Jul3)→M95(Jul7)→M100(Jul11)→M102(Jul15)→F | Runner-up J: M84(Jul2)→M93(Jul6)→M98(Jul10)→M101(Jul14)→F
  J: {
    first:  [{ venue: 'hardrock',     date: 'Jul 3, 2026'  }, { venue: 'mercedesbenz', date: 'Jul 7, 2026'  }, { venue: 'arrowhead',   date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'sofi',         date: 'Jul 2, 2026'  }, { venue: 'att',          date: 'Jul 6, 2026'  }, { venue: 'sofi',        date: 'Jul 10, 2026' }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    third:  [{ venue: 'mercedesbenz', date: 'Jul 1, 2026'  }, { venue: 'azteca',       date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner K: M87(Jul3)→M96(Jul7)→M100(Jul11)→M102(Jul15)→F | Runner-up K: M83(Jul2)→M93(Jul6)→M98(Jul10)→M101(Jul14)→F
  K: {
    first:  [{ venue: 'arrowhead',    date: 'Jul 3, 2026'  }, { venue: 'bcplace',      date: 'Jul 7, 2026'  }, { venue: 'arrowhead',   date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'bmo',          date: 'Jul 2, 2026'  }, { venue: 'att',          date: 'Jul 6, 2026'  }, { venue: 'sofi',        date: 'Jul 10, 2026' }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    third:  [{ venue: 'mercedesbenz', date: 'Jul 1, 2026'  }, { venue: 'azteca',       date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
  // Winner L: M80(Jul1)→M92(Jul5)→M99(Jul11)→M102(Jul15)→F | Runner-up L: M83(Jul2)→M93(Jul6)→M98(Jul10)→M101(Jul14)→F
  L: {
    first:  [{ venue: 'mercedesbenz', date: 'Jul 1, 2026'  }, { venue: 'azteca',       date: 'Jul 5, 2026'  }, { venue: 'hardrock',    date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    second: [{ venue: 'bmo',          date: 'Jul 2, 2026'  }, { venue: 'att',          date: 'Jul 6, 2026'  }, { venue: 'sofi',        date: 'Jul 10, 2026' }, { venue: 'att',          date: 'Jul 14, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
    third:  [{ venue: 'arrowhead',    date: 'Jul 3, 2026'  }, { venue: 'bcplace',      date: 'Jul 7, 2026'  }, { venue: 'arrowhead',   date: 'Jul 11, 2026' }, { venue: 'mercedesbenz', date: 'Jul 15, 2026' }, { venue: 'metlife', date: 'Jul 19, 2026' }],
  },
};

const KNOCKOUT_STAGES = ['R32', 'R16', 'QF', 'SF', 'F'] as const;
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
  // Third place has ~30% base chance of qualifying (only 8 of 12 advance)
  const gsBase = scenario === 'first' ? 0.72 : scenario === 'second' ? 0.52 : 0.30;
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

  // Projected knockout path — dates are now per-path, not shared
  const knockoutPath = KNOCKOUT_PATHS[group]?.[scenario] ?? [];
  const knockoutStops: JourneyStop[] = knockoutPath
    .map(({ venue: venueId, date }, i): JourneyStop | null => {
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
        date,
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
  const narrative = buildNarrative(team.name, allStops, Math.round(totalDistanceKm), scenario);

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

function buildNarrative(teamName: string, stops: JourneyStop[], distanceKm: number, scenario: JourneyScenario): string {
  const groupStops = stops.filter((s) => s.stage === 'GS');
  const cities = groupStops.map((s) => s.city.split(',')[0]);
  const finalStop = stops.find((s) => s.stage === 'F');
  const finalCity = finalStop?.city.split(',')[0] ?? 'East Rutherford';

  const allUniqueCities = [...new Set(stops.map((s) => s.city.split(',')[0]))];
  const cityList =
    allUniqueCities.length > 2
      ? `${allUniqueCities.slice(0, -1).join(', ')} and ${allUniqueCities[allUniqueCities.length - 1]}`
      : allUniqueCities.join(' and ');

  const scenarioNote =
    scenario === 'third'
      ? 'Should they sneak through as one of the 8 best third-place finishers, '
      : `Their projected path to glory winds through ${cityList}, `;

  return (
    `${teamName} begin their 2026 World Cup in ${cities[0] ?? 'their opening city'}, ` +
    `with group stage stops also in ${cities.slice(1).join(' and ')}. ` +
    scenarioNote +
    `covering roughly ${distanceKm.toLocaleString()} km across North America. ` +
    `Should they reach the final, the journey ends in ${finalCity} — ` +
    `home of the 2026 FIFA World Cup Final.`
  );
}

export { KNOCKOUT_ROUND_NAMES };
