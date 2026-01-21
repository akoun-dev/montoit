import React from 'react';
import { MapPin, Home } from 'lucide-react';
import { propertyService } from '../services/propertyService';

// City interface used internally by propertyService

interface CitySelectorProps {
  selectedCity: string;
  selectedDistrict: string;
  onCitySelect: (city: string) => void;
  onDistrictSelect: (district: string) => void;
  disabled?: boolean;
}

const CitySelector: React.FC<CitySelectorProps> = ({
  selectedCity,
  selectedDistrict,
  onCitySelect,
  onDistrictSelect,
  disabled = false,
}) => {
  const cities = propertyService.getPopularCities();
  const districts = selectedCity ? propertyService.getCityDistricts(selectedCity) : [];

  return (
    <div className="space-y-6">
      {/* Sélection de ville */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <MapPin className="inline w-4 h-4 mr-2" />
          Choisissez votre ville *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cities.map((city) => (
            <button
              key={city.name}
              type="button"
              onClick={() => onCitySelect(city.name)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all duration-200
                ${
                  selectedCity === city.name
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Image de fond */}
              <div
                className="absolute inset-0 rounded-lg bg-cover bg-center opacity-20"
                style={{ backgroundImage: `url(${city.image})` }}
              />

              {/* Contenu */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{city.name}</h3>
                  <Home className="w-5 h-5 text-gray-500" />
                </div>
                <p className="text-sm text-gray-600">{city.properties} propriétés</p>
                <p className="text-xs text-gray-500 mt-1">{city.districts.length} quartiers</p>
              </div>

              {/* Indicateur de sélection */}
              {selectedCity === city.name && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sélection de quartier */}
      {selectedCity && districts.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <MapPin className="inline w-4 h-4 mr-2" />
            Choisissez votre quartier *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {districts.map((district) => (
              <button
                key={district}
                type="button"
                onClick={() => onDistrictSelect(district)}
                disabled={disabled}
                className={`
                  px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                  ${
                    selectedDistrict === district
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {district}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Aide contextuelle */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Conseil de localisation</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Choisissez une ville et un quartier pour améliorer la visibilité de votre propriété.
                Les propriétés bien localisées obtiennent 3x plus de vues.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitySelector;
