import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CITIES, PROPERTY_TYPES } from '@/constants';

export interface PropertyFilters {
  city?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  maxSurface?: number;
  bedrooms?: number;
  bathrooms?: number;
  isFurnished?: boolean;
  hasAc?: boolean;
  hasParking?: boolean;
  hasGarden?: boolean;
  hasVideo?: boolean;
  has360View?: boolean;
  hasVirtualTour?: boolean;
  status?: string;
  isAnsutCertified?: boolean;
  addedPeriod?: 'today' | 'week' | 'month' | 'all';
}

interface PropertyFiltersProps {
  onFilterChange: (filters: PropertyFilters) => void;
  onReset: () => void;
}

const PropertyFiltersComponent = ({ onFilterChange, onReset }: PropertyFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<PropertyFilters>({});
  const [priceRange, setPriceRange] = useState([0, 1000000]);
  const [surfaceRange, setSurfaceRange] = useState([0, 500]);

  const handleFilterChange = (key: keyof PropertyFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    setFilters({});
    setPriceRange([0, 1000000]);
    setSurfaceRange([0, 500]);
    onReset();
  };

  const activeFiltersCount = Object.keys(filters).filter(key => filters[key as keyof PropertyFilters] !== undefined).length;

  return (
    <Card className="mb-6">
      <CardHeader>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <CardTitle>Filtres de recherche</CardTitle>
                {activeFiltersCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </div>
              <span className="text-muted-foreground text-sm">
                {isOpen ? 'Masquer' : 'Afficher'}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* City */}
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Select onValueChange={(value) => handleFilterChange('city', value)} value={filters.city}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ex: Abidjan, Yopougon, Cocody..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Type */}
                <div className="space-y-2">
                  <Label>Type de bien</Label>
                  <Select onValueChange={(value) => handleFilterChange('propertyType', value)} value={filters.propertyType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ex: Appartement, Villa, Studio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label>Statut</Label>
                  <Select onValueChange={(value) => handleFilterChange('status', value)} value={filters.status}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disponible">Disponible</SelectItem>
                      <SelectItem value="loué">Loué</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Added Period */}
                <div className="space-y-2">
                  <Label>Ajouté</Label>
                  <Select onValueChange={(value) => handleFilterChange('addedPeriod', value)} value={filters.addedPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Aujourd'hui</SelectItem>
                      <SelectItem value="week">Cette semaine</SelectItem>
                      <SelectItem value="month">Ce mois-ci</SelectItem>
                      <SelectItem value="all">Tout</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bedrooms */}
                <div className="space-y-2">
                  <Label>Chambres (min)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={filters.bedrooms || ''}
                    onChange={(e) => handleFilterChange('bedrooms', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>

                {/* Bathrooms */}
                <div className="space-y-2">
                  <Label>Salles de bain (min)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={filters.bathrooms || ''}
                    onChange={(e) => handleFilterChange('bathrooms', e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <Label>Prix mensuel (FCFA)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) => {
                      const newRange = [parseInt(e.target.value) || 0, priceRange[1]];
                      setPriceRange(newRange);
                      handleFilterChange('minPrice', newRange[0]);
                    }}
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) => {
                      const newRange = [priceRange[0], parseInt(e.target.value) || 1000000];
                      setPriceRange(newRange);
                      handleFilterChange('maxPrice', newRange[1]);
                    }}
                  />
                </div>
                <Slider
                  min={0}
                  max={1000000}
                  step={10000}
                  value={priceRange}
                  onValueChange={(value) => {
                    setPriceRange(value);
                    handleFilterChange('minPrice', value[0]);
                    handleFilterChange('maxPrice', value[1]);
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} FCFA
                </p>
              </div>

              {/* Surface Range */}
              <div className="space-y-2">
                <Label>Surface (m²)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={surfaceRange[0]}
                    onChange={(e) => {
                      const newRange = [parseInt(e.target.value) || 0, surfaceRange[1]];
                      setSurfaceRange(newRange);
                      handleFilterChange('minSurface', newRange[0]);
                    }}
                  />
                  <span>-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={surfaceRange[1]}
                    onChange={(e) => {
                      const newRange = [surfaceRange[0], parseInt(e.target.value) || 500];
                      setSurfaceRange(newRange);
                      handleFilterChange('maxSurface', newRange[1]);
                    }}
                  />
                </div>
                <Slider
                  min={0}
                  max={500}
                  step={10}
                  value={surfaceRange}
                  onValueChange={(value) => {
                    setSurfaceRange(value);
                    handleFilterChange('minSurface', value[0]);
                    handleFilterChange('maxSurface', value[1]);
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  {surfaceRange[0]} - {surfaceRange[1]} m²
                </p>
              </div>

              {/* Amenities */}
              <div className="space-y-3">
                <Label>Équipements</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="furnished"
                      checked={filters.isFurnished}
                      onCheckedChange={(checked) => handleFilterChange('isFurnished', checked)}
                    />
                    <Label htmlFor="furnished" className="font-normal cursor-pointer">Meublé</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ac"
                      checked={filters.hasAc}
                      onCheckedChange={(checked) => handleFilterChange('hasAc', checked)}
                    />
                    <Label htmlFor="ac" className="font-normal cursor-pointer">Climatisation</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="parking"
                      checked={filters.hasParking}
                      onCheckedChange={(checked) => handleFilterChange('hasParking', checked)}
                    />
                    <Label htmlFor="parking" className="font-normal cursor-pointer">Parking</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="garden"
                      checked={filters.hasGarden}
                      onCheckedChange={(checked) => handleFilterChange('hasGarden', checked)}
                    />
                    <Label htmlFor="garden" className="font-normal cursor-pointer">Jardin</Label>
                  </div>
                </div>
              </div>

              {/* Multimedia */}
              <div className="space-y-3">
                <Label>Visites & Médias</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="video"
                      checked={filters.hasVideo}
                      onCheckedChange={(checked) => handleFilterChange('hasVideo', checked)}
                    />
                    <Label htmlFor="video" className="font-normal cursor-pointer">Avec vidéo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="360view"
                      checked={filters.has360View}
                      onCheckedChange={(checked) => handleFilterChange('has360View', checked)}
                    />
                    <Label htmlFor="360view" className="font-normal cursor-pointer">Vue 360°</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="virtualtour"
                      checked={filters.hasVirtualTour}
                      onCheckedChange={(checked) => handleFilterChange('hasVirtualTour', checked)}
                    />
                    <Label htmlFor="virtualtour" className="font-normal cursor-pointer">Visite virtuelle</Label>
                  </div>
                </div>
              </div>

              {/* Certification ANSUT */}
              <div className="space-y-3">
                <Label>Certification</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="ansutCertified"
                    checked={filters.isAnsutCertified}
                    onCheckedChange={(checked) => handleFilterChange('isAnsutCertified', checked)}
                  />
                  <Label htmlFor="ansutCertified" className="font-normal cursor-pointer flex items-center gap-2">
                    <span className="text-secondary">✓</span> Baux certifiés ANSUT uniquement
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <X className="h-4 w-4 mr-2" />
                  Réinitialiser
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
};

export default PropertyFiltersComponent;
