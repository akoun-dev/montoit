import { MapPin } from 'lucide-react';
import { Widget } from './Widget';
import type { GeolocationData } from './types';

interface LocationWidgetProps {
  location: GeolocationData;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
}

export const LocationWidget = ({ 
  location, 
  isLoading, 
  error,
  onRefresh 
}: LocationWidgetProps) => {
  return (
    <Widget
      isLoading={isLoading}
      hasError={!!error}
      onClick={onRefresh}
      ariaLabel="Localisation actuelle - Cliquer pour rafraîchir"
    >
      <MapPin className="h-4 w-4 text-primary group-hover:animate-pulse" />
      <span className="font-semibold text-sm">{location.city}</span>
      {location.neighborhood && (
        <span className="text-xs text-muted-foreground hidden lg:inline">
          • {location.neighborhood}
        </span>
      )}
    </Widget>
  );
};
