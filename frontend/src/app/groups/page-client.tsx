"use client";

import { FeedStandings } from "@/components/workspace/FeedStandings";
import { useFeedStandings } from "@/hooks/useFeedStandings";

export function GroupsPageClient() {
  const { groups, loading, error } = useFeedStandings();

  return (
    <section className="overflow-hidden rounded-xl border border-white/8 bg-black/25">
      <div className="border-b border-white/8 px-4 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Standings
        </p>
      </div>
      <FeedStandings groups={groups} loading={loading} error={error} />
    </section>
  );
}

