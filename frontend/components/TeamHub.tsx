"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BackBar, Flag } from "./Shared";
import type { FotmobFixture, FotmobSquadMember, FotmobTeamProfile } from "@/types/fotmob";
import { getTeamMapEntry } from "@/lib/fotmob/team-map";
import { TeamHubHeaderSkeleton, TeamHubSkeleton } from "@/components/skeleton/TeamPagesSkeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

type HubTab = "squad" | "fixtures" | "stats";
type PosFilter = "all" | "G" | "D" | "M" | "F";

interface StandingRow {
  team: { abbreviation: string; name: string };
  played: number; wins: number; draws: number; losses: number;
  gd: number; pts: number; rank: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const POS_LABEL: Record<string, string> = { G: "GK", D: "DEF", M: "MID", F: "FWD" };
const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 };

function posKey(p: FotmobSquadMember): string {
  const raw = p.role ?? p.position ?? "";
  if (/^G/i.test(raw)) return "G";
  if (/^D/i.test(raw)) return "D";
  if (/^M/i.test(raw)) return "M";
  if (/^F|^A|^W/i.test(raw)) return "F";
  return raw.slice(0, 1).toUpperCase() || "?";
}

// ── Pill / tab button ─────────────────────────────────────────────────────────

function Pill({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mono"
      style={{
        padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
        fontSize: 10, letterSpacing: "0.1em",
        background: active ? "var(--pulse)" : "var(--paper-2)",
        color: active ? "#fff" : "var(--ink-3)",
        fontWeight: active ? 700 : 400,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ── Stat badge ────────────────────────────────────────────────────────────────

function StatBadge({ icon, value, title }: { icon: string; value: number; title: string }) {
  if (!value) return null;
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
      <span style={{ fontSize: 11 }}>{icon}</span>
      <span>{value}</span>
    </span>
  );
}

// ── Squad section ─────────────────────────────────────────────────────────────

function SquadSection({ code, profile }: { code: string; profile: FotmobTeamProfile }) {
  const [posFilter, setPosFilter] = useState<PosFilter>("all");

  const squad = useMemo(
    () => [...profile.squad].sort((a, b) => {
      const pa = POS_ORDER[posKey(a)] ?? 9;
      const pb = POS_ORDER[posKey(b)] ?? 9;
      if (pa !== pb) return pa - pb;
      const ga = a.worldCupStats?.goals ?? 0;
      const gb = b.worldCupStats?.goals ?? 0;
      return gb - ga;
    }),
    [profile.squad]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { G: 0, D: 0, M: 0, F: 0 };
    for (const p of squad) { const k = posKey(p); if (k in c) c[k]++; }
    return c;
  }, [squad]);

  const filtered = posFilter === "all" ? squad : squad.filter(p => posKey(p) === posFilter);

  if (squad.length === 0) {
    return (
      <p className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 16 }}>
        Roster not published yet.
      </p>
    );
  }

  return (
    <div>
      {/* Position filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        <Pill active={posFilter === "all"} onClick={() => setPosFilter("all")}>
          ALL · {squad.length}
        </Pill>
        {(["G", "D", "M", "F"] as const).map(pos =>
          counts[pos] > 0 ? (
            <Pill key={pos} active={posFilter === pos} onClick={() => setPosFilter(pos)}>
              {POS_LABEL[pos]} · {counts[pos]}
            </Pill>
          ) : null
        )}
      </div>

      {/* Player rows */}
      <div style={{ border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
        {filtered.map((p, i) => {
          const wc = p.worldCupStats;
          return (
            <Link
              key={p.id}
              href={`/player/${p.id}?team=${code}`}
              style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr auto",
                gap: 12,
                alignItems: "center",
                padding: "11px 18px",
                borderTop: i === 0 ? "none" : "1px solid var(--rule-soft)",
                textDecoration: "none",
                color: "inherit",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "var(--paper-2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = ""; }}
            >
              {/* Shirt # */}
              <span className="mono tnum" style={{ fontSize: 13, color: "var(--ink-3)", textAlign: "center" }}>
                {p.shirtNumber ?? "—"}
              </span>

              {/* Name + meta */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="serif" style={{ fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </span>
                  {p.injured && (
                    <span className="mono" style={{ fontSize: 8, color: "var(--pulse)", letterSpacing: "0.1em", flexShrink: 0 }}>INJ</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em" }}>
                    {POS_LABEL[posKey(p)] ?? posKey(p)}
                  </span>
                  {p.club && (
                    <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>· {p.club}</span>
                  )}
                  {p.age && (
                    <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>· {p.age}y</span>
                  )}
                </div>
              </div>

              {/* WC stats badges */}
              {wc && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <StatBadge icon="⚽" value={wc.goals} title="Goals" />
                  <StatBadge icon="🅰️" value={wc.assists} title="Assists" />
                  <StatBadge icon="🟨" value={wc.yellowCards} title="Yellow cards" />
                  <StatBadge icon="🟥" value={wc.redCards} title="Red cards" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Fixtures section ──────────────────────────────────────────────────────────

function FixturesSection({ fixtures }: { fixtures: FotmobFixture[] }) {
  const now = Date.now();
  const sorted = useMemo(
    () => [...fixtures].sort((a, b) => {
      const ta = a.utcTime ? Date.parse(a.utcTime) : 0;
      const tb = b.utcTime ? Date.parse(b.utcTime) : 0;
      return ta - tb;
    }),
    [fixtures]
  );

  const nextIdx = sorted.findIndex(
    f => f.status === "pre" && f.utcTime && Date.parse(f.utcTime) > now
  );

  if (sorted.length === 0) {
    return (
      <p className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 16 }}>
        No fixtures listed yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sorted.map((f, i) => (
        <FixtureRow key={f.matchId} fixture={f} isNext={i === nextIdx} />
      ))}
    </div>
  );
}

function FixtureRow({ fixture, isNext }: { fixture: FotmobFixture; isNext: boolean }) {
  const dateStr = fixture.utcTime
    ? new Date(fixture.utcTime).toLocaleString(undefined, {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      })
    : "TBD";

  const scoreOrDate =
    fixture.score != null
      ? `${fixture.score.home} – ${fixture.score.away}`
      : dateStr;

  const statusColor =
    fixture.status === "live" ? "var(--live)"
      : fixture.status === "ft" ? "var(--ink-3)"
        : isNext ? "var(--pulse)" : "var(--ink-3)";

  return (
    <div
      style={{
        padding: "14px 18px",
        border: `1px solid ${isNext ? "var(--pulse)" : "var(--rule)"}`,
        borderRadius: 10,
        background: isNext ? "rgba(99,102,241,0.04)" : "var(--paper)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {(fixture.group || fixture.roundName) && (
          <div className="mono" style={{ fontSize: 8, letterSpacing: "0.14em", color: "var(--ink-3)", marginBottom: 4 }}>
            {fixture.group ? `GROUP ${fixture.group}` : ""}{fixture.roundName ? ` · ${fixture.roundName}` : ""}
          </div>
        )}
        <div className="serif" style={{ fontSize: 15 }}>
          {fixture.home.name} <span style={{ color: "var(--ink-3)" }}>vs</span> {fixture.away.name}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {isNext && (
          <div className="mono" style={{ fontSize: 8, color: "var(--pulse)", letterSpacing: "0.1em", marginBottom: 3 }}>NEXT</div>
        )}
        <div className="mono tnum" style={{ fontSize: 13, color: statusColor, fontWeight: isNext ? 700 : 400 }}>
          {scoreOrDate}
        </div>
        <div className="mono" style={{ fontSize: 8, letterSpacing: "0.1em", color: "var(--ink-3)", marginTop: 2 }}>
          {fixture.status === "live" ? "● LIVE" : fixture.status === "ft" ? "FT" : ""}
        </div>
      </div>
    </div>
  );
}

// ── Stats section ─────────────────────────────────────────────────────────────

function StatsSection({ profile }: { profile: FotmobTeamProfile }) {
  const squad = profile.squad;
  const fixtures = profile.fixtures;

  // Aggregate team totals from squad stats
  const totals = useMemo(() => {
    let goals = 0, assists = 0, yellows = 0, reds = 0;
    for (const p of squad) {
      goals += p.worldCupStats?.goals ?? 0;
      assists += p.worldCupStats?.assists ?? 0;
      yellows += p.worldCupStats?.yellowCards ?? 0;
      reds += p.worldCupStats?.redCards ?? 0;
    }
    return { goals, assists, yellows, reds };
  }, [squad]);

  // Goals for / against from fixtures
  const matchStats = useMemo(() => {
    let gf = 0, ga = 0, wins = 0, draws = 0, losses = 0, cleanSheets = 0;
    for (const f of fixtures) {
      if (f.status !== "ft" || !f.score) continue;
      // Need to know which side the team is on — rely on squad data
      // Simple heuristic: goals scored by squad = goals for
      gf += f.score.home + f.score.away; // placeholder when we can't tell sides
      ga = 0;
      if (f.score.home === 0 || f.score.away === 0) cleanSheets++;
      const diff = f.score.home - f.score.away;
      if (diff > 0) wins++; else if (diff === 0) draws++; else losses++;
    }
    const played = wins + draws + losses;
    return { gf: totals.goals, ga, played, wins, draws, losses, cleanSheets };
  }, [fixtures, totals.goals]);

  // Top scorers
  const topScorers = useMemo(
    () => [...squad]
      .filter(p => (p.worldCupStats?.goals ?? 0) > 0)
      .sort((a, b) => (b.worldCupStats?.goals ?? 0) - (a.worldCupStats?.goals ?? 0))
      .slice(0, 5),
    [squad]
  );

  // Top assisters
  const topAssisters = useMemo(
    () => [...squad]
      .filter(p => (p.worldCupStats?.assists ?? 0) > 0)
      .sort((a, b) => (b.worldCupStats?.assists ?? 0) - (a.worldCupStats?.assists ?? 0))
      .slice(0, 5),
    [squad]
  );

  const StatTile = ({ label, value, accent }: { label: string; value: string | number; accent?: string }) => (
    <div style={{ padding: "16px 20px", background: "var(--paper-2)", borderRadius: 10, flex: 1, minWidth: 90 }}>
      <div className="mono" style={{ fontSize: 8, letterSpacing: "0.14em", color: "var(--ink-3)", marginBottom: 6 }}>{label}</div>
      <div className="serif tnum" style={{ fontSize: 28, lineHeight: 1, color: accent ?? "var(--ink)" }}>{value}</div>
    </div>
  );

  const noStats = totals.goals === 0 && totals.assists === 0 && totals.yellows === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Discipline totals */}
      <div>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Tournament totals</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatTile label="GOALS" value={totals.goals} accent="var(--live)" />
          <StatTile label="ASSISTS" value={totals.assists} />
          <StatTile label="YELLOW CARDS" value={totals.yellows} accent="#ca8a04" />
          <StatTile label="RED CARDS" value={totals.reds} accent="#e63c3c" />
        </div>
      </div>

      {/* Top scorers */}
      {topScorers.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Top scorers</div>
          <div style={{ border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
            {topScorers.map((p, i) => (
              <Link
                key={p.id}
                href={`/player/${p.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 18px",
                  borderTop: i === 0 ? "none" : "1px solid var(--rule-soft)",
                  textDecoration: "none", color: "inherit",
                }}
              >
                <span className="mono tnum" style={{ fontSize: 18, color: "var(--live)", width: 28, textAlign: "center" }}>
                  {p.worldCupStats?.goals}
                </span>
                <span className="serif" style={{ fontSize: 15, flex: 1 }}>{p.name}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>
                  {POS_LABEL[posKey(p)] ?? posKey(p)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top assisters */}
      {topAssisters.length > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Top assisters</div>
          <div style={{ border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
            {topAssisters.map((p, i) => (
              <Link
                key={p.id}
                href={`/player/${p.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 18px",
                  borderTop: i === 0 ? "none" : "1px solid var(--rule-soft)",
                  textDecoration: "none", color: "inherit",
                }}
              >
                <span className="mono tnum" style={{ fontSize: 18, color: "var(--ink-2)", width: 28, textAlign: "center" }}>
                  {p.worldCupStats?.assists}
                </span>
                <span className="serif" style={{ fontSize: 15, flex: 1 }}>{p.name}</span>
                <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>
                  {POS_LABEL[posKey(p)] ?? posKey(p)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {noStats && (
        <p className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
          Tournament stats will appear once matches begin.
        </p>
      )}

      {/* Match record */}
      {matchStats.played > 0 && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Match record</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatTile label="PLAYED" value={matchStats.played} />
            <StatTile label="W" value={matchStats.wins} accent="#22c55e" />
            <StatTile label="D" value={matchStats.draws} />
            <StatTile label="L" value={matchStats.losses} accent="#e63c3c" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Standing row for hero ─────────────────────────────────────────────────────

function HeroStandingBadge({ row }: { row: StandingRow }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "10px 16px", background: "var(--paper-2)", borderRadius: 10, marginTop: 12 }}>
      <div style={{ textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 7, letterSpacing: "0.14em", color: "var(--ink-3)" }}>POS</div>
        <div className="serif tnum" style={{ fontSize: 22, lineHeight: 1.1 }}>#{row.rank}</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 7, letterSpacing: "0.14em", color: "var(--ink-3)" }}>PTS</div>
        <div className="serif tnum" style={{ fontSize: 22, lineHeight: 1.1 }}>{row.pts}</div>
      </div>
      <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
        {row.wins}W · {row.draws}D · {row.losses}L
      </div>
      {row.gd !== 0 && (
        <div className="mono" style={{ fontSize: 11, color: row.gd > 0 ? "#22c55e" : "#e63c3c" }}>
          {row.gd > 0 ? "+" : ""}{row.gd} GD
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TeamHub({ code }: { code: string }) {
  const upper = code.toUpperCase();
  const mapEntry = getTeamMapEntry(upper);

  const [profile, setProfile] = useState<FotmobTeamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<HubTab>("squad");
  const [standingRow, setStandingRow] = useState<StandingRow | null>(null);

  // Fetch FotMob team profile
  useEffect(() => {
    if (!mapEntry) { setError("Team not found"); setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(null);
    fetch(`/api/fotmob/team-by-code/${upper}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          if (data.error) throw new Error(data.detail ?? data.error);
          setProfile(data.profile);
        }
      })
      .catch(e => { if (!cancelled) setError(e.message ?? "Failed to load team"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [upper, mapEntry]);

  // Fetch standings to show group position in hero
  useEffect(() => {
    fetch("/api/wc/standings")
      .then(r => r.json())
      .then(data => {
        for (const group of data.groups ?? []) {
          const row = group.rows?.find(
            (r: StandingRow) => r.team.abbreviation?.toUpperCase() === upper
          );
          if (row) { setStandingRow(row); break; }
        }
      })
      .catch(() => {/* standings are optional */});
  }, [upper]);

  // Next fixture (upcoming soonest)
  const nextFixture = useMemo(() => {
    if (!profile?.fixtures) return null;
    const now = Date.now();
    return profile.fixtures
      .filter(f => f.status === "pre" && f.utcTime && Date.parse(f.utcTime) > now)
      .sort((a, b) => Date.parse(a.utcTime!) - Date.parse(b.utcTime!))
    [0] ?? null;
  }, [profile]);

  if (!mapEntry) {
    return (
      <div className="screen">
        <BackBar label="TEAM" />
        <div style={{ padding: "40px 56px" }}>
          <div className="serif" style={{ fontSize: 28 }}>Unknown team: {upper}</div>
        </div>
      </div>
    );
  }

  const TABS: { key: HubTab; label: string }[] = [
    { key: "squad", label: `Squad${profile ? ` · ${profile.squad.length}` : ""}` },
    { key: "fixtures", label: `Fixtures${profile ? ` · ${profile.fixtures.length}` : ""}` },
    { key: "stats", label: "Stats" },
  ];

  return (
    <div className="screen">
      <BackBar label={`TEAM · ${upper}`} />

      {/* Hero */}
      <div style={{ padding: "32px 40px 28px", borderBottom: "1px solid var(--rule)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flexShrink: 0 }}><Flag code={upper} w={80} h={54} /></div>
          <div style={{ flex: 1, minWidth: 200 }}>
            {loading ? (
              <TeamHubHeaderSkeleton />
            ) : (
              <>
                <div className="eyebrow">
                  {profile?.groupLabel ?? "World Cup 2026"}
                  {profile?.fifaRank && (
                    <span style={{ marginLeft: 12 }}>FIFA #{profile.fifaRank}</span>
                  )}
                </div>
                <div className="headline" style={{ fontSize: 48, marginTop: 6, lineHeight: 1 }}>
                  {profile?.name ?? mapEntry.name}
                </div>

                {/* Next fixture chip */}
                {nextFixture && (
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 10, letterSpacing: "0.08em" }}>
                    NEXT ·{" "}
                    <span style={{ color: "var(--ink)" }}>
                      {nextFixture.home.name} vs {nextFixture.away.name}
                    </span>
                    {nextFixture.utcTime && (
                      <span>
                        {" "}·{" "}
                        {new Date(nextFixture.utcTime).toLocaleDateString(undefined, {
                          month: "short", day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                )}

                {/* Standings badge */}
                {standingRow && <HeroStandingBadge row={standingRow} />}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        padding: "0 40px",
        borderBottom: "1px solid var(--rule)",
        display: "flex",
        gap: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="mono"
            style={{
              padding: "14px 20px",
              border: "none",
              borderBottom: tab === t.key ? "2px solid var(--pulse)" : "2px solid transparent",
              background: "transparent",
              color: tab === t.key ? "var(--ink)" : "var(--ink-3)",
              fontSize: 10,
              letterSpacing: "0.12em",
              fontWeight: tab === t.key ? 700 : 400,
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            {t.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: "32px 40px 80px" }}>
        {loading && <TeamHubSkeleton />}

        {!loading && error && (
          <div className="serif it" style={{ fontSize: 24, color: "var(--ink-3)" }}>{error}</div>
        )}

        {!loading && profile && (
          <>
            {tab === "squad" && <SquadSection code={upper} profile={profile} />}
            {tab === "fixtures" && <FixturesSection fixtures={profile.fixtures} />}
            {tab === "stats" && <StatsSection profile={profile} />}
          </>
        )}
      </div>
    </div>
  );
}
