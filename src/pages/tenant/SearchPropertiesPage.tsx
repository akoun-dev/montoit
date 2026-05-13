import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Home as HomeIcon,
  X,
  AlertCircle,
  Map as MapIcon,
  List,
  ArrowUpDown,
  Banknote,
  Filter,
  Bookmark,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import MapWrapper from '@/shared/ui/MapWrapper';
import { useInfiniteProperties } from '../../hooks/tenant/useInfiniteProperties';
import { useSaveSearch } from '../../hooks/tenant/useSaveSearch';
import { usePrefetchProperties } from '@/shared/hooks/usePrefetchProperty';
import SaveSearchDialog from '../../features/tenant/components/SaveSearchDialog';
import { PropertyCard } from '@/features/property/components/PropertyCard';
import { useShareDialog } from '@/shared/ui/ShareDialog';
import type { Json } from '@/integrations/supabase/types';

// Premium Ivorian Color Palette
const COLORS = {
  chocolat: '#2C1810',
  sable: '#E8D4C5',
  orange: '#F16522',
  creme: '#FAF7F4',
  grisNeutre: '#A69B95',
  grisTexte: '#6B5A4E',
  border: '#EFEBE9',
};

export default function SearchPropertiesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State for view mode - liste par défaut
  const [activeView, setActiveView] = useState<'list' | 'map'>('list');
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc'>('recent');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [locationMode, setLocationMode] = useState<'all' | 'abidjan' | 'outside_abidjan'>('all');

  // Applied filters (synced with URL params)
  const [appliedFilters, setAppliedFilters] = useState({
    city: searchParams.get('city') || '',
    propertyType: searchParams.get('type') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms: searchParams.get('bedrooms') || '',
    bathrooms: searchParams.get('bathrooms') || '',
    minSurface: searchParams.get('minSurface') || '',
    maxSurface: searchParams.get('maxSurface') || '',
    furnished: searchParams.get('furnished') || '',
    hasParking: searchParams.get('hasParking') || '',
  });

  // Save search hook
  const { saveSearch, isAuthenticated } = useSaveSearch();

  // Share dialog
  const { openShareDialog, ShareDialogComponent } = useShareDialog();

  // Prefetch properties hook
  const { prefetchProperties } = usePrefetchProperties();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9; // 9 propriétés par page (pagination côté client)
  const fetchPageSize = 1000; // Charger beaucoup de propriétés pour la pagination côté client

  // Infinite scroll hook with sorting - ANSUT certified only
  const {
    properties,
    loading,
    loadingMore: _loadingMore,
    error: queryError,
    hasMore: _hasMore,
    loadMore: _loadMore,
    totalCount,
  } = useInfiniteProperties({
    city: appliedFilters.city,
    propertyType: appliedFilters.propertyType,
    minPrice: appliedFilters.minPrice,
    maxPrice: appliedFilters.maxPrice,
    bedrooms: appliedFilters.bedrooms,
    bathrooms: appliedFilters.bathrooms,
    minSurface: appliedFilters.minSurface,
    maxSurface: appliedFilters.maxSurface,
    furnished: appliedFilters.furnished,
    hasParking: appliedFilters.hasParking,
    sortBy,
    pageSize: fetchPageSize,
    ansutVerifiedOnly: true,
    locationMode
  });

  // Calculer les indices pour la pagination
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentProperties = properties.slice(startIndex, endIndex);
  const totalPages = Math.ceil(totalCount / pageSize);

  // Réinitialiser à la page 1 quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters, sortBy, locationMode]);

  // Prefetch first 6 properties when they are loaded (for faster detail page navigation)
  const propertiesToPrefetch = useMemo(() => properties.slice(0, 6).map((p) => p.id), [properties]);

  useEffect(() => {
    if (propertiesToPrefetch.length > 0 && !loading) {
      prefetchProperties(propertiesToPrefetch);
    }
  }, [propertiesToPrefetch, loading, prefetchProperties]);

  const [error, setError] = useState<string | null>(null);

  // Calculate geolocated vs non-geolocated properties for accurate map counter
  const geolocatedProperties = properties.filter(
    (p) => p.longitude !== null && p.latitude !== null
  );
  const nonGeolocatedCount = properties.length - geolocatedProperties.length;
  const geolocatedCount = geolocatedProperties.length;

  // Sync URL params to applied filters on mount and URL change
  useEffect(() => {
    setAppliedFilters({
      city: searchParams.get('city') || '',
      propertyType: searchParams.get('type') || '',
      minPrice: searchParams.get('minPrice') || '',
      maxPrice: searchParams.get('maxPrice') || '',
      bedrooms: searchParams.get('bedrooms') || '',
      bathrooms: searchParams.get('bathrooms') || '',
      minSurface: searchParams.get('minSurface') || '',
      maxSurface: searchParams.get('maxSurface') || '',
      furnished: searchParams.get('furnished') || '',
      hasParking: searchParams.get('hasParking') || '',
    });
  }, [searchParams]);

  const clearFilters = () => {
    // Only update URL params - let the sync useEffect update appliedFilters
    // This avoids race conditions and ensures single source of truth
    setError(null);
    setSearchParams(new URLSearchParams());
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'Prix sur demande';
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const handleSaveSearch = () => {
    if (!isAuthenticated) {
      navigate('/connexion?redirect=/recherche');
      return;
    }
    setShowSaveDialog(true);
  };

  const handleSaveSearchSubmit = async (name: string, enableNotifications: boolean) => {
    const filters = {
      city: appliedFilters.city || undefined,
      property_type: appliedFilters.propertyType || undefined,
      min_price: appliedFilters.minPrice ? parseInt(appliedFilters.minPrice) : undefined,
      max_price: appliedFilters.maxPrice ? parseInt(appliedFilters.maxPrice) : undefined,
      min_bedrooms: appliedFilters.bedrooms ? parseInt(appliedFilters.bedrooms) : undefined,
    };
    await saveSearch(name, filters, enableNotifications);
  };

  const handlePropertyShare = (property: {
    id: string;
    title: string;
    images: Json | null;
  }) => {
    // Safely get the first image from Json
    let firstImage: string | undefined = undefined;
    if (Array.isArray(property.images) && property.images.length > 0) {
      const img = property.images[0];
      if (typeof img === 'string') {
        firstImage = img;
      }
    }

    openShareDialog(
      property.title || 'Propriete',
      `${window.location.origin}/proprietes/${property.id}`,
      firstImage
    );
  };

  const activeFiltersCount = [
    appliedFilters.city,
    appliedFilters.propertyType,
    appliedFilters.minPrice,
    appliedFilters.maxPrice,
    appliedFilters.bedrooms,
    appliedFilters.bathrooms,
    appliedFilters.minSurface,
    appliedFilters.maxSurface,
    appliedFilters.furnished,
    appliedFilters.hasParking,
  ].filter(Boolean).length;

  const displayError = error || queryError;
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.creme }}>
      {/* ==================== HEADER REDESIGNÉ ==================== */}
      <header
        className="relative overflow-hidden pb-6 pt-24 md:pt-28 px-4"
        style={{
          background: `linear-gradient(135deg, ${COLORS.chocolat} 0%, #1a0f0a 50%, ${COLORS.chocolat} 100%)`,
        }}
      >
        {/* Formes géométriques décoratives */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          {/* Cercle décoratif en haut à gauche */}
          <div
            className="absolute -top-32 -left-32 w-64 h-64 rounded-full"
            style={{
              background: `radial-gradient(circle, ${COLORS.orange}15 0%, transparent 70%)`,
            }}
          />
          {/* Lueur orange subtile en bas à droite */}
          <div
            className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-[120px]"
            style={{ backgroundColor: `${COLORS.orange}10` }}
          />
          {/* Grille de points subtils */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, ${COLORS.sable}08 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Section titre avec badge */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
            <div className="space-y-2">
              {/* Badge de catégorie */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border" style={{ borderColor: `${COLORS.orange}40`, backgroundColor: `${COLORS.orange}10` }}>
                <Search className="w-3.5 h-3.5" style={{ color: COLORS.orange }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.sable }}>
                  Moteur de recherche
                </span>
              </div>
              {/* Titre principal */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight">
                Trouver votre bien
              </h1>
            </div>

            {/* Compteur de biens */}
            {!loading && (
              <div className="flex flex-col items-center md:items-end">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-bold text-white">
                      {totalCount}
                    </span>
                    <span className="text-sm font-medium" style={{ color: COLORS.sable }}>
                      bien{totalCount > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================== ZONE DE RECHERCHE UNIFIÉE ==================== */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-4">
            {/* Recherche rapide : Ville + Type + Budget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Ville */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ville ou quartier..."
                  value={appliedFilters.city}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    if (e.target.value.trim()) params.set('city', e.target.value.trim());
                    else params.delete('city');
                    setSearchParams(params);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>

              {/* Type de bien */}
              <div className="relative mt-2">
                <select
                  value={appliedFilters.propertyType}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    if (e.target.value) params.set('type', e.target.value);
                    else params.delete('type');
                    setSearchParams(params);
                  }}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                  }}
                  className="w-full pl-10 pr-10 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" style={{ backgroundColor: '#2C1810', color: 'white' }}>Tous les types</option>
                  <option value="apartment" style={{ backgroundColor: '#2C1810', color: 'white' }}>Appartement</option>
                  <option value="house" style={{ backgroundColor: '#2C1810', color: 'white' }}>Maison</option>
                  <option value="studio" style={{ backgroundColor: '#2C1810', color: 'white' }}>Studio</option>
                  <option value="villa" style={{ backgroundColor: '#2C1810', color: 'white' }}>Villa</option>
                  <option value="duplex" style={{ backgroundColor: '#2C1810', color: 'white' }}>Duplex</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
              </div>

              {/* Budget max */}
              <div className="relative">
                <input
                  type="number"
                  placeholder="Budget max (FCFA)"
                  value={appliedFilters.maxPrice}
                  onChange={(e) => {
                    const params = new URLSearchParams(searchParams);
                    if (e.target.value.trim()) params.set('maxPrice', e.target.value.trim());
                    else params.delete('maxPrice');
                    setSearchParams(params);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                />
              </div>
            </div>

            {/* Actions : Localisation rapide + Filtres avancés + Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Localisation rapide */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs font-medium text-white/70 whitespace-nowrap">Localisation :</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLocationMode('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      locationMode === 'all'
                        ? 'bg-white text-[#2C1810] shadow-md'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    Toute la Côte d'voire
                  </button>
                  <button
                    onClick={() => setLocationMode('abidjan')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      locationMode === 'abidjan'
                        ? 'bg-[#F16522] text-white shadow-md'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    Abidjan
                  </button>
                  <button
                    onClick={() => setLocationMode('outside_abidjan')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      locationMode === 'outside_abidjan'
                        ? 'bg-white text-[#2C1810] shadow-md'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    Hors Abidjan
                  </button>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center gap-2">
                {/* Toggle filtres avancés */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    showAdvancedFilters
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                </button>

                {/* Sauvegarder */}
                <button
                  type="button"
                  onClick={handleSaveSearch}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#F16522] text-white hover:bg-[#D95318] transition-all"
                >
                  <Bookmark className="w-4 h-4" />
                  Sauvegarder
                </button>

                {/* Réinitialiser */}
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            {/* Panneau de filtres avancés (collapsible) */}
            {showAdvancedFilters && (
              <div className="pt-4 border-t border-white/20">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {/* Prix min */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/70">Prix min (FCFA)</label>
                    <input
                      type="number"
                      placeholder="Min"
                      value={appliedFilters.minPrice}
                      onChange={(e) => {
                        const params = new URLSearchParams(searchParams);
                        if (e.target.value) params.set('minPrice', e.target.value);
                        else params.delete('minPrice');
                        setSearchParams(params);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>

                  {/* Chambres min */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/70">Chambres</label>
                    <select
                      value={appliedFilters.bedrooms}
                      onChange={(e) => {
                        const params = new URLSearchParams(searchParams);
                        if (e.target.value) params.set('bedrooms', e.target.value);
                        else params.delete('bedrooms');
                        setSearchParams(params);
                      }}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                      }}
                      className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
                    >
                      <option value="" style={{ backgroundColor: '#2C1810', color: 'white' }}>Toutes</option>
                      <option value="1" style={{ backgroundColor: '#2C1810', color: 'white' }}>1+</option>
                      <option value="2" style={{ backgroundColor: '#2C1810', color: 'white' }}>2+</option>
                      <option value="3" style={{ backgroundColor: '#2C1810', color: 'white' }}>3+</option>
                      <option value="4" style={{ backgroundColor: '#2C1810', color: 'white' }}>4+</option>
                    </select>
                  </div>

                  {/* Salles de bain min */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/70">S. de bain</label>
                    <select
                      value={appliedFilters.bathrooms}
                      onChange={(e) => {
                        const params = new URLSearchParams(searchParams);
                        if (e.target.value) params.set('bathrooms', e.target.value);
                        else params.delete('bathrooms');
                        setSearchParams(params);
                      }}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                      }}
                      className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
                    >
                      <option value="" style={{ backgroundColor: '#2C1810', color: 'white' }}>Toutes</option>
                      <option value="1" style={{ backgroundColor: '#2C1810', color: 'white' }}>1+</option>
                      <option value="2" style={{ backgroundColor: '#2C1810', color: 'white' }}>2+</option>
                      <option value="3" style={{ backgroundColor: '#2C1810', color: 'white' }}>3+</option>
                    </select>
                  </div>

                  {/* Surface min */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/70">Surface min (m²)</label>
                    <input
                      type="number"
                      placeholder="Min"
                      value={appliedFilters.minSurface}
                      onChange={(e) => {
                        const params = new URLSearchParams(searchParams);
                        if (e.target.value) params.set('minSurface', e.target.value);
                        else params.delete('minSurface');
                        setSearchParams(params);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>

                  {/* Surface max */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/70">Surface max (m²)</label>
                    <input
                      type="number"
                      placeholder="Max"
                      value={appliedFilters.maxSurface}
                      onChange={(e) => {
                        const params = new URLSearchParams(searchParams);
                        if (e.target.value) params.set('maxSurface', e.target.value);
                        else params.delete('maxSurface');
                        setSearchParams(params);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>

                  {/* Meublé */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/70">Meublé</label>
                    <select
                      value={appliedFilters.furnished}
                      onChange={(e) => {
                        const params = new URLSearchParams(searchParams);
                        if (e.target.value) params.set('furnished', e.target.value);
                        else params.delete('furnished');
                        setSearchParams(params);
                      }}
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'white',
                      }}
                      className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
                    >
                      <option value="" style={{ backgroundColor: '#2C1810', color: 'white' }}>Tous</option>
                      <option value="true" style={{ backgroundColor: '#2C1810', color: 'white' }}>Oui</option>
                      <option value="false" style={{ backgroundColor: '#2C1810', color: 'white' }}>Non</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Séparateur courbe */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            className="w-full h-12"
            viewBox="0 0 1440 48"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M0 48V24C240 40 480 48 720 48C960 48 1200 40 1440 24V48H0Z"
              fill={COLORS.creme}
            />
          </svg>
        </div>
      </header>

      {/* ==================== CONTENU PRINCIPAL ==================== */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Barre d'outils (Tri & Vue) - Espacement réduit */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-5">
          <div className="flex items-center gap-2 text-sm" style={{ color: COLORS.grisTexte }}>
            {activeView === 'map' ? (
              <>
                <span className="font-bold" style={{ color: COLORS.chocolat }}>
                  {geolocatedCount}
                </span>{' '}
                bien{geolocatedCount > 1 ? 's' : ''} sur la carte
                {nonGeolocatedCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    +{nonGeolocatedCount} non géolocalisé{nonGeolocatedCount > 1 ? 's' : ''}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="font-bold" style={{ color: COLORS.chocolat }}>
                  {properties.length}
                </span>{' '}
                bien{properties.length > 1 ? 's' : ''} trouvé{properties.length > 1 ? 's' : ''}
                {nonGeolocatedCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    ({nonGeolocatedCount} sans localisation)
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Tri */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'price_asc' | 'price_desc')}
                className="appearance-none pl-9 pr-8 py-2.5 rounded-full text-sm bg-white border cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                style={{ borderColor: COLORS.border, color: COLORS.grisTexte }}
              >
                <option value="recent">Les plus récents</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
              </select>
              <ArrowUpDown
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: COLORS.grisNeutre }}
              />
            </div>

            {/* Toggle Vue - Amélioré avec labels */}
            <div
              className="bg-white border rounded-full p-1.5 flex items-center gap-1"
              style={{ borderColor: COLORS.border }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveView('list');
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all text-sm font-medium ${
                  activeView === 'list' ? 'text-white shadow-md' : 'hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: activeView === 'list' ? COLORS.chocolat : 'transparent',
                  color: activeView === 'list' ? 'white' : COLORS.grisNeutre,
                }}
              >
                <List className="w-4 h-4" />
                <span>Liste</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView('map');
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full transition-all text-sm font-medium ${
                  activeView === 'map' ? 'text-white shadow-md' : 'hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: activeView === 'map' ? COLORS.chocolat : 'transparent',
                  color: activeView === 'map' ? 'white' : COLORS.grisNeutre,
                }}
              >
                <MapIcon className="w-4 h-4" />
                <span>Carte</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-neutral-900 mb-1">Erreur</h3>
              <p className="text-neutral-700">{displayError}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* CONTENU (Liste ou Carte) */}
        <div className="flex gap-4 md:gap-8 items-start">
          {/* GRILLE DES BIENS - cachée en mode carte */}
          <div className={`flex-1 ${activeView === 'map' ? 'hidden' : ''}`}>
            {loading ? (
              /* Loading skeleton Premium */
              <div
                className={`grid gap-6 ${activeView === 'map' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
              >
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-[20px] h-[420px] animate-pulse border"
                    style={{ borderColor: COLORS.border }}
                  />
                ))}
              </div>
            ) : currentProperties.length === 0 && properties.length > 0 ? (
              /* Page vide (pagination) */
              <div className="text-center py-16">
                <p className="text-lg" style={{ color: COLORS.grisTexte }}>
                  Cette page ne contient aucune propriété.
                </p>
              </div>
            ) : properties.length === 0 ? (
                /* Empty state Premium avec détail des filtres */
                <div className="text-center py-16 md:py-24">
                  <div className="relative inline-block mb-8">
                    <div
                      className="absolute inset-0 rounded-full blur-2xl animate-pulse"
                      style={{ backgroundColor: `${COLORS.orange}33` }}
                    />
                    <div
                      className="relative rounded-full w-28 h-28 flex items-center justify-center border"
                      style={{ backgroundColor: COLORS.creme, borderColor: COLORS.border }}
                    >
                      <Filter className="h-12 w-12" style={{ color: COLORS.grisNeutre }} />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3" style={{ color: COLORS.chocolat }}>
                    Aucune propriété trouvée
                  </h3>

                  {/* Afficher les filtres actifs */}
                  {activeFiltersCount > 0 && (
                    <div className="mb-6 max-w-md mx-auto">
                      <p className="text-sm mb-3" style={{ color: COLORS.grisTexte }}>
                        Filtres appliqués :
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {appliedFilters.city && (
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${COLORS.orange}15`, color: COLORS.orange }}
                          >
                            <MapPin className="w-3 h-3" />
                            {appliedFilters.city}
                          </span>
                        )}
                        {appliedFilters.propertyType && (
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${COLORS.orange}15`, color: COLORS.orange }}
                          >
                            <HomeIcon className="w-3 h-3" />
                            {appliedFilters.propertyType}
                          </span>
                        )}
                        {appliedFilters.maxPrice && (
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${COLORS.orange}15`, color: COLORS.orange }}
                          >
                            <Banknote className="w-3 h-3" />
                            Max {parseInt(appliedFilters.maxPrice).toLocaleString('fr-FR')} FCFA
                          </span>
                        )}
                        {appliedFilters.bedrooms && (
                          <span
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${COLORS.orange}15`, color: COLORS.orange }}
                          >
                            <Bed className="w-3 h-3" />
                            {appliedFilters.bedrooms}+ ch.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="mb-8 max-w-md mx-auto" style={{ color: COLORS.grisTexte }}>
                    {activeFiltersCount > 0
                      ? "Aucun bien ne correspond à ces critères. Essayez d'élargir votre recherche."
                      : 'Aucun bien disponible pour le moment. Revenez bientôt !'}
                  </p>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all hover:opacity-90"
                      style={{ backgroundColor: COLORS.orange }}
                    >
                      <X className="h-5 w-5" />
                      Réinitialiser les filtres
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Properties Grid Premium Ivorian */}
                  <div
                    className={`grid gap-6 ${activeView === 'map' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
                  >
                    {currentProperties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        onHover={() => prefetchProperties([property.id])}
                        formatPrice={formatPrice}
                        colors={COLORS}
                        onShare={handlePropertyShare}
                      />
                    ))}
                  </div>

                  {/* Contrôles de pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex flex-col items-center gap-4">
                      {/* Info de pagination */}
                      <p className="text-sm" style={{ color: COLORS.grisTexte }}>
                        Affichage de {startIndex + 1}-{Math.min(endIndex, properties.length)} sur {properties.length} propriétés
                      </p>

                      {/* Boutons de navigation */}
                      <div className="flex items-center gap-2">
                        {/* Bouton précédent */}
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 rounded-lg border font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          style={{ borderColor: COLORS.border, color: COLORS.chocolat }}
                        >
                          ← Précédent
                        </button>

                        {/* Numéros de page */}
                        <div className="flex items-center gap-1">
                          {/* Afficher les pages autour de la page actuelle */}
                          {(() => {
                            const pages = [];
                            const maxVisiblePages = 5;
                            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                            const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                            // Ajuster startPage si on est proche de la fin
                            if (endPage - startPage < maxVisiblePages - 1) {
                              startPage = Math.max(1, endPage - maxVisiblePages + 1);
                            }

                            // Première page et points de suspension si nécessaire
                            if (startPage > 1) {
                              pages.push(
                                <button
                                  key={1}
                                  onClick={() => setCurrentPage(1)}
                                  className="w-10 h-10 rounded-lg font-medium transition-all hover:bg-gray-50"
                                  style={{
                                    backgroundColor: 1 === currentPage ? COLORS.chocolat : 'transparent',
                                    color: 1 === currentPage ? 'white' : COLORS.chocolat,
                                    border: 1 === currentPage ? 'none' : `1px solid ${COLORS.border}`,
                                  }}
                                >
                                  1
                                </button>
                              );
                              if (startPage > 2) {
                                pages.push(<span key="ellipsis-start" className="px-2" style={{ color: COLORS.grisNeutre }}>...</span>);
                              }
                            }

                            // Pages visibles
                            for (let i = startPage; i <= endPage; i++) {
                              pages.push(
                                <button
                                  key={i}
                                  onClick={() => setCurrentPage(i)}
                                  className="w-10 h-10 rounded-lg font-medium transition-all hover:bg-gray-50"
                                  style={{
                                    backgroundColor: i === currentPage ? COLORS.chocolat : 'transparent',
                                    color: i === currentPage ? 'white' : COLORS.chocolat,
                                    border: i === currentPage ? 'none' : `1px solid ${COLORS.border}`,
                                  }}
                                >
                                  {i}
                                </button>
                              );
                            }

                            // Dernière page et points de suspension si nécessaire
                            if (endPage < totalPages) {
                              if (endPage < totalPages - 1) {
                                pages.push(<span key="ellipsis-end" className="px-2" style={{ color: COLORS.grisNeutre }}>...</span>);
                              }
                              pages.push(
                                <button
                                  key={totalPages}
                                  onClick={() => setCurrentPage(totalPages)}
                                  className="w-10 h-10 rounded-lg font-medium transition-all hover:bg-gray-50"
                                  style={{
                                    backgroundColor: totalPages === currentPage ? COLORS.chocolat : 'transparent',
                                    color: totalPages === currentPage ? 'white' : COLORS.chocolat,
                                    border: totalPages === currentPage ? 'none' : `1px solid ${COLORS.border}`,
                                  }}
                                >
                                  {totalPages}
                                </button>
                              );
                            }

                            return pages;
                          })()}
                        </div>

                        {/* Bouton suivant */}
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 rounded-lg border font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          style={{ borderColor: COLORS.border, color: COLORS.chocolat }}
                        >
                          Suivant →
                        </button>
                      </div>

                      {/* Sélecteur de page rapide */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: COLORS.grisTexte }}>Aller à la page :</span>
                        <select
                          value={currentPage}
                          onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                          className="px-3 py-1.5 rounded-lg border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          style={{ borderColor: COLORS.border, color: COLORS.chocolat }}
                        >
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <option key={page} value={page}>
                              Page {page}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </>
              )}
          </div>

          {/* MAP (Visible seulement si mode Carte activé) */}
          {activeView === 'map' && (
            <div className="block w-full h-[50vh] md:h-[70vh] lg:h-[800px]">
              <div
                className="w-full h-full rounded-[24px] overflow-hidden shadow-inner border relative"
                style={{ borderColor: COLORS.border }}
              >
                {/* Map counter badge - shows geolocated properties count */}
                {geolocatedCount > 0 && (
                  <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-2 border" style={{ borderColor: COLORS.border }}>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" style={{ color: COLORS.orange }} />
                      <span className="font-bold" style={{ color: COLORS.chocolat }}>
                        {geolocatedCount}
                      </span>
                      <span style={{ color: COLORS.grisTexte }}>
                        bien{geolocatedCount > 1 ? 's' : ''} sur la carte
                      </span>
                      {nonGeolocatedCount > 0 && (
                        <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          +{nonGeolocatedCount} non géolocalisé{nonGeolocatedCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {geolocatedCount > 0 ? (
                  <MapWrapper
                    properties={geolocatedProperties as unknown[]}
                    height="100%"
                    fitBounds={properties.length > 0}
                    onMarkerClick={(property: { id: string }) => {
                      navigate(`/proprietes/${property.id}`);
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center"
                    style={{ backgroundColor: '#E5E5E5' }}
                  >
                    <div className="bg-white p-6 rounded-2xl shadow-xl text-center max-w-xs">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                        style={{ backgroundColor: `${COLORS.orange}1A` }}
                      >
                        <MapIcon className="w-6 h-6" style={{ color: COLORS.orange }} />
                      </div>
                      <h3 className="font-bold mb-2" style={{ color: COLORS.chocolat }}>
                        Carte Interactive
                      </h3>
                      <p className="text-sm" style={{ color: COLORS.grisTexte }}>
                        Aucune propriété géolocalisée disponible pour le moment.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vue carte mobile */}
        {activeView === 'map' && (
          <div className="lg:hidden space-y-4 md:space-y-6">
            <div
              className="h-[40vh] md:h-[50vh] rounded-2xl overflow-hidden shadow-lg border relative"
              style={{ borderColor: COLORS.border }}
            >
              {/* Map counter badge - mobile */}
              {geolocatedCount > 0 && (
                <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3 py-1.5 border" style={{ borderColor: COLORS.border }}>
                  <div className="flex items-center gap-1.5 text-xs">
                    <MapPin className="w-3.5 h-3.5" style={{ color: COLORS.orange }} />
                    <span className="font-bold" style={{ color: COLORS.chocolat }}>
                      {geolocatedCount}
                    </span>
                    <span style={{ color: COLORS.grisTexte }}>
                      bien{geolocatedCount > 1 ? 's' : ''} sur la carte
                    </span>
                    {nonGeolocatedCount > 0 && (
                      <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                        +{nonGeolocatedCount} non géo.
                      </span>
                    )}
                  </div>
                </div>
              )}
              {geolocatedCount > 0 ? (
                <MapWrapper
                  properties={geolocatedProperties as unknown[]}
                  height="100%"
                  fitBounds={properties.length > 0}
                  onMarkerClick={(property: { id: string }) => {
                    navigate(`/proprietes/${property.id}`);
                  }}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: '#E5E5E5' }}
                >
                  <div className="text-center">
                    <MapIcon
                      className="w-12 h-12 mx-auto mb-3"
                      style={{ color: COLORS.grisNeutre }}
                    />
                    <p style={{ color: COLORS.grisTexte }}>Aucune propriété géolocalisée</p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile property cards */}
            {!loading && currentProperties.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.chocolat }}>
                  À proximité (Page {currentPage})
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {currentProperties.slice(0, 4).map((property) => (
                    <article
                      key={property.id}
                      onClick={() => navigate(`/proprietes/${property.id}`)}
                      className="bg-white rounded-xl flex gap-4 p-4 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                      style={{ borderColor: COLORS.border }}
                    >
                      <img
                        src={
                          (Array.isArray(property.images) && typeof property.images[0] === 'string' ? property.images[0] : null) ||
                          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400'
                        }
                        alt={property.title || 'Propriété'}
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {/* Type de propriété */}
                          <span
                            className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full capitalize"
                            style={{ backgroundColor: `${COLORS.orange}1A`, color: COLORS.orange }}
                          >
                            {property.property_type}
                          </span>

                          {/* Badge de statut */}
                          {(() => {
                            const statusConfig = (() => {
                              const status = property.status?.toLowerCase();
                              if (!status) return null;
                              const normalizedStatus = status;
                              const configs: Record<string, { label: string; className: string }> = {
                                available: { label: 'Disponible', className: 'bg-green-100 text-green-700' },
                                rented: { label: 'Louée', className: 'bg-blue-100 text-blue-700' },
                                pending: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
                                unavailable: { label: 'Indisponible', className: 'bg-gray-100 text-gray-700' },
                                maintenance: { label: 'Maintenance', className: 'bg-red-100 text-red-700' },
                                inactive: { label: 'Inactif', className: 'bg-gray-100 text-gray-700' },
                              };
                              return configs[normalizedStatus] || null;
                            })();
                            return statusConfig ? (
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusConfig.className}`}>
                                {statusConfig.label}
                              </span>
                            ) : null;
                          })()}

                          {/* Badge Certifié ANSUT */}
                          {property.ansut_verified && (
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                              ✓ Certifié ANSUT
                            </span>
                          )}
                        </div>
                        <h4
                          className="font-semibold text-sm mb-1 line-clamp-1"
                          style={{ color: COLORS.chocolat }}
                        >
                          {property.title || 'Propriété'}
                        </h4>
                        <p
                          className="text-xs mb-2 flex items-center gap-1"
                          style={{ color: COLORS.grisTexte }}
                        >
                          <MapPin className="h-3 w-3" style={{ color: COLORS.orange }} />
                          {property.city} {property.neighborhood && `• ${property.neighborhood}`}
                        </p>
                        <p className="text-sm font-bold" style={{ color: COLORS.orange }}>
                          {formatPrice(property.price)} FCFA/mois
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
                {currentProperties.length > 4 && (
                  <button
                    onClick={() => setActiveView('list')}
                    className="w-full mt-4 py-3 font-semibold border-2 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ color: COLORS.orange, borderColor: COLORS.orange }}
                  >
                    Voir toutes les propriétés ({properties.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Save Search Dialog */}
      <SaveSearchDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveSearchSubmit}
        currentFilters={appliedFilters}
      />

      {/* Share Dialog */}
      <ShareDialogComponent />
    </div>
  );
}
