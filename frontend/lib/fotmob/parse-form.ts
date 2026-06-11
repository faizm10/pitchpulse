import type { FormResult } from "@/lib/types";
import type { FotmobFixture } from "@/types/fotmob";

/** Last N results from FotMob `overview.teamForm` (newest first). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTeamFormFromOverview(raw: any): FormResult[] {
  const teamForm = raw?.overview?.teamForm;
  if (!Array.isArray(teamForm)) return [];

  const results: FormResult[] = [];
  for (const item of teamForm) {
    const rs = String(item?.resultString ?? "").toUpperCase();
    if (rs === "W" || rs === "D" || rs === "L") {
      results.push(rs);
    }
  }
  return results.slice(0, 5);
}

/** W/D/L from finished WC league fixtures for one team (newest first). */
export function computeFormFromFixtures(
  teamId: number,
  fixtures: FotmobFixture[]
): FormResult[] {
  const finished = fixtures
    .filter(
      (f) =>
        f.status === "ft" &&
        f.score &&
        (f.home.id === teamId || f.away.id === teamId)
    )
    .sort((a, b) => {
      const ta = a.utcTime ? Date.parse(a.utcTime) : 0;
      const tb = b.utcTime ? Date.parse(b.utcTime) : 0;
      return tb - ta;
    });

  const results: FormResult[] = [];
  for (const f of finished) {
    const score = f.score!;
    const isHome = f.home.id === teamId;
    const gf = isHome ? score.home : score.away;
    const ga = isHome ? score.away : score.home;
    if (gf > ga) results.push("W");
    else if (gf < ga) results.push("L");
    else results.push("D");
  }
  return results.slice(0, 5);
}

/** Prefer WC results when the tournament has started; pad with recent form otherwise. */
export function resolveTeamForm(
  teamId: number,
  overviewForm: FormResult[],
  leagueFixtures: FotmobFixture[]
): FormResult[] {
  const wcForm = computeFormFromFixtures(teamId, leagueFixtures);
  if (wcForm.length >= 5) return wcForm;
  if (wcForm.length > 0) {
    const combined = [...wcForm];
    for (const r of overviewForm) {
      if (combined.length >= 5) break;
      combined.push(r);
    }
    return combined.slice(0, 5);
  }
  return overviewForm.slice(0, 5);
}

/** Live form for rail/journey: WC results when available, else FotMob recent form. */
export async function fetchResolvedTeamForm(
  teamId: number,
  leagueFixtures: FotmobFixture[]
): Promise<FormResult[]> {
  const wcForm = computeFormFromFixtures(teamId, leagueFixtures);
  if (wcForm.length >= 5) return wcForm;

  const { fetchTeamRaw } = await import("./client");
  const raw = await fetchTeamRaw(teamId);
  const overviewForm = parseTeamFormFromOverview(raw);
  return resolveTeamForm(teamId, overviewForm, leagueFixtures);
}
