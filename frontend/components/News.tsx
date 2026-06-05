'use client';

import { useEffect, useState, useMemo } from 'react';

interface Article {
  id: string;
  headline: string;
  description: string;
  published: string;
  image?: string;
  source?: string;
  link?: string;
  url?: string;
  byline?: string;
  category?: string;
}

const COUNTRIES = [
  { name: 'Algeria', code: 'ALG' },
  { name: 'Argentina', code: 'ARG' },
  { name: 'Australia', code: 'AUS' },
  { name: 'Austria', code: 'AUT' },
  { name: 'Belgium', code: 'BEL' },
  { name: 'Bosnia and Herzegovina', code: 'BIH' },
  { name: 'Brazil', code: 'BRA' },
  { name: 'Canada', code: 'CAN' },
  { name: 'Cape Verde', code: 'CPV' },
  { name: 'Colombia', code: 'COL' },
  { name: 'Congo DR', code: 'COD' },
  { name: 'Croatia', code: 'CRO' },
  { name: 'Curaçao', code: 'CUW' },
  { name: 'Czechia', code: 'CZE' },
  { name: 'Ecuador', code: 'ECU' },
  { name: 'Egypt', code: 'EGY' },
  { name: 'England', code: 'ENG' },
  { name: 'France', code: 'FRA' },
  { name: 'Germany', code: 'GER' },
  { name: 'Ghana', code: 'GHA' },
  { name: 'Haiti', code: 'HAI' },
  { name: 'Iran', code: 'IRN' },
  { name: 'Iraq', code: 'IRQ' },
  { name: 'Ivory Coast', code: 'CIV' },
  { name: 'Japan', code: 'JPN' },
  { name: 'Jordan', code: 'JOR' },
  { name: 'Mexico', code: 'MEX' },
  { name: 'Morocco', code: 'MAR' },
  { name: 'Netherlands', code: 'NED' },
  { name: 'New Zealand', code: 'NZL' },
  { name: 'Norway', code: 'NOR' },
  { name: 'Panama', code: 'PAN' },
  { name: 'Paraguay', code: 'PAR' },
  { name: 'Portugal', code: 'POR' },
  { name: 'Qatar', code: 'QAT' },
  { name: 'Saudi Arabia', code: 'KSA' },
  { name: 'Scotland', code: 'SCO' },
  { name: 'Senegal', code: 'SEN' },
  { name: 'South Africa', code: 'RSA' },
  { name: 'South Korea', code: 'KOR' },
  { name: 'Spain', code: 'ESP' },
  { name: 'Sweden', code: 'SWE' },
  { name: 'Switzerland', code: 'SUI' },
  { name: 'Tunisia', code: 'TUN' },
  { name: 'Turkey', code: 'TUR' },
  { name: 'United States', code: 'USA' },
  { name: 'Uruguay', code: 'URU' },
  { name: 'Uzbekistan', code: 'UZB' },
].sort((a, b) => a.name.localeCompare(b.name));

function relativeTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function articleHref(article: Article): string | undefined {
  return article.link ?? article.url ?? undefined;
}

function ArticleLink({ article, style, children }: { article: Article; style?: React.CSSProperties; children: React.ReactNode }) {
  const href = articleHref(article);
  if (href && href !== '#') {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'block', ...style }}>
        {children}
      </a>
    );
  }
  return <div style={style}>{children}</div>;
}

