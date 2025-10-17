import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { KentePattern } from '@/components/ui/african-patterns';
import PropertyFiltersComponent, { PropertyFilters } from '@/components/PropertyFilters';
import MobileFilters from '@/components/properties/MobileFilters';
import { PullToRefresh } from '@/components/properties/PullToRefresh';
import PropertyMap from '@/components/PropertyMap';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Grid, List, Map, Search as SearchIcon, Eye, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { useProperties } from '@/hooks/useProperties';
import { usePropertyFilters } from '@/hooks/usePropertyFilters';
import { useIsMobile } from '@/hooks/use-mobile';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { PropertyCardSkeleton } from '@/components/properties/PropertyCardSkeleton';
import { RecommendationsSection } from '@/components/recommendations/RecommendationsSection';
import { hasCoordinates } from '@/lib/geo';
import { toast } from 'sonner';

type ViewMode = 'grid' | 'list' | 'map';

const Search = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { data: properties = [], isLoading, error, refetch } = useProperties({ currentUserId: user?.id });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const isMobile = useIsMobile();
  
  const { filteredProperties, handleFilterChange, handleLocationSearch, handleReset } = 
    usePropertyFilters(properties);

  const handleNavigateToProperty = (propertyId: string) => {
    navigate(`/properties/${propertyId}`);
  };

  useEffect(() => {
    if (properties.length > 0) {
      const location = searchParams.get('location');
      const type = searchParams.get('type');
      const maxPrice = searchParams.get('maxPrice');

      if (location || type || maxPrice) {
        const filters: PropertyFilters = {};
        if (location) {
          filters.city = location;
        }
        if (type) filters.propertyType = type;
        if (maxPrice) filters.maxPrice = parseInt(maxPrice);
        handleFilterChange(filters as any);
      }
    }
  }, [searchParams, properties.length]);

  const handleFavoriteClick = async (propertyId: string) => {
    if (!user) {
      toast.error("Vous devez être connecté pour ajouter des favoris");
      return;
    }
    await toggleFavorite(propertyId);
  };

  return (
    <MainLayout>
      <main className="page-container section-spacing">
        <DynamicBreadcrumb />

        {/* Header with improved typography */}
        <div className="mb-8 md:mb-12 section-spacing">
          <KentePattern />
          <div className="relative z-10">
            <h1 className="text-h1 mb-4">
              <span className="text-gradient-primary">Rechercher</span> un bien
            </h1>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl">
            Trouvez le logement idéal parmi {properties.length} annonces à Abidjan et environs
          </p>
        </div>

        {/* Filters with better spacing */}
        <div className="mb-8 content-spacing">
          {isMobile ? (
            <MobileFilters
              onFilterChange={handleFilterChange as any}
              onReset={handleReset}
              currentFilters={{}}
            />
          ) : (
            <PropertyFiltersComponent
              onFilterChange={handleFilterChange as any}
              onReset={handleReset}
            />
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {filteredProperties.length} {filteredProperties.length > 1 ? 'biens trouvés' : 'bien trouvé'}
          </p>
          
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('map')}
            >
              <Map className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="content-spacing">
          <PullToRefresh onRefresh={async () => { await refetch(); }}>
            {/* Properties Grid/List */}
            {viewMode === 'map' ? (
              <Card className="p-4 md:p-6">
                <PropertyMap properties={filteredProperties.filter(hasCoordinates)} />
              </Card>
            ) : (
              <>
                {isLoading ? (
                  <div className={viewMode === 'grid' ? 'card-container grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-6'}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <PropertyCardSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredProperties.length > 0 ? (
                  <div className={viewMode === 'grid' ? 'card-container grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-6'}>
                    {filteredProperties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        isFavorite={isFavorite(property.id)}
                        onFavoriteClick={handleFavoriteClick}
                        variant={viewMode === 'list' ? 'compact' : 'default'}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center space-y-6">
                    <SearchIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <div>
                      <h3 className="text-2xl font-semibold mb-2">
                        {searchParams.get('location') ? (
                          <>Aucun bien disponible à <span className="capitalize text-primary">{searchParams.get('location')}</span></>
                        ) : (
                          'Aucun bien trouvé'
                        )}
                      </h3>
                      <p className="text-muted-foreground">
                        {searchParams.get('location') 
                          ? 'Essayez d\'élargir votre recherche à d\'autres villes ou désactivez certains filtres'
                          : 'Essayez de modifier vos critères de recherche pour voir plus de résultats'
                        }
                      </p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => refetch()} variant="outline" size="lg">
                        🔄 Actualiser
                      </Button>
                      <Button onClick={handleReset} variant="primary-gradient" size="lg">
                        Réinitialiser les filtres
                      </Button>
                    </div>
                  </Card>
                )}
              </>
            )}
          </PullToRefresh>
        </div>

        {/* Recommendations */}
        {user && (
          <div className="mt-12">
            <RecommendationsSection 
              userId={user.id}
              type="properties"
            />
          </div>
        )}
      </main>
    </MainLayout>
  );
};

export default Search;
