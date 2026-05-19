"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackBar, Flag } from "./Shared";
import type { FotmobPlayerDetail } from "@/types/fotmob";

export function PlayerProfile({ playerId, teamCode }: { playerId: string; teamCode: string }) {
  const upper = teamCode.toUpperCase();
  const [detail, setDetail] = useState<FotmobPlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!upper) {
      setError("Missing team code — open a player from a team squad page.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/fotmob/player/${playerId}?team=${encodeURIComponent(upper)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
        }
        if (!cancelled) setDetail(data.detail);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load player");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [upper, playerId]);

  const player = detail?.player;
  const team = detail?.team;
  const wc = player?.worldCupStats;

  return (
    <div className="screen">
      <BackBar label={player ? `PLAYER · ${upper}` : `PLAYER`} />

      <div style={{ padding: "40px 56px 72px", maxWidth: 1100 }}>
        {loading && (
          <div className="serif it" style={{ fontSize: 24, color: "var(--ink-3)" }}>
            Loading player…
          </div>
        )}

        {!loading && error && (
          <div>
            <p className="serif" style={{ fontSize: 24 }}>
              {error}
            </p>
            {upper && (
              <Link href={`/team/${upper}`} className="btn" style={{ marginTop: 20, display: "inline-flex" }}>
                ← BACK TO {upper}
              </Link>
            )}
          </div>
        )}

        {!loading && player && team && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 48,
              alignItems: "start",
            }}
          >
            <div>
              <header style={{ display: "flex", alignItems: "flex-start", gap: 22, marginBottom: 36 }}>
                <Flag code={upper} w={64} h={42} />
                <div>
                  <div className="eyebrow">{team.name}</div>
                  <h1 className="headline" style={{ fontSize: 52, marginTop: 8, lineHeight: 1.05 }}>
                    {player.name}
                  </h1>
                  <p
                    className="mono"
                    style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 10, letterSpacing: "0.12em" }}
                  >
                    {player.shirtNumber != null ? `#${player.shirtNumber}` : ""}
                    {player.position ? ` · ${player.position}` : ""}
                    {player.positions?.length ? ` · ${player.positions.join(", ")}` : ""}
                  </p>
                  {player.injured && (
                    <p className="mono" style={{ fontSize: 11, color: "var(--pulse)", marginTop: 8 }}>
                      INJURY LISTED
                    </p>
                  )}
                </div>
              </header>

              <SectionTitle>Profile</SectionTitle>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 14,
                  marginTop: 14,
                }}
              >
                {player.club && <InfoCard label="Club" value={player.club} />}
                {player.birthLabel && <InfoCard label="Born" value={player.birthLabel} />}
                {player.heightLabel && <InfoCard label="Height" value={player.heightLabel} />}
                {player.marketValueLabel && (
                  <InfoCard label="Market value" value={player.marketValueLabel} />
                )}
                {team.fifaRank != null && (
                  <InfoCard
                    label="FIFA ranking"
                    value={`#${team.fifaRank}${team.fifaPoints != null ? ` · ${team.fifaPoints} pts` : ""}`}
                  />
                )}
                {team.groupLabel && <InfoCard label="World Cup" value={team.groupLabel} />}
              </div>

              <Link
                href={`/team/${upper}`}
                className="btn"
                style={{ marginTop: 28, display: "inline-flex", textDecoration: "none" }}
              >
                VIEW FULL SQUAD →
              </Link>
            </div>

            <div>
              <SectionTitle>FIFA World Cup 2026</SectionTitle>
              <p
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8, lineHeight: 1.5, maxWidth: 420 }}
              >
                Tournament totals from FotMob squad data for {team.name}. Stats update as matches are played.
              </p>

              {wc && (
                <div
                  style={{
                    marginTop: 20,
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                  }}
                >
                  <StatTile label="Goals" value={wc.goals} highlight={wc.goals > 0} />
                  <StatTile label="Assists" value={wc.assists} highlight={wc.assists > 0} />
                  <StatTile label="Penalties" value={wc.penalties} />
                  <StatTile label="Yellow cards" value={wc.yellowCards} />
                  <StatTile label="Red cards" value={wc.redCards} />
                  <StatTile
                    label="Goal involvements"
                    value={wc.goals + wc.assists}
                    highlight={wc.goals + wc.assists > 0}
                  />
                </div>
              )}

              {wc && wc.goals === 0 && wc.assists === 0 && (
                <p
                  className="serif it"
                  style={{
                    marginTop: 24,
                    fontSize: 18,
                    color: "var(--ink-3)",
                    padding: 20,
                    border: "1px dashed var(--rule)",
                    borderRadius: 10,
                  }}
                >
                  No goals or assists recorded yet in this tournament window — check back once group matches kick
                  off.
                </p>
              )}

              <div style={{ marginTop: 32 }}>
                <SectionTitle>Positions</SectionTitle>
                {player.positions && player.positions.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {player.positions.map((pos) => (
                      <span
                        key={pos}
                        className="mono"
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.1em",
                          padding: "6px 12px",
                          border: "1px solid var(--rule)",
                          borderRadius: 999,
                        }}
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 12 }}>
                    {player.position ?? "—"}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 18, border: "1px solid var(--rule)", borderRadius: 10, background: "var(--paper-2)" }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)" }}>
        {label.toUpperCase()}
      </div>
      <div className="serif" style={{ fontSize: 20, marginTop: 8, lineHeight: 1.25 }}>
        {value}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: "20px 16px",
        border: `1px solid ${highlight ? "var(--ink)" : "var(--rule)"}`,
        borderRadius: 12,
        background: highlight ? "var(--ink)" : "var(--paper-2)",
        color: highlight ? "var(--paper)" : "inherit",
        textAlign: "center",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: "0.14em",
          opacity: highlight ? 0.7 : 1,
          color: highlight ? "inherit" : "var(--ink-3)",
        }}
      >
        {label.toUpperCase()}
      </div>
      <div className="serif tnum" style={{ fontSize: 36, marginTop: 8, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
