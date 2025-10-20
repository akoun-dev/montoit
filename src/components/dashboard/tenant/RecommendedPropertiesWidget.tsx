import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, MapPin, Bed, Bath, Car, Zap, Eye, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProperties } from '@/hooks/useProperties';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

interface RecommendedPropertiesWidgetProps {
  userId?: string;
}

export const RecommendedPropertiesWidget = ({ userId }: RecommendedPropertiesWidgetProps) => {
  const { user } = useAuth();
  const [userPreferences, setUserPreferences] = useState<any>(null);

  // Fetch user preferences first
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserPreferences(data);
    };

    fetchPreferences();
  }, [user]);

  // Build filters based on user preferences
  const filters = userPreferences ? {
    cities: userPreferences.preferred_cities || [],
    propertyTypes: userPreferences.preferred_property_types || [],
    minBudget: userPreferences.min_budget || 0,
    maxBudget: userPreferences.max_budget || 1000000,
    minBedrooms: userPreferences.min_bedrooms || 0,
    minBathrooms: userPreferences.min_bathrooms || 0,
    requiresParking: userPreferences.requires_parking || false,
    requiresGarden: userPreferences.requires_garden || false,
    requiresAC: userPreferences.requires_ac || false,
    requiresFurnished: userPreferences.requires_furnished || false,
    limit: 6 // Limit to 6 properties for the widget
  } : { limit: 6 };

  const { data: properties, isLoading, error } = useProperties(filters);

  const handleAddToFavorites = async (propertyId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('favorites')
        .upsert({
          user_id: user.id,
          property_id: propertyId
        });

      if (error) throw error;

      toast({
        title: 'Ajouté aux favoris',
        description: 'Le bien a été ajouté à vos favoris',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter aux favoris',
        variant: 'destructive',
      });
    }
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

  if (error || !properties || properties.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-lg text-muted-foreground mb-2">
            {userPreferences ? 'Aucune annonce ne correspond à vos critères' : 'Aucune recommandation disponible'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {userPreferences
              ? 'Essayez d\'élargir vos critères de recherche'
              : 'Configurez vos préférences pour recevoir des recommandations personnalisées'
            }
          </p>
          <Button asChild>
            <Link to="/recherche">
              Explorer toutes les annonces
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {properties.map((property: any) => (
        <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          {/* Property Image */}
          <div className="relative h-48 bg-gray-100">
            {property.images && property.images.length > 0 ? (
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <Home className="h-12 w-12 text-gray-400" />
              </div>
            )}

            {/* Status Badges */}
            <div className="absolute top-2 left-2 flex gap-2">
              {property.is_featured && (
                <Badge variant="default" className="bg-yellow-500">🌟 Vedette</Badge>
              )}
              {property.is_verified && (
                <Badge variant="default" className="bg-green-500">✓ Vérifié</Badge>
              )}
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

              {/* Additional Info */}
              {(property.deposit_amount || property.charges_amount) && (
                <div className="text-xs text-muted-foreground">
                  {property.deposit_amount && (
                    <span>Caution: {property.deposit_amount.toLocaleString()} FCFA</span>
                  )}
                  {property.deposit_amount && property.charges_amount && <span> • </span>}
                  {property.charges_amount && (
                    <span>Charges: {property.charges_amount.toLocaleString()} FCFA</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button asChild size="sm" className="flex-1">
                  <Link to={`/property/${property.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddToFavorites(property.id)}
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};