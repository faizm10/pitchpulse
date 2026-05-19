import { SkeletonBone } from "./SkeletonBone";

const squadRowCount = 12;
const fixtureCount = 4;

export function TeamHubSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 48 }}>
      <SquadListSkeleton />
      <FixturesListSkeleton />
    </div>
  );
}

export function TeamHubHeaderSkeleton() {
  return (
    <div style={{ flex: 1 }}>
      <SkeletonBone width={120} height={10} delay={0} />
      <SkeletonBone width="72%" height={48} style={{ marginTop: 12 }} delay={80} radius={10} />
      <SkeletonBone width={180} height={10} style={{ marginTop: 14 }} delay={160} />
    </div>
  );
}

export function SquadListSkeleton({ rows = squadRowCount }: { rows?: number }) {
  return (
    <section>
      <SkeletonBone width={140} height={10} delay={0} />
      <div
        style={{
          marginTop: 16,
          border: "1px solid var(--rule)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 72px 88px",
              gap: 12,
              alignItems: "center",
              padding: "12px 18px",
              borderTop: i === 0 ? "none" : "1px solid var(--rule-soft)",
            }}
          >
            <SkeletonBone width={22} height={14} delay={i * 40} />
            <SkeletonBone width={`${58 + (i % 4) * 8}%`} height={16} delay={i * 40 + 20} />
            <SkeletonBone width={52} height={10} delay={i * 40 + 40} />
            <SkeletonBone width={64} height={10} delay={i * 40 + 60} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function FixturesListSkeleton({ count = fixtureCount }: { count?: number }) {
  return (
    <section>
      <SkeletonBone width={160} height={10} delay={0} />
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            style={{
              padding: "14px 18px",
              border: "1px solid var(--rule)",
              borderRadius: 10,
            }}
          >
            <SkeletonBone width={100} height={9} delay={i * 60} />
            <SkeletonBone width="88%" height={16} style={{ marginTop: 10 }} delay={i * 60 + 30} />
            <SkeletonBone width={120} height={12} style={{ marginTop: 8 }} delay={i * 60 + 50} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PlayerProfileSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 48,
        alignItems: "start",
      }}
    >
      <div>
        <header style={{ display: "flex", alignItems: "flex-start", gap: 22, marginBottom: 36 }}>
          <SkeletonBone width={64} height={42} radius={6} delay={0} />
          <div style={{ flex: 1 }}>
            <SkeletonBone width={100} height={10} delay={40} />
            <SkeletonBone width="85%" height={44} style={{ marginTop: 12 }} delay={80} radius={10} />
            <SkeletonBone width="60%" height={12} style={{ marginTop: 12 }} delay={120} />
          </div>
        </header>

        <SkeletonBone width={72} height={10} delay={160} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 14,
            marginTop: 14,
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              style={{
                padding: 18,
                border: "1px solid var(--rule)",
                borderRadius: 10,
                background: "var(--paper-2)",
              }}
            >
              <SkeletonBone width={48} height={9} delay={i * 35} />
              <SkeletonBone width="75%" height={20} style={{ marginTop: 10 }} delay={i * 35 + 20} />
            </div>
          ))}
        </div>
        <SkeletonBone width={168} height={40} style={{ marginTop: 28 }} radius={999} delay={200} />
      </div>

      <div>
        <SkeletonBone width={160} height={10} delay={0} />
        <SkeletonBone width="100%" height={32} style={{ marginTop: 10 }} delay={40} />
        <div
          style={{
            marginTop: 20,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              style={{
                padding: "20px 16px",
                border: "1px solid var(--rule)",
                borderRadius: 12,
                background: "var(--paper-2)",
              }}
            >
              <SkeletonBone width="70%" height={9} style={{ margin: "0 auto" }} delay={i * 30} />
              <SkeletonBone width={36} height={32} style={{ margin: "10px auto 0" }} delay={i * 30 + 20} />
            </div>
          ))}
        </div>
        <SkeletonBone width={100} height={10} style={{ marginTop: 32 }} delay={180} />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[72, 64, 88].map((w, i) => (
            <SkeletonBone key={i} width={w} height={28} radius={999} delay={200 + i * 40} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StandingsSkeleton({ groups = 12 }: { groups?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
        gap: 32,
      }}
    >
      {Array.from({ length: groups }, (_, g) => (
        <StandingsGroupSkeleton key={g} delay={g * 50} />
      ))}
    </div>
  );
}

function StandingsGroupSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div style={{ border: "1px solid var(--rule)", borderRadius: 12, overflow: "hidden" }}>
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--rule)",
          background: "var(--paper-2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <SkeletonBone width={72} height={11} delay={delay} />
        <SkeletonBone width={160} height={9} delay={delay + 20} />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "20px 24px 1fr 120px",
            gap: 8,
            alignItems: "center",
            padding: "11px 20px",
            borderTop: i === 0 ? "none" : "1px solid var(--rule-soft)",
          }}
        >
          <SkeletonBone width={14} height={12} delay={delay + i * 35} />
          <SkeletonBone width={18} height={12} radius={2} delay={delay + i * 35 + 10} />
          <SkeletonBone width={`${55 + (i % 3) * 10}%`} height={14} delay={delay + i * 35 + 20} />
          <SkeletonBone width="100%" height={12} delay={delay + i * 35 + 30} />
        </div>
      ))}
    </div>
  );
}

export function FotmobExtrasSkeleton() {
  return (
    <div
      style={{
        padding: 20,
        border: "1px solid var(--rule)",
        borderRadius: 12,
        background: "var(--paper-2)",
      }}
    >
      <SkeletonBone width={120} height={10} delay={0} />
      <SkeletonBone width="70%" height={10} style={{ marginTop: 10 }} delay={40} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 16,
          marginTop: 16,
          alignItems: "center",
        }}
      >
        <SkeletonBone width="80%" height={28} style={{ marginLeft: "auto" }} delay={80} />
        <SkeletonBone width={20} height={10} delay={100} />
        <SkeletonBone width="80%" height={28} delay={120} />
      </div>
    </div>
  );
}

