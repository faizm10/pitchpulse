"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackBar, Flag } from "./Shared";
import type { FotmobFixture, FotmobTeamProfile } from "@/types/fotmob";
import { getTeamMapEntry } from "@/lib/fotmob/team-map";

export function TeamHub({ code }: { code: string }) {
  const upper = code.toUpperCase();
  const mapEntry = getTeamMapEntry(upper);
  const [profile, setProfile] = useState<FotmobTeamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!mapEntry) {
        setError("Team not in FotMob map");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/fotmob/team-by-code/${upper}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
        }
        if (!cancelled) setProfile(data.profile);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load team");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [upper, mapEntry]);

  if (!mapEntry) {
    return (
      <div className="screen">
        <BackBar label="TEAM" />
        <div style={{ padding: "40px 56px" }}>
          <div className="serif" style={{ fontSize: 28 }}>
            Unknown team: {upper}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackBar label={`TEAM · ${upper}`} />

      <div
        style={{
          padding: "40px 56px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <Flag code={upper} w={72} h={48} />
        <div>
          <div className="eyebrow">Squad & fixtures</div>
          <div className="headline" style={{ fontSize: 56, marginTop: 8 }}>
            {profile?.name ?? mapEntry.name}
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 10, letterSpacing: "0.14em" }}
          >
            FOTMOB · WORLD CUP 2026
          </div>
        </div>
      </div>

      <div style={{ padding: "40px 56px 80px" }}>
        {loading && (
          <div className="serif it" style={{ fontSize: 24, color: "var(--ink-3)" }}>
            Loading squad…
          </div>
        )}
        {!loading && error && (
          <div className="serif it" style={{ fontSize: 24, color: "var(--ink-3)" }}>
            {error}
          </div>
        )}
        {!loading && profile && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 48 }}>
            <SquadSection code={upper} profile={profile} />
            <FixturesSection fixtures={profile.fixtures} />
          </div>
        )}
      </div>
    </div>
  );
}

function SquadSection({ code, profile }: { code: string; profile: FotmobTeamProfile }) {
  const squad = profile.squad;
  if (squad.length === 0) {
    return (
      <section>
        <SectionTitle>Squad</SectionTitle>
        <p className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 12 }}>
          Roster not published yet.
        </p>
      </section>
    );
  }

  return (
    <section>
      <SectionTitle>Squad · {squad.length} players</SectionTitle>
      <div style={{ marginTop: 16, border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
        {squad.map((p, i) => (
          <Link
            key={p.id}
            href={`/player/${p.id}?team=${code}`}
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr auto auto",
              gap: 12,
              alignItems: "center",
              padding: "12px 18px",
              borderTop: i === 0 ? "none" : "1px solid var(--rule-soft)",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span className="mono tnum" style={{ fontSize: 14, color: "var(--ink-3)" }}>
              {p.shirtNumber ?? "—"}
            </span>
            <span className="serif" style={{ fontSize: 17 }}>
              {p.name}
              {p.injured ? (
                <span className="mono" style={{ fontSize: 9, color: "var(--pulse)", marginLeft: 8 }}>
                  INJ
                </span>
              ) : null}
            </span>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em" }}>
              {p.position ?? p.role ?? ""}
            </span>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
              {p.club ?? ""}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function FixturesSection({ fixtures }: { fixtures: FotmobFixture[] }) {
  const sorted = [...fixtures].sort((a, b) => {
    const ta = a.utcTime ? Date.parse(a.utcTime) : 0;
    const tb = b.utcTime ? Date.parse(b.utcTime) : 0;
    return ta - tb;
  });

  return (
    <section>
      <SectionTitle>World Cup fixtures</SectionTitle>
      {sorted.length === 0 ? (
        <p className="mono" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 12 }}>
          No fixtures listed yet.
        </p>
      ) : (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((f) => (
            <FixtureRow key={f.matchId} fixture={f} />
          ))}
        </div>
      )}
    </section>
  );
}

function FixtureRow({ fixture }: { fixture: FotmobFixture }) {
  const score =
    fixture.score != null
      ? `${fixture.score.home} – ${fixture.score.away}`
      : fixture.utcTime
        ? new Date(fixture.utcTime).toLocaleString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "TBD";

  return (
    <div
      style={{
        padding: "14px 18px",
        border: "1px solid var(--rule)",
        borderRadius: 10,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {fixture.group && (
        <span className="mono" style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)" }}>
          GROUP {fixture.group} · {fixture.status.toUpperCase()}
        </span>
      )}
      <div className="serif" style={{ fontSize: 16 }}>
        {fixture.home.name} vs {fixture.away.name}
      </div>
      <div className="mono tnum" style={{ fontSize: 12, color: "var(--ink-2)" }}>
        {score}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}
