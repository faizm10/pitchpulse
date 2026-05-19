const FOTMOB_BASE = "https://www.fotmob.com/api/data";

const DEFAULT_HEADERS: HeadersInit = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.fotmob.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export const FOTMOB_WC_LEAGUE_ID = 77;

export function isFotmobEnabled(): boolean {
  return process.env.FOTMOB_ENABLED !== "0";
}

export class FotmobError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "FotmobError";
  }
}

export async function fotmobFetch<T>(
  path: string,
  params?: Record<string, string | number>
): Promise<T> {
  if (!isFotmobEnabled()) {
    throw new FotmobError("FotMob integration is disabled", 503, "DISABLED");
  }

  const url = new URL(`${FOTMOB_BASE}/${path.replace(/^\//, "")}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    headers: DEFAULT_HEADERS,
    next: { revalidate: 60 },
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new FotmobError("Invalid JSON from FotMob", res.status, "PARSE");
  }

  if (!res.ok) {
    const err = data as { error?: string; code?: string } | null;
    throw new FotmobError(
      err?.error ?? `FotMob request failed (${res.status})`,
      res.status,
      err?.code
    );
  }

  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    (data as { code?: string }).code === "TURNSTILE_REQUIRED"
  ) {
    throw new FotmobError("FotMob verification required", 403, "TURNSTILE_REQUIRED");
  }

  return data as T;
}

export async function fetchLeagueRaw(leagueId = FOTMOB_WC_LEAGUE_ID) {
  return fotmobFetch<Record<string, unknown>>("leagues", { id: leagueId });
}

export async function fetchTeamRaw(teamId: number) {
  return fotmobFetch<Record<string, unknown>>("teams", { id: teamId });
}

/** Often empty or blocked; kept for future use. */
export async function fetchMatchDetailsRaw(matchId: string) {
  return fotmobFetch<Record<string, unknown>>("matchDetails", { matchId });
}
