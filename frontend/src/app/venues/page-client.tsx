"use client";

import { useState } from "react";
import { DashboardMap } from "@/components/map/DashboardMap";
import { MatchDetailContent } from "@/components/workspace/MatchDetailContent";
import { useScores } from "@/hooks/useScores";

export function VenuesPageClient() {
  const { matches } = useScores();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-xl border border-white/8 bg-black/25">
        <div className="border-b border-white/8 px-4 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Stadium map
          </p>
        </div>
        <div className="h-[min(70vh,36rem)]">
          <DashboardMap matches={matches} onSelectMatch={setSelectedMatchId} />
        </div>
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
            Select a pin to inspect that match.
          </div>
        )}
      </section>
    </div>
  );
}

