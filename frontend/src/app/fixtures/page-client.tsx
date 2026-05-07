"use client";

import { useState } from "react";
import { GamesTab } from "@/components/workspace/GamesTab";
import { MatchDetailContent } from "@/components/workspace/MatchDetailContent";
import { useScores } from "@/hooks/useScores";

export function FixturesPageClient() {
  const { matches, loading, error, liveCount } = useScores();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-xl border border-white/8 bg-black/25">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Games
          </p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-600">
            {liveCount > 0 ? `${liveCount} live` : "No live games"}
          </p>
        </div>
        <GamesTab
          matches={matches}
          loading={loading}
          error={error}
          showPickDetailHint={!selectedMatchId}
          onSelectMatch={(id) => setSelectedMatchId(id)}
        />
      </section>

      <section className="min-h-80 overflow-hidden rounded-xl border border-white/8 bg-black/25">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Match detail
          </p>
          {selectedMatchId && (
            <button
              type="button"
              className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 transition hover:text-neutral-200"
              onClick={() => setSelectedMatchId(null)}
            >
              Clear
            </button>
          )}
        </div>
        {selectedMatchId ? (
          <MatchDetailContent
            matchId={selectedMatchId}
            onClearSelection={() => setSelectedMatchId(null)}
          />
        ) : (
          <div className="p-4 text-sm text-neutral-500">
            Select a match to see standings, head-to-head, and related stories.
          </div>
        )}
      </section>
    </div>
  );
}

