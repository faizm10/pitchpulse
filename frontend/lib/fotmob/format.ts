/** Display helpers for FotMob numeric fields */

export function formatMarketValue(eur?: number): string | undefined {
  if (eur == null || !Number.isFinite(eur) || eur <= 0) return undefined;
  if (eur >= 1_000_000) return `€${(eur / 1_000_000).toFixed(1)}M`;
  if (eur >= 1_000) return `€${Math.round(eur / 1_000)}K`;
  return `€${eur}`;
}

export function formatHeight(cm?: number): string | undefined {
  if (cm == null || !Number.isFinite(cm)) return undefined;
  const feet = Math.floor(cm / 30.48);
  const inches = Math.round((cm / 2.54) % 12);
  return `${cm} cm (${feet}'${inches}")`;
}

export function formatDateOfBirth(iso?: string, age?: number): string | undefined {
  if (!iso) return age != null ? `Age ${age}` : undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return age != null ? `Age ${age}` : undefined;
  const formatted = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return age != null ? `${formatted} · Age ${age}` : formatted;
}

export function isDisplayableCountryCode(code?: string): boolean {
  if (!code) return false;
  return /^[A-Za-z]{2,3}$/.test(code.trim());
}
