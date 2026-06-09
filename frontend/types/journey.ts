export interface JourneyStop {
  venueId: string;
  venueName: string;
  city: string;
  coords: [number, number]; // [lng, lat]
  opponent: string;
  opponentCode: string;
  date: string;
  stage: 'GS' | 'R32' | 'R16' | 'QF' | 'SF' | 'F';
  confirmed: boolean; // true = confirmed schedule, false = projected
  matchday?: number;
}

export interface JourneyState {
  teamCode: string;
  stops: JourneyStop[];
  totalDistanceKm: number;
  citiesCount: number;
  stadiumsCount: number;
  narrative: string;
  scenario: JourneyScenario;
  stageProbabilities: Record<string, number>;
}

export type JourneyScenario = 'first' | 'second';
