import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { propertyService } from '@/services/propertyService';
import { PropertyCard } from '@/components/properties/PropertyCard';
import PropertyFiltersComponent, { PropertyFilters } from '@/components/PropertyFilters';
import { PropertyCardSkeleton } from '@/components/properties/PropertyCardSkeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowDown } from 'lucide-react';
import { FadeInView } from '@/components/animations/FadeInView';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { Property } from '@/types';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';

interface PropertyGridProps {
  limit?: number;
  showFilters?: boolean;
}

export const PropertyGrid = ({ 
  limit = 16, 
  showFilters = true,
}: PropertyGridProps) => {
  console.log('[PropertyGrid] Rendering with limit:', limit);
  const { user } = useAuth();
  const [displayLimit, setDisplayLimit] = useState(limit);
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc'>('recent');
  const [filters, setFilters] = useState<PropertyFilters>({});

  // Fetch properties
  const { data: properties = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      // Use secure RPC through propertyService to avoid RLS/REST 400 errors
      const data = await propertyService.fetchAll();
      return data as Property[];
    },
  });

  const handleRefresh = async () => {
    await refetch();
    toast({
      description: "✅ Liste des biens mise à jour",
      duration: 2000,
    });
  };

  // Apply filters
  const filteredProperties = properties.filter(property => {
    if (filters.city && property.city !== filters.city) return false;
    if (filters.propertyType && property.property_type !== filters.propertyType) return false;
    if (filters.minPrice && property.monthly_rent < filters.minPrice) return false;
    if (filters.maxPrice && property.monthly_rent > filters.maxPrice) return false;
    if (filters.minSurface && property.surface_area && property.surface_area < filters.minSurface) return false;
    if (filters.maxSurface && property.surface_area && property.surface_area > filters.maxSurface) return false;
    if (filters.bedrooms && property.bedrooms < filters.bedrooms) return false;
    if (filters.bathrooms && property.bathrooms < filters.bathrooms) return false;
    if (filters.isFurnished && !property.is_furnished) return false;
    if (filters.hasAc && !property.has_ac) return false;
    if (filters.hasParking && !property.has_parking) return false;
    if (filters.hasGarden && !property.has_garden) return false;
    if (filters.status && property.status !== filters.status) return false;
    return true;
  });

  // Sorting
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'price_asc') return a.monthly_rent - b.monthly_rent;
    if (sortBy === 'price_desc') return b.monthly_rent - a.monthly_rent;
    return 0;
  });

  const displayedProperties = sortedProperties.slice(0, displayLimit);
  const hasMore = sortedProperties.length > displayLimit;

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 12);
  };

  const handleFilterChange = (newFilters: PropertyFilters) => {
    setFilters(newFilters);
  };

  const handleReset = () => {
    setFilters({});
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <section className="bg-background">
      <div className="container mx-auto px-4 py-8 max-w-[1400px]">
        {/* Header: Filters toggle + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <p className="text-sm text-muted-foreground">
            <strong>{filteredProperties.length}</strong> bien{filteredProperties.length > 1 ? 's' : ''} disponible{filteredProperties.length > 1 ? 's' : ''}
          </p>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border rounded-md px-3 py-1.5 bg-background"
              aria-label="Trier les résultats"
            >
              <option value="recent">Plus récents</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <PropertyFiltersComponent
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        )}

        {/* Property Grid */}
        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <PropertyCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                Erreur lors du chargement des propriétés. {(error as Error)?.message}
              </AlertDescription>
            </Alert>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground mb-4">
                Aucun bien ne correspond à vos critères
              </p>
              <Button onClick={handleReset} variant="outline">
                Réinitialiser les filtres
              </Button>
            </div>
          ) : (
            <>
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                role="list"
                aria-label="Liste des biens immobiliers"
              >
                {displayedProperties.map((property, index) => (
                  <FadeInView key={property.id} delay={Math.min(index * 0.05, 0.4)} direction="up">
                    <div role="listitem">
                      <PropertyCard
                        property={property}
                        variant="compact"
                        onFavoriteClick={(id) => {
                          if (!user) {
                            toast({
                              title: "Connexion requise",
                              description: "Connectez-vous pour ajouter des favoris",
                              variant: "destructive",
                            });
                            return;
                          }
                          // Toggle favorite logic would go here
                        }}
                        isFavorite={false}
                      />
                    </div>
                  </FadeInView>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-8">
                  <Button
                    onClick={handleLoadMore}
                    size="lg"
                    variant="outline"
                    className="min-w-[200px]"
                  >
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Charger plus de biens ({sortedProperties.length - displayLimit} restants)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
    </PullToRefresh>
  );
};
