import { PageFrame } from "@/components/pages/PageFrame";
import { VenuesPageClient } from "./page-client";

export default function VenuesPage() {
  return (
    <PageFrame
      title="Venues"
      subtitle="Stadium map with match pins. Tap a pin to open match detail."
      className="overflow-x-hidden"
    >
      <VenuesPageClient />
    </PageFrame>
  );
}

