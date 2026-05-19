import teamMapJson from "@/data/fotmob-team-map.json";
import type { FotmobTeamMapEntry } from "@/types/fotmob";
import { teamCodeFromFotmobName } from "./team-codes";
import type { FotmobGroupTable } from "@/types/fotmob";

const staticMap = teamMapJson as Record<string, FotmobTeamMapEntry>;

export function getTeamMapEntry(code: string): FotmobTeamMapEntry | undefined {
  return staticMap[code.toUpperCase()];
}

export function getFotmobIdForCode(code: string): number | undefined {
  return getTeamMapEntry(code)?.fotmobId;
}

export function getCodeForFotmobId(fotmobId: number): string | undefined {
  for (const entry of Object.values(staticMap)) {
    if (entry.fotmobId === fotmobId) return entry.code;
  }
  return undefined;
}

/** Merge static map with live group tables (fills gaps). */
export function buildTeamMapFromGroups(groups: FotmobGroupTable[]): Record<string, FotmobTeamMapEntry> {
  const out = { ...staticMap };
  for (const g of groups) {
    for (const row of g.rows) {
      const code = teamCodeFromFotmobName(row.name) ?? teamCodeFromFotmobName(row.shortName);
      if (!code) continue;
      out[code] = {
        code,
        name: row.name,
        fotmobId: row.teamId,
      };
    }
  }
  return out;
}

export function listMappedTeams(): FotmobTeamMapEntry[] {
  return Object.values(staticMap).sort((a, b) => a.name.localeCompare(b.name));
}
