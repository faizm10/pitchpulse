'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo, Flag } from './Shared';
import { useMyTeam } from './Providers';
import { teams } from '@/lib/data';

const tabs = [
  { label: 'Map', href: '/' },
  { label: 'Matches', href: '/matches' },
  { label: 'Standings', href: '/standings' },
  { label: 'Bracket', href: '/bracket' },
  { label: 'Stats', href: '/stats' },
  { label: 'News', href: '/news' },
];

// WC2026 phase boundaries (UTC midnight)
const WC_START   = new Date('2026-06-11T00:00:00Z'); // opening match
const WC_R32     = new Date('2026-06-29T00:00:00Z'); // round of 32 begins
const WC_R16     = new Date('2026-07-05T00:00:00Z'); // round of 16 begins
const WC_QF      = new Date('2026-07-11T00:00:00Z'); // quarter-finals
const WC_SF      = new Date('2026-07-14T00:00:00Z'); // semi-finals
const WC_FINAL   = new Date('2026-07-18T00:00:00Z'); // final day
const WC_END     = new Date('2026-07-20T00:00:00Z'); // tournament over

function getTournamentStatus(): string {
  const now = new Date();
  if (now < WC_START)  return 'INTERNATIONAL FRIENDLIES';
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
  const { myTeam } = useMyTeam();
  const [time, setTime] = useState<string>('');
  const [tournamentLine, setTournamentLine] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toUpperCase());
      setTournamentLine(getTournamentStatus());
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <Logo />
        <div className="topbar-status mono">
          {time || '\u00A0'}<br />
          {tournamentLine || ' '}
        </div>
      </div>

      <div className="topbar-mid">
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
      </div>

      <div className="topbar-right">
        <div className="topbar-live mono">
          <span />
          4 LIVE
        </div>
        {myTeam ? (
          <Link href={`/?journey=${myTeam}`} className="my-team-link" title="Follow your team's journey">
            <Flag code={myTeam} w={20} h={13} />
            <span className="my-team-name">Follow {teams[myTeam]?.name}</span>
          </Link>
        ) : (
          <Link href="/?journey=open" className="btn btn-pulse topbar-cta">
            Follow a Team
          </Link>
        )}
      </div>
    </div>
  );
}
