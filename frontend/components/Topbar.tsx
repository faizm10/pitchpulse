'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Logo } from './Shared';
import { useTeamFollow } from './Providers';
import { useLiveMatches } from '@/hooks/useLiveMatches';

const tabs = [
  { label: 'Map', href: '/' },
  { label: 'Matches', href: '/matches' },
  { label: 'Standings', href: '/standings' },
  // { label: 'Bracket', href: '/bracket' },
  { label: 'Stats', href: '/stats' },
  { label: 'News', href: '/news' },
];

// WC2026 phase boundaries — opening match June 11 at 3 PM EST (20:00 UTC)
const WC_START   = new Date('2026-06-11T20:00:00Z'); // opening match kickoff
const WC_R32     = new Date('2026-06-29T00:00:00Z'); // round of 32 begins
const WC_R16     = new Date('2026-07-05T00:00:00Z'); // round of 16 begins
const WC_QF      = new Date('2026-07-11T00:00:00Z'); // quarter-finals
const WC_SF      = new Date('2026-07-14T00:00:00Z'); // semi-finals
const WC_FINAL   = new Date('2026-07-18T00:00:00Z'); // final day
const WC_END     = new Date('2026-07-20T00:00:00Z'); // tournament over

function getCountdown(compact = false): string {
  const diff = WC_START.getTime() - Date.now();
  if (diff <= 0) return '';
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (compact) {
    if (d > 0) return `${d}D ${h}H ${m}M`;
    if (h > 0) return `${h}H ${m}M ${s}S`;
    return `${m}M ${s}S`;
  }
  if (d > 0) {
    return `KICKOFF IN ${d}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`;
  }
  if (h > 0) {
    return `KICKOFF IN ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`;
  }
  return `KICKOFF IN ${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`;
}

function getTournamentStatus(compact = false): string {
  const now = new Date();
  if (now < WC_START) return getCountdown(compact);
  if (now >= WC_END)   return 'WORLD CUP 2026 · COMPLETE';
  const day = Math.floor((now.getTime() - WC_START.getTime()) / 86_400_000) + 1;
  let stage: string;
  if (now >= WC_FINAL) stage = 'FINAL';
  else if (now >= WC_SF) stage = 'SEMI-FINALS';
  else if (now >= WC_QF) stage = 'QUARTER-FINALS';
  else if (now >= WC_R16) stage = 'ROUND OF 16';
  else if (now >= WC_R32) stage = 'ROUND OF 32';
  else stage = 'GROUP STAGE';
  return `DAY ${day} · ${stage}`;
}

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { myTeam, openTeamPicker, selectFollowedTeam } = useTeamFollow();
  const liveMatches = useLiveMatches();
  const topbarRef = useRef<HTMLElement>(null);
  const [tournamentLine, setTournamentLine] = useState<string>('');
  const [compactTopbar, setCompactTopbar] = useState(false);

  const goHome = () => {
    if (pathname !== '/') router.push('/');
  };

  const handleFollowTeam = () => {
    openTeamPicker();
    goHome();
  };

  const handleFollowMyTeam = () => {
    if (myTeam) selectFollowedTeam(myTeam);
    goHome();
  };

  useLayoutEffect(() => {
    const el = topbarRef.current;
    if (!el) return;

    const setHeight = () => {
      document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`);
    };

    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(el);
    window.addEventListener('resize', setHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setHeight);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const syncCompact = () => setCompactTopbar(mq.matches);
    syncCompact();
    mq.addEventListener('change', syncCompact);
    return () => mq.removeEventListener('change', syncCompact);
  }, []);

  useEffect(() => {
    const update = () => setTournamentLine(getTournamentStatus(compactTopbar));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [compactTopbar]);

  const liveCount = liveMatches.length;
  const isKickoffCountdown = Date.now() < WC_START.getTime();

  const statusContent = useMemo(() => {
    if (liveCount > 0) {
      return (
        <Link href="/matches" className="topbar-status-live mono" title="View live matches">
          <span aria-hidden="true" />
          {liveCount} LIVE
        </Link>
      );
    }
    if (isKickoffCountdown) {
      return (
        <span className={`topbar-status-kickoff${compactTopbar ? ' topbar-status-kickoff--compact' : ''}`}>
          {compactTopbar ? (
            <>
              <span className="topbar-status-kickoff__label">KICKOFF</span>
              <span className="topbar-status-kickoff__timer">{tournamentLine}</span>
            </>
          ) : (
            tournamentLine
          )}
        </span>
      );
    }
    return <span>{tournamentLine || '\u00A0'}</span>;
  }, [compactTopbar, liveCount, isKickoffCountdown, tournamentLine]);

  return (
    <header className="topbar" ref={topbarRef}>
      <div className="topbar-head">
        <div className="topbar-top">
          <Logo />
          <div className="topbar-status mono" aria-live="polite">
            {statusContent}
          </div>
        </div>

        <div className="topbar-right">
          {liveCount > 0 ? (
            <Link
              href="/matches"
              className="topbar-live topbar-live--desktop mono"
              style={{ textDecoration: 'none', color: 'inherit' }}
              title="View live matches"
            >
              <span aria-hidden="true" />
              {liveCount} LIVE
            </Link>
          ) : null}
          {myTeam ? (
            <button
              type="button"
              className="my-team-link"
              title="Follow your team's journey"
              onClick={handleFollowMyTeam}
            >
              Follow
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-pulse topbar-cta"
              onClick={handleFollowTeam}
            >
              Follow a Team
            </button>
          )}
        </div>
      </div>

      <nav className="topbar-mid" aria-label="Primary">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== '/' && pathname?.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`nav-pill ${isActive ? 'active' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
