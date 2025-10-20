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
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Grid, List, Map, Search as SearchIcon, Eye, CheckCircle2, Lock, Locate } from 'lucide-react';
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
  const [locating, setLocating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const isMobile = useIsMobile();

  const { filteredProperties, handleFilterChange, handleLocationSearch, handleReset } =
    usePropertyFilters(properties);

  // Pagination logic
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProperties = filteredProperties.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredProperties.length]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Fonction pour obtenir la position de l'utilisateur
  const handleNearMeSearch = async () => {
    if (!navigator.geolocation) {
      toast.error('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setLocating(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
          }
        );
      });

      const { latitude, longitude } = position.coords;

      // Filtrer les propriétés dans un rayon de 5km
      const nearbyProperties = properties.filter(property => {
        if (!property.latitude || !property.longitude) return false;

        const distance = calculateDistance(
          latitude,
          longitude,
          property.latitude,
          property.longitude
        );

        return distance <= 5; // 5km radius
      });

      // Appliquer le filtre de localisation
      handleLocationSearch(latitude, longitude);

      // Mettre à jour l'affichage pour montrer les propriétés à proximité
      toast.success(`${nearbyProperties.length} bien(s) trouvé(s) dans un rayon de 5km`);

      // Forcer le mode carte pour mieux visualiser les résultats
      if (nearbyProperties.length > 0) {
        setViewMode('map');
      }
    } catch (error) {
      console.error('Geolocation error:', error);
      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Veuillez autoriser l\'accès à votre position pour utiliser cette fonctionnalité');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Votre position n\'est pas disponible');
            break;
          case error.TIMEOUT:
            toast.error('La recherche de votre position a expiré');
            break;
          default:
            toast.error('Erreur lors de la recherche de votre position');
        }
      } else {
        toast.error('Erreur lors de la recherche de votre position');
      }
    } finally {
      setLocating(false);
    }
  };

  // Fonction pour calculer la distance entre deux points (formule de Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

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
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {startIndex + 1}-{Math.min(endIndex, filteredProperties.length)} de {filteredProperties.length} {filteredProperties.length > 1 ? 'biens trouvés' : 'bien trouvé'}
              {totalPages > 1 && <span> (Page {currentPage} sur {totalPages})</span>}
            </p>

            {/* Bouton "Autour de moi" */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleNearMeSearch}
              disabled={locating || isLoading}
              className="text-xs"
            >
              <Locate className={`h-4 w-4 mr-1 ${locating ? 'animate-pulse' : ''}`} />
              {locating ? 'Localisation...' : 'Autour de moi'}
            </Button>
          </div>

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
                ) : currentProperties.length > 0 ? (
                  <div className={viewMode === 'grid' ? 'card-container grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'space-y-6'}>
                    {currentProperties.map((property) => (
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {/* Page numbers */}
                        {[...Array(totalPages)].map((_, index) => {
                          const pageNumber = index + 1;
                          const isCurrentPage = pageNumber === currentPage;

                          // Show first page, last page, current page, and pages around current
                          if (
                            pageNumber === 1 ||
                            pageNumber === totalPages ||
                            (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={pageNumber}>
                                <PaginationLink
                                  isActive={isCurrentPage}
                                  onClick={() => handlePageChange(pageNumber)}
                                  className={isCurrentPage ? '' : 'cursor-pointer'}
                                >
                                  {pageNumber}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }

                          // Show ellipsis for gaps
                          if (
                            (pageNumber === currentPage - 2 && currentPage > 3) ||
                            (pageNumber === currentPage + 2 && currentPage < totalPages - 2)
                          ) {
                            return (
                              <PaginationItem key={`ellipsis-${pageNumber}`}>
                                <span className="flex h-9 w-9 items-center justify-center">...</span>
                              </PaginationItem>
                            );
                          }

                          return null;
                        })}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
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
