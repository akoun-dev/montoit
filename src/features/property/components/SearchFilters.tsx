import {
  SlidersHorizontal,
  X,
  MapPin,
  Home,
  Bed,
  Bath,
  DollarSign,
  Sofa,
  ParkingCircle,
  Wind,
  Maximize,
  Layers,
} from 'lucide-react';
import { useState } from 'react';
import Button from '@/shared/ui/Button';
import { useDebouncedCallback } from '@/hooks/shared';
import type { Database } from '@/shared/lib/database.types';

type PropertyType = Database['public']['Tables']['properties']['Row']['property_type'];
type PropertyCategory = 'residentiel' | 'commercial';

interface SearchFiltersProps {
  searchCity: string;
  setSearchCity: (city: string) => void;
  propertyType: PropertyType | '';
  setPropertyType: (type: PropertyType | '') => void;
  propertyCategory: PropertyCategory | '';
  setPropertyCategory: (category: PropertyCategory | '') => void;
  minPrice: string;
  setMinPrice: (price: string) => void;
  maxPrice: string;
  setMaxPrice: (price: string) => void;
  bedrooms: string;
  setBedrooms: (beds: string) => void;
  bathrooms: string;
  setBathrooms: (baths: string) => void;
  minSurface: string;
  setMinSurface: (surface: string) => void;
  maxSurface: string;
  setMaxSurface: (surface: string) => void;
  floor: string;
  setFloor: (floor: string) => void;
  isFurnished: boolean | null;
  setIsFurnished: (furnished: boolean | null) => void;
  hasParking: boolean | null;
  setHasParking: (parking: boolean | null) => void;
  hasAC: boolean | null;
  setHasAC: (ac: boolean | null) => void;
  onSearch: () => void;
  onReset: () => void;
}

