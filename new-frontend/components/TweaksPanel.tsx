'use client';

import { useState } from 'react';
import { useTweaks } from './Providers';
import type { Tweaks } from '@/lib/types';

export function TweaksPanel() {
  const { tweaks, setTweak } = useTweaks();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle tweaks"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 100,
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--ink)', color: 'var(--paper)',
          border: 0, cursor: 'pointer',
          fontFamily: 'var(--mono)', fontSize: 18,
          boxShadow: '0 8px 24px rgba(14,22,38,0.18)',
        }}
      >{open ? '×' : '⚙'}</button>

      {open && (
        <aside style={{
          position: 'fixed', bottom: 76, right: 20, zIndex: 100,
          width: 280, background: 'var(--paper)',
          border: '1px solid var(--rule)', borderRadius: 14,
          boxShadow: '0 16px 50px rgba(14,22,38,0.18)',
          fontFamily: 'var(--sans)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Tweaks</span>
            <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--ink-3)', fontSize: 16 }}>×</button>
          </div>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Seg label="Type" value={tweaks.type} options={[['editorial','Editorial'],['modernist','Modern'],['mono','Mono']]} onChange={(v) => setTweak('type', v as Tweaks['type'])} />
            <Seg label="Look" value={tweaks.look} options={[['atlas','Atlas'],['broadcast','Night'],['festival','Festival']]} onChange={(v) => setTweak('look', v as Tweaks['look'])} />
            <Seg label="Map" value={tweaks.mapStyle} options={[['dots','Dots'],['topo','Topo'],['link','Schema']]} onChange={(v) => setTweak('mapStyle', v as Tweaks['mapStyle'])} />
            <Seg label="Density" value={tweaks.density} options={[['cozy','Cozy'],['compact','Compact']]} onChange={(v) => setTweak('density', v as Tweaks['density'])} />
            <Toggle label="AI summaries" value={tweaks.aiSummary} onChange={(v) => setTweak('aiSummary', v)} />
          </div>
        </aside>
      )}
    </>
  );
}

function Seg({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', border: '1px solid var(--rule)', borderRadius: 999, padding: 3, gap: 2, background: 'var(--paper-2)' }}>
        {options.map(([v, l]) => (
          <button key={v} onClick={() => onChange(v)} style={{
            flex: 1, padding: '6px 8px', border: 0, borderRadius: 999, cursor: 'pointer',
            background: value === v ? 'var(--ink)' : 'transparent',
            color: value === v ? 'var(--paper)' : 'var(--ink-2)',
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.06em',
          }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '6px 0' }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-2)', textTransform: 'uppercase' }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 36, height: 20, borderRadius: 999, border: 0, padding: 2, cursor: 'pointer',
        background: value ? 'var(--ink)' : 'var(--rule-soft)',
        transition: 'background 150ms ease',
      }}>
        <span style={{
          display: 'block', width: 16, height: 16, borderRadius: '50%', background: 'var(--paper)',
          transform: value ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 150ms ease',
        }} />
      </button>
    </label>
  );
}
