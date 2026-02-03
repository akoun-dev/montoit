import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Home, Wallet, X, Sparkles, TrendingUp } from 'lucide-react';
import { RESIDENTIAL_PROPERTY_TYPES } from '@/shared/lib/constants/app.constants';
import { ABIDJAN_NEIGHBORHOODS, CITY_NAMES } from '@/shared/data/cities';
import { CITY_COORDINATES } from '@/shared/data/cityCoordinates';

interface UnifiedSearchBarProps {
  variant?: 'hero' | 'page';
  onSearch?: (filters: {
    city: string;
    propertyType: string;
    maxBudget: string;
  }) => void;
  initialFilters?: {
    city?: string;
    propertyType?: string;
    maxBudget?: string;
  };
}

export default function UnifiedSearchBar({
  variant = 'hero',
  onSearch,
  initialFilters,
}: UnifiedSearchBarProps) {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState(initialFilters?.propertyType || '');
  const [city, setCity] = useState(initialFilters?.city || '');
  const [maxBudget, setMaxBudget] = useState(initialFilters?.maxBudget || '');
  const [customBudget, setCustomBudget] = useState('');
  const [showCustomBudgetInput, setShowCustomBudgetInput] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync with URL params
  useEffect(() => {
    if (initialFilters) {
      setPropertyType(initialFilters.propertyType || '');
      setCity(initialFilters.city || '');
      const budget = initialFilters.maxBudget || '';
      setMaxBudget(budget);
      // Check if the budget is a custom value (not one of the preset values)
      const presetValues = ['150000', '300000', '500000'];
      if (budget && !presetValues.includes(budget)) {
        setCustomBudget(budget);
        setShowCustomBudgetInput(true);
      }
    }
  }, [initialFilters]);

  // Popular searches
  const popularSearches = [
    { label: 'Appartement Cocody', type: 'appartement', city: 'Cocody', icon: Home },
    { label: 'Studio Plateau', type: 'studio', city: 'Plateau', icon: Home },
    { label: 'Villa Abidjan < 300k', type: '', city: 'Abidjan', budget: '300000', icon: TrendingUp },
  ];

  const quickFilters = [
    { value: 'appartement', label: 'Appartements', icon: Home },
    { value: 'studio', label: 'Studios', icon: Home },
    { value: 'villa', label: 'Villas', icon: Home },
    { value: 'maison', label: 'Maisons', icon: Home },
    { value: 'duplex', label: 'Duplex', icon: Home },
    { value: 'chambre', label: 'Chambres', icon: Home },
  ];

  const budgetQuickSelect = [
    { value: '150000', label: '≤ 150k', icon: Wallet },
    { value: '300000', label: '≤ 300k', icon: Wallet },
    { value: '500000', label: '≤ 500k', icon: Wallet },
    { value: 'custom', label: 'Autre...', icon: Wallet },
  ];

  const citySuggestions = useMemo(() => {
    const staticCities = [
      ...CITY_NAMES,
      ...ABIDJAN_NEIGHBORHOODS,
      ...Object.keys(CITY_COORDINATES),
    ];
    const all = staticCities.map((name) => name.trim()).filter(Boolean);
    return Array.from(new Set(all)).sort((a, b) =>
      a.localeCompare(b, 'fr', { sensitivity: 'base' })
    );
  }, []);

  // Parse search query for auto-detection
  const parseSearchQuery = (query: string) => {
    const parts = query.toLowerCase().split(/\s+/);
    let detectedType = '';
    let detectedCity = '';
    let detectedBudget = '';

    // Detect property type
    RESIDENTIAL_PROPERTY_TYPES.forEach(type => {
      if (parts.some(p => p.includes(type.label.toLowerCase()) || p.includes(type.value))) {
        detectedType = type.value;
      }
    });

    // Detect city
    citySuggestions.forEach(cityName => {
      if (parts.some(p => cityName.toLowerCase().includes(p) || p.includes(cityName.toLowerCase()))) {
        detectedCity = cityName;
      }
    });

    // Detect budget
    const budgetMatch = query.match(/(\d+)\s*(?:k|f?cfa)?/i);
    if (budgetMatch) {
      const budget = parseInt(budgetMatch[1]);
      if (query.toLowerCase().includes('k')) {
        detectedBudget = (budget * 1000).toString();
      } else {
        detectedBudget = budget.toString();
      }
    }

    return { type: detectedType, city: detectedCity, budget: detectedBudget };
  };

  const handleSearch = () => {
    // Use customBudget if custom input is shown and has a value, otherwise use maxBudget
    const finalBudget = showCustomBudgetInput && customBudget ? customBudget : maxBudget;
    const filters = { city, propertyType, maxBudget: finalBudget };

    if (onSearch) {
      onSearch(filters);
    } else {
      const params = new URLSearchParams();
      if (propertyType) params.set('type', propertyType);
      if (city) params.set('city', city);
      if (finalBudget) params.set('maxPrice', finalBudget);
      navigate(`/recherche${params.toString() ? `?${params.toString()}` : ''}`);
    }
    setShowSuggestions(false);
  };

  const handleQuickSearch = (suggestion: typeof popularSearches[0]) => {
    const filters = {
      city: suggestion.city,
      propertyType: suggestion.type,
      maxBudget: suggestion.budget || '',
    };

    if (onSearch) {
      onSearch(filters);
    } else {
      const params = new URLSearchParams();
      if (suggestion.type) params.set('type', suggestion.type);
      if (suggestion.city) params.set('city', suggestion.city);
      if (suggestion.budget) params.set('maxPrice', suggestion.budget);
      navigate(`/recherche${params.toString() ? `?${params.toString()}` : ''}`);
    }
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSuggestions(value.length > 0);

    // Auto-detect filters from input
    const detected = parseSearchQuery(value);
    if (detected.type) setPropertyType(detected.type);
    if (detected.city) setCity(detected.city);
    if (detected.budget) setMaxBudget(detected.budget);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setPropertyType('');
    setCity('');
    setMaxBudget('');
    setCustomBudget('');
    setShowCustomBudgetInput(false);
    searchInputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const containerClass = variant === 'hero'
    ? 'bg-white rounded-2xl shadow-2xl overflow-hidden'
    : 'bg-white rounded-xl shadow-lg overflow-hidden border border-neutral-200';

  const inputHeight = variant === 'hero' ? 'h-14 sm:h-16' : 'h-12 sm:h-13';

  return (
    <div className={containerClass}>
      <div className="relative" ref={dropdownRef}>
        {/* Main search input */}
        <div className="flex items-stretch">
          <div className={`flex-1 relative flex items-center px-4 sm:px-6`}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              placeholder="Rechercher un logement... (ex: Appartement Cocody, Studio Plateau)"
              className={`w-full ${inputHeight} pl-12 sm:pl-14 pr-10 bg-transparent text-base sm:text-lg text-neutral-700 placeholder:text-neutral-400 focus:outline-none`}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 sm:right-4 p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="px-6 sm:px-8 bg-[#FF6C2F] hover:bg-[#e05519] text-white font-semibold rounded-none transition-all hover:scale-[1.02] shadow-lg shadow-[#FF6C2F]/30 flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            <span className="hidden sm:inline">Rechercher</span>
          </button>
        </div>

        {/* Active filters display */}
        {(propertyType || city || maxBudget) && (
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3 border-t border-neutral-100">
            {propertyType && (
              <button
                onClick={() => setPropertyType('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FF6C2F]/10 text-[#FF6C2F] rounded-full text-sm font-medium hover:bg-[#FF6C2F]/20 transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                {RESIDENTIAL_PROPERTY_TYPES.find(t => t.value === propertyType)?.label || propertyType}
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {city && (
              <button
                onClick={() => setCity('')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium hover:bg-cyan-200 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                {city}
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {(maxBudget || customBudget) && (
              <button
                onClick={() => {
                  setMaxBudget('');
                  setCustomBudget('');
                  setShowCustomBudgetInput(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium hover:bg-green-200 transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                {(() => {
                  const value = customBudget || maxBudget;
                  const parsed = parseInt(value, 10);
                  if (isNaN(parsed)) return `${value} FCFA`;
                  return parsed >= 1000
                    ? `${(parsed / 1000).toFixed(0)}k FCFA`
                    : `${parsed} FCFA`;
                })()}
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Quick filter controls - always visible for page variant */}
        {variant === 'page' && !searchQuery && (
          <div className="px-4 pb-3 border-t border-neutral-100">
            <div className="flex flex-wrap gap-3">
              {/* Property types */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Type:</span>
                <div className="flex flex-wrap gap-1.5">
                  {quickFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setPropertyType(propertyType === filter.value ? '' : filter.value)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        propertyType === filter.value
                          ? 'bg-[#FF6C2F] text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-500">Budget:</span>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {budgetQuickSelect.map((budget) => (
                    <button
                      key={budget.value}
                      onClick={() => {
                        if (budget.value === 'custom') {
                          setShowCustomBudgetInput(!showCustomBudgetInput);
                          if (!showCustomBudgetInput) {
                            setMaxBudget('custom');
                          } else {
                            setMaxBudget('');
                            setCustomBudget('');
                          }
                        } else {
                          setShowCustomBudgetInput(false);
                          setMaxBudget(maxBudget === budget.value ? '' : budget.value);
                          setCustomBudget('');
                        }
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        (budget.value === 'custom' && showCustomBudgetInput) || maxBudget === budget.value
                          ? 'bg-green-600 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {budget.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom budget input */}
              {showCustomBudgetInput && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={customBudget}
                    onChange={(e) => setCustomBudget(e.target.value)}
                    placeholder="Ex: 200000"
                    className="px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 w-44"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <span className="text-xs text-neutral-500">FCFA</span>
                  <button
                    onClick={handleSearch}
                    className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                  >
                    ✓
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden z-50">
            {/* Popular searches - hero only */}
            {!searchQuery && variant === 'hero' && (
              <div className="p-4 border-b border-neutral-100">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-neutral-700">Recherches populaires</span>
                </div>
                <div className="space-y-1">
                  {popularSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickSearch(search)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors text-left"
                    >
                      <search.icon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      <span className="text-sm text-neutral-700">{search.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick filters - show for all variants when input is empty */}
            {!searchQuery && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#FF6C2F]" />
                  <span className="text-sm font-semibold text-neutral-700">Filtrer par</span>
                </div>
                <div className="space-y-3">
                  {/* Property types */}
                  <div>
                    <div className="text-xs text-neutral-500 mb-2">Type de bien</div>
                    <div className="flex flex-wrap gap-2">
                      {quickFilters.map((filter) => (
                        <button
                          key={filter.value}
                          onClick={() => {
                            setPropertyType(filter.value);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            propertyType === filter.value
                              ? 'bg-[#FF6C2F] text-white'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          <filter.icon className="w-3.5 h-3.5" />
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <div className="text-xs text-neutral-500 mb-2">Budget max</div>
                    <div className="flex flex-wrap gap-2">
                      {budgetQuickSelect.map((budget) => (
                        <button
                          key={budget.value}
                          onClick={() => {
                            if (budget.value === 'custom') {
                              setShowCustomBudgetInput(!showCustomBudgetInput);
                              if (!showCustomBudgetInput) {
                                setMaxBudget('custom');
                              } else {
                                setMaxBudget('');
                                setCustomBudget('');
                              }
                            } else {
                              setShowCustomBudgetInput(false);
                              setMaxBudget(budget.value);
                              setCustomBudget('');
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            (budget.value === 'custom' && showCustomBudgetInput) || maxBudget === budget.value
                              ? 'bg-green-600 text-white'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          <budget.icon className="w-3.5 h-3.5" />
                          {budget.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom budget input in dropdown */}
                    {showCustomBudgetInput && (
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={customBudget}
                          onChange={(e) => setCustomBudget(e.target.value)}
                          placeholder="Ex: 200000"
                          className="px-4 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 flex-1 min-w-[200px]"
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button
                          onClick={handleSearch}
                          className="px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                        >
                          OK
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* City suggestions based on input */}
            {searchQuery && citySuggestions.filter(city =>
              city.toLowerCase().includes(searchQuery.toLowerCase())
            ).length > 0 && (
              <div className="p-2 max-h-64 overflow-y-auto">
                {citySuggestions
                  .filter(city => city.toLowerCase().includes(searchQuery.toLowerCase()))
                  .slice(0, 8)
                  .map((cityName) => (
                    <button
                      key={cityName}
                      onClick={() => {
                        setCity(cityName);
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors text-left"
                    >
                      <MapPin className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                      <span className="text-sm text-neutral-700">{cityName}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* No results */}
            {searchQuery && citySuggestions.filter(city =>
              city.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 && (
              <div className="p-8 text-center">
                <Search className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500">Aucun résultat pour "{searchQuery}"</p>
                <p className="text-sm text-neutral-400 mt-1">Essayez "Cocody", "Plateau" ou "Abidjan"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
