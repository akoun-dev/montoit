import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, MapPin, Bed, Bath, Car, Zap, Eye, Heart, Edit, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Property {
  id: string;
  title: string;
  city: string;
  neighborhood?: string;
  monthly_rent: number;
  status: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  has_parking: boolean;
  has_ac: boolean;
  created_at: string;
  updated_at: string;
  view_count?: number;
  favorite_count?: number;
  application_count?: number;
  main_image?: string;
}

interface OwnerPropertiesWidgetProps {
  properties: Property[];
  isLoading: boolean;
  userId?: string;
}

export const OwnerPropertiesWidget = ({ properties, isLoading, userId }: OwnerPropertiesWidgetProps) => {
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'disponible': { variant: 'default', label: '🟢 Disponible' },
      'loué': { variant: 'secondary', label: '🔵 Loué' },
      'en_attente': { variant: 'outline', label: '🟡 En attente' },
      'indisponible': { variant: 'destructive', label: '🔴 Indisponible' },
      'maintenance': { variant: 'outline', label: '🔧 Maintenance' },
    };

    const config = configs[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="h-6 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground mb-2">
            Vous n'avez pas encore de biens
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Commencez par ajouter votre première annonce
          </p>
          <Button asChild>
            <Link to="/ajouter-bien">
              <Home className="h-4 w-4 mr-2" />
              Ajouter un bien
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-primary">{properties.length}</div>
          <div className="text-sm text-muted-foreground">Total biens</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {properties.filter(p => p.status === 'disponible').length}
          </div>
          <div className="text-sm text-muted-foreground">Disponibles</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {properties.filter(p => p.status === 'loué').length}
          </div>
          <div className="text-sm text-muted-foreground">Loués</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">
            {properties.reduce((sum, p) => sum + (p.view_count || 0), 0)}
          </div>
          <div className="text-sm text-muted-foreground">Vues totales</div>
        </Card>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.slice(0, 6).map((property) => (
          <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            {/* Property Image */}
            <div className="relative h-48 bg-gray-100">
              {property.main_image ? (
                <img
                  src={property.main_image}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Home className="h-12 w-12 text-gray-400" />
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-2 left-2">
                {getStatusBadge(property.status)}
              </div>

              {/* Price Badge */}
              <div className="absolute bottom-2 right-2">
                <Badge variant="secondary" className="bg-white/90 backdrop-blur">
                  {property.monthly_rent?.toLocaleString()} FCFA/mois
                </Badge>
              </div>
            </div>

            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Title and Location */}
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1">{property.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{property.city}</span>
                    {property.neighborhood && <span>• {property.neighborhood}</span>}
                  </div>
                </div>

                {/* Property Features */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {property.bedrooms > 0 && (
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      <span>{property.bedrooms}</span>
                    </div>
                  )}
                  {property.bathrooms > 0 && (
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      <span>{property.bathrooms}</span>
                    </div>
                  )}
                  {property.has_parking && (
                    <div className="flex items-center gap-1">
                      <Car className="h-4 w-4" />
                    </div>
                  )}
                  {property.has_ac && (
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{property.view_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{property.favorite_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(property.created_at), 'dd MMM', { locale: fr })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link to={`/biens/${property.id}/modifier`}>
                      <Edit className="h-4 w-4 mr-1" />
                      Modifier
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/property/${property.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View More */}
      {properties.length > 6 && (
        <div className="text-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/mes-biens">
              Voir tous mes biens ({properties.length})
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
};