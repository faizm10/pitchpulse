export const dynamic = 'force-dynamic';

// ESPN's actual citizenshipCountry.abbreviation values → ISO 3166-1 alpha-2
// Many differ from standard IOC/FIFA codes — verified against live ESPN data.
const ESPN_CODE_TO_ALPHA2: Record<string, string> = {
  // Standard codes that match
  ALG: 'DZ', ARG: 'AR', AUS: 'AU', AUT: 'AT', BEL: 'BE', BIH: 'BA',
  BRA: 'BR', CAN: 'CA', CPV: 'CV', COL: 'CO', CRO: 'HR', CUW: 'CW',
  CZE: 'CZ', ECU: 'EC', EGY: 'EG', FRA: 'FR', GER: 'DE', GHA: 'GH',
  HAI: 'HT', IRN: 'IR', IRQ: 'IQ', JOR: 'JO', JPN: 'JP', KSA: 'SA',
  MEX: 'MX', NED: 'NL', NOR: 'NO', NZL: 'NZ', PAN: 'PA', PAR: 'PY',
  POR: 'PT', QAT: 'QA', RSA: 'ZA', SEN: 'SN', ESP: 'ES', SWE: 'SE',
  SUI: 'CH', TUN: 'TN', TUR: 'TR', URU: 'UY', USA: 'US', UZB: 'UZ',
  // ESPN-specific non-standard codes
  KORS: 'KR', // South Korea (ESPN appends S to distinguish from North Korea)
  MOR:  'MA', // Morocco
  RDC:  'CD', // Congo DR (République Démocratique du Congo)
  ENG:  'GB', // England (no standalone flag; use UK)
  SCO:  'GB', // Scotland
  WAL:  'GB', // Wales
  CHI:  'CL', // Chile
  GRE:  'GR', // Greece
  DEN:  'DK', // Denmark
  IRL:  'IE', // Ireland
  PHI:  'PH', // Philippines
};

// Fallback: flag.alt country name → alpha-2 (handles dual-national edge cases)
const COUNTRY_NAME_TO_ALPHA2: Record<string, string> = {
  Algeria: 'DZ', Argentina: 'AR', Australia: 'AU', Austria: 'AT',
  Belgium: 'BE', 'Bosnia-Herzegovina': 'BA', Brazil: 'BR', Canada: 'CA',
  'Cape Verde': 'CV', 'Cape Verde Islands': 'CV', Colombia: 'CO',
  'Congo DR': 'CD', Croatia: 'HR', 'Curaçao': 'CW', Czechia: 'CZ',
  Ecuador: 'EC', Egypt: 'EG', England: 'GB', France: 'FR', Germany: 'DE',
  Ghana: 'GH', Haiti: 'HT', Iran: 'IR', Iraq: 'IQ', 'Ivory Coast': 'CI',
  Japan: 'JP', Jordan: 'JO', Mexico: 'MX', Morocco: 'MA',
  Netherlands: 'NL', 'New Zealand': 'NZ', Norway: 'NO', Panama: 'PA',
  Paraguay: 'PY', Portugal: 'PT', Qatar: 'QA', 'Saudi Arabia': 'SA',
  Scotland: 'GB', Senegal: 'SN', 'South Africa': 'ZA', 'South Korea': 'KR',
  Spain: 'ES', Sweden: 'SE', Switzerland: 'CH', Tunisia: 'TN',
  'Türkiye': 'TR', Turkey: 'TR', 'United States': 'US', USA: 'US',
  Uruguay: 'UY', Uzbekistan: 'UZ', Wales: 'GB',
};

function toFlagEmoji(alpha2: string): string {
  if (!alpha2 || alpha2.length !== 2) return '';
  return Array.from(alpha2.toUpperCase())
    .map(c => String.fromCodePoint(c.charCodeAt(0) - 65 + 0x1F1E6))
    .join('');
}

function resolveFlag(ccAbbr: string, flagAlt: string): string {
  // 1. Try ESPN code lookup
  const fromCode = ESPN_CODE_TO_ALPHA2[ccAbbr?.toUpperCase() ?? ''];
  if (fromCode) return toFlagEmoji(fromCode);
  // 2. Try country name lookup (handles dual nationals / edge cases)
  const fromName = COUNTRY_NAME_TO_ALPHA2[flagAlt];
  if (fromName) return toFlagEmoji(fromName);
  return '';
}

const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };

interface ESPNAthlete {
  id: string;
  displayName: string;
  shortName: string;
  firstName: string;
  lastName: string;
  position?: { abbreviation: string; name: string };
  jersey?: string | null;
  citizenshipCountry?: { abbreviation: string };
  flag?: { alt: string };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${teamId}/roster`,
      { cache: 'no-store' }
    );
    if (!res.ok) return Response.json({ players: [] });

    const data = await res.json();
    const raw: ESPNAthlete[] = data.athletes ?? [];

    const players = raw
      .map(a => {
        const ccAbbr = a.citizenshipCountry?.abbreviation ?? '';
        const flagAlt = a.flag?.alt ?? '';
        return {
          id: a.id,
          name: a.displayName,
          shortName: a.shortName,
          firstName: a.firstName ?? '',
          lastName: a.lastName ?? '',
          position: a.position?.abbreviation ?? '?',
          positionName: a.position?.name ?? '',
          jersey: a.jersey ?? null,
          countryCode: ccAbbr,
          flagEmoji: resolveFlag(ccAbbr, flagAlt),
          flagAlt,
        };
      })
      .sort((a, b) => (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9));

    return Response.json({ players });
  } catch {
    return Response.json({ players: [] });
  }
}
