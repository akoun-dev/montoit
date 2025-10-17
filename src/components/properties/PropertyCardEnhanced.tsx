import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { 
  MapPin, BedDouble, Bath, Square, Eye, Heart, FileText, 
  TrendingUp, AlertCircle 
} from 'lucide-react';
import type { Property as PropertyType } from '@/types';
import { PROPERTY_STATUS_LABELS, PROPERTY_STATUS_COLORS } from '@/constants';

type Property = Pick<PropertyType, 
  'id' | 'title' | 'description' | 'property_type' | 'status' | 
  'address' | 'city' | 'bedrooms' | 'bathrooms' | 'surface_area' | 
  'monthly_rent' | 'main_image' | 'view_count' | 'created_at'
> & {
  moderation_status?: string;
  moderation_notes?: string;
  favorites_count?: number;
  applications_count?: number;
  conversion_rate?: number;
};

interface PropertyCardEnhancedProps {
  property: Property;
  view: 'grid' | 'list';
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}

const PropertyCardEnhanced = ({ property, view, isSelected, onToggleSelect }: PropertyCardEnhancedProps) => {
  if (view === 'list') {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <div className="flex flex-col md:flex-row">
          {/* Selection Checkbox */}
          <div className="absolute top-4 left-4 z-10">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(property.id)}
              className="bg-background"
            />
          </div>

          {/* Image */}
          <div className="md:w-64 aspect-video md:aspect-auto bg-muted relative">
            {property.main_image ? (
              <img
                src={property.main_image}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <Badge className={`absolute top-2 right-2 ${PROPERTY_STATUS_COLORS[property.status]}`}>
              {PROPERTY_STATUS_LABELS[property.status]}
            </Badge>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {/* Moderation Alert */}
            {property.moderation_status === 'pending' && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>En attente de modération</AlertDescription>
              </Alert>
            )}
            {property.moderation_status === 'rejected' && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Rejeté: {property.moderation_notes || 'Non spécifié'}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-bold">{property.title}</h3>
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {property.city}
                </p>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-4 border-y">
                <div className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{property.bedrooms} chambres</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{property.bathrooms} bains</span>
                </div>
                <div className="flex items-center gap-2">
                  <Square className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{property.surface_area}m²</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{property.view_count} vues</span>
                </div>
                {property.conversion_rate !== undefined && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">{property.conversion_rate}% conv.</span>
                  </div>
                )}
              </div>

              {/* Performance Stats */}
              {(property.favorites_count !== undefined || property.applications_count !== undefined) && (
                <div className="flex gap-4 text-sm">
                  {property.favorites_count !== undefined && (
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span>{property.favorites_count} favoris</span>
                    </div>
                  )}
                  {property.applications_count !== undefined && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span>{property.applications_count} candidatures</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-primary">
                  {property.monthly_rent.toLocaleString()} FCFA
                  <span className="text-sm text-muted-foreground font-normal">/mois</span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/biens/${property.id}`}>Voir</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/biens/${property.id}/modifier`}>Modifier</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Grid view
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelect(property.id)}
          className="bg-background"
        />
      </div>

      {/* Moderation Status Alert */}
      {property.moderation_status === 'pending' && (
        <Alert className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>En attente de modération</AlertDescription>
        </Alert>
      )}
      {property.moderation_status === 'rejected' && (
        <Alert variant="destructive" className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Rejeté: {property.moderation_notes || 'Non spécifié'}
          </AlertDescription>
        </Alert>
      )}

      {/* Property Image */}
      <div className="aspect-video bg-muted relative">
        {property.main_image ? (
          <img
            src={property.main_image}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <Badge className={`absolute top-2 right-2 ${PROPERTY_STATUS_COLORS[property.status]}`}>
          {PROPERTY_STATUS_LABELS[property.status]}
        </Badge>
      </div>

      <CardHeader>
        <CardTitle className="line-clamp-1">{property.title}</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {property.city}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Property Details */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <BedDouble className="h-4 w-4" />
            {property.bedrooms}
          </div>
          <div className="flex items-center gap-1">
            <Bath className="h-4 w-4" />
            {property.bathrooms}
          </div>
          <div className="flex items-center gap-1">
            <Square className="h-4 w-4" />
            {property.surface_area}m²
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Eye className="h-4 w-4" />
            {property.view_count} vues
          </div>
          {property.conversion_rate !== undefined && (
            <div className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-4 w-4" />
              {property.conversion_rate}%
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        {(property.favorites_count !== undefined || property.applications_count !== undefined) && (
          <div className="flex gap-3 text-xs border-t pt-3">
            {property.favorites_count !== undefined && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-500" />
                {property.favorites_count}
              </div>
            )}
            {property.applications_count !== undefined && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-blue-500" />
                {property.applications_count}
              </div>
            )}
          </div>
        )}

        {/* Price */}
        <div className="text-2xl font-bold text-primary">
          {property.monthly_rent.toLocaleString()} FCFA/mois
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" asChild>
            <Link to={`/biens/${property.id}`}>Voir</Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link to={`/biens/${property.id}/modifier`}>Modifier</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PropertyCardEnhanced;
