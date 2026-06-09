'use client';

import { useState, useMemo } from 'react';
import { teams } from '@/lib/data';
import { Flag } from '@/components/Shared';

interface TeamSelectorProps {
  onSelect: (teamCode: string) => void;
  onClose: () => void;
}

const ALL_TEAMS = Object.values(teams).sort((a, b) => a.name.localeCompare(b.name));

export function TeamSelector({ onSelect, onClose }: TeamSelectorProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      query.trim()
        ? ALL_TEAMS.filter(
            (t) =>
              t.name.toLowerCase().includes(query.toLowerCase()) ||
              t.code.toLowerCase().includes(query.toLowerCase()),
          )
        : ALL_TEAMS,
    [query],
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(10, 14, 22, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%',
        maxWidth: 480,
        maxHeight: '80vh',
        borderRadius: 16,
        border: '1px solid var(--rule)',
        background: 'var(--paper)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 0',
          borderBottom: '1px solid var(--rule)',
          paddingBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
              Select Your Team
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--ink-3)', fontSize: 18, lineHeight: 1, padding: 4,
              }}
            >
              ×
            </button>
          </div>
          <input
            autoFocus
            type="text"
            placeholder="Search teams…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: 8,
              border: '1px solid var(--rule)',
              background: 'var(--paper-2)',
              color: 'var(--ink)',
              fontSize: 13,
              fontFamily: 'var(--mono)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Team list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map((team) => (
            <button
              key={team.code}
              type="button"
              onClick={() => onSelect(team.code)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--rule-soft)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--paper-2)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
            >
              <Flag code={team.code} w={28} h={18} />
              <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
                {team.name}
              </span>
              <span style={{
                fontSize: 10,
                fontFamily: 'var(--mono)',
                color: 'var(--ink-3)',
                letterSpacing: '0.1em',
                background: 'var(--paper-2)',
                border: '1px solid var(--rule)',
                borderRadius: 4,
                padding: '2px 6px',
              }}>
                GRP {team.group}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ padding: '24px 20px', color: 'var(--ink-3)', fontSize: 13, textAlign: 'center', fontFamily: 'var(--mono)' }}>
              No teams found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
