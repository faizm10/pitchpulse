import { SkeletonBone } from "./SkeletonBone";

export function TestMatchSkeleton({ isMobile }: { isMobile: boolean }) {
  const sectionPad = isMobile ? "20px 16px" : "28px 32px";
  const logoSize = isMobile ? 44 : 64;

  return (
    <div
      className="screen"
      style={{ minHeight: "100vh", maxWidth: "100vw", overflowX: "hidden" }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading match"
    >
      <header
        style={{
          padding: isMobile ? "10px 16px" : "12px 32px",
          borderBottom: "1px solid var(--rule)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--paper-2)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <SkeletonBone width={isMobile ? 120 : 160} height={10} delay={0} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SkeletonBone width={72} height={10} delay={40} />
          {!isMobile && <SkeletonBone width={88} height={10} delay={60} />}
          <SkeletonBone width={isMobile ? 64 : 72} height={36} radius={6} delay={80} />
          {!isMobile && <SkeletonBone width={88} height={36} radius={6} delay={100} />}
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
          gap: isMobile ? 8 : 16,
          alignItems: "center",
          padding: isMobile ? "20px 16px" : "36px 32px",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14, minWidth: 0 }}>
          <SkeletonBone width={logoSize} height={logoSize} radius={8} delay={0} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <SkeletonBone width="75%" height={isMobile ? 18 : 28} delay={30} radius={6} />
            {!isMobile && <SkeletonBone width={48} height={10} style={{ marginTop: 6 }} delay={50} />}
          </div>
          <SkeletonBone width={isMobile ? 28 : 40} height={isMobile ? 44 : 64} delay={70} radius={6} />
        </div>

        <div style={{ textAlign: "center", minWidth: isMobile ? 60 : 80 }}>
          <SkeletonBone width={48} height={10} style={{ margin: "0 auto" }} delay={90} />
          <SkeletonBone width={56} height={isMobile ? 18 : 22} style={{ margin: "8px auto 0" }} delay={110} />
          <SkeletonBone width={40} height={10} style={{ margin: "6px auto 0" }} delay={130} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14, flexDirection: "row-reverse", minWidth: 0 }}>
          <SkeletonBone width={logoSize} height={logoSize} radius={8} delay={20} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <SkeletonBone width="70%" height={isMobile ? 18 : 28} style={{ marginLeft: "auto" }} delay={50} radius={6} />
            {!isMobile && <SkeletonBone width={44} height={10} style={{ marginTop: 6, marginLeft: "auto" }} delay={70} />}
          </div>
          <SkeletonBone width={isMobile ? 28 : 40} height={isMobile ? 44 : 64} delay={90} radius={6} />
        </div>
      </div>

      <div style={{ padding: isMobile ? "8px 16px" : "10px 32px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <SkeletonBone width={isMobile ? "90%" : 420} height={10} delay={140} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <section
          style={{
            padding: sectionPad,
            borderRight: isMobile ? "none" : "1px solid var(--rule)",
            borderBottom: isMobile ? "1px solid var(--rule)" : "none",
          }}
        >
          <SkeletonBone width={140} height={10} delay={0} />
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <SkeletonBone width={36} height={12} delay={i * 45} />
                <div style={{ flex: 1 }}>
                  <SkeletonBone width={`${65 + (i % 3) * 10}%`} height={14} delay={i * 45 + 15} />
                  <SkeletonBone width="45%" height={10} style={{ marginTop: 6 }} delay={i * 45 + 30} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: sectionPad }}>
          <SkeletonBone width={120} height={10} delay={20} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, marginBottom: 14 }}>
            <SkeletonBone width={64} height={11} delay={40} />
            <SkeletonBone width={64} height={11} delay={50} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <SkeletonBone width={32} height={11} delay={i * 35 + 60} />
                  <SkeletonBone width={72} height={9} delay={i * 35 + 70} />
                  <SkeletonBone width={32} height={11} delay={i * 35 + 80} />
                </div>
                <SkeletonBone width="100%" height={5} radius={3} delay={i * 35 + 90} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div style={{ borderBottom: "1px solid var(--rule)", padding: sectionPad }}>
        <SkeletonBone width={130} height={10} delay={0} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
            gap: isMobile ? 20 : 32,
            marginTop: 20,
          }}
        >
          {[0, 1].map((col) => (
            <div key={col}>
              <SkeletonBone width={100} height={10} delay={col * 40} />
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 14px",
                      border: "1px solid var(--rule-soft)",
                      borderRadius: 8,
                    }}
                  >
                    <SkeletonBone width={80} height={9} delay={col * 40 + i * 30} />
                    <SkeletonBone width="60%" height={14} style={{ marginTop: 8 }} delay={col * 40 + i * 30 + 15} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderBottom: "1px solid var(--rule)", padding: sectionPad }}>
        <SkeletonBone width={80} height={10} delay={0} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 16,
            marginTop: 16,
          }}
        >
          {Array.from({ length: isMobile ? 2 : 3 }, (_, i) => (
            <div key={i} style={{ border: "1px solid var(--rule)", borderRadius: 8, overflow: "hidden" }}>
              <SkeletonBone width="100%" height={isMobile ? 100 : 120} radius={0} delay={i * 50} />
              <div style={{ padding: 14 }}>
                <SkeletonBone width="90%" height={14} delay={i * 50 + 20} />
                <SkeletonBone width="70%" height={10} style={{ marginTop: 8 }} delay={i * 50 + 35} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <section style={{ padding: sectionPad, borderRight: isMobile ? "none" : "1px solid var(--rule)" }}>
          <SkeletonBone width={160} height={10} delay={0} />
          <div style={{ marginTop: 16, border: "1px solid var(--rule)", borderRadius: 8, overflow: "hidden" }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 28px 1fr 48px 40px",
                  gap: 8,
                  alignItems: "center",
                  padding: "10px 14px",
                  borderTop: i === 0 ? "none" : "1px solid var(--rule-soft)",
                }}
              >
                <SkeletonBone width={14} height={12} delay={i * 25} />
                <SkeletonBone width={22} height={22} radius={4} delay={i * 25 + 10} />
                <SkeletonBone width={`${50 + (i % 4) * 8}%`} height={14} delay={i * 25 + 20} />
                <SkeletonBone width={32} height={12} delay={i * 25 + 30} />
                <SkeletonBone width={28} height={12} delay={i * 25 + 40} />
              </div>
            ))}
          </div>
        </section>
        <div style={{ padding: sectionPad, borderTop: isMobile ? "1px solid var(--rule)" : "none" }}>
          <SkeletonBone width={140} height={10} delay={40} />
          <SkeletonBone width="100%" height={120} style={{ marginTop: 12 }} radius={8} delay={60} />
        </div>
      </div>

      <span className="sr-only">Loading match data from ESPN</span>
    </div>
  );
}
