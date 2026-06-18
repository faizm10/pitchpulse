'use client';

import { useState } from 'react';
import { Bracket } from '@/components/Bracket';
import { BracketProjection } from '@/components/BracketProjection';
import { useWindowWidth } from '@/hooks/useWindowWidth';

const GROUP_STAGE_ENDS = new Date('2026-06-28T00:00:00Z');

type Tab = 'projected' | 'knockout';

export default function BracketPage() {
  const isGroupStage = Date.now() < GROUP_STAGE_ENDS.getTime();
  const [tab, setTab] = useState<Tab>(isGroupStage ? 'projected' : 'knockout');
  const width = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const pad = isMobile ? '16px' : isTablet ? '24px' : '56px';

  return (
    <div className="screen">
      {/* Page header */}
      <div
        style={{
          padding: isMobile ? '24px 16px 20px' : isTablet ? '32px 24px 20px' : '40px 56px 24px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div className="eyebrow">Knockout Stage · Round of 32 → Final</div>
        <div
          className="headline"
          style={{ fontSize: isMobile ? 36 : isTablet ? 48 : 64, marginTop: 8 }}
        >
          The path to <em>MetLife.</em>
        </div>
        <div
          className="mono"
          style={{ marginTop: 14, fontSize: isMobile ? 10 : 11, color: 'var(--ink-3)', letterSpacing: '0.08em' }}
        >
          Top 2 from each group + 8 best third-placed teams · Final Jul 19, 2026
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, marginTop: 20 }}>
          {([
            { id: 'projected' as Tab, label: 'Projected' },
            { id: 'knockout' as Tab, label: 'Live Bracket' },
          ]).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="mono"
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid var(--rule)',
                background: tab === id ? 'var(--ink)' : 'transparent',
                color: tab === id ? 'var(--paper)' : 'var(--ink-3)',
                fontSize: 10,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                fontWeight: tab === id ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {label.toUpperCase()}
              {id === 'projected' && isGroupStage && (
                <span
                  style={{
                    marginLeft: 6,
                    display: 'inline-block',
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: tab === id ? '#22c55e' : '#22c55e',
                    verticalAlign: 'middle',
                    position: 'relative',
                    top: -1,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — both tabs use the same full-bleed scroll container */}
      {tab === 'projected' ? (
        <div style={{ padding: `20px ${pad} 0` }}>
          <BracketProjection />
        </div>
      ) : (
        <Bracket />
      )}
    </div>
  );
}
