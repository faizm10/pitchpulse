import { StadiumView } from '@/components/StadiumView';

export default function StadiumPage({ params }: { params: { id: string } }) {
  return <StadiumView id={params.id} />;
}
