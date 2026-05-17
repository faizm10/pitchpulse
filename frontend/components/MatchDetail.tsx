'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BackBar } from './Shared';
import { MatchPrediction } from './MatchPrediction';
import { useTweaks } from './Providers';
import { useTypewriter } from '@/hooks/useTypewriter';
import { buildPredictionNarrative, fetchPrediction } from '@/lib/predict';
import { VENUES } from '@/data/venues';
import { matchVenueId } from '@/lib/espn';
import type { MatchDetail as EspnMatchDetail, MatchTeam } from '@/types/espn';
import type { PredictResponse } from '@/types/predict';

const SHOW_EXTENDED_STATS = false;

export function MatchDetail({ id }: { id: string }) {
  const { tweaks } = useTweaks();
  const [detail, setDetail] = useState<EspnMatchDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(true);

  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingMatch(true);
      setLoadError(null);
      setDetail(null);
      try {
        const res = await fetch(`/api/match/${id}`);
        const data = await res.json();
        if (!res.ok) {
          const msg =
            data?.detail ??
            data?.error ??
            `Failed to load match (${res.status})`;
          throw new Error(typeof msg === 'string' ? msg : 'Failed to load match');
        }
        if (!data.detail) {
          throw new Error('Match API returned no detail payload');
        }
        if (!cancelled) setDetail(data.detail);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load match');
      } finally {
        if (!cancelled) setLoadingMatch(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const match = detail;
    if (!match) return;
    let cancelled = false;
    async function loadPrediction() {
      setPredictionLoading(true);
      setPredictionError(null);
      try {
        const p = await fetchPrediction(match.homeTeam.name, match.awayTeam.name);
        if (!cancelled) setPrediction(p);
      } catch (e) {
        if (!cancelled) {
          setPredictionError(e instanceof Error ? e.message : 'Prediction failed');
        }
      } finally {
        if (!cancelled) setPredictionLoading(false);
      }
    }
    loadPrediction();
    return () => {
      cancelled = true;
    };
  }, [detail]);

  const narrativeText = prediction ? buildPredictionNarrative(prediction) : '';
  const { display: aiNarrative, isTyping } = useTypewriter(
    narrativeText,
    tweaks.aiSummary && Boolean(narrativeText)
  );

  if (loadingMatch) {
    return (
      <div className="screen" style={{ padding: 60 }}>
        <div className="serif it" style={{ fontSize: 28, color: 'var(--ink-3)' }}>
          Loading match…
        </div>
      </div>
    );
  }

  if (loadError || !detail) {
    return (
      <div className="screen" style={{ padding: 60 }}>
        <div className="serif" style={{ fontSize: 28 }}>Match not found</div>
        <p className="mono" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12 }}>
          {loadError ?? 'No data for this fixture.'}
        </p>
      </div>
    );
  }

  const resolvedVenueId = matchVenueId(detail.venue.city);
  const stadiumLinkId =
    resolvedVenueId && VENUES.some((v) => v.id === resolvedVenueId)
      ? resolvedVenueId
      : undefined;
  const headerLabel = [
    detail.group ? `Group ${detail.group}` : null,
    detail.venue.city.toUpperCase(),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="screen" style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <BackBar label={headerLabel} />

      <div
        style={{
          padding: '48px 56px 40px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 40,
          alignItems: 'center',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <TeamHero team={detail.homeTeam} side="left" state={detail.state} />
        <StatusCenter detail={detail} />
        <TeamHero team={detail.awayTeam} side="right" state={detail.state} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: SHOW_EXTENDED_STATS ? '1.2fr 1fr' : '1fr',
          flex: 1,
          borderBottom: '1px solid var(--rule)',
        }}
      >
        {SHOW_EXTENDED_STATS && (
          <div style={{ padding: '32px 48px', borderRight: '1px solid var(--rule)', display: 'none' }}>
            <div className="eyebrow">Timeline</div>
            <div className="serif" style={{ fontSize: 28, marginTop: 6, fontStyle: 'italic' }}>
              How the match has unfolded
            </div>
          </div>
        )}

        <div style={{ padding: '32px 48px', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {tweaks.aiSummary && narrativeText && (
            <div style={{ background: 'var(--ink)', color: 'var(--paper)', padding: 24, borderRadius: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <div
                  className="mono"
                  style={{ fontSize: 10, letterSpacing: '0.18em', color: 'rgba(242,238,227,0.65)' }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'var(--pulse)',
                      marginRight: 8,
                    }}
                  />
                  PULSE · AI NARRATIVE
                </div>
                <div className="mono" style={{ fontSize: 9, color: 'rgba(242,238,227,0.45)' }}>
                  {prediction?.model ?? 'random_forest_v1'}
                </div>
              </div>
              <div className="serif" style={{ fontSize: 19, lineHeight: 1.4, fontStyle: 'italic' }}>
                {aiNarrative}
                {isTyping && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 18,
                      background: 'var(--pulse)',
                      verticalAlign: 'text-bottom',
                      marginLeft: 2,
                    }}
                  />
                )}
              </div>
            </div>
          )}

          <MatchPrediction
            homeLabel={detail.homeTeam.name}
            awayLabel={detail.awayTeam.name}
            prediction={prediction}
            loading={predictionLoading}
            error={predictionError}
          />
        </div>
      </div>

      <div
        style={{
          padding: '24px 56px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--paper-2)',
        }}
      >
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.12em' }}>
          {detail.venue.name.toUpperCase()}
          {detail.venue.country ? ` · ${detail.venue.country.toUpperCase()}` : ''}
          {detail.broadcast ? ` · ${detail.broadcast.toUpperCase()}` : ''}
        </div>
        {stadiumLinkId ? (
          <Link href={`/stadium/${stadiumLinkId}`} className="btn" style={{ textDecoration: 'none' }}>
            VIEW STADIUM →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function StatusCenter({ detail }: { detail: EspnMatchDetail }) {
  if (detail.state === 'in') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: 'var(--live)',
            letterSpacing: '0.18em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span className="status-dot live" /> LIVE
          {detail.displayClock ? ` · ${detail.displayClock}` : ''}
        </div>
        <div className="serif" style={{ fontSize: 18, marginTop: 8, color: 'var(--ink-3)', fontStyle: 'italic' }}>
          {detail.statusDetail}
        </div>
      </div>
    );
  }

  if (detail.state === 'post') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.18em' }}>
          {detail.statusDetail.toUpperCase() || 'FULL TIME'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.18em' }}>
        {detail.statusDetail.toUpperCase() || 'SCHEDULED'}
      </div>
      <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 8 }}>
        {new Date(detail.date).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}

function TeamHero({
  team,
  side,
  state,
}: {
  team: MatchTeam;
  side: 'left' | 'right';
  state: EspnMatchDetail['state'];
}) {
  const showScore = state !== 'pre';
  const score = team.score;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        flexDirection: side === 'right' ? 'row-reverse' : 'row',
      }}
    >
      {team.logo ? (
        <img
          src={team.logo}
          alt={team.name}
          style={{ width: 88, height: 88, objectFit: 'contain' }}
        />
      ) : (
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 8,
            background: 'var(--rule-soft)',
          }}
        />
      )}
      <div style={{ textAlign: side === 'right' ? 'right' : 'left' }}>
        <div className="serif" style={{ fontSize: 46, lineHeight: 0.95 }}>
          {team.name}
        </div>
        <div
          className="mono"
          style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--ink-3)', marginTop: 8 }}
        >
          {team.abbreviation}
        </div>
      </div>
      {showScore && (
        <div className="serif tnum" style={{ fontSize: 96, lineHeight: 1 }}>
          {score}
        </div>
      )}
    </div>
  );
}
