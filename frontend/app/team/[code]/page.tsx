import { TeamHub } from "@/components/TeamHub";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <TeamHub code={code} />;
}
