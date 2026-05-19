'use client';

import { useState, useEffect, useRef, useMemo, type CSSProperties } from 'react';

/* ------------------------------------------------------------
 * Public types
 * ------------------------------------------------------------ */
export type GoalVariant = 'broadcast' | 'arcade' | 'cinematic' | 'stadium';

export interface GoalData {
  given: string;
  surname: string;
  number: number;
  minute: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  teamColor: string;
  accentColor: string;
  matchLabel: string;
  assist: string;
  flag: string;
}

export interface GoalNotificationProps {
  /** Increment to trigger a celebration. Each new value fires once. */
  trigger: number;
  data: GoalData;
  onComplete?: () => void;
}

interface VariantProps {
  data: GoalData;
  onDone: () => void;
}

/* ------------------------------------------------------------
 * Styles — injected once
 * ------------------------------------------------------------ */
const STYLE_ID = '__goal-notification-styles';
const CSS = `
:root { --gn-bg:#0a0a0c; --gn-ink:#f4f3ee; }

.gn-host {
  position: fixed; inset: 0;
  z-index: 99999;
  pointer-events: none;
  font-family: 'Inter', -apple-system, system-ui, sans-serif;
}

/* ===== BROADCAST ===== */
.bc-root { position:absolute; inset:0; overflow:hidden; font-family:'Anton','Bebas Neue',Impact,sans-serif; }
.bc-slab { position:absolute; left:-10%; right:-10%; height:56%; transition:transform .55s cubic-bezier(.16,1,.3,1); }
.bc-slab-top { top:-6%; background:linear-gradient(180deg, var(--team), color-mix(in oklab, var(--team) 70%, #000)); transform:skewY(-6deg) translateY(-100%); box-shadow:0 30px 80px rgba(0,0,0,.5); }
.bc-slab-bot { bottom:-6%; background:linear-gradient(0deg,#0a0a0c,#1a1a1f); transform:skewY(-6deg) translateY(100%); }
.bc-root[data-phase="1"] .bc-slab-top, .bc-root[data-phase="2"] .bc-slab-top, .bc-root[data-phase="3"] .bc-slab-top { transform:skewY(-6deg) translateY(0); }
.bc-root[data-phase="1"] .bc-slab-bot, .bc-root[data-phase="2"] .bc-slab-bot, .bc-root[data-phase="3"] .bc-slab-bot { transform:skewY(-6deg) translateY(0); }
.bc-root[data-phase="4"] .bc-slab-top { transform:skewY(-6deg) translateY(-110%); }
.bc-root[data-phase="4"] .bc-slab-bot { transform:skewY(-6deg) translateY(110%); }
.bc-stack { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; width:min(1200px,92vw); }
.bc-eyebrow { display:inline-flex; align-items:center; gap:16px; background:rgba(0,0,0,.55); padding:10px 22px; font-family:'Roboto Mono',monospace; font-size:16px; letter-spacing:.26em; color:#fff; text-transform:uppercase; margin-bottom:18px; opacity:0; transform:translateY(-10px); transition:all .4s .4s ease; }
.bc-root[data-phase="2"] .bc-eyebrow, .bc-root[data-phase="3"] .bc-eyebrow { opacity:1; transform:translateY(0); }
.bc-root[data-phase="4"] .bc-eyebrow { opacity:0; transform:translateY(-10px); transition-delay:0s; }
.bc-dot { width:8px; height:8px; border-radius:50%; background:var(--accent); box-shadow:0 0 10px var(--accent); }
.bc-min { color:var(--accent); font-weight:700; }
.bc-word { font-size:clamp(140px,26vw,380px); font-weight:900; line-height:.82; letter-spacing:-.02em; color:#fff; text-shadow:0 8px 0 rgba(0,0,0,.35); display:inline-flex; gap:.02em; }
.bc-char, .bc-bang { display:inline-block; opacity:0; transform:translateY(60px) scale(.6) rotate(-8deg); transition:all .55s cubic-bezier(.2,1.4,.3,1); transition-delay:calc(var(--i) * 70ms + 200ms); }
.bc-bang { color:var(--accent); }
.bc-root[data-phase="2"] .bc-char, .bc-root[data-phase="3"] .bc-char, .bc-root[data-phase="2"] .bc-bang, .bc-root[data-phase="3"] .bc-bang { opacity:1; transform:translateY(0) scale(1) rotate(0); }
.bc-root[data-phase="4"] .bc-char, .bc-root[data-phase="4"] .bc-bang { opacity:0; transform:translateY(-30px) scale(.95); transition-delay:calc(var(--i) * 30ms); }
.bc-player { margin-top:24px; display:inline-flex; align-items:center; gap:22px; opacity:0; transform:translateY(20px); transition:all .5s .9s cubic-bezier(.16,1,.3,1); }
.bc-root[data-phase="3"] .bc-player { opacity:1; transform:translateY(0); }
.bc-root[data-phase="4"] .bc-player { opacity:0; transform:translateY(-10px); transition-delay:0s; }
.bc-num { font-size:88px; font-weight:900; color:var(--accent); background:#fff; width:110px; height:110px; display:flex; align-items:center; justify-content:center; line-height:1; border-radius:6px; box-shadow:0 0 0 4px var(--accent) inset; }
.bc-nameblock { text-align:left; }
.bc-given { font-family:'Roboto Mono',monospace; font-size:18px; letter-spacing:.2em; color:rgba(255,255,255,.7); text-transform:uppercase; }
.bc-surname { font-size:72px; line-height:1; font-weight:900; letter-spacing:-.01em; color:#fff; text-transform:uppercase; text-shadow:0 4px 0 rgba(0,0,0,.3); }
.bc-score { margin-top:22px; display:inline-flex; align-items:center; gap:28px; font-family:'Roboto Mono',monospace; font-size:28px; font-weight:700; color:#fff; background:rgba(0,0,0,.4); padding:12px 28px; letter-spacing:.14em; opacity:0; transform:translateY(20px); transition:all .45s 1.1s cubic-bezier(.16,1,.3,1); }
.bc-root[data-phase="3"] .bc-score { opacity:1; transform:translateY(0); }
.bc-root[data-phase="4"] .bc-score { opacity:0; transition-delay:0s; }
.bc-team { display:inline-flex; align-items:center; gap:14px; }
.bc-team-score { font-size:38px; color:var(--accent); font-weight:900; }
.bc-dash { color:rgba(255,255,255,.4); }
.bc-ticker { position:absolute; bottom:8%; left:0; right:0; height:44px; background:#000; border-top:2px solid var(--accent); border-bottom:2px solid var(--accent); overflow:hidden; transform:translateY(120%); transition:transform .5s 1.3s cubic-bezier(.16,1,.3,1); }
.bc-root[data-phase="3"] .bc-ticker, .bc-root[data-phase="4"] .bc-ticker { transform:translateY(0); }
.bc-root[data-phase="5"] .bc-ticker { transform:translateY(120%); transition-delay:0s; }
.bc-ticker-track { display:flex; gap:40px; white-space:nowrap; align-items:center; height:100%; padding-left:100%; animation:bc-ticker-scroll 14s linear infinite; font-family:'Roboto Mono',monospace; font-size:16px; letter-spacing:.18em; color:#fff; }
@keyframes bc-ticker-scroll { to { transform:translateX(-100%); } }

.pb-root { position:absolute; top:50%; left:50%; width:0; height:0; pointer-events:none; }
.pb-p { position:absolute; top:0; left:0; border-radius:2px; opacity:0; animation:pb-fly 1.6s cubic-bezier(.2,.8,.3,1) forwards; }
@keyframes pb-fly {
  0% { opacity:0; transform:translate(-50%,-50%) scale(0) rotate(0); }
  10% { opacity:1; }
  100% { opacity:0; transform:translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(.4) rotate(var(--rot)); }
}

/* ===== ARCADE ===== */
.ar-root { position:absolute; inset:0; background:var(--team); overflow:hidden; font-family:'Bungee','Anton',Impact,sans-serif; opacity:0; transition:opacity .2s ease; }
.ar-root[data-phase="1"], .ar-root[data-phase="2"] { opacity:1; }
.ar-root[data-phase="3"] { opacity:0; transition:opacity .5s ease; }
.ar-stripes { position:absolute; inset:-20%; background:repeating-linear-gradient(-45deg, var(--team) 0 60px, color-mix(in oklab, var(--team) 80%, #000) 60px 120px); animation:ar-stripes-move 4s linear infinite; }
@keyframes ar-stripes-move { to { transform:translate(120px,-120px); } }
.ar-checker { position:absolute; inset:0; background:radial-gradient(circle at center, transparent 30%, rgba(0,0,0,.4) 100%); }
.ar-star { position:absolute; color:var(--accent); text-shadow:4px 4px 0 #000; opacity:0; animation:ar-star-pop .9s cubic-bezier(.2,1.4,.4,1) forwards; font-family:serif; }
@keyframes ar-star-pop {
  0% { transform:scale(0) rotate(0); opacity:0; }
  30% { opacity:1; }
  60% { transform:scale(1.3) rotate(180deg); }
  100% { transform:scale(1) rotate(360deg); opacity:1; }
}
.ar-stack { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; }
.ar-shadow { position:relative; display:inline-block; }
.ar-word { font-size:clamp(120px,22vw,320px); font-weight:900; letter-spacing:.04em; line-height:.9; color:#000; -webkit-text-stroke:2px #000; animation:ar-wobble .6s ease-in-out infinite alternate; }
.ar-word-front { position:absolute; inset:0; color:var(--accent); -webkit-text-stroke:6px #000; text-shadow:6px 6px 0 #000, 8px 8px 0 #fff; animation:ar-wobble .6s ease-in-out infinite alternate-reverse; }
@keyframes ar-wobble { from { transform:rotate(-2deg) scale(1); } to { transform:rotate(2deg) scale(1.04); } }
.ar-player { margin-top:26px; font-size:42px; color:#fff; text-shadow:3px 3px 0 #000; display:inline-flex; align-items:center; gap:14px; background:#000; padding:10px 20px; border:4px solid #fff; box-shadow:6px 6px 0 var(--accent); animation:ar-pop .5s cubic-bezier(.2,1.6,.4,1) backwards; animation-delay:.3s; }
.ar-flag { font-size:32px; }
.ar-num { color:var(--accent); }
.ar-bonus { margin-top:18px; font-size:56px; font-weight:900; color:var(--accent); text-shadow:4px 4px 0 #000; animation:ar-bonus-rise 1.4s cubic-bezier(.2,.8,.3,1) backwards; animation-delay:.6s; }
@keyframes ar-bonus-rise {
  0% { transform:translateY(40px); opacity:0; }
  20% { opacity:1; }
  100% { transform:translateY(-30px); opacity:1; }
}
.ar-score-line { margin-top:24px; font-family:'Roboto Mono',monospace; font-size:28px; color:#fff; background:#000; padding:8px 18px; letter-spacing:.12em; animation:ar-pop .5s .9s cubic-bezier(.2,1.6,.4,1) backwards; }
.ar-score-line b { color:var(--accent); font-size:36px; }
@keyframes ar-pop { from { transform:scale(0); opacity:0; } to { transform:scale(1); opacity:1; } }

/* ===== CINEMATIC ===== */
.ci-root { position:absolute; inset:0; background:#000; overflow:hidden; font-family:'Cormorant Garamond','Playfair Display',Georgia,serif; opacity:0; transition:opacity .6s ease; }
.ci-root[data-phase="1"], .ci-root[data-phase="2"], .ci-root[data-phase="3"] { opacity:1; }
.ci-root[data-phase="4"] { opacity:0; transition:opacity .7s ease; }
.ci-bar { position:absolute; left:0; right:0; height:14%; background:#000; z-index:3; transition:transform .8s cubic-bezier(.7,0,.3,1); }
.ci-bar-top { top:0; transform:translateY(-100%); }
.ci-bar-bot { bottom:0; transform:translateY(100%); }
.ci-root[data-phase="1"] .ci-bar-top, .ci-root[data-phase="2"] .ci-bar-top, .ci-root[data-phase="3"] .ci-bar-top { transform:translateY(0); }
.ci-root[data-phase="1"] .ci-bar-bot, .ci-root[data-phase="2"] .ci-bar-bot, .ci-root[data-phase="3"] .ci-bar-bot { transform:translateY(0); }
.ci-vignette { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 45%, color-mix(in oklab, var(--team) 28%, transparent) 0%, transparent 60%), radial-gradient(ellipse at center, transparent 30%, #000 100%); }
.ci-grain { position:absolute; inset:0; background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='.6'/></svg>"); opacity:.12; mix-blend-mode:overlay; animation:ci-grain-shift .4s steps(4) infinite; }
@keyframes ci-grain-shift {
  0% { transform:translate(0,0); }
  25% { transform:translate(-2%,1%); }
  50% { transform:translate(1%,-2%); }
  75% { transform:translate(-1%,2%); }
  100% { transform:translate(2%,0); }
}
.ci-stack { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; z-index:2; }
.ci-min { display:inline-flex; align-items:center; gap:18px; opacity:0; transform:translateY(8px); transition:all .8s .2s ease; margin-bottom:32px; }
.ci-root[data-phase="2"] .ci-min, .ci-root[data-phase="3"] .ci-min { opacity:1; transform:translateY(0); }
.ci-min-line { width:80px; height:1px; background:rgba(255,255,255,.4); }
.ci-min-text { font-family:'Roboto Mono',monospace; font-size:14px; letter-spacing:.42em; color:rgba(255,255,255,.7); text-transform:uppercase; }
.ci-word { font-size:clamp(140px,22vw,320px); font-weight:600; font-style:italic; line-height:.9; letter-spacing:-.02em; color:#fff; opacity:0; transform:translateY(40px) scale(.9); filter:blur(20px); transition:all 1.4s .3s cubic-bezier(.16,1,.3,1); }
.ci-root[data-phase="2"] .ci-word, .ci-root[data-phase="3"] .ci-word { opacity:1; transform:translateY(0) scale(1); filter:blur(0); }
.ci-name { margin-top:18px; opacity:0; transform:translateY(20px); transition:all 1s 1.2s cubic-bezier(.16,1,.3,1); }
.ci-root[data-phase="3"] .ci-name { opacity:1; transform:translateY(0); }
.ci-given { font-family:'Roboto Mono',monospace; font-size:14px; letter-spacing:.5em; color:rgba(255,255,255,.5); text-transform:uppercase; margin-bottom:6px; }
.ci-surname { font-size:64px; font-family:'Cormorant Garamond',serif; font-weight:500; letter-spacing:.26em; color:#fff; text-transform:uppercase; }
.ci-meta { margin-top:36px; font-family:'Roboto Mono',monospace; font-size:18px; letter-spacing:.3em; color:rgba(255,255,255,.6); text-transform:uppercase; opacity:0; transition:opacity 1s 1.7s ease; }
.ci-root[data-phase="3"] .ci-meta { opacity:1; }
.ci-meta-score { color:var(--accent); font-weight:700; }

/* ===== STADIUM ===== */
.st-root { position:absolute; inset:0; overflow:hidden; background:var(--team); font-family:'Anton','Bebas Neue',Impact,sans-serif; transform:scale(0); transform-origin:center; transition:transform .55s cubic-bezier(.2,1.4,.3,1); }
.st-root[data-phase="1"], .st-root[data-phase="2"], .st-root[data-phase="3"] { transform:scale(1); }
.st-root[data-phase="4"] { transform:scale(1.05); opacity:0; transition:transform .5s ease, opacity .5s ease; }
.st-stripes { position:absolute; inset:0; background:repeating-linear-gradient(90deg, transparent 0 80px, rgba(255,255,255,.04) 80px 160px); }
.st-radial { position:absolute; inset:0; background:radial-gradient(circle at 50% 60%, transparent 20%, rgba(0,0,0,.5) 100%); }
.st-confetti { position:absolute; top:-10vh; animation:st-fall linear forwards; border-radius:2px; }
@keyframes st-fall { to { transform:translate(var(--sway), 120vh) rotate(var(--rot)); } }
.st-stack { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; width:min(1200px,92vw); }
.st-club { display:inline-flex; align-items:center; gap:18px; margin-bottom:14px; opacity:0; transform:translateY(-12px); transition:all .5s .15s ease; }
.st-root[data-phase="2"] .st-club, .st-root[data-phase="3"] .st-club { opacity:1; transform:translateY(0); }
.st-crest { width:64px; height:76px; background:#fff; clip-path:polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%); display:flex; align-items:center; justify-content:center; }
.st-crest-inner { font-size:36px; font-weight:900; color:var(--team); font-family:'Anton',sans-serif; line-height:1; }
.st-club-name { font-family:'Roboto Mono',monospace; font-size:16px; letter-spacing:.3em; color:#fff; text-transform:uppercase; }
.st-word { font-size:clamp(140px,24vw,340px); font-weight:900; line-height:.82; letter-spacing:-.01em; color:#fff; text-shadow:0 6px 0 rgba(0,0,0,.3), 0 18px 40px rgba(0,0,0,.5); }
.st-char { display:inline-block; opacity:0; transform:translateY(80px) scale(.5); transition:all .5s cubic-bezier(.2,1.6,.3,1); transition-delay:calc(var(--i) * 60ms + 200ms); animation:st-pulse 2s ease-in-out infinite; animation-delay:calc(var(--i) * 100ms + 1.2s); }
.st-root[data-phase="2"] .st-char, .st-root[data-phase="3"] .st-char { opacity:1; transform:translateY(0) scale(1); }
.st-bang { color:var(--accent); }
@keyframes st-pulse { 0%,100% { transform:translateY(0) scale(1); } 50% { transform:translateY(-6px) scale(1.02); } }
.st-player-row { margin-top:30px; display:inline-flex; align-items:center; gap:22px; background:rgba(0,0,0,.4); padding:14px 28px; border-left:6px solid var(--accent); opacity:0; transform:translateX(-40px); transition:all .5s .9s cubic-bezier(.16,1,.3,1); }
.st-root[data-phase="3"] .st-player-row { opacity:1; transform:translateX(0); }
.st-num-block { font-size:84px; font-weight:900; color:var(--accent); line-height:.9; }
.st-name-block { text-align:left; }
.st-surname { font-size:56px; font-weight:900; color:#fff; line-height:1; letter-spacing:-.01em; text-transform:uppercase; }
.st-given { font-family:'Roboto Mono',monospace; font-size:14px; letter-spacing:.2em; color:rgba(255,255,255,.7); text-transform:uppercase; margin-top:6px; }
.st-scoreboard { margin-top:26px; display:inline-flex; align-items:center; gap:18px; background:#000; padding:14px 30px; font-family:'Roboto Mono',monospace; letter-spacing:.14em; color:#fff; font-size:22px; opacity:0; transform:translateY(20px); transition:all .5s 1.1s cubic-bezier(.16,1,.3,1); }
.st-root[data-phase="3"] .st-scoreboard { opacity:1; transform:translateY(0); }
.st-sb-team { font-weight:600; }
.st-sb-score { font-size:44px; font-weight:900; color:var(--accent); }
.st-sb-divider { width:1px; height:44px; background:rgba(255,255,255,.2); }

@media (max-width:700px) {
  .bc-num { width:80px; height:80px; font-size:60px; }
  .bc-surname { font-size:44px; }
  .bc-given { font-size:14px; }
  .bc-score { font-size:18px; gap:14px; padding:10px 16px; }
  .bc-team-score { font-size:26px; }
  .st-num-block { font-size:56px; }
  .st-surname { font-size:36px; }
  .ci-surname { font-size:38px; letter-spacing:.2em; }
}
`;

function ensureStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

/* ------------------------------------------------------------
 * Particle burst (used by Broadcast)
 * ------------------------------------------------------------ */
function ParticleBurst({ color }: { color: string }) {
  const parts = useMemo(() => Array.from({ length: 36 }, (_: any, i: number) => {
    const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.2;
    const dist = 280 + Math.random() * 320;
    return {
      id: i,
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist,
      delay: Math.random() * 0.15,
      size: 4 + Math.random() * 8,
      rot: Math.random() * 720,
    };
  }), []);
  return (
    <div className="pb-root">
      {parts.map((p: any) => (
        <span key={p.id} className="pb-p" style={{
          background: color,
          width: p.size + 'px',
          height: p.size + 'px',
          ['--tx' as any]: p.tx + 'px',
          ['--ty' as any]: p.ty + 'px',
          ['--rot' as any]: p.rot + 'deg',
          animationDelay: p.delay + 's',
        } as CSSProperties} />
      ))}
    </div>
  );
}

const TICKER_LINGER_MS = 5000;

function broadcastTickerLine(data: GoalData): string {
  return `${data.surname.toUpperCase()} ${data.minute}' • ${data.homeTeam} ${data.homeScore} - ${data.awayScore} ${data.awayTeam}`;
}

/* ------------------------------------------------------------
 * Variants
 * ------------------------------------------------------------ */
