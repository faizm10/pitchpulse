export type ConfidenceLevel = 'high' | 'low';

export interface PredictResponse {
  home_team: string;
  away_team: string;
  home_win_probability: number;
  draw_probability: number;
  away_win_probability: number;
  model: string;
  confidence: ConfidenceLevel;
  reason?: string | null;
  narrative?: string | null;
  h2h_matches_prior: number;
  features_used: string[];
}
