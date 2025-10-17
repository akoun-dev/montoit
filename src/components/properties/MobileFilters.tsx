import { useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Filter, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { CITIES, PROPERTY_TYPES } from '@/constants';
import { triggerHapticFeedback } from '@/utils/haptics';
import { toast } from '@/hooks/use-toast';
import type { PropertyFilters } from '@/components/PropertyFilters';

interface MobileFiltersProps {
  onFilterChange: (filters: PropertyFilters) => void;
  onReset: () => void;
  currentFilters?: PropertyFilters;
}

const MobileFilters = ({ onFilterChange, onReset, currentFilters = {} }: MobileFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const containerRef = useFocusTrap(isOpen);
  const [filters, setFilters] = useState<PropertyFilters>(currentFilters);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    currentFilters.minPrice ?? 0,
    currentFilters.maxPrice ?? 1000000
  ]);
  const [surfaceRange, setSurfaceRange] = useState<[number, number]>([
    currentFilters.minSurface ?? 0,
    currentFilters.maxSurface ?? 500
  ]);

  const validateFilters = (): boolean => {
    if (priceRange[0] > priceRange[1]) {
      toast({
        title: "Erreur de validation",
        description: "Le prix minimum ne peut pas être supérieur au prix maximum",
        variant: "destructive",
      });
      return false;
    }
    if (surfaceRange[0] > surfaceRange[1]) {
      toast({
        title: "Erreur de validation",
        description: "La surface minimum ne peut pas être supérieure à la surface maximum",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleApply = () => {
    if (!validateFilters()) return;
    
    const finalFilters: PropertyFilters = {
      ...filters,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      minSurface: surfaceRange[0],
      maxSurface: surfaceRange[1],
    };
    
    triggerHapticFeedback('medium');
    onFilterChange(finalFilters);
    setIsOpen(false);
    toast({
      description: "✓ Filtres appliqués",
      duration: 2000,
    });
  };

  const handleResetSection = () => {
    triggerHapticFeedback('light');
    if (step === 1) {
      setFilters({ ...filters, city: undefined });
    } else if (step === 2) {
      setPriceRange([0, 1000000]);
      setSurfaceRange([0, 500]);
    } else if (step === 3) {
      setFilters({ ...filters, propertyType: undefined, bedrooms: undefined, bathrooms: undefined });
    } else if (step === 4) {
      setFilters({
        ...filters,
        isFurnished: undefined,
        hasAc: undefined,
        hasParking: undefined,
        hasGarden: undefined,
        hasVideo: undefined,
        has360View: undefined,
        hasVirtualTour: undefined,
        isAnsutCertified: undefined,
      });
    }
  };

  const handleResetAll = () => {
    triggerHapticFeedback('medium');
    setFilters({});
    setPriceRange([0, 1000000]);
    setSurfaceRange([0, 500]);
    onReset();
    setIsOpen(false);
    toast({
      description: "Tous les filtres ont été réinitialisés",
      duration: 2000,
    });
  };

  const activeFiltersCount = Object.keys(filters).filter(
    key => filters[key as keyof PropertyFilters] !== undefined
  ).length;

  const steps = [
    { number: 1, title: 'Localisation' },
    { number: 2, title: 'Budget' },
    { number: 3, title: 'Type de bien' },
    { number: 4, title: 'Options' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="relative"
          aria-label="Ouvrir les filtres de recherche"
        >
          <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
          Filtres
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent 
        ref={containerRef}
        side="bottom" 
        className="h-[90vh] flex flex-col"
        aria-labelledby="filters-title"
      >
        <SheetHeader>
          <SheetTitle id="filters-title">Filtres de recherche</SheetTitle>
          
          {/* Progress Stepper */}
          <div className="flex justify-between items-center pt-4">
            {steps.map((s, idx) => (
              <div key={s.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      step === s.number
                        ? 'bg-primary text-primary-foreground'
                        : step > s.number
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s.number}
                  </div>
                  <span className="text-xs mt-1 text-center">{s.title}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 -mt-5 ${
                      step > s.number ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </SheetHeader>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Ville</Label>
                <Select
                  value={filters.city}
                  onValueChange={(value) => {
                    triggerHapticFeedback('light');
                    setFilters({ ...filters, city: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une ville" />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Prix mensuel (FCFA)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPriceRange([val, priceRange[1]]);
                    }}
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1000000;
                      setPriceRange([priceRange[0], val]);
                    }}
                  />
                </div>
                <Slider
                  min={0}
                  max={1000000}
                  step={10000}
                  value={priceRange}
                  onValueChange={(value) => {
                    triggerHapticFeedback('light');
                    setPriceRange(value as [number, number]);
                  }}
                  className="py-4"
                />
                <p className="text-sm text-muted-foreground text-center">
                  {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} FCFA
                </p>
              </div>

              <div className="space-y-3">
                <Label>Surface (m²)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Min"
                    value={surfaceRange[0]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setSurfaceRange([val, surfaceRange[1]]);
                    }}
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Max"
                    value={surfaceRange[1]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 500;
                      setSurfaceRange([surfaceRange[0], val]);
                    }}
                  />
                </div>
                <Slider
                  min={0}
                  max={500}
                  step={10}
                  value={surfaceRange}
                  onValueChange={(value) => {
                    triggerHapticFeedback('light');
                    setSurfaceRange(value as [number, number]);
                  }}
                  className="py-4"
                />
                <p className="text-sm text-muted-foreground text-center">
                  {surfaceRange[0]} - {surfaceRange[1]} m²
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type de bien</Label>
                <Select
                  value={filters.propertyType}
                  onValueChange={(value) => {
                    triggerHapticFeedback('light');
                    setFilters({ ...filters, propertyType: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chambres (min)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={0}
                    placeholder="0"
                    value={filters.bedrooms || ''}
                    onChange={(e) => {
                      triggerHapticFeedback('light');
                      setFilters({ ...filters, bedrooms: e.target.value ? parseInt(e.target.value) : undefined });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Salles de bain (min)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={0}
                    placeholder="0"
                    value={filters.bathrooms || ''}
                    onChange={(e) => {
                      triggerHapticFeedback('light');
                      setFilters({ ...filters, bathrooms: e.target.value ? parseInt(e.target.value) : undefined });
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Équipements</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'isFurnished', label: 'Meublé' },
                    { key: 'hasAc', label: 'Climatisation' },
                    { key: 'hasParking', label: 'Parking' },
                    { key: 'hasGarden', label: 'Jardin' },
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={filters[key as keyof PropertyFilters] ? 'default' : 'outline'}
                      className="min-h-[44px] py-3"
                      onClick={() => {
                        triggerHapticFeedback('light');
                        setFilters({
                          ...filters,
                          [key]: !filters[key as keyof PropertyFilters],
                        });
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Visites & Médias</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'hasVideo', label: 'Avec vidéo' },
                    { key: 'has360View', label: 'Vue 360°' },
                    { key: 'hasVirtualTour', label: 'Visite virtuelle' },
                    { key: 'isAnsutCertified', label: 'Certifié ANSUT' },
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      variant={filters[key as keyof PropertyFilters] ? 'default' : 'outline'}
                      className="min-h-[44px] py-3"
                      onClick={() => {
                        triggerHapticFeedback('light');
                        setFilters({
                          ...filters,
                          [key]: !filters[key as keyof PropertyFilters],
                        });
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="border-t pt-4 pb-safe space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetSection}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-1" />
              Reset section
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              className="flex-1"
            >
              Reset tout
            </Button>
          </div>

          <div className="flex gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={() => {
                  triggerHapticFeedback('light');
                  setStep(step - 1);
                }}
                className="flex-1"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Précédent
              </Button>
            )}
            {step < 4 ? (
              <Button
                onClick={() => {
                  triggerHapticFeedback('light');
                  setStep(step + 1);
                }}
                className="flex-1"
              >
                Suivant
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleApply} className="flex-1">
                Appliquer les filtres
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileFilters;
