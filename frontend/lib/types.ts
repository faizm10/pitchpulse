// Types for PitchPulse data

export type CountryCode = 'CA' | 'US' | 'MX';

export interface Stadium {
  id: string;
  city: string;
  country: CountryCode;
  name: string;
  capacity: number;
  lat: number;
  lng: number;
  opened: number;
  surface: string;
  orientation: string;
}

export type FormResult = 'W' | 'D' | 'L';

export interface Team {
  code: string;
  name: string;
  flag: [string, string, string];
  group: string;
  form: FormResult[];
}

export type MatchStatus = 'live' | 'ft' | 'upcoming';

export interface Match {
  id: string;
  home: string;
  away: string;
  score: [number, number] | null;
  status: MatchStatus;
  minute: number;
  stadium: string;
  stage: 'GS' | 'R16' | 'QF' | 'SF' | 'F';
  heat: number;
  kickoff: string;
  winner?: string;
}

export interface Pulse {
  id: string;
  match: string;
  minute: number;
  scorer: string;
  team: string;
  t: number;
}

export interface GroupRow {
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
}

export interface Country {
  code: CountryCode;
  name: string;
  tagline: string;
  colors: string[];
  cities: string[];
  population: string;
  timezones: string;
  food: { name: string; note: string }[];
  culture: string[];
  fanFact: string;
}

export interface TopScorer {
  rank: number;
  player: string;
  team: string;
  goals: number;
  assists: number;
  xg: number;
  mp: number;
}

export interface TopAssist {
  rank: number;
  player: string;
  team: string;
  assists: number;
  key: number;
}

export interface TopCards {
  team: string;
  y: number;
  r: number;
}

export interface BracketMatch {
  id: string;
  a: string | null;
  b: string | null;
  score: [number, number] | null;
  status: MatchStatus;
  pen?: [number, number];
  hint?: string;
}

export interface Bracket {
  R32: BracketMatch[];
  R16: BracketMatch[];
  QF: BracketMatch[];
  SF: BracketMatch[];
  F: BracketMatch[];
}

export interface NewsItem {
  id: string;
  kind: 'feature' | 'short';
  title: string;
  dek: string;
  source: string;
  time: string;
  tag: string;
  accent?: string;
}

export interface Tweaks {
  type: 'editorial' | 'modernist' | 'mono';
  look: 'atlas' | 'broadcast' | 'festival';
  mapStyle: 'dots' | 'topo' | 'link';
  density: 'cozy' | 'compact';
  aiSummary: boolean;
}
