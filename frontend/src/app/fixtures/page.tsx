import { PageFrame } from "@/components/pages/PageFrame";
import { FixturesPageClient } from "./page-client";

export default function FixturesPage() {
  return (
    <PageFrame
      title="Fixtures"
      subtitle="Live, upcoming, and completed matches. Pick one for detail."
      className="overflow-x-hidden"
    >
      <FixturesPageClient />
    </PageFrame>
  );
}

