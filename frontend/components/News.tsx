'use client';

import { useEffect, useState } from 'react';

interface Article {
  id: string;
  headline: string;
  description: string;
  published: string;
  image?: string;
  source: string;
  link?: string;
  category?: string;
}

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function readTime(text: string) {
  const words = (text || '').split(' ').length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

export function News() {
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        setNews(data.articles || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadNews();
  }, []);

  if (loading) {
    return (
      <div
        className="screen"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}
      >
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
          Loading News
        </div>
        <div style={{ width: 200, height: 1, background: 'var(--rule)', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 0, left: '-40%', width: '40%', height: '100%',
            background: 'var(--ink-1)', animation: 'slide 1s linear infinite',
          }} />
        </div>
        <style>{`@keyframes slide { to { left: 100%; } }`}</style>
      </div>
    );
  }

  const [hero, feature, ...rest] = news;
  const dispatches = rest.slice(0, 2);
  const shorts = rest.slice(2);

  return (
    <div className="screen">
      {/* MASTHEAD */}
      <div style={{
        padding: '32px 48px 28px',
        borderBottom: '2px solid var(--ink-1)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24,
      }}>
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.22em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 6 }}>
            World Cup · Aggregated Wire + Editorial
          </div>
          <div className="serif" style={{ fontSize: 58, lineHeight: 1.0, letterSpacing: '-0.025em' }}>
            The world is <em>watching.</em>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase', lineHeight: 1.8 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <br />Updated every 30 minutes
            <br />ESPN World Cup Feed
          </div>
          <LiveBadge />
        </div>
      </div>

      {/* NAV STRIP */}
      <NavStrip />

      {/* BODY */}
      <div style={{ padding: '40px 48px 64px' }}>

        {/* HERO GRID */}
        {hero && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 340px',
            border: '1px solid var(--rule)', marginBottom: 40,
            background: 'var(--paper-2)',
          }}>
            <HeroMain article={hero} />
            <HeroSidebar feature={feature} dispatches={dispatches} />
          </div>
        )}

        {/* LATEST */}
        {shorts.length > 0 && (
          <>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              borderTop: '2px solid var(--ink-1)', paddingTop: 16, marginBottom: 24,
            }}>
              <div className="serif" style={{ fontSize: 28, fontStyle: 'italic' }}>Latest</div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: '0.14em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                {shorts.length} stories
              </div>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              border: '1px solid var(--rule)',
            }}>
              {shorts.map((n) => <ShortCard key={n.id} article={n} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function LiveBadge() {
  return (
    <>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .live-dot { width:5px;height:5px;border-radius:50%;background:#fff;animation:blink 1.2s ease-in-out infinite; }
      `}</style>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'var(--pulse)', color: '#fff',
        fontFamily: "'Courier New', monospace", fontSize: 9,
        letterSpacing: '0.2em', padding: '4px 10px', marginTop: 8,
        textTransform: 'uppercase',
      }}>
        <span className="live-dot" />
        Live
      </div>
    </>
  );
}

const NAV_TABS = ['All', 'Match Reports', 'Analysis', 'Stats', 'Fixtures', 'Standings'];

function NavStrip() {
  const [active, setActive] = useState('All');
  return (
    <div style={{ display: 'flex', padding: '0 48px', borderBottom: '1px solid var(--rule)', overflowX: 'auto' }}>
      {NAV_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActive(tab)}
          style={{
            fontFamily: "'Courier New', monospace", fontSize: 10,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: active === tab ? 'var(--ink-1)' : 'var(--ink-3)',
            padding: '14px 16px', background: 'none', border: 'none',
            borderBottom: active === tab ? '2px solid var(--ink-1)' : '2px solid transparent',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function Tag({ label, variant = 'filled' }: { label: string; variant?: 'filled' | 'outline' | 'live' }) {
  const styles: Record<string, React.CSSProperties> = {
    filled: { background: 'var(--ink-1)', color: 'var(--paper-1)' },
    live:   { background: 'var(--pulse)', color: '#fff' },
    outline:{ background: 'transparent', color: 'var(--ink-3)', border: '1px solid var(--rule)' },
  };
  return (
    <span style={{
      fontFamily: "'Courier New', monospace", fontSize: 9,
      letterSpacing: '0.2em', textTransform: 'uppercase',
      padding: variant === 'outline' ? '2px 7px' : '3px 8px',
      ...styles[variant],
    }}>
      {label}
    </span>
  );
}

function ArticleImage({ src, alt }: { src?: string; alt: string }) {
  if (src) return <img src={src} alt={alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Courier New', monospace", fontSize: 9, letterSpacing: '0.16em',
      color: 'var(--ink-3)', textTransform: 'uppercase',
    }}>
      No image available
    </div>
  );
}

function HeroMain({ article: n }: { article: Article }) {
  return (
    <a href={n.link} target="_blank" rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: 'inherit', borderRight: '1px solid var(--rule)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--paper-3)', overflow: 'hidden' }}>
        <ArticleImage src={n.image} alt={n.headline} />
      </div>
      <div style={{ padding: '28px 32px 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Tag label="Live Coverage" variant="live" />
          <Tag label={n.category || 'World Cup'} variant="outline" />
        </div>
        <div className="serif" style={{ fontSize: 38, lineHeight: 1.08, letterSpacing: '-0.02em' }}>
          {n.headline}
        </div>
        <div style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          {n.description}
        </div>
        <div className="mono" style={{
          fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-3)',
          textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto',
        }}>
          <span>{(n.source || 'ESPN').toUpperCase()}</span>
          <Dot />
          <span>{relativeTime(n.published)}</span>
          <Dot />
          <span>{readTime(n.description)}</span>
        </div>
      </div>
    </a>
  );
}

function HeroSidebar({ feature, dispatches }: { feature?: Article; dispatches: Article[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {feature && (
        <a href={feature.link} target="_blank" rel="noopener noreferrer"
          style={{ textDecoration: 'none', color: 'inherit', padding: 24, borderBottom: '1px solid var(--rule)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--paper-3)', marginBottom: 4 }}>
            <ArticleImage src={feature.image} alt={feature.headline} />
          </div>
          <Tag label={feature.category || 'News'} variant="filled" />
          <div className="serif" style={{ fontSize: 22, lineHeight: 1.15 }}>{feature.headline}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{feature.description}</div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
            {(feature.source || 'ESPN').toUpperCase()} · {relativeTime(feature.published)}
          </div>
        </a>
      )}
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--pulse)', textTransform: 'uppercase', marginBottom: 8 }}>
          Quick Dispatches
        </div>
        {dispatches.map((n) => (
          <a key={n.id} href={n.link} target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '12px 0', borderTop: '1px solid var(--rule-soft)' }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 4 }}>
              {n.category || 'News'} · {relativeTime(n.published)}
            </div>
            <div className="serif" style={{ fontSize: 15, lineHeight: 1.25 }}>{n.headline}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function ShortCard({ article: n }: { article: Article }) {
  return (
    <a href={n.link} target="_blank" rel="noopener noreferrer"
      style={{
        textDecoration: 'none', color: 'inherit', padding: 20,
        borderRight: '1px solid var(--rule-soft)', borderBottom: '1px solid var(--rule-soft)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
      <Tag label={n.category || 'News'} variant="outline" />
      <div className="serif" style={{ fontSize: 18, lineHeight: 1.2 }}>{n.headline}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45, flex: 1 }}>{n.description}</div>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase', marginTop: 4 }}>
        {(n.source || 'ESPN').toUpperCase()} · {relativeTime(n.published)} · {readTime(n.description)}
      </div>
    </a>
  );
}

function Dot() {
  return <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ink-3)', display: 'inline-block' }} />;
}