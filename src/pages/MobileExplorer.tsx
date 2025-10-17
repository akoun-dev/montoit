import { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useMobile, useMobileSwipe } from '@/contexts/MobileContext';
import { useProperties } from '@/hooks/useProperties';
import { useFavorites } from '@/hooks/useFavorites';
import SwipeablePropertyBrowser from '@/components/mobile/SwipeablePropertyBrowser';
import MobileSearchBar from '@/components/mobile/MobileSearchBar';
import MobileSearchFilters from '@/components/mobile/MobileSearchFilters';
import MobileBottomNavigation from '@/components/mobile/MobileBottomNavigation';
import MobilePropertyCard from '@/components/mobile/MobilePropertyCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Grid, Heart, Map } from 'lucide-react';
import { Property } from '@/types';

const MobileExplorer = () => {
  const isMobile = useIsMobile();
  const {
    currentView,
    setCurrentView,
    isSwipeMode,
    setIsSwipeMode,
    searchQuery,
    setSearchQuery,
    activeBottomSheet,
    openBottomSheet,
    closeBottomSheet
  } = useMobile();

  const { properties, isLoading, error, filters, setFilters } = useProperties();
  const { favoriteProperties } = useFavorites();

  // Mobile swipe interface
  const {
    currentProperty,
    currentIndex,
    total,
    handleSwipe,
    isFavorite: isCurrentFavorite
  } = useMobileSwipe(properties || []);

  // Search and filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);

  // Filter properties based on search and filters
  useEffect(() => {
    if (!properties) {
      setFilteredProperties([]);
      return;
    }

    let filtered = [...properties];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(property =>
        property.title.toLowerCase().includes(query) ||
        property.description.toLowerCase().includes(query) ||
        property.city.toLowerCase().includes(query) ||
        property.property_type.toLowerCase().includes(query)
      );
    }

    // Apply additional filters
    if (filters.city) {
      filtered = filtered.filter(property => property.city === filters.city);
    }
    if (filters.propertyType) {
      filtered = filtered.filter(property => property.property_type === filters.propertyType);
    }
    if (filters.maxPrice) {
      filtered = filtered.filter(property => property.monthly_rent <= filters.maxPrice!);
    }
    if (filters.isFurnished !== undefined) {
      filtered = filtered.filter(property => property.is_furnished === filters.isFurnished);
    }

    setFilteredProperties(filtered);
  }, [properties, searchQuery, filters]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) =>
      key !== 'city' && key !== 'propertyType' && value !== undefined && value !== ''
    ).length;
  }, [filters]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    setFilters({});
    setSearchQuery('');
  };

  const toggleViewMode = () => {
    setIsSwipeMode(!isSwipeMode);
  };

  const handlePropertyLike = (property: Property) => {
    // This would integrate with the existing favorites system
    console.log('Liked property:', property.id);
  };

  const handlePropertyPass = (property: Property) => {
    console.log('Passed property:', property.id);
  };

  const handlePropertySuperLike = (property: Property) => {
    console.log('Super liked property:', property.id);
  };

  const handlePropertyView = (property: Property) => {
    // Navigate to property detail
    window.location.href = `/property/${property.id}`;
  };

  // Only render on mobile devices
  if (!isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📱</div>
          <h2 className="text-2xl font-bold mb-2">Mode Mobile Requis</h2>
          <p className="text-gray-600 mb-4">
            Cette page est optimisée pour les appareils mobiles.
            Veuillez utiliser un mobile ou redimensionner votre navigateur.
          </p>
          <Button onClick={() => window.location.href = '/explorer'}>
            Version Desktop
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">
              {isSwipeMode ? 'Découverte' : 'Explorer'}
            </h1>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {filteredProperties.length} biens
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={toggleViewMode}
                className="flex items-center gap-2"
              >
                {isSwipeMode ? (
                  <>
                    <Grid className="h-4 w-4" />
                    Grille
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4" />
                    Swipe
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <MobileSearchBar
            onSearch={handleSearch}
            suggestions={[]}
            recentSearches={[]}
          />
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {isSwipeMode ? (
          /* Swipe Mode */
          <div className="h-screen">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Chargement...</p>
                </div>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4">🏠</div>
                  <h3 className="text-lg font-semibold mb-2">Aucune propriété trouvée</h3>
                  <p className="text-gray-600 mb-4">Essayez de modifier vos filtres de recherche</p>
                  <Button onClick={handleFilterReset}>
                    Réinitialiser les filtres
                  </Button>
                </div>
              </div>
            ) : (
              <SwipeablePropertyBrowser
                properties={filteredProperties}
                onPropertyLike={handlePropertyLike}
                onPropertyPass={handlePropertyPass}
                onPropertySuperLike={handlePropertySuperLike}
                onPropertyView={handlePropertyView}
              />
            )}
          </div>
        ) : (
          /* Grid/List Mode */
          <div className="p-4 space-y-4">
            {/* Filters */}
            <MobileSearchFilters
              onFilterChange={handleFilterChange}
              onReset={handleFilterReset}
              activeFiltersCount={activeFiltersCount}
              initialFilters={filters}
            />

            {/* Property Grid */}
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                      <div className="h-48 bg-gray-200"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏠</div>
                <h3 className="text-lg font-semibold mb-2">Aucune propriété trouvée</h3>
                <p className="text-gray-600">Essayez de modifier vos filtres de recherche</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredProperties.map((property) => (
                  <MobilePropertyCard
                    key={property.id}
                    property={property}
                    onFavorite={() => handlePropertyLike(property)}
                    isFavorite={favoriteProperties.has(property.id)}
                    onViewDetails={() => handlePropertyView(property)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNavigation
        notificationCount={0}
        favoriteCount={favoriteProperties.size}
      />
    </div>
  );
};

export default MobileExplorer;