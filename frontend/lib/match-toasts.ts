import { toast } from 'sonner';

export type MatchToastEvent = {
  typeSlug: string;
  scoringPlay?: boolean;
  clock?: string;
  text?: string;
  typeText?: string;
  teamName?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  participants?: { athlete?: string; team?: string }[];
};

export type MatchToastTeam = {
  name: string;
  abbreviation?: string;
};

function teamAbbr(team: MatchToastTeam): string {
  return team.abbreviation || team.name;
}

function eventIcon(typeSlug: string): string {
  switch (typeSlug) {
    case 'goal':
    case 'penalty-scored':
    case 'own-goal':
      return '⚽';
    case 'yellow-card':
      return '🟨';
    case 'red-card':
    case 'yellow-red-card':
      return '🟥';
    case 'substitution':
      return '↔';
    case 'shot-on-target':
      return '→';
    default:
      return '•';
  }
}

function metaLine(clock: string, teamName: string, scoreLine?: string): string {
  return [clock, teamName, scoreLine].filter(Boolean).join(' · ');
}

type ToastVariant = 'goal' | 'card-yellow' | 'card-red' | 'sub' | 'default';

function showToast(
  variant: ToastVariant,
  title: string,
  description: string,
  icon: string,
  duration: number
) {
  toast(title, {
    description,
    duration,
    icon,
    classNames: {
      toast: `pp-toast pp-toast--${variant}`,
      title: 'pp-toast__title',
      description: 'pp-toast__description',
      icon: 'pp-toast__icon',
      closeButton: 'pp-toast__close',
    },
  });
}

/** Live match event toast — styled for PitchPulse (use with {@link PitchPulseToaster}). */
export function showMatchEventToast(
  ev: MatchToastEvent,
  home: MatchToastTeam,
  away: MatchToastTeam
) {
  const slug = ev.typeSlug;
  const athlete = ev.participants?.[0]?.athlete || ev.text || 'Unknown';
  const teamName = ev.teamName || '';
  const clock = ev.clock || '';
  const scoreLine =
    ev.homeScore != null && ev.awayScore != null
      ? `${teamAbbr(home)} ${ev.homeScore}–${ev.awayScore} ${teamAbbr(away)}`
      : undefined;

  if (ev.scoringPlay || slug === 'goal' || slug === 'penalty-scored') {
    showToast(
      'goal',
      `Goal · ${athlete}`,
      metaLine(clock, teamName, scoreLine),
      '⚽',
      8000
    );
    return;
  }

  if (slug === 'own-goal') {
    showToast(
      'goal',
      `Own goal · ${athlete}`,
      metaLine(clock, teamName, scoreLine),
      '⚽',
      8000
    );
    return;
  }

  if (slug === 'yellow-card') {
    showToast(
      'card-yellow',
      `Yellow card · ${athlete}`,
      metaLine(clock, teamName),
      '🟨',
      5000
    );
    return;
  }

  if (slug === 'red-card' || slug === 'yellow-red-card') {
    showToast(
      'card-red',
      slug === 'yellow-red-card' ? `Second yellow · ${athlete}` : `Red card · ${athlete}`,
      metaLine(clock, teamName),
      '🟥',
      7000
    );
    return;
  }

  if (slug === 'substitution') {
    showToast(
      'sub',
      `Substitution · ${athlete}`,
      metaLine(clock, teamName),
      '↔',
      4000
    );
    return;
  }

  showToast(
    'default',
    ev.text || ev.typeText || 'Match event',
    metaLine(clock, teamName),
    eventIcon(slug),
    4000
  );
}
