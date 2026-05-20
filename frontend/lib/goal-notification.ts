import type { GoalData } from '@/components/GoalNotification';
import type { MatchToastTeam } from '@/lib/match-toasts';

export type ScoringSide = 'home' | 'away';

export interface KeyEventLike {
  typeSlug: string;
  scoringPlay?: boolean;
  clock?: string;
  teamName?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  participants?: { athlete?: string; team?: string }[];
}

export interface GoalScorerOption {
  id: string;
  name: string;
  number: number;
  flag?: string;
  assist?: string;
}

export interface GoalMatchTeams {
  home: { name: string; abbreviation: string; color: string };
  away: { name: string; abbreviation: string; color: string };
}

/** MLS Round 2 test slugs → squads for dev panel + name lookup on live goals */
export const MLS_GAME_SQUADS: Record<string, Record<ScoringSide, GoalScorerOption[]>> = {
  'hou-stl': {
    home: [
      { id: 'baird', name: 'Fafà Picault', number: 10, flag: '🇭🇹' },
      { id: 'quinones', name: 'Ezequiel Ponce', number: 9, flag: '🇲🇽' },
      { id: 'dynamo', name: 'Artur', number: 6, flag: '🇧🇷' },
      { id: 'herrera', name: 'Héctor Herrera', number: 16, flag: '🇲🇽' },
      { id: 'bassogog', name: 'Ibrahim Aliyu', number: 18, flag: '🇳🇬' },
    ],
    away: [
      { id: 'löwen', name: 'Eduard Löwen', number: 10, flag: '🇩🇪' },
      { id: 'sands', name: 'João Klauss', number: 9, flag: '🇧🇷' },
      { id: 'klauss', name: 'Rasmus Alm', number: 7, flag: '🇸🇪' },
      { id: 'hassan', name: 'Roman Celentano', number: 1, flag: '🇺🇸' },
      { id: 'oreilly', name: 'Jared Stroud', number: 23, flag: '🇺🇸' },
    ],
  },
};

export function getMatchSquads(matchSlug?: string): Record<ScoringSide, GoalScorerOption[]> {
  if (matchSlug && MLS_GAME_SQUADS[matchSlug]) return MLS_GAME_SQUADS[matchSlug];
  return { home: [], away: [] };
}

export function isScoringGoalEvent(ev: Pick<KeyEventLike, 'typeSlug' | 'scoringPlay'>): boolean {
  const slug = ev.typeSlug;
  return Boolean(ev.scoringPlay || slug === 'goal' || slug === 'penalty-scored' || slug === 'own-goal');
}

export function parseMinuteFromClock(clock: string): number {
  const plus = clock.match(/(\d+)\s*\+\s*(\d+)/);
  if (plus) return Math.min(120, parseInt(plus[1], 10) + parseInt(plus[2], 10));
  const m = clock.match(/(\d+)\s*'?/);
  return m ? Math.min(120, parseInt(m[1], 10)) : 1;
}

export function resolveScoringSide(teamName: string, teams: GoalMatchTeams): ScoringSide {
  const n = teamName.toLowerCase().trim();
  if (!n) return 'home';
  const homeKeys = [teams.home.name, teams.home.abbreviation].map((s) => s.toLowerCase());
  const awayKeys = [teams.away.name, teams.away.abbreviation].map((s) => s.toLowerCase());
  if (homeKeys.some((h) => h && (n.includes(h) || h.includes(n)))) return 'home';
  if (awayKeys.some((a) => a && (n.includes(a) || a.includes(n)))) return 'away';
  return 'home';
}

function findScorerInSquad(
  athleteName: string,
  squads: Record<ScoringSide, GoalScorerOption[]>,
  side: ScoringSide
): GoalScorerOption | null {
  const norm = athleteName.toLowerCase().trim();
  if (!norm) return null;
  const hit = squads[side].find((p) => {
    const pn = p.name.toLowerCase();
    return pn === norm || pn.endsWith(norm) || norm.endsWith(pn.split(' ').pop() ?? '');
  });
  return hit ?? null;
}

export function teamsFromMatchToast(home: MatchToastTeam & { color?: string }, away: MatchToastTeam & { color?: string }): GoalMatchTeams {
  return {
    home: {
      name: home.name,
      abbreviation: home.abbreviation || home.name.slice(0, 3).toUpperCase(),
      color: home.color ?? '#1d4ed8',
    },
    away: {
      name: away.name,
      abbreviation: away.abbreviation || away.name.slice(0, 3).toUpperCase(),
      color: away.color ?? '#0f766e',
    },
  };
}

export function buildGoalDataFromKeyEvent(
  ev: KeyEventLike,
  home: MatchToastTeam & { color?: string },
  away: MatchToastTeam & { color?: string },
  league: string,
  matchSlug?: string
): GoalData {
  const teams = teamsFromMatchToast(home, away);
  const scoringSide = resolveScoringSide(ev.teamName ?? '', teams);
  const athlete = ev.participants?.[0]?.athlete || 'Unknown';
  const squads = getMatchSquads(matchSlug);
  const squadPlayer = findScorerInSquad(athlete, squads, scoringSide);
  const scorer: GoalScorerOption = squadPlayer ?? {
    id: 'live',
    name: athlete,
    number: 9,
    flag: '⚽',
  };
  const homeScore = ev.homeScore ?? 0;
  const awayScore = ev.awayScore ?? 0;

  return buildGoalData({
    scorer,
    minute: parseMinuteFromClock(ev.clock ?? ''),
    scoringSide,
    teams,
    homeScore: Number.isFinite(homeScore) ? homeScore : 0,
    awayScore: Number.isFinite(awayScore) ? awayScore : 0,
    league,
  });
}

export function parseScorerName(fullName: string): { given: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { given: '', surname: 'Unknown' };
  if (parts.length === 1) return { given: '', surname: parts[0] };
  return { given: parts[0], surname: parts.slice(1).join(' ') };
}

export function buildGoalData(params: {
  scorer: GoalScorerOption;
  minute: number;
  scoringSide: ScoringSide;
  teams: GoalMatchTeams;
  homeScore: number;
  awayScore: number;
  league?: string;
  accentColor?: string;
}): GoalData {
  const { given, surname } = parseScorerName(params.scorer.name);
  const scoringTeam =
    params.scoringSide === 'home' ? params.teams.home : params.teams.away;

  return {
    given,
    surname,
    number: params.scorer.number,
    minute: params.minute,
    homeTeam: params.teams.home.abbreviation,
    awayTeam: params.teams.away.abbreviation,
    homeScore: params.homeScore,
    awayScore: params.awayScore,
    teamColor: scoringTeam.color,
    accentColor: params.accentColor ?? '#f4d35e',
    matchLabel: params.league?.toUpperCase() ?? 'MATCH',
    assist: params.scorer.assist ?? '',
    flag: params.scorer.flag ?? '⚽',
  };
}
