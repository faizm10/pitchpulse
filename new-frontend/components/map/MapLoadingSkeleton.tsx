export function MapLoadingSkeleton() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      background: "var(--paper)", display: "flex", flexDirection: "column",
    }}>
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--paper-2)" }}>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontFamily: "var(--mono)", fontSize: 10,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "var(--ink-3)",
            animation: "map-loader-pulse 1.4s ease-in-out infinite",
          }}>
            Loading map
          </div>
        </div>

        {/* Simulated stadium markers */}
        {[
          { top: "38%", left: "52%", color: "var(--us)" },
          { top: "42%", left: "48%", color: "var(--us)" },
          { top: "46%", left: "44%", color: "var(--us)" },
          { top: "35%", left: "56%", color: "var(--ca)" },
          { top: "30%", left: "54%", color: "var(--ca)" },
          { top: "58%", left: "38%", color: "var(--mx)" },
          { top: "62%", left: "34%", color: "var(--mx)" },
        ].map(({ top, left, color }, i) => (
          <div key={i} style={{
            position: "absolute", top, left,
            width: 10, height: 10, borderRadius: "50%",
            background: color, opacity: 0.4,
            animation: `map-loader-pulse 1.4s ease-in-out ${i * 200}ms infinite`,
          }} />
        ))}

        {/* Zoom controls skeleton */}
        <div style={{ position: "absolute", bottom: 40, right: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: 6,
              background: "var(--rule-soft)",
              animation: `map-loader-pulse 1.4s ease-in-out ${i * 100}ms infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
