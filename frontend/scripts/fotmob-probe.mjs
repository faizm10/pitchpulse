#!/usr/bin/env node
/**
 * Quick FotMob API probe for World Cup league (id=77).
 * Usage: node scripts/fotmob-probe.mjs
 */

const LEAGUE_ID = 77;
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; PitchPulse/1.0)",
  Referer: "https://www.fotmob.com/",
  Accept: "application/json",
};

async function get(path) {
  const url = `https://www.fotmob.com/api/data/${path}`;
  const res = await fetch(url, { headers: HEADERS });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, json, snippet: text.slice(0, 120) };
}

async function main() {
  console.log("FotMob probe — league", LEAGUE_ID);

  const league = await get(`leagues?id=${LEAGUE_ID}`);
  console.log("\nleagues:", league.status);
  if (league.json?.table) {
    const tables = league.json.table?.[0]?.data?.tables ?? [];
    console.log("  groups:", tables.length);
    const teams = new Set();
    for (const t of tables) {
      for (const row of t.table?.all ?? []) {
        if (row.id) teams.add(row.id);
      }
    }
    console.log("  unique teams:", teams.size);
  }

  const mexico = await get("teams?id=6710");
  console.log("\nteams (Mexico 6710):", mexico.status);
  if (mexico.json?.squad) {
    const sections = mexico.json.squad?.squad ?? [];
    const count = sections.reduce((n, s) => n + (s.members?.length ?? 0), 0);
    console.log("  squad members:", count);
  }

  const matchDetails = await get("matchDetails?matchId=1");
  console.log("\nmatchDetails (sample):", matchDetails.status, matchDetails.snippet);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
