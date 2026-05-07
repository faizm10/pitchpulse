import { PageFrame } from "@/components/pages/PageFrame";
import { GroupsPageClient } from "./page-client";

export default function GroupsPage() {
  return (
    <PageFrame
      title="Groups"
      subtitle="Group tables update as FIFA publishes the official draw."
    >
      <GroupsPageClient />
    </PageFrame>
  );
}

