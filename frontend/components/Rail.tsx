'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { teams } from '@/lib/data';
import { Flag, FormDots, ago } from './Shared';
import { useTweaks, useTeamFollow } from './Providers';
import { TeamTravelStats } from './rail/TeamTravelStats';
import { GroupFinishToggle } from './rail/GroupFinishToggle';
import { TournamentPath } from './rail/TournamentPath';
import { JourneyStopsList } from './rail/JourneyStopsList';
import { useLiveForms } from '@/hooks/useLiveForms';
import type { Match } from '@/types/espn';
import type { FormResult } from '@/lib/types';

interface StandingsRow {
  team: { id: string; name: string; abbreviation: string; logo: string | null };
  played: number; wins: number; draws: number; losses: number; gd: number; pts: number; rank: number;
}
interface StandingsGroup { name: string; abbreviation: string; rows: StandingsRow[]; }
interface GoalPulseEvent {
  id: string;
  matchId: string;
  minute: number;
  scorer: string;
  team: string;
  venueCity: string;
  timestamp: number; // ← changed from string to number
}

import { buildPredictionNarrative, fetchPrediction } from '@/lib/predict';
import { useTypewriter } from '@/hooks/useTypewriter';
import { getTeamBannerStyle } from '@/lib/teamColor';

function findGroupForTeam(
  groups: StandingsGroup[],
  teamCode: string | null,
): StandingsGroup | null {
  if (!teamCode || !teams[teamCode]) return null;
  const letter = teams[teamCode].group.toUpperCase();
  return (
    groups.find(
      (g) =>
        g.abbreviation?.toUpperCase().endsWith(letter) ||
        g.name?.toUpperCase().includes(`GROUP ${letter}`) ||
        g.abbreviation?.toUpperCase() === letter,
    ) ?? null
  );
}

export function Rail() {
  const { tweaks } = useTweaks();
  const {
    myTeam,
    journey,
    scenario,
    teamColor,
    openTeamPicker,
    setScenario,
    replayJourney,
  } = useTeamFollow();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('pp-banner-dismissed') === '1') setBannerDismissed(true);
    } catch {}
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    try { localStorage.setItem('pp-banner-dismissed', '1'); } catch {}
  };
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]); // top-5 for "UP NEXT"
  const [allUpcoming, setAllUpcoming] = useState<Match[]>([]); // full list for team search
  const [standingsGroups, setStandingsGroups] = useState<StandingsGroup[]>([]);
  const [groupIdx, setGroupIdx] = useState(0);
  const [railNarrative, setRailNarrative] = useState('');
  const [goalPulses, setGoalPulses] = useState<GoalPulseEvent[]>([]);

  useEffect(() => {
    if (!tweaks.aiSummary || liveMatches.length === 0) {
      setRailNarrative('');
      return;
    }
    const featured = liveMatches[0];
    let cancelled = false;
    fetchPrediction(featured.homeTeam.name, featured.awayTeam.name)
      .then((p) => {
        if (!cancelled) setRailNarrative(buildPredictionNarrative(p));
      })
      .catch(() => {
        if (!cancelled) setRailNarrative('');
      });
    return () => {
      cancelled = true;
    };
  }, [liveMatches, tweaks.aiSummary]);

  const { display: aiText, isTyping } = useTypewriter(
    railNarrative,
    tweaks.aiSummary && railNarrative.length > 0
  );

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch('/api/scores');
        const data = await res.json();
        const all: Match[] = data.matches ?? [];
        
        const live = all.filter((m) => m.state === 'in');
        setLiveMatches(live);
        
        const pre = all
          .filter((m) => m.state === 'pre')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setAllUpcoming(pre);           // full list — used for myTeam next-match lookup
        setUpcomingMatches(pre.slice(0, 5)); // top 5 shown in UP NEXT

        // ── DYNAMIC GOAL PULSE EXTRACTION ──────────────────────────────
        const freshPulses: GoalPulseEvent[] = [];
        live.forEach((match) => {
          const events = (match as any).events ?? (match as any).details ?? [];
          const currentCity = match.venue?.city ?? 'Live Match';
          
          if (Array.isArray(events)) {
            events.forEach((evt: any, idx: number) => {
              if (String(evt.type).toLowerCase() === 'goal') {
                freshPulses.push({
                  id: evt.id ?? `${match.id}-${evt.clock}-${evt.player?.id ?? idx}`,
                  matchId: match.id,
                  minute: parseInt(String(evt.clock ?? evt.minute ?? '0'), 10),
                  scorer: evt.player?.displayName ?? evt.scorer ?? 'Goal Scored',
                  team: String(evt.team?.id ?? '').toLowerCase(),
                  venueCity: currentCity,
                  // ← convert ISO string to numeric ms timestamp for ago()
                  timestamp: evt.timestamp ? new Date(evt.timestamp).getTime() : Date.now(),
                });
              }
            });
          }
        });

        setGoalPulses(freshPulses.sort((a, b) => b.minute - a.minute));

      } catch (err) {
        console.error("Error streaming live updates:", err);
      }
    }
    
    async function loadStandings() {
      try {
        const res = await fetch('/api/wc/standings');
        const data = await res.json();
        setStandingsGroups(data.groups ?? []);
      } catch {}
    }
    
    loadMatches();
    loadStandings();
    const interval = setInterval(loadMatches, 30000);
    return () => clearInterval(interval);
  }, []);

  const pinnedGroup = useMemo(
    () => (myTeam ? findGroupForTeam(standingsGroups, myTeam) : null),
    [myTeam, standingsGroups],
  );

  const displayGroup = myTeam && pinnedGroup ? pinnedGroup : standingsGroups[groupIdx % standingsGroups.length] ?? null;

  const teamUpcoming = useMemo(() => {
    if (!myTeam) return upcomingMatches;
    return allUpcoming
      .filter(
        (m) =>
          m.homeTeam.abbreviation.toUpperCase() === myTeam.toUpperCase() ||
          m.awayTeam.abbreviation.toUpperCase() === myTeam.toUpperCase(),
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [myTeam, allUpcoming, upcomingMatches]);

  const followingTeam = Boolean(myTeam && journey);

  return (
    <aside className="rail">
      <MyTeamBanner myTeam={myTeam} onFollow={openTeamPicker} onChangeTeam={openTeamPicker} dismissed={bannerDismissed} onDismiss={dismissBanner} />

      {/* Live first when browsing without a followed team */}
      {!followingTeam && (
        <div className="rail-section">
          <div className="rail-h">
            <span>LIVE NOW · {liveMatches.length}</span>
            {liveMatches.length > 0 ? (
              <span style={{ color: 'var(--live)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="status-dot live" /> ON AIR
              </span>
            ) : (
              <span style={{ fontSize: 9, color: 'var(--ink-3)' }}>OFF AIR</span>
            )}
          </div>
          {liveMatches.length > 0 ? (
            liveMatches.map((m) => <LiveMatchRow key={m.id} m={m} />)
          ) : (
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', padding: '8px 0' }}>
              No live matches right now.
            </div>
          )}
        </div>
      )}

      {/* Group standings — pinned near top when following a team */}
      {displayGroup && (
        <div className="rail-section">
          <div className="rail-h">
            <span>{displayGroup.name.toUpperCase()} · STANDINGS</span>
            {!myTeam && standingsGroups.length > 1 && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setGroupIdx((i) => (i - 1 + standingsGroups.length) % standingsGroups.length)}
                  style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 4, width: 22, height: 18, cursor: 'pointer', fontSize: 12, color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
                >‹</button>
                <span style={{ fontSize: 9, color: 'var(--ink-3)', minWidth: 32, textAlign: 'center' }}>{groupIdx + 1}/{standingsGroups.length}</span>
                <button
                  type="button"
                  onClick={() => setGroupIdx((i) => (i + 1) % standingsGroups.length)}
                  style={{ background: 'none', border: '1px solid var(--rule)', borderRadius: 4, width: 22, height: 18, cursor: 'pointer', fontSize: 12, color: 'var(--ink-3)', display: 'grid', placeItems: 'center' }}
                >›</button>
              </div>
            )}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: 11 }}>
            <thead>
              <tr style={{ color: 'var(--ink-3)', fontSize: 9, letterSpacing: '0.14em' }}>
                <th style={{ textAlign: 'left', padding: '6px 0' }}>TEAM</th>
                <th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>PTS</th>
              </tr>
            </thead>
            <tbody>
              {displayGroup.rows.map((row, i) => {
                const isFollowed =
                  myTeam &&
                  row.team.abbreviation.toUpperCase() === myTeam.toUpperCase();
                return (
                  <tr
                    key={row.team.id}
                    style={{
                      borderTop: '1px dashed var(--rule-soft)',
                      background: isFollowed ? 'rgba(14,22,38,0.06)' : undefined,
                    }}
                  >
                    <td style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 16, color: 'var(--ink-3)', fontSize: 10 }}>{i + 1}</span>
                      {row.team.logo
                        ? <img src={row.team.logo} alt={row.team.abbreviation} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                        : <Flag code={row.team.abbreviation} w={18} h={12} />}
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: isFollowed ? 600 : 400 }}>{row.team.name}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{row.played}</td>
                    <td style={{ textAlign: 'center' }}>{row.wins}</td>
                    <td style={{ textAlign: 'center' }}>{row.draws}</td>
                    <td style={{ textAlign: 'center' }}>{row.losses}</td>
                    <td style={{ textAlign: 'center' }}>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--ink)' }}>{row.pts}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Up next — chronological fixture list (no duplicate top "next match" card) */}
      <div className="rail-section">
        <div className="rail-h">
          <span>{myTeam ? `${teams[myTeam]?.name?.toUpperCase() ?? 'TEAM'} · UP NEXT` : 'UP NEXT'}</span>
          <span style={{ fontSize: 9 }}>{teamUpcoming.length > 0 ? `${teamUpcoming.length} MATCHES` : ''}</span>
        </div>
        {teamUpcoming.length === 0 ? (
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', padding: '8px 0' }}>No upcoming matches.</div>
        ) : (
          teamUpcoming.map((m) => <UpcomingMatchRow key={m.id} m={m} />)
        )}
      </div>

      {/* Live — after standings/up next when following; only if something is on air */}
      {followingTeam && liveMatches.length > 0 && (
        <div className="rail-section">
          <div className="rail-h">
            <span>LIVE NOW · {liveMatches.length}</span>
            <span style={{ color: 'var(--live)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="status-dot live" /> ON AIR
            </span>
          </div>
          {liveMatches.map((m) => <LiveMatchRow key={m.id} m={m} />)}
        </div>
      )}

      {followingTeam && (
        <div className="rail-section rail-team-journey">
          <TeamTravelStats journey={journey!} />
          <GroupFinishToggle
            teamCode={myTeam!}
            scenario={scenario}
            onScenarioChange={setScenario}
          />
          <JourneyStopsList stops={journey!.stops} />
          <TournamentPath journey={journey!} teamColor={teamColor} />
          <div className="rail-team-actions">
            <button type="button" className="btn btn-sm" onClick={replayJourney}>
              Replay journey
            </button>
          </div>
        </div>
      )}

      {goalPulses.length > 0 && (
        <div className="rail-section">
          <div className="rail-h">
            <span>GOAL PULSES</span>
            <span style={{ fontSize: 9 }}>LIVE STREAM</span>
          </div>
          {goalPulses.slice(0, 6).map((p) => {
            const teamName = teams[p.team]?.name ?? p.team;
            return (
              <Link
                key={p.id}
                href={`/match/${p.matchId}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '10px 0',
                  borderTop: '1px dashed var(--rule-soft)',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--pulse)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  {p.minute}&apos;
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="serif" style={{ fontSize: 16, lineHeight: 1.1 }}>
                    {p.scorer}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: 'var(--ink-3)',
                      letterSpacing: '0.06em',
                      marginTop: 2,
                    }}
                  >
                    {teamName.toUpperCase()} · {p.venueCity.toUpperCase()}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                  {ago(p.timestamp)}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {tweaks.aiSummary && railNarrative && liveMatches.length > 0 && (
        <div className="rail-section" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
          <div className="rail-h" style={{ color: 'rgba(242,238,227,0.65)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: 'var(--pulse)',
                  boxShadow: '0 0 0 2px rgba(229,57,43,0.25)',
                }}
              />
              PULSE · LIVE SUMMARY
            </span>
            <span style={{ fontSize: 9 }}>AI · 14s ago</span>
          </div>
          <div className="serif" style={{ fontSize: 17, lineHeight: 1.35, fontStyle: 'italic' }}>
            {aiText}
            {isTyping && (
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 18,
                  background: 'var(--pulse)',
                  verticalAlign: 'text-bottom',
                  marginLeft: 2,
                  animation: 'blink 1s steps(2) infinite',
                }}
              />
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

// ── SUB-COMPONENTS ────────────────────────────────────────────────

function MyTeamBanner({
  myTeam,
  onFollow,
  onChangeTeam,
  dismissed,
  onDismiss,
}: {
  myTeam: string | null;
  onFollow: () => void;
  onChangeTeam: () => void;
  dismissed: boolean;
  onDismiss: () => void;
}) {
  const t = myTeam ? teams[myTeam] : null;
  const liveForms = useLiveForms();
  const banner = t ? getTeamBannerStyle(myTeam) : null;

  const form: FormResult[] = (myTeam ? liveForms?.[myTeam] : null) ?? t?.form ?? [];

  if (!t && dismissed) {
    return (
      <div className="rail-section" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="btn btn-sm"
          style={{ flex: 1 }}
          onClick={onFollow}
        >
          Follow a Team
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        t
          ? `rail-section rail-team-banner${banner?.onLight ? ' rail-team-banner--on-light' : ''}`
          : 'rail-section'
      }
      style={
        banner
          ? { background: banner.background, color: banner.color }
          : undefined
      }
    >
      {t ? (
        <div>
          <div className="mono rail-team-banner__eyebrow">
            YOUR WORLD CUP · GROUP {t.group}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="rail-team-banner__flag">
              <Flag code={myTeam!} w={48} h={32} />
            </span>
            <div>
              <div className="serif" style={{ fontSize: 28, lineHeight: 1.05, fontStyle: 'italic' }}>
                You&apos;re with <span style={{ fontWeight: 600, fontStyle: 'normal' }}>{t.name}</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, opacity: 0.95 }}>
                <span className="mono">FORM</span>
                <FormDots form={form} />
              </div>
            </div>
          </div>
          <div className="rail-team-banner__actions">
            <Link href={`/team/${myTeam}`} className="rail-team-banner__btn rail-team-banner__btn--primary">
              View squad →
            </Link>
            <button type="button" className="rail-team-banner__btn rail-team-banner__btn--ghost" onClick={onChangeTeam}>
              Change team
            </button>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            style={{
              position: 'absolute', top: 0, right: 0,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-3)', fontSize: 16, lineHeight: 1, padding: 2,
            }}
          >
            ×
          </button>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            MAKE IT YOURS
          </div>
          <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, marginTop: 6 }}>
            Pick your team —<br /><em style={{ color: 'var(--pulse)' }}>map &amp; rail sync.</em>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-pulse" onClick={onFollow}>
              Follow a Team
            </button>
            <button type="button" className="btn btn-sm" onClick={onDismiss}>
              Just browse
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveMatchRow({ m }: { m: Match }) {
  const router = useRouter();
  return (
    <div className="match-row" onClick={() => router.push(`/match/${m.id}`)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Flag code={m.homeTeam.abbreviation} />
        <Flag code={m.awayTeam.abbreviation} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="team-name-sm">{m.homeTeam.name}</div>
        <div className="team-name-sm" style={{ opacity: 0.6 }}>{m.awayTeam.name}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.08em' }}>
          {m.venue.city.toUpperCase()}
        </div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <div className="score">{m.homeTeam.score}</div>
        <div className="score" style={{ opacity: 0.6 }}>{m.awayTeam.score}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--live)', letterSpacing: '0.08em' }}>
          <span className="status-dot live" style={{ display: 'inline-block', marginRight: 4 }} />
          {m.displayClock}
        </div>
      </div>
    </div>
  );
}

function UpcomingMatchRow({ m }: { m: Match }) {
  const router = useRouter();
  const kickoff = new Date(m.date);
  const dateStr = kickoff.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const timeStr = kickoff.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  return (
    <div className="match-row" onClick={() => router.push(`/match/${m.id}`)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {m.homeTeam.logo
          ? <img src={m.homeTeam.logo} alt={m.homeTeam.abbreviation} style={{ width: 18, height: 18, objectFit: 'contain' }} />
          : <Flag code={m.homeTeam.abbreviation} />}
        {m.awayTeam.logo
          ? <img src={m.awayTeam.logo} alt={m.awayTeam.abbreviation} style={{ width: 18, height: 18, objectFit: 'contain' }} />
          : <Flag code={m.awayTeam.abbreviation} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="team-name-sm">{m.homeTeam.name}</div>
        <div className="team-name-sm" style={{ opacity: 0.6 }}>{m.awayTeam.name}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4, letterSpacing: '0.08em' }}>
          {dateStr} · {timeStr}
        </div>
      </div>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>—</div>
    </div>
  );
}