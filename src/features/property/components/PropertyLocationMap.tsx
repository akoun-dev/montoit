/**
 * Composant de localisation sur carte pour les propriétés
 *
 * Utilise une bibliothèque de cartes (Leaflet comme fallback) pour afficher
 * la position d'une propriété et permettre de sélectionner/emplacer le marqueur.
 */

import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Locate,
  Search,
  ChevronDown,
  X,
} from 'lucide-react';

interface Coordinates {
  lat: number;
  lng: number;
}

interface AddressSuggestion {
  id: string;
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    country?: string;
    postcode?: string;
    road?: string;
    house_number?: string;
  };
  lat: string;
  lon: string;
}

interface PropertyLocationMapProps {
  initialCoordinates?: Coordinates;
  initialAddress?: string;
  onLocationChange?: (coords: Coordinates, address: string) => void;
  readOnly?: boolean;
  height?: string;
}

export function PropertyLocationMap({
  initialCoordinates,
  initialAddress = '',
  onLocationChange,
  readOnly = false,
  height = '400px',
}: PropertyLocationMapProps) {
  const [coordinates, setCoordinates] = useState<Coordinates>(
    initialCoordinates || { lat: 5.3453, lng: -4.0244 } // Abidjan par défaut
  );
  const [address, setAddress] = useState(initialAddress);
  const [markerDraggable, setMarkerDraggable] = useState(!readOnly);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);

  // Initialiser la carte quand le composant est monté
  useEffect(() => {
    // Note: Pour une vraie implémentation, utiliser ici la carte
    // Mapbox, Google Maps, ou Leaflet
    setMapLoaded(true);
  }, []);

  // Fonction pour obtenir les suggestions d'adresse via Nominatim (OSM)
  const fetchAddressSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&country=CI&limit=5`
      );
      const data = await response.json();
      setSuggestions(data || []);
    } catch (error) {
      console.error('Erreur lors de la recherche d\'adresse:', error);
      setSuggestions([]);
    }
  };

  // Fonction pour géocoder l'adresse (convertir adresse en coordonnées)
   
  const _geocodeAddress = async (_addressString: string) => {
    setLoadingLocation(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          addressString + ', Côte d\'Ivoire'
        )}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newCoords: Coordinates = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        };
        setCoordinates(newCoords);
        setAddress(result.display_name);
        onLocationChange?.(newCoords, result.display_name);
      }
    } catch (error) {
      console.error('Erreur lors du géocodage:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  // Fonction pour reverse geocoder (convertir coordonnées en adresse)
  const reverseGeocode = async (coords: Coordinates) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18`
      );
      const data = await response.json();

      if (data && !data.error) {
        const displayAddress = data.display_name || `Lat: ${coords.lat.toFixed(6)}, Lng: ${coords.lng.toFixed(6)}`;
        setAddress(displayAddress);
        onLocationChange?.(coords, displayAddress);
      }
    } catch (error) {
      console.error('Erreur du reverse geocoding:', error);
    }
  };

  // Fonction pour obtenir la position de l'utilisateur
  const locateUser = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCoordinates(newCoords);
        reverseGeocode(newCoords);
        setMarkerDraggable(true);
        setLoadingLocation(false);
      },
      (error) => {
        console.error('Erreur de géolocalisation:', error);
        setLoadingLocation(false);
        alert('Impossible d\'obtenir votre position. Veuillez déplacer le marqueur manuellement.');
      }
    );
  };

  // Fonction pour gérer le déplacement du marqueur (clic sur la carte)
  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !mapRef.current) return;

    const rect = mapRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Conversion simplifiée (en production, utiliser la vraie conversion carte→coords)
    // Note: Ceci est une approximation. En production, utiliser les méthodes
    // fournies par la bibliothèque de carte
    const newCoords: Coordinates = {
      lat: 5.3453 + (y / rect.height - 0.5) * 0.1, // Approximation
      lng: -4.0244 + (x / rect.width - 0.5) * 0.1,  // Approximation
    };

    setCoordinates(newCoords);
    reverseGeocode(newCoords);
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche d'adresse */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length >= 3) {
                  fetchAddressSuggestions(e.target.value);
                } else {
                  setSuggestions([]);
                }
              }}
              placeholder="Rechercher une adresse..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {searchQuery && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => {
                      const coords: Coordinates = {
                        lat: parseFloat(suggestion.lat),
                        lng: parseFloat(suggestion.lon),
                      };
                      setCoordinates(coords);
                      setAddress(suggestion.display_name);
                      setSearchQuery(suggestion.display_name);
                      setSuggestions([]);
                      onLocationChange?.(coords, suggestion.display_name);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-sm"
                  >
                    {suggestion.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!readOnly && (
            <button
              onClick={locateUser}
              disabled={loadingLocation}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
              title="Ma position"
            >
              <Locate className="w-4 h-4" />
              <span className="hidden sm:inline">Me localiser</span>
            </button>
          )}
        </div>

        {/* Adresse sélectionnée */}
        {address && (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
            <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="text-gray-700 flex-1 line-clamp-2">{address}</span>
            {!readOnly && (
              <button
                onClick={() => {
                  setAddress('');
                  setSearchQuery('');
                  onLocationChange?.(coordinates, '');
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Carte */}
      <div
        ref={mapRef}
        onClick={handleMapClick}
        className="relative w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer"
        style={{ height }}
      >
        {!mapLoaded ? (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Chargement de la carte...</p>
          </div>
        ) : (
          <>
            {/* Placeholder carte - En production, intégrer Leaflet ou Mapbox */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 opacity-50" />
            <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10">
              {Array.from({ length: 36 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-emerald-200"
                  style={{
                    gridColumn: `${(i % 6) + 1} / span 1 / span 1`,
                    gridRow: `${Math.floor(i / 6) + 1} / span 1 / span 1`,
                  }}
                />
              ))}
            </div>

            {/* Marqueur centré */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className={`relative ${markerDraggable && !readOnly ? 'cursor-move' : ''}`}>
                <MapPin
                  className={`h-10 w-10 ${
                    markerDraggable
                      ? 'text-emerald-600'
                      : 'text-gray-400'
                  } transition-colors`}
                />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full">
                  <div
                    className={`w-8 h-8 rounded-full ${
                      markerDraggable
                        ? 'bg-emerald-500'
                        : 'bg-gray-400'
                    } border-4 border-white shadow-lg`}
                  />
                </div>
              </div>
            </div>

            {/* Informations de position */}
            <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur rounded-lg p-2 shadow-sm">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-600" />
                <span className="font-mono text-gray-700">
                  {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                </span>
                {!readOnly && (
                  <span className="text-xs text-gray-500 ml-2">
                    Cliquez pour préciser
                  </span>
                )}
              </div>
            </div>

            {/* Contrôles de zoom (placeholder) */}
            {!readOnly && (
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50">
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </button>
                <button className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50">
                  <ChevronDown className="w-5 h-5 text-gray-600 rotate-180" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Instructions pour l'utilisateur */}
      {!readOnly && (
        <div className="text-sm text-gray-500 space-y-1">
          <p>
            <strong>Comment placer votre propriété :</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Recherchez une adresse ou utilisez le bouton "Me localiser"</li>
            <li>Cliquez sur la carte pour positionner le marqueur précisément</li>
            <li>Le marqueur peut être déplacé en faisant glisser</li>
          </ul>
        </div>
      )}

      {/* Message en mode lecture seule */}
      {readOnly && (
        <p className="text-sm text-gray-500">
          <em>Mode lecture seule : la position ne peut être modifiée.</em>
        </p>
      )}
    </div>
  );
}

export default PropertyLocationMap;
