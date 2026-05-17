'use client';

import Link from 'next/link';
import { teams } from '@/lib/data';
import type { FormResult } from '@/lib/types';

import {
  GB_ENG,
  GB_SCT,
} from "country-flag-icons/react/3x2";

// ───── Flag ─────
import {
  AR,
  AU,
  AT,
  BE,
  BA,
  BR,
  CA,
  CV,
  CO,
  CG,
  CI,
  CW,
  CZ,
  EC,
  EG,
  SV,
  FR,
  DE,
  GH,
  HT,
  IR,
  IQ,
  JP,
  JO,
  KR,
  MX,
  MA,
  NL,
  NZ,
  NO,
  PA,
  PY,
  PT,
  QA,
  SA,
  SN,
  ZA,
  ES,
  SE,
  CH,
  TN,
  TR,
  US,
  UY,
  UZ,
  DZ,
  CD,
  HR,
  GB,
  
} from "country-flag-icons/react/3x2";

const FLAGS: Record<string, React.ComponentType<any>> = {
  // Co-hosts
  CAN: CA,
  MEX: MX,
  USA: US,

  // AFC
  AUS: AU,
  IRQ: IQ,
  IRN: IR,
  JPN: JP,
  JOR: JO,
  KOR: KR,
  QAT: QA,
  KSA: SA,
  UZB: UZ,

  // CAF
  ALG: DZ,
  CPV: CV,
  COD: CD,
  CIV: CI,
  EGY: EG,
  GHA: GH,
  MAR: MA,
  SEN: SN,
  RSA: ZA,
  TUN: TN,

  // Concacaf
  CUW: CW,
  HAI: HT,
  PAN: PA,

  // CONMEBOL
  ARG: AR,
  BRA: BR,
  COL: CO,
  ECU: EC,
  PAR: PY,
  URU: UY,

  // OFC
  NZL: NZ,

  // UEFA
  AUT: AT,
  BEL: BE,
  BIH: BA,
  CRO: HR,
  CZE: CZ,
  ENG: GB_ENG,
  SCO: GB_SCT,
  FRA: FR,
  GER: DE,
  NED: NL,
  NOR: NO,
  POR: PT,

  ESP: ES,
  SWE: SE,
  SUI: CH,
  TUR: TR,
  
  
};
export function Flag({
  code,
  w = 22,
  h = 14,
}: {
  code: string;
  w?: number;
  h?: number;
}) {
  const FlagIcon = FLAGS[code];

  if (!FlagIcon) return null;

  return (
    <FlagIcon
      style={{
        width: w,
        height: h,
        borderRadius: 2,
        objectFit: "cover",
      }}
    />
  );
}

// ───── Logo ─────
export function Logo() {
  return (
    <Link href="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
      <span className="brand-mark"><span className="ring" /></span>
      <span className="brand-name">Pitch<em>Pulse</em></span>
      <span className="brand-sub">WC &apos;26</span>
    </Link>
  );
}

// ───── FormDots ─────
export function FormDots({ form }: { form: FormResult[] }) {
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {form.map((r, i) => (
        <span key={i} style={{
          width: 14, height: 14, borderRadius: 4,
          background: r === 'W' ? 'var(--live)' : r === 'D' ? 'var(--gold)' : 'var(--pulse)',
          display: 'inline-grid', placeItems: 'center',
          fontFamily: 'var(--mono)', fontSize: 9, color: 'white', fontWeight: 600,
        }}>{r}</span>
      ))}
    </span>
  );
}

// ───── Stat / Big ─────
export function Stat({ n, l }: { n: string | number; l: string }) {
  return (
    <div>
      <div className="serif tnum" style={{ fontSize: 32, lineHeight: 1 }}>{n}</div>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--ink-3)', marginTop: 6 }}>{l.toUpperCase()}</div>
    </div>
  );
}

export function Big({ n, l }: { n: string | number; l: string }) {
  return (
    <div>
      <div className="serif tnum" style={{ fontSize: 30, lineHeight: 1 }}>{n}</div>
      <div className="mono" style={{ fontSize: 9, letterSpacing: '0.16em', opacity: 0.65, marginTop: 6 }}>{l.toUpperCase()}</div>
    </div>
  );
}

// ───── BackBar ─────
export function BackBar({ label, accent }: { label: string; accent?: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 32px',
      borderBottom: '1px solid var(--rule)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--paper)',
    }}>
      <Link href="/" style={{
        textDecoration: 'none',
        background: 'transparent', border: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em',
        color: 'var(--ink)',
      }}>
        ← BACK TO MAP
      </Link>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.18em' }}>
        {label}
      </div>
      {accent || <div style={{ width: 80 }} />}
    </div>
  );
}

// ───── ago ─────
export const ago = (t: number): string => {
  if (t < 60) return `${t}s ago`;
  if (t < 3600) return `${Math.round(t / 60)}m ago`;
  return `${Math.round(t / 3600)}h ago`;
};
