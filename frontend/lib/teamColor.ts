import { teams } from '@/lib/data';

/** Returns '#fff' or '#0a0e16' so text is always readable on the given hex background */
export function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.55 ? '#0a0e16' : '#ffffff';
}

/** Pick the first flag colour that isn't too light (e.g. England's flag[0] is #FFFFFF) */
export function getTeamColor(teamCode: string | null): string {
  if (!teamCode) return '#4285F4';
  const team = teams[teamCode];
  return (
    team?.flag.find((c) => {
      const r = parseInt(c.slice(1, 3), 16) / 255;
      const g = parseInt(c.slice(3, 5), 16) / 255;
      const b = parseInt(c.slice(5, 7), 16) / 255;
      return 0.299 * r + 0.587 * g + 0.114 * b < 0.72;
    }) ?? '#4285F4'
  );
}
