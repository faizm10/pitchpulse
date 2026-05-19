import { PlayerProfile } from "@/components/PlayerProfile";

export default function PlayerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { team?: string };
}) {
  const team = searchParams.team ?? "";
  return <PlayerProfile playerId={params.id} teamCode={team} />;
}
