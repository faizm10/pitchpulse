import { CountryView } from '@/components/CountryView';

export default function CountryPage({ params }: { params: { code: string } }) {
  return <CountryView code={params.code.toUpperCase()} />;
}