export default function SearchFilters({
  searchCity,
  setSearchCity,
  propertyType,
  setPropertyType,
  propertyCategory: _propertyCategory,
  setPropertyCategory: _setPropertyCategory,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  bedrooms,
  setBedrooms,
  bathrooms,
  setBathrooms,
  minSurface,
  setMinSurface,
  maxSurface,
  setMaxSurface,
  floor,
  setFloor,
  isFurnished,
  setIsFurnished,
  hasParking,
  setHasParking,
  hasAC,
  setHasAC,
  onSearch,
  onReset,
}: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Débouncer les changements de filtres
  const debouncedUpdateFilters = useDebouncedCallback((callback: () => void) => {
    callback();
  }, 300);

  const ivoirianCities = [
    'Abidjan',
    'Yamoussoukro',
    'Bouaké',
    'Daloa',
    'San-Pédro',
    'Korhogo',
    'Man',
    'Gagnoa',
    'Abengourou',
    'Agboville',
    'Cocody',
    'Yopougon',
    'Abobo',
    'Plateau',
    'Marcory',
    'Treichville',
    'Koumassi',
    'Port-Bouët',
    'Adjamé',
    'Attécoubé',
  ];

  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: 'appartement', label: 'Appartement' },
    { value: 'maison', label: 'Maison' },
    { value: 'villa', label: 'Villa' },
    { value: 'studio', label: 'Studio' },
    { value: 'duplex', label: 'Duplex' },
    { value: 'bureau', label: 'Bureau' },
    { value: 'commerce', label: 'Commerce' },
    { value: 'terrain', label: 'Terrain' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h2 className="text-lg font-bold text-gray-900">Filtres de recherche</h2>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-label="Réinitialiser tous les filtres"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span>Réinitialiser</span>
        </button>
      </div>

      {/* Filtres essentiels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ville */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2 gap-1">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span>Ville ou quartier</span>
          </label>
          <select
            value={searchCity}
            onChange={(e) => {
              const value = e.target.value;
              setSearchCity(value);
              debouncedUpdateFilters(() => {});
            }}
            className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value="">Toutes les villes</option>
            {ivoirianCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Type de propriété */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2 gap-1">
            <Home className="h-4 w-4" aria-hidden="true" />
            <span>Type de bien</span>
          </label>
          <select
            value={propertyType}
            onChange={(e) => {
              const value = e.target.value as PropertyType | '';
              setPropertyType(value);
              debouncedUpdateFilters(() => {});
            }}
            className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value="">Tous les types</option>
            {propertyTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Prix minimum */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2 gap-1">
            <DollarSign className="h-4 w-4" aria-hidden="true" />
            <span>Prix minimum (FCFA)</span>
          </label>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => {
              const value = e.target.value;
              setMinPrice(value);
              debouncedUpdateFilters(() => {});
            }}
            placeholder="Ex: 50000"
            className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Prix maximum */}
        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-2 gap-1">
            <DollarSign className="h-4 w-4" aria-hidden="true" />
            <span>Prix maximum (FCFA)</span>
          </label>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => {
              const value = e.target.value;
              setMaxPrice(value);
              debouncedUpdateFilters(() => {});
            }}
            placeholder="Ex: 500000"
            className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Bouton filtres avancés */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        aria-label={showAdvanced ? 'Masquer les filtres avancés' : 'Afficher les filtres avancés'}
        aria-expanded={showAdvanced}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        <span>{showAdvanced ? 'Masquer' : 'Afficher'} les filtres avancés</span>
      </button>

      {/* Filtres avancés */}
      {showAdvanced && (
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chambres */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2 gap-1">
                <Bed className="h-4 w-4" aria-hidden="true" />
                <span>Nombre de chambres minimum</span>
              </label>
              <select
                value={bedrooms}
                onChange={(e) => {
                  const value = e.target.value;
                  setBedrooms(value);
                  debouncedUpdateFilters(() => {});
                }}
                className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Indifférent</option>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'chambre' : 'chambres'}
                  </option>
                ))}
              </select>
            </div>

            {/* Salles de bain */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2 gap-1">
                <Bath className="h-4 w-4" aria-hidden="true" />
                <span>Nombre de salles de bain minimum</span>
              </label>
              <select
                value={bathrooms}
                onChange={(e) => {
                  const value = e.target.value;
                  setBathrooms(value);
                  debouncedUpdateFilters(() => {});
                }}
                className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Indifférent</option>
                {[1, 2, 3, 4].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'salle de bain' : 'salles de bain'}
                  </option>
                ))}
              </select>
            </div>

            {/* Surface minimum */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2 gap-1">
                <Maximize className="h-4 w-4" aria-hidden="true" />
                <span>Surface minimum (m²)</span>
              </label>
              <select
                value={minSurface}
                onChange={(e) => {
                  const value = e.target.value;
                  setMinSurface(value);
                  debouncedUpdateFilters(() => {});
                }}
                className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Indifférent</option>
                {[20, 30, 40, 50, 60, 80, 100, 150, 200].map((surface) => (
                  <option key={surface} value={surface}>
                    {surface} m² et plus
                  </option>
                ))}
              </select>
            </div>

            {/* Surface maximum */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2 gap-1">
                <Maximize className="h-4 w-4" aria-hidden="true" />
                <span>Surface maximum (m²)</span>
              </label>
              <select
                value={maxSurface}
                onChange={(e) => {
                  const value = e.target.value;
                  setMaxSurface(value);
                  debouncedUpdateFilters(() => {});
                }}
                className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Indifférent</option>
                {[50, 75, 100, 150, 200, 300, 400, 500].map((surface) => (
                  <option key={surface} value={surface}>
                    {surface} m² maximum
                  </option>
                ))}
              </select>
            </div>

            {/* Étage */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2 gap-1">
                <Layers className="h-4 w-4" aria-hidden="true" />
                <span>Étage</span>
              </label>
              <select
                value={floor}
                onChange={(e) => {
                  const value = e.target.value;
                  setFloor(value);
                  debouncedUpdateFilters(() => {});
                }}
                className="w-full px-4 py-3 min-h-[48px] border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Indifférent</option>
                <option value="0">Rez-de-chaussée</option>
                <option value="1">1er étage</option>
                <option value="2">2ème étage</option>
                <option value="3">3ème étage</option>
                <option value="4">4ème étage</option>
                <option value="5">5ème étage</option>
                <option value="dernier">Dernier étage</option>
              </select>
            </div>
          </div>

          {/* Équipements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Équipements</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const newValue = isFurnished === true ? null : true;
                  setIsFurnished(newValue);
                  debouncedUpdateFilters(() => {});
                }}
                className={`px-4 py-2 rounded-xl border-2 transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  isFurnished === true
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
                aria-label="Filtrer les biens meublés"
                aria-pressed={isFurnished === true}
              >
                <Sofa className="h-4 w-4 inline mr-2" aria-hidden="true" />
                Meublé
              </button>
              <button
                onClick={() => {
                  const newValue = hasParking === true ? null : true;
                  setHasParking(newValue);
                  debouncedUpdateFilters(() => {});
                }}
                className={`px-4 py-2 rounded-xl border-2 transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  hasParking === true
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
                aria-label="Filtrer les biens avec parking"
                aria-pressed={hasParking === true}
              >
                <ParkingCircle className="h-4 w-4 inline mr-2" aria-hidden="true" />
                Parking
              </button>
              <button
                onClick={() => {
                  const newValue = hasAC === true ? null : true;
                  setHasAC(newValue);
                  debouncedUpdateFilters(() => {});
                }}
                className={`px-4 py-2 rounded-xl border-2 transition-all min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  hasAC === true
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
                aria-label="Filtrer les biens avec climatisation"
                aria-pressed={hasAC === true}
              >
                <Wind className="h-4 w-4 inline mr-2" aria-hidden="true" />
                Climatisation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bouton de recherche */}
      <Button onClick={onSearch} variant="primary" size="large" fullWidth className="mt-4">
        Rechercher
      </Button>
    </div>
  );
}
