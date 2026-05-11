"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripHorizontal,
} from "lucide-react";

import type {
  Match,
  NewsArticle,
  StandingsGroupBlock,
} from "@/types/espn";

import { cn } from "@/lib/utils";

import { NewsTab } from "./NewsTab";
import { GamesTab } from "./GamesTab";
import { FeedStandings } from "./FeedStandings";
import { MatchDetailContent } from "./MatchDetailContent";

interface WorkspaceShellProps {
  matches: Match[];
  scoresLoading: boolean;
  scoresError: string | null;

  newsArticles: NewsArticle[];
  newsLoading: boolean;
  newsError: string | null;
  newsLastUpdated: Date | null;

  selectedMatchId: string | null;

  collapsed: boolean;
  mobileOpen: boolean;

  height: number;

  onHeightChange: (height: number) => void;

  onCollapseToggle: () => void;

  onMobileOpenChange: (open: boolean) => void;

  onSelectMatch: (id: string) => void;

  onClearSelectedMatch: () => void;

  standingsGroups: StandingsGroupBlock[];
  standingsLoading: boolean;
  standingsError: string | null;
}

const DESKTOP_MIN_HEIGHT = 100;
const DESKTOP_MAX_HEIGHT = 920;
const MOBILE_BREAKPOINT = 768;

export function WorkspaceShell({
  matches,
  scoresLoading,
  scoresError,

  newsArticles,
  newsLoading,
  newsError,
  newsLastUpdated,

  selectedMatchId,

  collapsed,
  mobileOpen,

  height,

  onHeightChange,

  onCollapseToggle,

  onMobileOpenChange,

  onSelectMatch,

  onClearSelectedMatch,

  standingsGroups,
  standingsLoading,
  standingsError,
}: WorkspaceShellProps) {
  const [dragging, setDragging] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

  const detailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    );

    const sync = () => setIsMobile(mediaQuery.matches);

    sync();

    mediaQuery.addEventListener("change", sync);

    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!dragging || isMobile) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      const nextHeight = Math.min(
        DESKTOP_MAX_HEIGHT,
        Math.max(
          DESKTOP_MIN_HEIGHT,
          window.innerHeight - event.clientY
        )
      );

      onHeightChange(nextHeight);
    }

    function handlePointerUp() {
      setDragging(false);
    }

    window.addEventListener("pointermove", handlePointerMove);

    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp
      );
    };
  }, [dragging, isMobile, onHeightChange]);

  useEffect(() => {
    if (!selectedMatchId || !detailRef.current) {
      return;
    }

    detailRef.current.scrollIntoView({
      behavior: "smooth",
      block: isMobile ? "nearest" : "start",
    });
  }, [isMobile, selectedMatchId]);

  const desktopHeight = collapsed ? 52 : height;

  const mobileHeight = mobileOpen
    ? "min(78vh, 42rem)"
    : "3.5rem";

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "absolute inset-0 z-[120] bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          mobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={() => onMobileOpenChange(false)}
      />

      {/* Workspace */}
      <section
        className={cn(
          `
          pointer-events-auto
          absolute
          inset-x-0
          bottom-0
          z-[130]
          flex
          flex-col
          overflow-hidden
          border-t
          border-white/10
          bg-neutral-950/90
          shadow-[0_-20px_80px_rgba(0,0,0,0.75)]
          backdrop-blur-3xl
          `,
          "transition-transform duration-300",
          "md:left-0 md:right-0 md:bottom-0 md:rounded-t-[2rem]",
          !isMobile &&
            !dragging &&
            "md:transition-[height,transform]",
          mobileOpen
            ? "translate-y-0"
            : "translate-y-[calc(100%-3.5rem)] md:translate-y-0"
        )}
        style={{
          height: isMobile
            ? mobileHeight
            : desktopHeight,
        }}
      >
        {/* Premium Glow Line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-lime-400/60 to-transparent" />

        {/* Resize Handle */}
        {!isMobile && !collapsed && (
          <button
            type="button"
            onPointerDown={() => setDragging(true)}
            className={cn(
              "absolute left-0 right-0 top-0 h-4 -translate-y-1/2 cursor-row-resize bg-transparent",
              dragging && "bg-lime-400/10"
            )}
            aria-label="Resize workspace"
          >
            <span className="absolute left-1/2 top-1/2 h-px w-28 -translate-x-1/2 -translate-y-1/2 bg-lime-400/40" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-lime-400/20 bg-lime-400/10">
              <GripHorizontal className="size-5 text-lime-400" />
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-lime-400">
                World Cup
              </p>

              <h2 className="mt-1 text-lg font-black text-white">
                Match Intelligence Feed
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isMobile) {
                onMobileOpenChange(!mobileOpen);
                return;
              }

              onCollapseToggle();
            }}
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              border
              border-white/10
              bg-white/[0.03]
              text-neutral-400
              transition-all
              duration-300
              hover:border-lime-400/20
              hover:bg-lime-400/10
              hover:text-white
            "
            aria-label={
              collapsed
                ? "Expand workspace"
                : "Collapse workspace"
            }
          >
            {collapsed || !mobileOpen ? (
              <ChevronUp className="size-5" />
            ) : (
              <ChevronDown className="size-5" />
            )}
          </button>
        </div>

        {/* Content */}
        {!collapsed && (
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
            <div
              className={cn(
                "grid min-h-0 gap-5",
                selectedMatchId
                  ? "md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.1fr)]"
                  : "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
              )}
            >
              {/* News */}
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                <div className="border-b border-white/10 px-5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-lime-400">
                    News Feed
                  </p>
                </div>

                <NewsTab
                  articles={newsArticles}
                  loading={newsLoading}
                  error={newsError}
                  lastUpdated={newsLastUpdated}
                />
              </section>

              {/* Games + Standings */}
              <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                <div className="border-b border-white/10 px-5 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-lime-400">
                    Match Center
                  </p>
                </div>

                <GamesTab
                  matches={matches}
                  loading={scoresLoading}
                  error={scoresError}
                  showPickDetailHint={!selectedMatchId}
                  onSelectMatch={(id) => {
                    if (isMobile) {
                      onMobileOpenChange(true);
                    }

                    onSelectMatch(id);
                  }}
                />

                {/* Standings */}
                <div className="border-t border-white/10">
                  <div className="border-b border-white/10 px-5 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-lime-400">
                      Standings
                    </p>
                  </div>

                  <FeedStandings
                    groups={standingsGroups}
                    loading={standingsLoading}
                    error={standingsError}
                  />
                </div>
              </section>

              {/* Match Detail */}
              {selectedMatchId && (
                <section
                  ref={detailRef}
                  className="
                    rounded-2xl
                    border
                    border-lime-400/10
                    bg-gradient-to-br
                    from-white/[0.04]
                    to-white/[0.02]
                    backdrop-blur-xl
                  "
                >
                  <div className="border-b border-white/10 px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-lime-400">
                        Match Detail
                      </p>

                      <button
                        type="button"
                        onClick={onClearSelectedMatch}
                        className="
                          rounded-lg
                          border
                          border-white/10
                          px-3
                          py-1.5
                          text-[11px]
                          font-semibold
                          uppercase
                          tracking-[0.18em]
                          text-neutral-400
                          transition-all
                          duration-300
                          hover:border-red-400/20
                          hover:bg-red-400/10
                          hover:text-white
                        "
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <MatchDetailContent
                    matchId={selectedMatchId}
                    onClearSelection={
                      onClearSelectedMatch
                    }
                  />
                </section>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}