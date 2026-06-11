import { teams } from '@/lib/data';

/** Returns '#fff' or '#0a0e16' so text is always readable on the given hex background */
export function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 0.55 ? '#0a0e16' : '#ffffff';
}

function mixHex(hex: string, target: string, weight: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(target);
  const mix = (a: number, b: number) => Math.round(a * (1 - weight) + b * weight);
  return `#${[mix(r1, r2), mix(g1, g2), mix(b1, b2)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Gradient + text colour for the home-rail team banner */
export function getTeamBannerStyle(teamCode: string | null): {
  background: string;
  color: string;
  onLight: boolean;
} {
  const accent = getTeamColor(teamCode);
  const color = contrastText(accent);
  const background = `linear-gradient(135deg, ${accent} 0%, ${mixHex(accent, '#0a0e16', 0.25)} 100%)`;
  return { background, color, onLight: color === '#0a0e16' };
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
