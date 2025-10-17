import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { propertyService } from '@/services/propertyService';
import { Property } from '@/types';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/services/logger';
import { toast } from 'sonner';

interface FeaturedPropertiesProps {
  limit?: number;
}

const FeaturedProperties = ({ limit = 6 }: FeaturedPropertiesProps) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('Tous');
  const { toggleFavorite, isFavorite } = useFavorites();
  const { user } = useAuth();

  const fetchFeaturedProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logger.debug('Fetching featured properties');
      const data = await propertyService.fetchAll();
      logger.debug('Featured properties data received', { count: data?.length || 0 });

      if (!data || data.length === 0) {
        logger.warn('No properties returned from API');
        setProperties([]);
        setLoading(false);
        setIsRetrying(false);
        return;
      }

      // Filter out rented properties - propertyService.fetchAll() already does this
      const featured = data
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, limit);

      logger.info('Featured properties prepared', { count: featured.length });
      setProperties(featured);
    } catch (err) {
      logger.logError(err, { context: 'fetchFeaturedProperties' });

      let errorMessage = 'Impossible de charger les biens en vedette. Veuillez réessayer.';

      // Provide more specific error messages
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
          errorMessage = 'Problème de connexion. Vérifiez votre connexion internet.';
        } else if (err.message.includes('JWT') || err.message.includes('auth')) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (err.message.includes('not found') || err.message.includes('404')) {
          errorMessage = 'Service temporairement indisponible. Réessayez dans quelques instants.';
        }
      }

      setError(errorMessage);
      handleError(err, errorMessage);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchFeaturedProperties();
  }, [fetchFeaturedProperties]);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    await fetchFeaturedProperties();
  }, [fetchFeaturedProperties]);

  const filteredProperties = useMemo(() => {
    if (activeFilter === 'Tous') return properties;
    return properties.filter(p => {
      if (activeFilter === 'Appartements') return p.property_type.toLowerCase().includes('appartement');
      if (activeFilter === 'Villas') return p.property_type.toLowerCase().includes('villa');
      if (activeFilter === 'Studios') return p.property_type.toLowerCase().includes('studio');
      return true;
    });
  }, [properties, activeFilter]);

  // Skeleton loader optimisé pour PropertyCard
  const SkeletonCard = useMemo(() => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-md">
      <Skeleton className="h-56 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-4 pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-full mt-4" />
      </div>
    </div>
  ), []);

  if (loading) {
    return (
      <div className="px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                Biens en vedette
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Découvrez notre sélection de biens les plus consultés
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i}>{SkeletonCard}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">
              Une erreur est survenue
            </h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              {error}
            </p>
            <Button onClick={handleRetry} variant="outline" disabled={isRetrying}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Chargement...' : 'Réessayer'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return null;
  }

  return (
    <div className="px-3 md:px-4 bg-gradient-to-b from-white via-primary/3 to-white border-t border-primary/10">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-6 animate-fade-in">
          <div>
            <h2 
              id="featured-properties-heading"
              className="text-4xl md:text-5xl font-bold mb-3 text-foreground"
            >
              Biens en vedette
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Découvrez les biens les plus populaires cette semaine
            </p>
          </div>
          <Button 
            size="lg" 
            variant="outline" 
            asChild
            className="hidden md:flex items-center gap-2 mt-6 md:mt-0 font-semibold border-2 hover:bg-primary hover:text-white transition-all"
          >
            <Link to="/recherche">
              Voir toutes les annonces
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
        
        {/* Filtres rapides */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['Tous', 'Appartements', 'Villas', 'Studios'].map(filter => (
            <Button 
              key={filter} 
              variant={activeFilter === filter ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveFilter(filter)}
              className="whitespace-nowrap font-medium"
            >
              {filter}
            </Button>
          ))}
        </div>
        
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          role="list"
          aria-label="Biens immobiliers en vedette"
        >
          {filteredProperties.map((property, index) => (
            <div 
              key={property.id} 
              role="listitem"
              className="animate-fade-in hover-scale"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <PropertyCard
                property={property}
                onFavoriteClick={(id) => {
                  if (!user) {
                    toast.error("Connectez-vous pour ajouter des favoris");
                    return;
                  }
                  toggleFavorite(id);
                }}
                isFavorite={user ? isFavorite(property.id) : false}
                variant="compact"
              />
            </div>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Button asChild size="lg" className="md:hidden font-semibold shadow-lg hover:shadow-xl">
            <Link to="/recherche" className="flex items-center gap-2">
              Voir toutes les annonces
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedProperties;
