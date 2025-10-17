import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  SlidersHorizontal, 
  Home, 
  DollarSign, 
  Bed, 
  MapPin,
  RefreshCw,
  TrendingUp,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MapFiltersState {
  minPrice: number;
  maxPrice: number;
  propertyType: string;
  minBedrooms: number;
  maxBedrooms: number;
  amenities: string[];
}

interface MapFiltersProps {
  filters: MapFiltersState;
  onFiltersChange: (filters: MapFiltersState) => void;
  stats: {
    totalProperties: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    neighborhoods: number;
  };
}

const AMENITIES = [
  { value: 'piscine', label: 'Piscine', icon: '🏊' },
  { value: 'parking', label: 'Parking', icon: '🚗' },
  { value: 'securite', label: 'Sécurité', icon: '🛡️' },
  { value: 'jardin', label: 'Jardin', icon: '🌳' },
  { value: 'climatisation', label: 'Climatisation', icon: '❄️' },
  { value: 'meuble', label: 'Meublé', icon: '🛋️' },
];

export const MapFilters = ({ filters, onFiltersChange, stats }: MapFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handlePriceChange = (values: number[]) => {
    onFiltersChange({
      ...filters,
      minPrice: values[0],
      maxPrice: values[1],
    });
  };

  const handleBedroomsChange = (values: number[]) => {
    onFiltersChange({
      ...filters,
      minBedrooms: values[0],
      maxBedrooms: values[1],
    });
  };

  const handlePropertyTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      propertyType: value,
    });
  };

  const handleAmenityToggle = (amenity: string) => {
    const newAmenities = filters.amenities.includes(amenity)
      ? filters.amenities.filter(a => a !== amenity)
      : [...filters.amenities, amenity];
    
    onFiltersChange({
      ...filters,
      amenities: newAmenities,
    });
  };

  const handleReset = () => {
    onFiltersChange({
      minPrice: 0,
      maxPrice: 2000000,
      propertyType: 'all',
      minBedrooms: 1,
      maxBedrooms: 5,
      amenities: [],
    });
  };

  const formatPrice = (price: number) => {
    return `${(price / 1000).toFixed(0)}k`;
  };

  return (
    <Card className="w-full max-w-sm bg-gradient-to-b from-background to-muted/20 border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            Filtres de recherche
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.div>
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-6">
              {/* Stats Section */}
              <div className="grid grid-cols-2 gap-3">
                <motion.div
                  className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Biens</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{stats.totalProperties}</p>
                </motion.div>

                <motion.div
                  className="p-3 rounded-lg bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-secondary" />
                    <span className="text-xs text-muted-foreground">Moy.</span>
                  </div>
                  <p className="text-lg font-bold text-secondary">{formatPrice(stats.avgPrice)}</p>
                </motion.div>
              </div>

              <Separator />

              {/* Price Range */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Prix mensuel
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {formatPrice(filters.minPrice)} - {formatPrice(filters.maxPrice)} FCFA
                  </Badge>
                </div>
                <Slider
                  min={0}
                  max={2000000}
                  step={50000}
                  value={[filters.minPrice, filters.maxPrice]}
                  onValueChange={handlePriceChange}
                  className="w-full"
                />
              </div>

              {/* Property Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Home className="h-4 w-4 text-primary" />
                  Type de bien
                </Label>
                <Select value={filters.propertyType} onValueChange={handlePropertyTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="appartement">Appartement</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="duplex">Duplex</SelectItem>
                    <SelectItem value="maison">Maison</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bedrooms */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-semibold">
                    <Bed className="h-4 w-4 text-primary" />
                    Chambres
                  </Label>
                  <Badge variant="secondary" className="text-xs">
                    {filters.minBedrooms} - {filters.maxBedrooms}
                  </Badge>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[filters.minBedrooms, filters.maxBedrooms]}
                  onValueChange={handleBedroomsChange}
                  className="w-full"
                />
              </div>

              {/* Amenities */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-primary" />
                  Équipements
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {AMENITIES.map((amenity) => (
                    <motion.div
                      key={amenity.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <label
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          filters.amenities.includes(amenity.value)
                            ? 'bg-primary/10 border-primary'
                            : 'bg-background border-border hover:border-primary/50'
                        }`}
                      >
                        <Checkbox
                          checked={filters.amenities.includes(amenity.value)}
                          onCheckedChange={() => handleAmenityToggle(amenity.value)}
                        />
                        <span className="text-lg">{amenity.icon}</span>
                        <span className="text-xs font-medium">{amenity.label}</span>
                      </label>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

