'use client';

import { news } from '@/lib/data';
import type { NewsItem } from '@/lib/types';

export function News() {
  const features = news.filter((n) => n.kind === 'feature');
  const shorts = news.filter((n) => n.kind === 'short');

  return (
    <div className="screen">
      <div style={{ padding: '40px 56px 24px', borderBottom: '1px solid var(--rule)' }}>
        <div className="eyebrow">News · Aggregated wire + editorial</div>
        <div className="headline" style={{ fontSize: 64, marginTop: 8 }}>
          The world is <em>watching.</em>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 14, letterSpacing: '0.08em' }}>
          UPDATED EVERY 5 MINUTES · 24 SOURCES
        </div>
      </div>

      <div style={{ padding: '40px 56px 64px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginBottom: 48 }}>
          {features.map((n) => <FeatureCard key={n.id} news={n} />)}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: '1px solid var(--rule)', paddingTop: 22, marginBottom: 22 }}>
          <div className="serif" style={{ fontSize: 32, fontStyle: 'italic' }}>Latest</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>{shorts.length} STORIES</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 0 }}>
          {shorts.map((n) => <ShortCard key={n.id} news={n} />)}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ news }: { news: NewsItem }) {
  return (
    <article style={{
      border: '1px solid var(--rule)', borderRadius: 14, overflow: 'hidden',
      background: 'var(--paper-2)',
      display: 'flex', flexDirection: 'column', cursor: 'pointer',
    }}>
      <div style={{
        aspectRatio: '16 / 9',
        background: news.accent || 'var(--ink)',
        position: 'relative', overflow: 'hidden', color: '#fff', padding: 22,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '6px 6px',
        }} />
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', opacity: 0.9, position: 'relative' }}>
          {news.tag} · FEATURE
        </div>
        <div className="serif" style={{ fontSize: 14, fontStyle: 'italic', opacity: 0.85, position: 'relative' }}>
          ⌗ image placeholder · drop hero photo
        </div>
      </div>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="serif" style={{ fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.015em' }}>{news.title}</div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>{news.dek}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', marginTop: 4 }}>
          {news.source.toUpperCase()} · {news.time.toUpperCase()}
        </div>
      </div>
    </article>
  );
}

function ShortCard({ news }: { news: NewsItem }) {
  return (
    <article style={{
      borderTop: '1px solid var(--rule-soft)',
      borderRight: '1px solid var(--rule-soft)',
      padding: 22, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--pulse)' }}>
        {news.tag}
      </div>
      <div className="serif" style={{ fontSize: 20, lineHeight: 1.2 }}>{news.title}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>{news.dek}</div>
      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: '0.12em', marginTop: 'auto' }}>
        {news.source.toUpperCase()} · {news.time.toUpperCase()}
      </div>
    </article>
  );
}
