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
  Bed,
  Bath,
  Maximize,
  Heart,
  ArrowUpDown,
  Banknote,
  Loader2,
  Filter,
  Bookmark,
} from 'lucide-react';
import Breadcrumb from '@/shared/components/navigation/Breadcrumb';
import MapWrapper from '@/shared/ui/MapWrapper';
import { ScoreBadge } from '@/shared/ui/ScoreBadge';
import InfiniteScroll from '@/shared/components/InfiniteScroll';
import { useInfiniteProperties } from '../../hooks/tenant/useInfiniteProperties';
import { useSaveSearch } from '../../hooks/tenant/useSaveSearch';
import { usePrefetchProperties } from '@/shared/hooks/usePrefetchProperty';
import SaveSearchDialog from '../../features/tenant/components/SaveSearchDialog';
import UnifiedSearchBar from '@/shared/ui/UnifiedSearchBar';

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

  // State for view mode
  const [activeView, setActiveView] = useState<'list' | 'map'>('map');
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc'>('recent');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Applied filters (synced with URL params)
  const [appliedFilters, setAppliedFilters] = useState({
    city: searchParams.get('city') || '',
    propertyType: searchParams.get('type') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms: searchParams.get('bedrooms') || '',
  });

  // Save search hook
  const { saveSearch, isAuthenticated } = useSaveSearch();

  // Prefetch properties hook
  const { prefetchProperties } = usePrefetchProperties();

  // Infinite scroll hook with sorting - ANSUT certified only
  const {
    properties,
    loading,
    loadingMore,
    error: queryError,
    hasMore,
    loadMore,
    totalCount,
  } = useInfiniteProperties({ ...appliedFilters, sortBy, pageSize: 99999, ansutVerifiedOnly: true });

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

  const activeFiltersCount = [
    appliedFilters.city,
    appliedFilters.propertyType,
    appliedFilters.minPrice,
    appliedFilters.maxPrice,
    appliedFilters.bedrooms,
  ].filter(Boolean).length;

  const displayError = error || queryError;
  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.creme }}>
      {/* ==================== HEADER AVEC DÉGRADÉ ALLÉGÉ ==================== */}
      <header
        className="relative overflow-hidden pb-8 pt-20 md:pt-24 px-4"
        style={{
          background: `linear-gradient(to bottom, ${COLORS.chocolat} 0%, #3D2518 100%)`,
        }}
      >
        {/* Texture de fond subtile plus légère */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Lueur d'ambiance orange */}
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#F16522]/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Breadcrumb items={[{ label: 'Recherche' }]} className="text-white/60" />
          </div>

          {/* Header Content - Plus compact */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1" style={{ color: COLORS.orange }}>
                <Search className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Moteur de recherche
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Trouver un bien</h1>
            </div>

            {!loading && (
              <div
                className="hidden md:flex items-center gap-2 text-sm"
                style={{ color: COLORS.sable }}
              >
                <span className="font-bold text-white">{totalCount}</span> biens disponibles
              </div>
            )}
          </div>

          {/* ==================== BARRE DE RECHERCHE UNIFIÉE ==================== */}
          <div className="mb-4">
            <UnifiedSearchBar
              variant="page"
              initialFilters={{
                city: appliedFilters.city,
                propertyType: appliedFilters.propertyType,
                maxBudget: appliedFilters.maxPrice,
              }}
              onSearch={(filters) => {
                const params = new URLSearchParams();
                if (filters.city?.trim()) params.set('city', filters.city.trim());
                if (filters.propertyType?.trim()) params.set('type', filters.propertyType.trim());
                if (filters.maxBudget?.trim()) params.set('maxPrice', filters.maxBudget.trim());
                // Explicitly clear minPrice and bedrooms when using UnifiedSearchBar
                // to avoid conflicts with maxPrice filter
                params.delete('minPrice');
                params.delete('bedrooms');
                setSearchParams(params);
              }}
            />
          </div>

          {/* Actions rapides */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Bouton Sauvegarder */}
            <button
              type="button"
              onClick={handleSaveSearch}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full h-9 px-4 text-xs font-medium hover:bg-white/20 transition-all"
              style={{ color: COLORS.sable }}
            >
              <Bookmark className="w-3 h-3" /> Sauvegarder la recherche
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs font-medium hover:text-white transition-colors"
                style={{ color: COLORS.orange }}
              >
                <X className="w-3 h-3" />
                Réinitialiser ({activeFiltersCount})
              </button>
            )}
          </div>
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
                <span className="hidden sm:inline">Liste</span>
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
                <span className="hidden sm:inline">Carte</span>
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
        <div className="flex gap-8 items-start">
          {/* GRILLE DES BIENS - cachée en mode carte */}
          <div className={`flex-1 ${activeView === 'map' ? 'hidden' : ''}`}>
            <InfiniteScroll
              onLoadMore={loadMore}
              hasMore={hasMore}
              loading={loadingMore}
              threshold={300}
              loader={
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLORS.orange }} />
                  <span className="ml-3" style={{ color: COLORS.grisTexte }}>
                    Chargement...
                  </span>
                </div>
              }
              endMessage={
                properties.length > 0 ? (
                  <div
                    className="flex justify-center items-center py-8"
                    style={{ color: COLORS.grisNeutre }}
                  >
                    <span>Vous avez vu toutes les propriétés disponibles</span>
                  </div>
                ) : null
              }
            >
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
                /* Properties Grid Premium Ivorian */
                <div
                  className={`grid gap-6 ${activeView === 'map' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
                >
                  {properties.map((property) => (
                    <article
                      key={property.id}
                      onClick={() => navigate(`/proprietes/${property.id}`)}
                      className="group bg-white rounded-[20px] overflow-hidden border hover:shadow-[0_20px_40px_rgba(44,24,16,0.08)] transition-all duration-300 cursor-pointer"
                      style={{
                        borderColor: COLORS.border,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = `${COLORS.orange}4D`;
                        // Prefetch property details on hover for faster navigation
                        prefetchProperties([property.id]);
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = COLORS.border;
                      }}
                    >
                      {/* Image Container */}
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={
                            property.images?.[0] ||
                            'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
                          }
                          alt={property.title || 'Propriété'}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src =
                              'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800';
                          }}
                        />

                        {/* Badges Flottants */}
                        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                          {/* Badge de statut */}
                          {(() => {
                            const statusConfig = (() => {
                              const status = property.status?.toLowerCase();
                              if (!status) return null;
                              const configs: Record<string, { label: string; className: string }> = {
                                disponible: { label: 'Disponible', className: 'bg-green-500/90 text-white' },
                                louee: { label: 'Louée', className: 'bg-blue-500/90 text-white' },
                                en_attente: { label: 'En attente', className: 'bg-amber-500/90 text-white' },
                                reservee: { label: 'Réservée', className: 'bg-purple-500/90 text-white' },
                                indisponible: { label: 'Indisponible', className: 'bg-gray-500/90 text-white' },
                                maintenance: { label: 'Maintenance', className: 'bg-red-500/90 text-white' },
                              };
                              return configs[status] || null;
                            })();
                            return statusConfig ? (
                              <span className={`${statusConfig.className} text-[10px] font-bold px-2 py-1 rounded-md uppercase shadow-sm backdrop-blur-sm`}>
                                {statusConfig.label}
                              </span>
                            ) : null;
                          })()}

                          {/* Badge Certifié ANSUT */}
                          {property.ansut_verified && (
                            <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase shadow-sm backdrop-blur-sm flex items-center gap-1">
                              <span>✓</span>
                              <span>Certifié ANSUT</span>
                            </span>
                          )}
                        </div>

                        {/* Bouton Favori */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Add to favorites
                          }}
                          className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white transition-colors group/fav"
                          aria-label="Ajouter aux favoris"
                        >
                          <Heart className="w-4 h-4 group-hover/fav:text-red-500 transition-colors" />
                        </button>

                        {/* Prix Overlay */}
                        <div className="absolute bottom-3 left-3">
                          <div
                            className="backdrop-blur-sm text-white px-3 py-1.5 rounded-lg shadow-lg"
                            style={{ backgroundColor: `${COLORS.chocolat}E6` }}
                          >
                            <span className="font-bold text-lg">{formatPrice(property.price)}</span>
                            <span className="text-[10px] opacity-80 ml-1">FCFA/mois</span>
                          </div>
                        </div>
                      </div>

                      {/* Infos */}
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p
                              className="text-[10px] font-bold uppercase mb-1"
                              style={{ color: COLORS.grisNeutre }}
                            >
                              {property.property_type || 'Bien immobilier'}
                            </p>
                            <h3
                              className="font-bold text-lg leading-tight transition-colors line-clamp-1"
                              style={{ color: COLORS.chocolat }}
                            >
                              {property.title || 'Propriété sans titre'}
                            </h3>
                          </div>
                          {property.owner_trust_score != null && (
                            <ScoreBadge
                              score={property.owner_trust_score}
                              size="sm"
                              variant="compact"
                            />
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1.5 text-sm mb-4"
                          style={{ color: COLORS.grisTexte }}
                        >
                          <MapPin className="w-3.5 h-3.5" style={{ color: COLORS.orange }} />
                          {property.neighborhood ? `${property.neighborhood}, ` : ''}
                          {property.city || 'Non spécifié'}
                        </div>

                        {/* Features */}
                        <div
                          className="flex items-center gap-4 pt-4 border-t text-xs font-medium"
                          style={{ borderColor: COLORS.border, color: COLORS.grisNeutre }}
                        >
                          {property.bedrooms && (
                            <div className="flex items-center gap-1.5">
                              <Bed className="w-4 h-4" style={{ color: COLORS.orange }} />{' '}
                              {property.bedrooms} ch.
                            </div>
                          )}
                          {property.bathrooms && (
                            <div className="flex items-center gap-1.5">
                              <Bath className="w-4 h-4" style={{ color: COLORS.orange }} />{' '}
                              {property.bathrooms} sdb
                            </div>
                          )}
                          {property.surface_area && (
                            <div className="flex items-center gap-1.5">
                              <Maximize className="w-4 h-4" style={{ color: COLORS.orange }} />{' '}
                              {property.surface_area} m²
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </InfiniteScroll>
          </div>

          {/* MAP (Visible seulement si mode Carte activé) */}
          {activeView === 'map' && (
            <div className="block w-full h-[800px]">
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
          <div className="lg:hidden space-y-6">
            <div
              className="h-[400px] rounded-2xl overflow-hidden shadow-lg border relative"
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
            {!loading && properties.length > 0 && (
              <div>
                <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.chocolat }}>
                  À proximité
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {properties.slice(0, 4).map((property) => (
                    <article
                      key={property.id}
                      onClick={() => navigate(`/proprietes/${property.id}`)}
                      className="bg-white rounded-xl flex gap-4 p-4 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                      style={{ borderColor: COLORS.border }}
                    >
                      <img
                        src={
                          property.images?.[0] ||
                          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400'
                        }
                        alt={property.title || 'Propriété'}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
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
                              const configs: Record<string, { label: string; className: string }> = {
                                disponible: { label: 'Disponible', className: 'bg-green-100 text-green-700' },
                                louee: { label: 'Louée', className: 'bg-blue-100 text-blue-700' },
                                en_attente: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
                                reservee: { label: 'Réservée', className: 'bg-purple-100 text-purple-700' },
                                indisponible: { label: 'Indisponible', className: 'bg-gray-100 text-gray-700' },
                                maintenance: { label: 'Maintenance', className: 'bg-red-100 text-red-700' },
                              };
                              return configs[status] || null;
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
                {properties.length > 4 && (
                  <button
                    onClick={() => setActiveView('list')}
                    className="w-full mt-4 py-3 font-semibold border-2 rounded-xl hover:opacity-90 transition-opacity"
                    style={{ color: COLORS.orange, borderColor: COLORS.orange }}
                  >
                    Voir les {totalCount} propriétés
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
    </div>
  );
}
