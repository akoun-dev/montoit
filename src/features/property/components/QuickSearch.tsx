import { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Home as HomeIcon,
  Coins,
  Plus,
  CheckCircle,
  Shield,
  Navigation,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  CITIES,
  ABIDJAN_COMMUNES,
  RESIDENTIAL_PROPERTY_TYPES,
  COMMERCIAL_PROPERTY_TYPES,
  GEOLOCATION_SETTINGS,
} from '@/shared/lib/constants/app.constants';
import { FEATURES } from '@/shared/config/features.config';

interface QuickSearchProps {
  onSearch?: (filters: SearchFilters) => void;
}

interface SearchFilters {
  city: string;
  propertyType: string;
  maxBudget: string;
  propertyCategory?: string;
  useGeolocation?: boolean;
  searchRadius?: number;
}

export default function QuickSearch({ onSearch }: QuickSearchProps) {
  const { user, profile } = useAuth();
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyCategory, setPropertyCategory] = useState<'residentiel' | 'commercial' | ''>(
    'residentiel'
  );
  const [maxBudget, setMaxBudget] = useState('');
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(GEOLOCATION_SETTINGS.DEFAULT_RADIUS);
  const [_showAdvanced, _setShowAdvanced] = useState(false);

  const cities = ['Toutes les villes', ...CITIES];

  const formatBudget = (value: string): string => {
    const numValue = value.replace(/\s/g, '');
    if (!numValue) return '';
    return parseInt(numValue).toLocaleString('fr-FR');
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s/g, '');
    if (value === '' || /^\d+$/.test(value)) {
      setMaxBudget(value);
    }
  };

  const incrementBudget = () => {
    const current = parseInt(maxBudget) || 0;
    const newValue = current + 10000;
    if (newValue <= 5000000) {
      setMaxBudget(newValue.toString());
    }
  };

  const decrementBudget = () => {
    const current = parseInt(maxBudget) || 0;
    const newValue = Math.max(0, current - 10000);
    setMaxBudget(newValue.toString());
  };

  const getPropertyTypesForCategory = () => {
    if (propertyCategory === 'commercial') {
      return [
        { value: '', label: 'Tous les types commerciaux' },
        ...COMMERCIAL_PROPERTY_TYPES.map((pt) => ({
          value: pt.value,
          label: `${pt.icon} ${pt.label}`,
        })),
      ];
    }
    return [
      { value: '', label: 'Tous les types résidentiels' },
      ...RESIDENTIAL_PROPERTY_TYPES.map((pt) => ({
        value: pt.value,
        label: `${pt.icon} ${pt.label}`,
      })),
    ];
  };

  const propertyTypes = getPropertyTypesForCategory();

  useEffect(() => {
    if (city !== 'Abidjan') {
      setCommune('');
    }
  }, [city]);

  useEffect(() => {
    setPropertyType('');
  }, [propertyCategory]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        setUseGeolocation(true);
        setCity('Ma position actuelle');
        setCommune('');
        setGettingLocation(false);

        localStorage.setItem('user_last_location', JSON.stringify(location));
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = "Impossible d'obtenir votre position.";

        if (error.code === error.PERMISSION_DENIED) {
          errorMessage =
            "Accès à la localisation refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = 'Position non disponible. Veuillez vérifier votre connexion GPS.';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = 'La demande de localisation a expiré. Veuillez réessayer.';
        }

        alert(errorMessage);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_SETTINGS.TIMEOUT,
        maximumAge: GEOLOCATION_SETTINGS.MAX_AGE,
      }
    );
  };

  const handleClearLocation = () => {
    setUseGeolocation(false);
    setUserLocation(null);
    setCity('');
    localStorage.removeItem('user_last_location');
  };

  const handleSearch = () => {
    // Validation : ville obligatoire
    const searchLocation = commune || city;
    if (!useGeolocation && (!searchLocation || searchLocation === 'Toutes les villes')) {
      alert('Veuillez sélectionner une ville ou utiliser votre position actuelle');
      return;
    }

    if (onSearch) {
      onSearch({
        city: commune || city,
        propertyType,
        maxBudget,
        propertyCategory,
        useGeolocation,
        searchRadius: useGeolocation ? searchRadius : undefined,
      });
    } else {
      const params = new URLSearchParams();
      const searchLocation = commune || city;

      if (useGeolocation && userLocation) {
        params.append('lat', userLocation.lat.toString());
        params.append('lng', userLocation.lng.toString());
        params.append('radius', searchRadius.toString());
      } else if (
        searchLocation &&
        searchLocation !== 'Toutes les villes' &&
        searchLocation !== 'Ma position actuelle'
      ) {
        params.append('city', searchLocation);
      }

      if (propertyType) params.append('type', propertyType);
      if (propertyCategory) params.append('category', propertyCategory);
      if (maxBudget) params.append('max_price', maxBudget);

      window.location.href = `/recherche?${params.toString()}`;
    }
  };

  const handlePublish = () => {
    if (!user) {
      window.location.href = '/auth';
    } else {
      window.location.href = '/add-property';
    }
  };

  return (
    <div className="w-full">
      <div className="card-scrapbook p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-terracotta-100 rounded-xl flex items-center justify-center">
              <Search className="w-5 h-5 text-terracotta-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Recherche rapide</h2>
              <p className="text-sm text-gray-600">Simple et efficace</p>
            </div>
          </div>

          {user && profile?.user_type === 'proprietaire' && (
            <button
              onClick={handlePublish}
              className="hidden md:flex items-center space-x-2 px-6 py-3 bg-terracotta-600 text-white rounded-xl hover:bg-terracotta-700 transition-all hover:scale-105 shadow-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Publier une annonce</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline-flex mr-2 text-terracotta-600" />
                {city === 'Abidjan' ? 'Ville' : 'Localisation'}
              </label>
              {useGeolocation ? (
                <div className="flex items-center justify-between px-4 py-3 h-12 border-2 border-cyan-500 bg-cyan-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                    <span className="font-medium text-cyan-900">Ma position actuelle</span>
                  </div>
                  <button
                    onClick={handleClearLocation}
                    className="text-cyan-600 hover:text-cyan-800 transition-colors flex-shrink-0"
                    title="Effacer la localisation"
                  >
                    <span className="text-sm">✕</span>
                  </button>
                </div>
              ) : (
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={useGeolocation}
                  className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-terracotta-200 focus:border-terracotta-500 transition-all bg-white appearance-none cursor-pointer font-medium disabled:opacity-50"
                >
                  <option value="">Sélectionner une ville</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {!useGeolocation && (
              <button
                onClick={handleGetLocation}
                disabled={gettingLocation}
                className="mt-7 h-12 px-4 border-2 border-cyan-500 text-cyan-600 rounded-xl hover:bg-cyan-50 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                title="Utiliser ma position actuelle"
              >
                <Navigation className="w-5 h-5 flex-shrink-0" />
                <span className="hidden sm:inline">
                  {gettingLocation ? 'Détection...' : 'Ma position'}
                </span>
              </button>
            )}
          </div>

          {city === 'Abidjan' && !useGeolocation && (
            <div className="relative animate-slide-down">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline-flex mr-2 text-terracotta-600" />
                Commune d'Abidjan
              </label>
              <select
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-terracotta-200 focus:border-terracotta-500 transition-all bg-white appearance-none cursor-pointer font-medium"
              >
                <option value="">Toutes les communes</option>
                {ABIDJAN_COMMUNES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Affinez votre recherche dans Abidjan</p>
            </div>
          )}

          {useGeolocation && (
            <div className="relative animate-slide-down">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline-flex mr-2 text-cyan-600" />
                Rayon de recherche
              </label>
              <select
                value={searchRadius}
                onChange={(e) => setSearchRadius(Number(e.target.value))}
                className="w-full h-12 px-4 border-2 border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500 transition-all bg-white appearance-none cursor-pointer font-medium"
              >
                {GEOLOCATION_SETTINGS.RADIUS_OPTIONS.map((radius) => (
                  <option key={radius} value={radius}>
                    Dans un rayon de {radius} km
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-800 flex items-center">
                <HomeIcon className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" />
                Catégorie de bien
              </label>
              <p className="text-xs text-gray-600">Mon Toit = Logements résidentiels</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPropertyCategory('residentiel')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                  propertyCategory === 'residentiel'
                    ? 'bg-terracotta-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <HomeIcon className="w-4 h-4 flex-shrink-0" />
                Résidentiel
              </button>
              {FEATURES.COMMERCIAL_PROPERTIES && (
                <button
                  type="button"
                  onClick={() => setPropertyCategory('commercial')}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                    propertyCategory === 'commercial'
                      ? 'bg-olive-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Building2 className="w-4 h-4 flex-shrink-0" />
                  Commercial
                </button>
              )}
            </div>
            {propertyCategory === 'commercial' && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                ⚠️ Les biens commerciaux seront disponibles dans une future extension "Mon Commerce"
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <HomeIcon className="w-4 h-4 inline-flex mr-2 text-terracotta-600" />
                Type de bien
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-terracotta-200 focus:border-terracotta-500 transition-all bg-white appearance-none cursor-pointer font-medium"
              >
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Coins className="w-4 h-4 inline-flex mr-2 text-terracotta-600" />
                Budget max (FCFA)
              </label>
              <div className="relative h-12">
                <input
                  type="text"
                  value={maxBudget ? formatBudget(maxBudget) : ''}
                  onChange={handleBudgetChange}
                  placeholder="Ex : 200 000 FCFA"
                  className="w-full h-full px-4 pr-16 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-terracotta-200 focus:border-terracotta-500 transition-all bg-white font-medium"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                  <button
                    type="button"
                    onClick={incrementBudget}
                    className="px-2 py-0.5 hover:bg-gray-100 rounded text-gray-600 hover:text-terracotta-600 transition-colors leading-none"
                    title="Augmenter de 10 000 FCFA"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={decrementBudget}
                    className="px-2 py-0.5 hover:bg-gray-100 rounded text-gray-600 hover:text-terracotta-600 transition-colors leading-none"
                    title="Diminuer de 10 000 FCFA"
                  >
                    ▼
                  </button>
                </div>
              </div>
              {maxBudget && parseInt(maxBudget) < 10000 && (
                <p className="mt-1 text-xs text-red-600">
                  Veuillez entrer un budget minimal de 10 000 FCFA
                </p>
              )}
              {maxBudget && parseInt(maxBudget) > 5000000 && (
                <p className="mt-1 text-xs text-red-600">Budget maximum: 5 000 000 FCFA</p>
              )}
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="w-full h-12 px-6 bg-terracotta-600 text-white rounded-xl hover:bg-terracotta-700 transition-all hover:scale-105 shadow-lg font-bold flex items-center justify-center gap-2"
              >
                <Search className="w-5 h-5 flex-shrink-0" />
                <span>Rechercher</span>
              </button>
            </div>
          </div>
        </div>

        {user && profile?.user_type === 'proprietaire' && (
          <button
            onClick={handlePublish}
            className="md:hidden mt-4 w-full flex items-center justify-center space-x-2 px-6 py-3 border-2 border-terracotta-600 text-terracotta-600 rounded-xl hover:bg-terracotta-50 transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Publier une annonce</span>
          </button>
        )}

        <div className="mt-6 flex items-center justify-center space-x-2 text-sm">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-gray-700 font-medium">100% gratuit • Sécurisé</span>
          <Shield className="w-4 h-4 text-olive-600" />
        </div>
      </div>
    </div>
  );
}
