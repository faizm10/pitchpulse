import { MatchDetail } from '@/components/MatchDetail';

export default function MatchPage({ params }: { params: { id: string } }) {
  return <MatchDetail id={params.id} />;
}
