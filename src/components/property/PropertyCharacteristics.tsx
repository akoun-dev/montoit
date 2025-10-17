import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bed, Bath, Maximize, Building, CheckCircle } from 'lucide-react';
import { Property } from '@/types';

interface PropertyCharacteristicsProps {
  property: Property;
}

export const PropertyCharacteristics = ({ property }: PropertyCharacteristicsProps) => {
  const characteristics = [
    { icon: Building, label: 'Type', value: property.property_type },
    { icon: Maximize, label: 'Surface', value: property.surface_area ? `${property.surface_area} m²` : 'Non spécifié' },
    { icon: Bed, label: 'Chambres', value: property.bedrooms },
    { icon: Bath, label: 'Salles de bain', value: property.bathrooms },
  ];

  const amenities = [
    { condition: property.is_furnished, label: 'Meublé' },
    { condition: property.has_ac, label: 'Climatisation' },
    { condition: property.has_parking, label: 'Parking' },
    { condition: property.has_garden, label: 'Jardin' },
  ].filter(a => a.condition);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Caractéristiques</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {characteristics.map((char, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <char.icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{char.label}</p>
                <p className="font-semibold">{char.value}</p>
              </div>
            </div>
          ))}
        </div>

        {amenities.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Équipements
            </h3>
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {amenity.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
