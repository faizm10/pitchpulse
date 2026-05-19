import { TeamHub } from "@/components/TeamHub";

export default function TeamPage({ params }: { params: { code: string } }) {
  return <TeamHub code={params.code} />;
}
