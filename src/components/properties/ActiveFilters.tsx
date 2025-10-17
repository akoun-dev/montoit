import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { triggerHapticFeedback } from '@/utils/haptics';

interface ActiveFiltersProps {
  filters: Record<string, any>;
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

const getFilterLabel = (key: string, value: any): string => {
  const labels: Record<string, string> = {
    city: `Ville: ${value}`,
    propertyType: `Type: ${value}`,
    minPrice: `Min: ${value.toLocaleString()} FCFA`,
    maxPrice: `Max: ${value.toLocaleString()} FCFA`,
    minBedrooms: `${value}+ chambres`,
    minBathrooms: `${value}+ salles de bain`,
    minSurface: `Min: ${value}m²`,
    furnished: 'Meublé',
    parking: 'Parking',
    garden: 'Jardin',
    ac: 'Climatisé',
  };

  return labels[key] || `${key}: ${value}`;
};

const ActiveFilters = ({ filters, onRemove, onClearAll }: ActiveFiltersProps) => {
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (value === null || value === undefined || value === '') return false;
    if (typeof value === 'boolean') return value === true;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  });

  if (activeFilters.length === 0) return null;

  return (
    <div 
      className="flex flex-wrap gap-2 items-center p-4 bg-muted/30 rounded-lg"
      role="region"
      aria-label="Filtres actifs"
    >
      <span className="text-sm text-muted-foreground font-medium">
        {activeFilters.length} filtre{activeFilters.length > 1 ? 's' : ''} actif{activeFilters.length > 1 ? 's' : ''}
      </span>
      
      {activeFilters.map(([key, value]) => (
        <Badge
          key={key}
          variant="secondary"
          className="pr-1 min-h-[44px] gap-1"
        >
          {getFilterLabel(key, value)}
          <button
            className="ml-1 p-1 hover:bg-muted-foreground/20 rounded-full transition-colors"
            onClick={() => {
              onRemove(key);
              triggerHapticFeedback('light');
            }}
            aria-label={`Retirer le filtre ${key}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onClearAll();
          triggerHapticFeedback('medium');
        }}
        className="text-destructive hover:text-destructive min-h-[44px]"
        aria-label="Effacer tous les filtres"
      >
        Tout effacer
      </Button>
    </div>
  );
};

export default ActiveFilters;
