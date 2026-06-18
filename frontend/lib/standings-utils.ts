import type { GroupStandingEntry } from '@/types/espn';
import { teamCodeFromDisplayName } from '@/lib/team-codes';

export function computeLiveGroupEntries(
  initialEntries: GroupStandingEntry[],
  matches: any[]
): GroupStandingEntry[] {
  const map: Record<string, GroupStandingEntry> = {};

  initialEntries.forEach((entry) => {
    const code =
      teamCodeFromDisplayName(entry.name, entry.abbreviation) ||
      entry.name.toLowerCase();
    map[code] = {
      ...entry,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    };
  });

  matches.forEach((match) => {
    const homeCode =
      teamCodeFromDisplayName(match.homeTeam.name, match.homeTeam.abbreviation) ||
      match.homeTeam.name.toLowerCase();
    const awayCode =
      teamCodeFromDisplayName(match.awayTeam.name, match.awayTeam.abbreviation) ||
      match.awayTeam.name.toLowerCase();

    if (map[homeCode] && map[awayCode]) {
      if (match.state === 'in' || match.state === 'post') {
        const homeScore = Number(match.homeTeam.score || 0);
        const awayScore = Number(match.awayTeam.score || 0);

        map[homeCode].played += 1;
        map[awayCode].played += 1;
        map[homeCode].goalsFor += homeScore;
        map[homeCode].goalsAgainst += awayScore;
        map[awayCode].goalsFor += awayScore;
        map[awayCode].goalsAgainst += homeScore;

        if (homeScore > awayScore) {
          map[homeCode].wins += 1;
          map[homeCode].points += 3;
          map[awayCode].losses += 1;
        } else if (awayScore > homeScore) {
          map[awayCode].wins += 1;
          map[awayCode].points += 3;
          map[homeCode].losses += 1;
        } else {
          map[homeCode].draws += 1;
          map[homeCode].points += 1;
          map[awayCode].draws += 1;
          map[awayCode].points += 1;
        }
      }
    }
  });

  const dynamicEntries = Object.values(map);
  const totalPlayed = dynamicEntries.reduce((sum, e) => sum + e.played, 0);
  if (totalPlayed === 0) return initialEntries;

  return dynamicEntries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}
