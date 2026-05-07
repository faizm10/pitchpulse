import { PageFrame } from "@/components/pages/PageFrame";
import { NewsPageClient } from "./page-client";

export default function NewsPage() {
  return (
    <PageFrame
      title="News"
      subtitle="Latest stories and updates. Opens sources in a new tab."
    >
      <NewsPageClient />
    </PageFrame>
  );
}

