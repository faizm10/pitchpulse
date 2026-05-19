import type { FotmobSquadMember, FotmobWorldCupPlayerStats } from "@/types/fotmob";
import { formatDateOfBirth, formatHeight, formatMarketValue, isDisplayableCountryCode } from "./format";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWorldCupStats(m: any): FotmobWorldCupPlayerStats {
  return {
    goals: Number(m?.goals ?? 0),
    assists: Number(m?.assists ?? 0),
    penalties: Number(m?.penalties ?? 0),
    yellowCards: Number(m?.ycards ?? 0),
    redCards: Number(m?.rcards ?? 0),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSquadMemberExtended(m: any): FotmobSquadMember {
  const role = m?.role?.fallback ?? m?.role?.key ?? undefined;
  const positionsDesc = m?.positionIdsDesc
    ? String(m.positionIdsDesc)
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean)
    : [];

  const rawCountry = m?.ccode ? String(m.ccode) : undefined;

  return {
    id: Number(m?.id ?? 0),
    name: String(m?.name ?? ""),
    shirtNumber: m?.shirtNumber != null ? Number(m.shirtNumber) : undefined,
    position: role,
    role: role,
    nationality: isDisplayableCountryCode(rawCountry) ? rawCountry : undefined,
    club: m?.cname ? String(m.cname) : undefined,
    injured: Boolean(m?.injured) || Boolean(m?.injury),
    age: m?.age != null ? Number(m.age) : undefined,
    heightCm: m?.height != null ? Number(m.height) : undefined,
    dateOfBirth: m?.dateOfBirth ? String(m.dateOfBirth) : undefined,
    positions: positionsDesc.length > 0 ? positionsDesc : undefined,
    marketValueEur: m?.transferValue != null ? Number(m.transferValue) : undefined,
    marketValueLabel: formatMarketValue(
      m?.transferValue != null ? Number(m.transferValue) : undefined
    ),
    heightLabel: formatHeight(m?.height != null ? Number(m.height) : undefined),
    birthLabel: formatDateOfBirth(
      m?.dateOfBirth ? String(m.dateOfBirth) : undefined,
      m?.age != null ? Number(m.age) : undefined
    ),
    worldCupStats: parseWorldCupStats(m),
  };
}
