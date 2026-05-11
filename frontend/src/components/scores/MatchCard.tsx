import type { Match } from "@/types/espn";
import { Clock3, Radio } from "lucide-react";

function TeamRow({
  team,
  isWinner,
  state,
}: {
  team: Match["homeTeam"];
  isWinner?: boolean;
  state: Match["state"];
}) {
  return (
    <div className="flex items-center gap-3">
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.logo}
          alt={team.abbreviation}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full bg-white/5 p-1 object-contain"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-white/10" />
      )}

      <div className="flex flex-1 items-center justify-between min-w-0">
        <span
          className={`truncate text-sm font-semibold tracking-wide ${
            state === "post" && isWinner
              ? "text-white"
              : "text-neutral-300"
          }`}
        >
          {team.name !== "TBD" ? team.name : team.abbreviation}
        </span>

        {state !== "pre" && (
          <span
            className={`text-2xl font-black tabular-nums ${
              state === "post" && isWinner
                ? "text-white"
                : "text-neutral-400"
            }`}
          >
            {team.score}
          </span>
        )}
      </div>
    </div>
  );
}

export function MatchCard({
  match,
  onSelect,
}: {
  match: Match;
  onSelect?: (id: string) => void;
}) {
  const isPre = match.state === "pre";
  const isLive = match.state === "in";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(match.id)}
      className="
        group
        relative
        w-full
        overflow-hidden
        border-b
        border-white/5
        bg-gradient-to-br
        from-neutral-950
        to-neutral-900
        p-4
        text-left
        transition-all
        duration-300
        hover:bg-white/[0.03]
        hover:shadow-[0_0_30px_rgba(163,230,53,0.08)]
      "
    >
      {/* Hover glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-r from-lime-400/5 via-transparent to-transparent" />
      </div>

      {/* Top Row */}
      <div className="mb-4 flex items-center justify-between">
        {isLive ? (
          <div className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1">
            <Radio className="h-3 w-3 text-red-400" />

            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-400">
              LIVE {match.displayClock}
            </span>
          </div>
        ) : isPre ? (
          <div className="flex items-center gap-2 text-[11px] text-lime-400">
            <Clock3 className="h-3 w-3" />

            <span className="font-semibold tracking-wide">
              {match.statusDetail}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            FULL TIME
          </span>
        )}

        {match.broadcast && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-400">
            {match.broadcast}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="space-y-4">
        <TeamRow
          team={match.homeTeam}
          isWinner={match.homeTeam.winner}
          state={match.state}
        />

        <TeamRow
          team={match.awayTeam}
          isWinner={match.awayTeam.winner}
          state={match.state}
        />
      </div>

      {/* Venue */}
      {isPre && match.venue.name && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <p className="text-[11px] tracking-wide text-neutral-500">
            {match.venue.name}
            {match.venue.city ? ` · ${match.venue.city}` : ""}
          </p>
        </div>
      )}
    </button>
  );
}