function BroadcastVariant({ data, onDone }: VariantProps) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 3800),
      setTimeout(() => setPhase(5), 3800 + TICKER_LINGER_MS),
      setTimeout(() => onDone(), 3800 + TICKER_LINGER_MS + 600),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const chars = 'GOAL'.split('');
  const tickerLine = broadcastTickerLine(data);
  return (
    <div className="bc-root" data-phase={phase}
         style={{ ['--team' as any]: data.teamColor, ['--accent' as any]: data.accentColor } as CSSProperties}>
      <div className="bc-slab bc-slab-top" />
      <div className="bc-slab bc-slab-bot" />
      <div className="bc-stack">
        <div className="bc-eyebrow">
          <span className="bc-dot" />
          <span className="bc-min">{data.minute}&apos;</span>
        </div>
        <div className="bc-word">
          {chars.map((c, i) => (
            <span key={i} className="bc-char" style={{ ['--i' as any]: i } as CSSProperties}>{c}</span>
          ))}
          <span className="bc-bang" style={{ ['--i' as any]: chars.length } as CSSProperties}>!</span>
        </div>
        <div className="bc-player">
          <div className="bc-num">{data.number}</div>
          <div className="bc-nameblock">
            <div className="bc-surname">{data.surname}</div>
            <div className="bc-given">{data.given}</div>
          </div>
        </div>
        <div className="bc-score">
          <div className="bc-team">
            <span>{data.homeTeam}</span>
            <span className="bc-team-score">{data.homeScore}</span>
          </div>
          <span className="bc-dash">—</span>
          <div className="bc-team">
            <span className="bc-team-score">{data.awayScore}</span>
            <span>{data.awayTeam}</span>
          </div>
        </div>
      </div>
      <ParticleBurst color={data.accentColor} />
      <div className="bc-ticker">
        <div className="bc-ticker-track">
          <span>{tickerLine}</span><span>•</span>
          <span>{tickerLine}</span><span>•</span>
          <span>{tickerLine}</span><span>•</span>
          <span>{tickerLine}</span>
        </div>
      </div>
    </div>
  );
}

