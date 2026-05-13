import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { VENUES, COUNTRY_COLORS } from "@/data/venues";
import type { Match } from "@/types/espn";

interface StadiumMarkersProps {
  matches: Match[];
  onSelectMatch?: (id: string) => void;
}

function getNextMatch(matches: Match[]) {
  const upcoming = matches
    .filter((m) => m.state === "pre")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0];
}

function MatchPopupSection({ match }: { match: Match }) {
  const isLive = match.state === "in";
  const isFinished = match.state === "post";

  return (
    <div style={{ borderTop: "1px solid var(--rule-soft)", paddingTop: 8, marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{
          fontSize: 10, color: "var(--ink-3)",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {isLive ? "Live" : isFinished ? "Full Time" : "Upcoming"}
        </span>
        {isLive && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "var(--live)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--live)" }} />
            {match.displayClock}
          </span>
        )}
        {!isLive && (
          <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
            {match.statusDetail}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[match.homeTeam, match.awayTeam].map((team) => (
          <div key={team.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {team.logo ? (
              <img src={team.logo} alt={team.abbreviation} style={{ width: 16, height: 16, objectFit: "contain", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--rule)", flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, fontSize: 12, color: "var(--ink)", fontWeight: 500 }}>
              {team.abbreviation}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--ink)" }}>
              {match.state === "pre" ? "–" : team.score}
            </span>
          </div>
        ))}
      </div>

      {match.broadcast && (
        <p style={{ marginTop: 8, marginBottom: 0, fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
          {match.broadcast}
        </p>
      )}
    </div>
  );
}

export function StadiumMarkers({ matches, onSelectMatch }: StadiumMarkersProps) {
  const matchesByVenue = new Map<string, Match[]>();
  for (const match of matches) {
    if (!match.venueId) continue;
    if (!matchesByVenue.has(match.venueId)) matchesByVenue.set(match.venueId, []);
    matchesByVenue.get(match.venueId)!.push(match);
  }

  return (
    <>
      {VENUES.map((venue) => {
        const venueMatches = matchesByVenue.get(venue.id) ?? [];
        const match = getNextMatch(venueMatches);
        const isLive = match?.state === "in";
        const color = COUNTRY_COLORS[venue.country];

        return (
          <MapMarker key={venue.id} longitude={venue.longitude} latitude={venue.latitude}>
            <MarkerContent>
              <div style={{ position: "relative" }}>
                {isLive && (
                  <>
                    <span style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      backgroundColor: color,
                      animation: "pulse-ring 1.8s ease-out infinite",
                    }} />
                    <span style={{
                      position: "absolute", inset: -6, borderRadius: "50%",
                      border: "1px solid rgba(229,57,43,0.3)",
                    }} />
                  </>
                )}
                {/* Glow */}
                <div style={{
                  position: "absolute", inset: -4, borderRadius: "50%",
                  filter: "blur(6px)", opacity: 0.7,
                  backgroundColor: color,
                }} />
                {/* Dot */}
                <button
                  type="button"
                  style={{
                    position: "relative",
                    width: 14, height: 14, borderRadius: "50%",
                    border: "2px solid white",
                    backgroundColor: color,
                    cursor: "pointer",
                    boxShadow: "0 0 12px rgba(255,255,255,0.15)",
                    transition: "transform 200ms",
                    padding: 0,
                  }}
                />
              </div>
            </MarkerContent>

            <MarkerPopup>
              <div style={{
                minWidth: 210, borderRadius: 12, overflow: "hidden",
                boxShadow: "0 8px 24px rgba(14,22,38,0.18)",
                border: "1px solid var(--rule)",
                background: "var(--paper)",
              }}>
                {/* Country color stripe */}
                <div style={{ height: 4, width: "100%", backgroundColor: color }} />

                {venue.image && (
                  <img
                    src={venue.image}
                    alt={venue.name}
                    style={{ width: "100%", height: 112, objectFit: "cover", display: "block" }}
                  />
                )}

                <div style={{ padding: 12, background: "var(--paper-2)" }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "var(--ink)", lineHeight: 1.3 }}>
                    {venue.name}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-3)" }}>
                    {venue.city}
                  </p>

                  <div style={{ borderTop: "1px solid var(--rule-soft)", paddingTop: 8, marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Capacity</span>
                      <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink)" }}>
                        {venue.capacity.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Country</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color }}>
                        {venue.country}
                      </span>
                    </div>
                  </div>

                  {match && <MatchPopupSection match={match} />}

                  {match && onSelectMatch && (
                    <button
                      type="button"
                      onClick={() => onSelectMatch(match.id)}
                      style={{
                        marginTop: 8, width: "100%",
                        borderRadius: 8, border: "1px solid var(--rule)",
                        background: "var(--paper)", padding: "8px 12px",
                        fontSize: 12, fontWeight: 500, color: "var(--ink)",
                        cursor: "pointer", fontFamily: "var(--mono)",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Open Match Details
                    </button>
                  )}
                </div>
              </div>
            </MarkerPopup>
          </MapMarker>
        );
      })}
    </>
  );
}