export function News() {
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('ALL');

  useEffect(() => {
    async function loadNews() {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        console.log("Total articles received from backend:", data.articles?.length);
        const articles: Article[] = (data.articles || []).map((a: Article) => ({
          ...a,
          link: a.link ?? a.url,
          source: a.source ?? a.byline ?? 'ESPN',
        }));
        setNews(articles);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadNews();
  }, []);

  const filteredNews = useMemo(() => {
    if (selectedCountry === 'ALL') return news;
    const target = COUNTRIES.find(c => c.code === selectedCountry);
    if (!target) return news;
    
    const name = target.name.toLowerCase();
    const code = target.code.toLowerCase();

    return news.filter(art => {
      const h = String(art.headline ?? '').toLowerCase();
      const d = String(art.description ?? '').toLowerCase();
      return h.includes(name) || d.includes(name); // just match full country name
    });
  }, [news, selectedCountry]);

  if (loading) {
    return (
      <div className="screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>Loading Wire Feeds</div>
        <div style={{ width: 200, height: 1, background: 'var(--rule)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: '-40%', width: '40%', height: '100%', background: 'var(--ink-1)', animation: 'slide 1s linear infinite' }} />
        </div>
        <style>{`@keyframes slide { to { left: 100%; } }`}</style>
      </div>
    );
  }

  const heroArticle = filteredNews[0];
  const sideHeadlines = filteredNews.slice(1, 5); 
  const streamStories = filteredNews.slice(5);

  return (
    <div className="screen">
      {/* MASTHEAD */}
      <div style={{ padding: '24px 40px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.22em', color: 'var(--ink-3)', textTransform: 'uppercase', marginBottom: 4 }}>World Cup Hub Feed</div>
          <div className="serif" style={{ fontSize: 40, lineHeight: 1.0, fontWeight: 700, letterSpacing: '-0.025em' }}>The world is <em>watching.</em></div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.12em', color: 'var(--ink-3)', textTransform: 'uppercase', lineHeight: 1.6 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            <br />ESPN Aggregate Wire
          </div>
        </div>
      </div>

      {/* FILTER STRIP */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 40px', borderBottom: '1px solid var(--rule)', background: 'var(--paper-2)', gap: 12 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-2)', textTransform: 'uppercase', fontWeight: 600 }}>Filter By Nation:</div>
        <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} style={{ fontFamily: "'Courier New', monospace", fontSize: 11, padding: '4px 10px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 4, color: 'var(--ink)', cursor: 'pointer', outline: 'none', minWidth: 220 }}>
          <option value="ALL">ALL TOURNAMENT NEWS</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name.toUpperCase()} ({c.code})</option>)}
        </select>
      </div>

      {/* COMPONENT BODY */}
      <div style={{ padding: '32px 40px 80px' }}>
        {filteredNews.length === 0 ? (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <div className="serif" style={{ fontSize: 20, fontStyle: 'italic', color: 'var(--ink-3)' }}>No matching bulletins found right now.</div>
            <button onClick={() => setSelectedCountry('ALL')} className="mono" style={{ background: 'none', border: 'none', color: 'var(--pulse)', textDecoration: 'underline', marginTop: 12, cursor: 'pointer', fontSize: 11 }}>Return to global wire</button>
          </div>
        ) : (
          <>
            {/* HERO SPLIT SECTION */}
            {selectedCountry === 'ALL' && heroArticle && (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'minmax(0, 1fr) 420px', 
                gap: 32, 
                marginBottom: 40, 
                background: 'var(--paper-2)',
                border: '1px solid var(--rule)',
                borderRadius: 8,
                overflow: 'hidden'
              }}>
                <HeroCard article={heroArticle} />

                <div style={{ padding: '24px 24px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {sideHeadlines.map((art) => (
                    <ArticleLink key={art.id} article={art} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 80px', 
                      gap: 16, 
                      paddingBottom: 16, 
                      borderBottom: '1px solid var(--rule-soft)',
                      alignItems: 'start'
                    }}>
                      <div>
                        <InteractiveHeadline text={art.headline} fontSize={14} />
                        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 6 }}>
                          {art.source?.toUpperCase()} · {relativeTime(art.published)}
                        </div>
                      </div>
                      {art.image && (
                        <div style={{ width: 80, height: 54, borderRadius: 4, overflow: 'hidden', background: 'var(--paper-3)', border: '1px solid var(--rule-soft)' }}>
                          <img src={art.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                    </ArticleLink>
                  ))}
                </div>
              </div>
            )}

            {/* DUAL COLUMN BOTTOM GRID */}
            <div style={{ marginTop: 24 }}>
              {selectedCountry !== 'ALL' && (
                <div className="serif" style={{ fontSize: 24, fontStyle: 'italic', marginBottom: 24, borderBottom: '1px solid var(--rule)', paddingBottom: 12 }}>
                  News Feed for {COUNTRIES.find(c => c.code === selectedCountry)?.name}
                </div>
              )}
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', 
                gap: 24 
              }}>
                {(selectedCountry === 'ALL' ? streamStories : filteredNews).map((art) => (
                  <HorizontalStreamRow key={art.id} article={art} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── SUB-COMPONENTS ──────────────────────────────────────────────── */

function InteractiveHeadline({ text, fontSize }: { text: string; fontSize: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="serif" 
      style={{ 
        fontSize, 
        lineHeight: 1.3, 
        fontWeight: 600, 
        color: hovered ? 'var(--pulse)' : 'var(--ink)', 
        transition: 'color 0.15s ease',
        cursor: 'pointer'
      }}
    >
      {text}
    </div>
  );
}

function HeroCard({ article: n }: { article: Article }) {
  return (
    <ArticleLink article={n} style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.02)' }}>
      <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderBottom: '1px solid var(--rule)' }}>
        <img src={n.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--pulse)', fontWeight: 700, letterSpacing: '0.1em' }}>FEATURED STORY</div>
        <div className="serif" style={{ fontSize: 26, lineHeight: 1.2, fontWeight: 700 }}>{n.headline}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>{n.description}</div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
          {n.source?.toUpperCase()} · {relativeTime(n.published)}
        </div>
      </div>
    </ArticleLink>
  );
}

function HorizontalStreamRow({ article: n }: { article: Article }) {
  return (
    <ArticleLink article={n} style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 120px', 
      gap: 20, 
      padding: 20, 
      background: 'var(--paper)', 
      border: '1px solid var(--rule-soft)', 
      borderRadius: 6,
      alignItems: 'center',
      height: '100%'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--ink-3)', letterSpacing: '0.05em' }}>
          {n.category?.toUpperCase() || 'NEWS'}
        </div>
        <InteractiveHeadline text={n.headline} fontSize={16} />
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {n.description}
        </div>
        <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', marginTop: 4 }}>
          {n.source?.toUpperCase()} · {relativeTime(n.published)}
        </div>
      </div>
      {n.image && (
        <div style={{ width: 120, aspectRatio: '4/3', borderRadius: 4, overflow: 'hidden', background: 'var(--paper-3)', border: '1px solid var(--rule-soft)' }}>
          <img src={n.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
    </ArticleLink>
  );
}