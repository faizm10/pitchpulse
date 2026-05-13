import { MapView } from '@/components/MapView';
import { Rail } from '@/components/Rail';

export default function HomePage() {
  return (
    <div className="dashboard">
      <MapView />
      <Rail />
    </div>
  );
}
