'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Logo } from './Shared';
import { useLiveMatches } from '@/hooks/useLiveMatches';

const tabs = [
  { label: 'Map', href: '/' },
  { label: 'Matches', href: '/matches' },
  { label: 'Standings', href: '/standings' },
  // { label: 'Bracket', href: '/bracket' },
  { label: 'Stats', href: '/stats' },
  { label: 'News', href: '/news' },
];

// WC2026 phase boundaries (all UTC)
const WC_START   = new Date('2026-06-11T00:00:00Z'); // tournament day 1 begins
const WC_MD2     = new Date('2026-06-18T00:00:00Z'); // group stage matchday 2
const WC_MD3     = new Date('2026-06-24T00:00:00Z'); // group stage matchday 3
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
  if (now >= WC_END)  return 'WORLD CUP 2026 · COMPLETE';
  if (now >= WC_FINAL) return 'FINAL';
  if (now >= WC_SF)    return compact ? 'SEMI-FINALS'  : 'SEMI-FINALS';
  if (now >= WC_QF)    return compact ? 'QTR-FINALS'   : 'QUARTER-FINALS';
  if (now >= WC_R16)   return 'ROUND OF 16';
  if (now >= WC_R32)   return 'ROUND OF 32';
  if (now >= WC_MD3)   return compact ? 'MATCHDAY 3'  : 'GROUP STAGE · MATCHDAY 3';
  if (now >= WC_MD2)   return compact ? 'MATCHDAY 2'  : 'GROUP STAGE · MATCHDAY 2';
  return compact ? 'MATCHDAY 1' : 'GROUP STAGE · MATCHDAY 1';
}

export function Topbar() {
  const pathname = usePathname();
  const liveMatches = useLiveMatches();
  const topbarRef = useRef<HTMLElement>(null);
  const [tournamentLine, setTournamentLine] = useState<string>('');
  const [compactTopbar, setCompactTopbar] = useState(false);

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

        {liveCount > 0 ? (
          <div className="topbar-right">
            <Link
              href="/matches"
              className="topbar-live topbar-live--desktop mono"
              style={{ textDecoration: 'none', color: 'inherit' }}
              title="View live matches"
            >
              <span aria-hidden="true" />
              {liveCount} LIVE
            </Link>
          </div>
        ) : null}
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
