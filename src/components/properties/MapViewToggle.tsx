import { Button } from '@/components/ui/button';
import { Map, List } from 'lucide-react';
import { triggerHapticFeedback } from '@/utils/haptics';

interface MapViewToggleProps {
  isMapView: boolean;
  onToggle: () => void;
}

const MapViewToggle = ({ isMapView, onToggle }: MapViewToggleProps) => {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40">
      <Button
        variant="default"
        className="rounded-full shadow-lg min-h-[44px] px-6"
        onClick={() => {
          triggerHapticFeedback('medium');
          onToggle();
        }}
        aria-label={isMapView ? "Afficher la vue liste" : "Afficher la vue carte"}
      >
        {isMapView ? (
          <>
            <List className="h-4 w-4 mr-2" />
            Vue liste
          </>
        ) : (
          <>
            <Map className="h-4 w-4 mr-2" />
            Vue carte
          </>
        )}
      </Button>
    </div>
  );
};

export default MapViewToggle;