function ArcadeVariant({ data, onDone }: VariantProps) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 60),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 3800),
      setTimeout(() => onDone(), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const stars = useMemo(() => Array.from({ length: 28 }, (_: any, i: number) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 0.5,
    rot: Math.random() * 360,
    size: 12 + Math.random() * 28,
  })), []);

  return (
    <div className="ar-root" data-phase={phase}
         style={{ ['--team' as any]: data.teamColor, ['--accent' as any]: data.accentColor } as CSSProperties}>
      <div className="ar-stripes" />
      <div className="ar-checker" />
      {stars.map((s: any) => (
        <div key={s.id} className="ar-star" style={{
          left: s.x + '%', top: s.y + '%',
          animationDelay: s.delay + 's',
          transform: `rotate(${s.rot}deg)`,
          fontSize: s.size + 'px',
        }}>★</div>
      ))}
      <div className="ar-stack">
        <div className="ar-shadow">
          <div className="ar-word">G O A L</div>
          <div className="ar-word ar-word-front">G O A L</div>
        </div>
        <div className="ar-player">
          <span className="ar-flag">{data.flag}</span>
          <span>{data.surname.toUpperCase()}</span>
          <span className="ar-num">#{data.number}</span>
        </div>
        <div className="ar-bonus">+1 · {data.minute}'</div>
        <div className="ar-score-line">
          {data.homeTeam} <b>{data.homeScore}</b> — <b>{data.awayScore}</b> {data.awayTeam}
        </div>
      </div>
    </div>
  );
}

