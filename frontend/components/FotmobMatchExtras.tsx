"use client";

import type { FotmobMatchExtras } from "@/types/fotmob";
import { FotmobExtrasSkeleton } from "@/components/skeleton/TeamPagesSkeleton";

interface FotmobMatchExtrasProps {
  extras: FotmobMatchExtras | null;
  loading?: boolean;
}

const blockStyle: React.CSSProperties = {
  padding: 20,
  border: "1px solid var(--rule)",
  borderRadius: 12,
  background: "var(--paper-2)",
};

export function FotmobMatchExtrasBlock({ extras, loading }: FotmobMatchExtrasProps) {
  if (loading) {
    return <FotmobExtrasSkeleton />;
  }

  if (!extras) return null;

  return (
    <div style={blockStyle}>
      <p className="eyebrow">FotMob · match data</p>
      {extras.group && (
        <p
          className="mono"
          style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6, letterSpacing: "0.12em" }}
        >
          GROUP {extras.group}
          {extras.utcTime
            ? ` · ${new Date(extras.utcTime).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}`
            : ""}
        </p>
      )}

      {extras.xg && (
        <div style={{ marginTop: 16 }}>
          <p
            className="mono"
            style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-3)", margin: 0 }}
          >
            EXPECTED GOALS (xG)
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: 16,
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <span className="serif tnum" style={{ fontSize: 28, textAlign: "right" }}>
              {extras.xg.home.toFixed(2)}
            </span>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
              vs
            </span>
            <span className="serif tnum" style={{ fontSize: 28 }}>
              {extras.xg.away.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {extras.unavailableReason && (
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--ink-3)",
            marginTop: 14,
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {extras.unavailableReason}
        </p>
      )}
    </div>
  );
}
