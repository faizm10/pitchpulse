import type { FotmobPlayerDetail, FotmobSquadMember, FotmobTeamProfile } from "@/types/fotmob";
import { fetchTeamProfile } from "./parse-team";
import { getTeamMapEntry } from "./team-map";

export async function fetchPlayerDetail(
  teamCode: string,
  playerId: number
): Promise<FotmobPlayerDetail | null> {
  const entry = getTeamMapEntry(teamCode.toUpperCase());
  if (!entry) return null;

  const profile = await fetchTeamProfile(entry.fotmobId);
  const member = profile.squad.find((p) => p.id === playerId);
  if (!member) return null;

  return buildPlayerDetail(teamCode.toUpperCase(), profile, member);
}

export function buildPlayerDetail(
  teamCode: string,
  profile: FotmobTeamProfile,
  member: FotmobSquadMember
): FotmobPlayerDetail {
  return {
    player: member,
    team: {
      code: teamCode,
      name: profile.name,
      teamId: profile.teamId,
      fifaRank: profile.fifaRank,
      fifaPoints: profile.fifaPoints,
      groupLabel: profile.groupLabel,
    },
  };
}
