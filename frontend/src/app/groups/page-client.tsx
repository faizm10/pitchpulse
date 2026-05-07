"use client";

import { useFeedStandings } from "@/hooks/useFeedStandings";
import { GroupStandings } from "@/components/match/GroupStandings";

export function GroupsPageClient() {
  const { groups, loading, error } = useFeedStandings();

  const sorted = [...groups].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Standings
          </p>
          <p className="mt-1 text-sm text-neutral-300">
            {groups.length > 0
              ? `${groups.length} group table${groups.length === 1 ? "" : "s"}`
              : "Group tables will fill in as the tournament approaches."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            Updated ~2 min
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            FIFA WC 2026
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl border border-white/8 bg-black/25"
            >
              <div className="border-b border-white/8 px-4 py-3">
                <div className="h-3 w-24 rounded bg-white/10" />
              </div>
              <div className="space-y-2 p-4">
                <div className="h-3 w-4/5 rounded bg-white/10" />
                <div className="h-3 w-3/5 rounded bg-white/10" />
                <div className="h-24 rounded-xl bg-white/6" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-white/8 bg-black/25 p-4 text-sm text-neutral-400">
          {error}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorted.map((g, i) => (
            <section
              key={`${g.order ?? i}-${g.header}`}
              className="overflow-hidden rounded-2xl border border-white/8 bg-black/25 transition hover:bg-white/3"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    {g.header}
                  </p>
                  <p className="mt-1 truncate text-xs text-neutral-400">
                    {g.entries.length} teams
                  </p>
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-600">
                  Pts · GD
                </div>
              </div>

              <div className="pb-1">
                <GroupStandings
                  title={g.header}
                  hideTitle
                  entries={g.entries}
                  highlightIds={[]}
                  showBorderBottom={false}
                  variant="feed"
                  className="px-4 py-3"
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

