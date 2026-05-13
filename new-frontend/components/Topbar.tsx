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
  { label: 'Bracket', href: '/bracket' },
  { label: 'Stats', href: '/stats' },
  { label: 'News', href: '/news' },
];

export function Topbar() {
  const pathname = usePathname();
  const { myTeam } = useMyTeam();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toUpperCase());
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <Logo />
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em', borderLeft: '1px solid var(--rule-soft)', paddingLeft: 14 }}>
          {time || '\u00A0'}<br />
          DAY 18 · KNOCKOUTS
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
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--live)' }} />
          4 LIVE
        </div>
        {myTeam ? (
          <Link href="/mywc" style={{
            textDecoration: 'none', color: 'inherit',
            padding: '6px 12px 6px 6px',
            border: '1px solid var(--rule)',
            borderRadius: 999,
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--paper-2)',
          }}>
            <Flag code={myTeam} w={20} h={13} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>{teams[myTeam]?.name}</span>
          </Link>
        ) : (
          <Link href="/mywc" className="btn btn-pulse" style={{ textDecoration: 'none' }}>+ MY WORLD CUP</Link>
        )}
      </div>
    </div>
  );
}