function CinematicVariant({ data, onDone }: VariantProps) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 4400),
      setTimeout(() => onDone(), 5200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="ci-root" data-phase={phase}
         style={{ ['--team' as any]: data.teamColor, ['--accent' as any]: data.accentColor } as CSSProperties}>
      <div className="ci-bar ci-bar-top" />
      <div className="ci-bar ci-bar-bot" />
      <div className="ci-vignette" />
      <div className="ci-grain" />
      <div className="ci-stack">
        <div className="ci-min">
          <span className="ci-min-line" />
          <span className="ci-min-text">{data.minute}TH MINUTE</span>
          <span className="ci-min-line" />
        </div>
        <div className="ci-word">GOAL.</div>
        <div className="ci-name">
          <div className="ci-given">{data.given.toUpperCase()}</div>
          <div className="ci-surname">{data.surname.toUpperCase()}</div>
        </div>
        <div className="ci-meta">
          {data.homeTeam} <span className="ci-meta-score">{data.homeScore}–{data.awayScore}</span> {data.awayTeam}
        </div>
      </div>
    </div>
  );
}

function StadiumVariant({ data, onDone }: VariantProps) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 60),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 4000),
      setTimeout(() => onDone(), 4800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const confetti = useMemo(() => Array.from({ length: 60 }, (_: any, i: number) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.4,
    dur: 1.6 + Math.random() * 1.4,
    rot: Math.random() * 720 - 360,
    color: ['var(--team)', 'var(--accent)', '#ffffff', '#111111'][i % 4],
    w: 6 + Math.random() * 8,
    h: 10 + Math.random() * 14,
    sway: -40 + Math.random() * 80,
  })), []);

  const chars = 'GOOOAL'.split('');
  return (
    <div className="st-root" data-phase={phase}
         style={{ ['--team' as any]: data.teamColor, ['--accent' as any]: data.accentColor } as CSSProperties}>
      <div className="st-stripes" />
      <div className="st-radial" />
      {confetti.map((c: any) => (
        <span key={c.id} className="st-confetti" style={{
          left: c.x + '%',
          width: c.w + 'px',
          height: c.h + 'px',
          background: c.color,
          animationDelay: c.delay + 's',
          animationDuration: c.dur + 's',
          ['--rot' as any]: c.rot + 'deg',
          ['--sway' as any]: c.sway + 'px',
        } as CSSProperties} />
      ))}
      <div className="st-stack">
        <div className="st-club">
          <div className="st-crest"><div className="st-crest-inner">{data.homeTeam[0] || 'F'}</div></div>
          <div className="st-club-name">{data.homeTeam}</div>
        </div>
        <div className="st-word">
          {chars.map((c, i) => (
            <span key={i} className="st-char" style={{ ['--i' as any]: i } as CSSProperties}>{c}</span>
          ))}
          <span className="st-char st-bang" style={{ ['--i' as any]: chars.length } as CSSProperties}>!</span>
        </div>
        <div className="st-player-row">
          <div className="st-num-block">{data.number}</div>
          <div className="st-name-block">
            <div className="st-surname">{data.surname}</div>
            <div className="st-given">{data.given} · {data.minute}'</div>
          </div>
        </div>
        <div className="st-scoreboard">
          <span className="st-sb-team">{data.homeTeam}</span>
          <span className="st-sb-score">{data.homeScore}</span>
          <span className="st-sb-divider" />
          <span className="st-sb-score">{data.awayScore}</span>
          <span className="st-sb-team">{data.awayTeam}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
 * Main exported component
 * ------------------------------------------------------------ */
export function GoalNotification({ trigger, data, onComplete }: GoalNotificationProps) {
  ensureStyles();
  const [active, setActive] = useState<null | { key: number; data: GoalData }>(null);
  const keyRef = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!trigger) return;
    keyRef.current += 1;
    setActive({
      key: keyRef.current,
      data: dataRef.current,
    });
  }, [trigger]);

  if (!active) return null;
  const done = () => { setActive(null); onComplete?.(); };
  return (
    <div className="gn-host" key={active.key}>
      <BroadcastVariant data={active.data} onDone={done} />
    </div>
  );
}
