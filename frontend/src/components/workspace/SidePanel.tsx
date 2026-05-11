"use client";

import { useState } from "react";
import type { Match, NewsArticle, StandingsGroupBlock } from "@/types/espn";
import { cn } from "@/lib/utils";
import { NewsTab } from "./NewsTab";
import { GamesTab } from "./GamesTab";
import { FeedStandings } from "./FeedStandings";
import { MatchDetailContent } from "./MatchDetailContent";

type Tab = "games" | "news" | "standings";

interface SidePanelProps {
  matches: Match[];
  scoresLoading: boolean;
  scoresError: string | null;
  newsArticles: NewsArticle[];
  newsLoading: boolean;
  newsError: string | null;
  newsLastUpdated: Date | null;
  selectedMatchId: string | null;
  onSelectMatch: (id: string) => void;
  onClearSelectedMatch: () => void;
  standingsGroups: StandingsGroupBlock[];
  standingsLoading: boolean;
  standingsError: string | null;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "games", label: "Games" },
  { id: "news", label: "News" },
  { id: "standings", label: "Standings" },
];

export function SidePanel({
  matches,
  scoresLoading,
  scoresError,
  newsArticles,
  newsLoading,
  newsError,
  newsLastUpdated,
  selectedMatchId,
  onSelectMatch,
  onClearSelectedMatch,
  standingsGroups,
  standingsLoading,
  standingsError,
}: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("games");

  const liveMatches = matches.filter((m) => m.state === "in");
  const upcomingMatches = matches.filter((m) => m.state === "pre");

  return (
    <aside className="row-start-2 row-end-3 flex flex-col overflow-hidden border-l border-gray-200 bg-white shadow-[-4px_0_16px_rgba(0,0,0,0.06)]">

      {/* Quick-glance stats strip */}
      <div className="flex shrink-0 items-stretch divide-x divide-gray-100 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex flex-1 flex-col items-center justify-center py-2.5">
          <span className="text-lg font-bold tabular-nums text-emerald-600">
            {liveMatches.length}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-500">
            Live now
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-2.5">
          <span className="text-lg font-bold tabular-nums text-gray-700">
            {upcomingMatches.length}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Upcoming
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center py-2.5">
          <span className="text-lg font-bold tabular-nums text-gray-700">
            {matches.filter((m) => m.state === "post").length}
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Results
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-gray-100 px-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
              activeTab === tab.id
                ? "text-emerald-600"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            {tab.label}

            {/* Live pulse on Games tab */}
            {tab.id === "games" && liveMatches.length > 0 && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            )}

            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-10 -translate-x-1/2 rounded-full bg-emerald-500" />
            )}
          </button>
        ))}
      </div>

      {/* Match detail banner */}
      {selectedMatchId && activeTab === "games" && (
        <div className="shrink-0 border-b border-emerald-100 bg-emerald-50 px-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-600">
              ⚡ Match selected
            </p>
            <button
              type="button"
              onClick={onClearSelectedMatch}
              className="text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-400 transition hover:text-gray-700"
            >
              Clear ✕
            </button>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {activeTab === "games" && (
          <div>
            {selectedMatchId && (
              <div className="border-b border-gray-100">
                <MatchDetailContent
                  matchId={selectedMatchId}
                  onClearSelection={onClearSelectedMatch}
                />
              </div>
            )}
            <GamesTab
              matches={matches}
              loading={scoresLoading}
              error={scoresError}
              showPickDetailHint={!selectedMatchId}
              onSelectMatch={onSelectMatch}
            />
          </div>
        )}

        {activeTab === "news" && (
          <NewsTab
            articles={newsArticles}
            loading={newsLoading}
            error={newsError}
            lastUpdated={newsLastUpdated}
          />
        )}

        {activeTab === "standings" && (
          <div className="p-4">
            <FeedStandings
              groups={standingsGroups}
              loading={standingsLoading}
              error={standingsError}
            />
          </div>
        )}
      </div>
    </aside>
  );
}