/** Normalized FotMob shapes for PitchPulse UI */

export interface FotmobTeamRef {
  id: number;
  name: string;
  shortName?: string;
}

export interface FotmobTableRow {
  rank: number;
  teamId: number;
  name: string;
  shortName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  qualColor?: string;
}

export interface FotmobGroupTable {
  group: string;
  rows: FotmobTableRow[];
}

export interface FotmobFixture {
  matchId: string;
  round?: string;
  roundName?: string | number;
  group?: string;
  utcTime?: string;
  status: "pre" | "live" | "ft";
  home: FotmobTeamRef;
  away: FotmobTeamRef;
  score?: { home: number; away: number };
}

export interface FotmobLeagueOverview {
  leagueId: number;
  name: string;
  season: string;
  groups: FotmobGroupTable[];
  fixtures: FotmobFixture[];
}

export interface FotmobWorldCupPlayerStats {
  goals: number;
  assists: number;
  penalties: number;
  yellowCards: number;
  redCards: number;
}

export interface FotmobSquadMember {
  id: number;
  name: string;
  shirtNumber?: number;
  position?: string;
  role?: string;
  /** ISO-style code when FotMob provides it (not numeric ids). */
  nationality?: string;
  club?: string;
  injured?: boolean;
  age?: number;
  heightCm?: number;
  dateOfBirth?: string;
  positions?: string[];
  marketValueEur?: number;
  marketValueLabel?: string;
  heightLabel?: string;
  birthLabel?: string;
  worldCupStats: FotmobWorldCupPlayerStats;
}

export interface FotmobPlayerDetail {
  player: FotmobSquadMember;
  team: {
    code: string;
    name: string;
    teamId: number;
    fifaRank?: number;
    fifaPoints?: number;
    groupLabel?: string;
  };
}

export interface FotmobTeamProfile {
  teamId: number;
  name: string;
  countryCode?: string;
  fifaRank?: number;
  fifaPoints?: number;
  groupLabel?: string;
  squad: FotmobSquadMember[];
  fixtures: FotmobFixture[];
}

export interface FotmobMatchExtras {
  matchId: string;
  home: FotmobTeamRef;
  away: FotmobTeamRef;
  status: "pre" | "live" | "ft";
  score?: { home: number; away: number };
  group?: string;
  utcTime?: string;
  /** Populated when matchDetails is available (may be blocked server-side). */
  xg?: { home: number; away: number };
  lineups?: {
    home: FotmobSquadMember[];
    away: FotmobSquadMember[];
  };
  unavailableReason?: string;
}

export interface FotmobTeamMapEntry {
  code: string;
  name: string;
  fotmobId: number;
}
