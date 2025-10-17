import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, X, MapPin, Home, Bed, Bath, Maximize,
  ChevronDown, ChevronUp, DollarSign, Calendar, Sparkles,
  Wifi, Car, Wind, Trees, Video, Camera, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PropertyFilters } from '@/components/PropertyFilters';
import { triggerHapticFeedback } from '@/utils/haptics';
import { cn } from '@/lib/utils';
import { CITIES, PROPERTY_TYPES } from '@/constants';

interface MobileSearchFiltersProps {
  onFilterChange: (filters: PropertyFilters) => void;
  onReset: () => void;
  activeFiltersCount: number;
  initialFilters?: Partial<PropertyFilters>;
}

export const MobileSearchFilters = ({
  onFilterChange,
  onReset,
  activeFiltersCount,
  initialFilters = {}
}: MobileSearchFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<PropertyFilters>(initialFilters as PropertyFilters);
  const [priceRange, setPriceRange] = useState([0, 500000]);
  const [surfaceRange, setSurfaceRange] = useState([0, 200]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Quick filter categories
  const quickFilters = [
    {
      id: 'immediate',
      label: 'Dispo. immédiate',
      icon: Sparkles,
      filter: { addedPeriod: 'today' }
    },
    {
      id: 'furnished',
      label: 'Meublé',
      icon: Home,
      filter: { isFurnished: true }
    },
    {
      id: 'budget',
      label: '- 100k',
      icon: DollarSign,
      filter: { maxPrice: 100000 }
    },
    {
      id: 'certified',
      label: 'Certifié',
      icon: ShieldCheck,
      filter: { isAnsutCertified: true }
    }
  ];

  // Amenity filters
  const amenities = [
    { id: 'hasAc', label: 'Climatisation', icon: Wind },
    { id: 'hasParking', label: 'Parking', icon: Car },
    { id: 'hasGarden', label: 'Jardin', icon: Trees },
    { id: 'hasWifi', label: 'Wi-Fi', icon: Wifi },
    { id: 'hasVideo', label: 'Vidéo', icon: Video },
    { id: 'has360View', label: 'Vue 360°', icon: Camera }
  ];

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
    triggerHapticFeedback('light');
  };

  const handleQuickFilter = (quickFilter: typeof quickFilters[0]) => {
    const isActive = Object.entries(quickFilter.filter).every(
      ([key, value]) => filters[key as keyof PropertyFilters] === value
    );

    let newFilters = { ...filters };

    if (isActive) {
      // Remove the filter
      Object.entries(quickFilter.filter).forEach(([key]) => {
        delete newFilters[key as keyof PropertyFilters];
      });
    } else {
      // Add the filter
      newFilters = { ...newFilters, ...quickFilter.filter };
    }

    setFilters(newFilters);
    onFilterChange(newFilters);
    triggerHapticFeedback('selection');
  };

  const handleReset = () => {
    setFilters({});
    setPriceRange([0, 500000]);
    setSurfaceRange([0, 200]);
    onReset();
    triggerHapticFeedback('medium');
    setIsExpanded(false);
  };

  const isQuickFilterActive = (quickFilter: typeof quickFilters[0]) => {
    return Object.entries(quickFilter.filter).every(
      ([key, value]) => filters[key as keyof PropertyFilters] === value
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header with quick filters */}
      <Card className="mb-4 border-0 shadow-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Filtres</h3>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs"
                >
                  Réinitialiser
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 gap-2">
            {quickFilters.map((quickFilter) => {
              const Icon = quickFilter.icon;
              const isActive = isQuickFilterActive(quickFilter);

              return (
                <motion.button
                  key={quickFilter.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickFilter(quickFilter)}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{quickFilter.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Expanded Filters */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-0 shadow-sm" ref={scrollRef}>
              <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Location & Type */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wider">
                    Localisation
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Ville</Label>
                      <Select
                        value={filters.city || ''}
                        onValueChange={(value) => handleFilterChange('city', value)}
                      >
                        <SelectTrigger className="h-11 mt-1">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          <SelectValue placeholder="Toutes les villes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Toutes les villes</SelectItem>
                          {CITIES.map(city => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Type de bien</Label>
                      <Select
                        value={filters.propertyType || ''}
                        onValueChange={(value) => handleFilterChange('propertyType', value)}
                      >
                        <SelectTrigger className="h-11 mt-1">
                          <Home className="h-4 w-4 mr-2 text-gray-400" />
                          <SelectValue placeholder="Tous les types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Tous les types</SelectItem>
                          {PROPERTY_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Price Range */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wider">
                    Budget
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">
                        Loyers mensuels: {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} FCFA
                      </Label>
                      <Slider
                        min={0}
                        max={500000}
                        step={10000}
                        value={priceRange}
                        onValueChange={(value) => {
                          setPriceRange(value);
                          handleFilterChange('minPrice', value[0]);
                          handleFilterChange('maxPrice', value[1]);
                        }}
                        className="mt-3"
                      />
                    </div>
                  </div>
                </div>

                {/* Property Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wider">
                    Caractéristiques
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-medium">Chambres min.</Label>
                      <Select
                        value={filters.bedrooms?.toString() || ''}
                        onValueChange={(value) => handleFilterChange('bedrooms', value ? parseInt(value) : undefined)}
                      >
                        <SelectTrigger className="h-11 mt-1">
                          <Bed className="h-4 w-4 mr-2 text-gray-400" />
                          <SelectValue placeholder="Indifférent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Indifférent</SelectItem>
                          {[1, 2, 3, 4, 5].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num === 1 ? 'chambre' : 'chambres'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Surface min. (m²)</Label>
                      <Select
                        value={filters.minSurface?.toString() || ''}
                        onValueChange={(value) => handleFilterChange('minSurface', value ? parseInt(value) : undefined)}
                      >
                        <SelectTrigger className="h-11 mt-1">
                          <Maximize className="h-4 w-4 mr-2 text-gray-400" />
                          <SelectValue placeholder="Indifférent" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Indifférent</SelectItem>
                          {[20, 30, 50, 75, 100, 150].map(size => (
                            <SelectItem key={size} value={size.toString()}>
                              {size}m²+
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wider">
                    Équipements & Services
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    {amenities.map((amenity) => {
                      const Icon = amenity.icon;
                      const isChecked = filters[amenity.id as keyof PropertyFilters] as boolean;

                      return (
                        <div
                          key={amenity.id}
                          className={cn(
                            "flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all duration-200",
                            isChecked
                              ? "bg-primary/10 border-primary"
                              : "hover:bg-gray-50 border-gray-200"
                          )}
                          onClick={() => handleFilterChange(amenity.id as keyof PropertyFilters, !isChecked)}
                        >
                          <Checkbox
                            id={amenity.id}
                            checked={isChecked}
                            className="pointer-events-none"
                          />
                          <Icon className="h-4 w-4 text-gray-600" />
                          <Label htmlFor={amenity.id} className="text-sm font-medium cursor-pointer">
                            {amenity.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Options */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wider">
                    Options supplémentaires
                  </h4>

                  <div className="space-y-3">
                    <Select
                      value={filters.addedPeriod || ''}
                      onValueChange={(value) => handleFilterChange('addedPeriod', value as any)}
                    >
                      <SelectTrigger className="h-11">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <SelectValue placeholder="Période d'ajout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Toutes périodes</SelectItem>
                        <SelectItem value="today">Aujourd'hui</SelectItem>
                        <SelectItem value="week">Cette semaine</SelectItem>
                        <SelectItem value="month">Ce mois-ci</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={filters.status || ''}
                      onValueChange={(value) => handleFilterChange('status', value)}
                    >
                      <SelectTrigger className="h-11">
                        <Search className="h-4 w-4 mr-2 text-gray-400" />
                        <SelectValue placeholder="Statut du bien" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tous les statuts</SelectItem>
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="en_negociation">En négociation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Apply Button */}
                <div className="sticky bottom-0 bg-white border-t pt-4">
                  <Button
                    onClick={() => setIsExpanded(false)}
                    className="w-full h-12 rounded-xl font-semibold"
                  >
                    Appliquer les filtres
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileSearchFilters;