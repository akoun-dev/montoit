import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Building2, Home, Loader2, ArrowRight, Warehouse, Tent } from 'lucide-react';
import MapWrapper from '@/shared/ui/MapWrapper';
import { useHomeMapProperties } from '../hooks/useHomeMapProperties';

// --- CONFIGURATION PREMIUM ---

const PROPERTY_TYPES = [
  { value: 'all', label: 'Tout', icon: MapPin },
  { value: 'apartment', label: 'Appartements', icon: Building2 },
  { value: 'villa', label: 'Villas', icon: Home },
  { value: 'studio', label: 'Studios', icon: Tent },
  { value: 'retail', label: 'Bureaux', icon: Warehouse },
];

const BUDGET_OPTIONS = [
  { value: 0, label: 'Budget Max' },
  { value: 150000, label: '< 150k' },
  { value: 300000, label: '< 300k' },
  { value: 500000, label: '< 500k' },
  { value: 1000000, label: '< 1M' },
];

const CUSTOM_BUDGET_VALUE = 'custom';

export default function HomeMapSection() {
  const navigate = useNavigate();
  const { properties, loading, totalCount, fetchInitialProperties } = useHomeMapProperties();

  const [filters, setFilters] = useState({
    propertyType: 'all',
    maxPrice: 0,
  });
  const [budgetMode, setBudgetMode] = useState<'preset' | 'custom'>('preset');
  const [customMaxPrice, setCustomMaxPrice] = useState('');

  // Charger les propriétés initiales
  useEffect(() => {
    fetchInitialProperties({
      propertyType: filters.propertyType,
      maxPrice: filters.maxPrice || undefined,
    });
  }, [fetchInitialProperties, filters.propertyType, filters.maxPrice]);

  // Gérer le clic sur un marqueur
  const handleMarkerClick = useCallback(
    (property: { id: string }) => {
      navigate(`/proprietes/${property.id}`);
    },
    [navigate]
  );

  // Transformer les propriétés pour MapboxMap
  const mapProperties = properties.map((p) => ({
    id: p.id,
    title: p.title,
    latitude: p.latitude,
    longitude: p.longitude,
    monthly_rent: p.monthly_rent,
    property_type: p.property_type,
    city: p.city,
    neighborhood: p.neighborhood ?? undefined,
    main_image: p.main_image ?? undefined,
    bedrooms: p.bedrooms ?? undefined,
    surface_area: p.surface_area ?? undefined,
    status: p.status ?? undefined,
  }));

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-[#FAF7F4] relative overflow-hidden">
      {/* Background Decor - Blob Orange */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-[#F16522]/5 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] bg-[#2C1810]/5 rounded-full blur-[60px] sm:blur-[80px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* --- HEADER SECTION PREMIUM --- */}
        <div className="text-center mb-8 sm:mb-10 space-y-3 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-[#2C1810]/5 text-[#2C1810] text-[10px] sm:text-xs font-bold uppercase tracking-wider border border-[#2C1810]/10">
            <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#F16522]" />
            Cartographie Interactive
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#2C1810] leading-tight px-4">
            Explorez Abidjan <span className="text-[#F16522]">quartier par quartier</span>
          </h2>
          <p className="text-[#6B5A4E] max-w-2xl mx-auto text-sm sm:text-lg px-4">
            Naviguez sur la carte pour dénicher les biens disponibles autour de vos lieux préférés
          </p>
        </div>

        {/* --- BARRE DE FILTRES PREMIUM --- */}
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 bg-white p-3 sm:p-4 md:p-5 rounded-[12px] sm:rounded-[16px] md:rounded-[20px] shadow-sm border border-[#EFEBE9] max-w-5xl mx-auto">
          {/* Types (Chips Scrollables) - Toujours horizontal */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-1.5">
            {PROPERTY_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = filters.propertyType === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setFilters((f) => ({ ...f, propertyType: type.value }))}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 md:px-4 py-2 min-h-[44px] rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'bg-[#2C1810] text-white shadow-md sm:shadow-lg shadow-[#2C1810]/20'
                      : 'bg-[#FAF7F4] text-[#6B5A4E] hover:bg-[#EFEBE9]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F16522]' : 'text-[#A69B95]'}`} />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>

          <div className="h-px bg-[#EFEBE9] w-full" />

          {/* Budget (Select) - Row sur mobile */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <label className="text-xs sm:text-sm font-semibold text-[#6B5A4E] whitespace-nowrap flex items-center gap-2">
              <span>Budget max :</span>
            </label>
            <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3 min-w-0">
              <select
                value={budgetMode === 'custom' ? CUSTOM_BUDGET_VALUE : String(filters.maxPrice)}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === CUSTOM_BUDGET_VALUE) {
                    setBudgetMode('custom');
                    const parsed = Number(customMaxPrice || 0);
                    setFilters((f) => ({ ...f, maxPrice: Number.isFinite(parsed) ? parsed : 0 }));
                    return;
                  }
                  setBudgetMode('preset');
                  const parsed = Number(value);
                  setFilters((f) => ({ ...f, maxPrice: Number.isFinite(parsed) ? parsed : 0 }));
                }}
                className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 bg-[#FAF7F4] border border-[#EFEBE9] rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-[#2C1810] focus:ring-2 focus:ring-[#F16522]/20 focus:bg-white focus:border-[#F16522]/40 transition-all outline-none cursor-pointer"
              >
                {BUDGET_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value={CUSTOM_BUDGET_VALUE}>Personnalisé...</option>
              </select>
              {budgetMode === 'custom' && (
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={customMaxPrice}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomMaxPrice(value);
                    const parsed = Number(value || 0);
                    setFilters((f) => ({ ...f, maxPrice: Number.isFinite(parsed) ? parsed : 0 }));
                  }}
                  placeholder="Ex: 75 000"
                  className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 bg-white border border-[#EFEBE9] rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-[#2C1810] focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522]/40 transition-all outline-none"
                />
              )}
            </div>
          </div>
        </div>

        {/* --- CARTE PREMIUM --- */}
        <div className="relative h-[50vh] sm:h-[55vh] md:h-[60vh] lg:h-[600px] min-h-[320px] sm:min-h-[350px] rounded-[12px] sm:rounded-[16px] md:rounded-[20px] overflow-hidden shadow-2xl border border-white ring-1 ring-[#EFEBE9]">
          {/* Map Component */}
          <MapWrapper
            center={[-3.9962, 5.36]}
            zoom={11}
            properties={mapProperties}
            height="100%"
            onMarkerClick={handleMarkerClick}
          />

          {/* Loading Overlay Subtil */}
          {loading && (
            <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px] flex items-center justify-center z-10">
              <div className="bg-white p-4 rounded-full shadow-xl animate-bounce">
                <Loader2 className="w-6 h-6 text-[#F16522] animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* --- FOOTER STATS PREMIUM --- */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-[#6B5A4E]">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-sm border border-[#EFEBE9]">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs sm:text-sm">
              <strong className="text-[#2C1810]">{totalCount}</strong> bien{totalCount !== 1 ? 's' : ''} sur la carte
            </span>
          </div>
          <button
            onClick={() => navigate('/recherche')}
            className="flex items-center gap-1.5 sm:gap-2 font-bold text-[#F16522] hover:text-[#D95318] hover:underline transition-colors"
          >
            <span>Voir la liste</span>
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
