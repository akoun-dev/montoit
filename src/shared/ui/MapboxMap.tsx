import { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxToken } from '@/hooks/shared/useMapboxToken';
// import { usePlacesAutocomplete, PlaceSuggestion } from '@/shared/hooks/usePlacesAutocomplete';
import { Loader2, MapPin, Navigation2, Focus, Search, X, Map, Globe } from 'lucide-react';

interface Property {
  id: string;
  title: string;
  monthly_rent: number;
  longitude: number;
  latitude: number;
  status?: string;
  images?: string[];
  city?: string;
  neighborhood?: string;
  main_image?: string;
  bedrooms?: number;
  surface_area?: number;
}

// Styles de carte Mapbox
const MAP_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
} as const;

type MapStyleType = keyof typeof MAP_STYLES;

interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  properties: Property[];
  highlightedPropertyId?: string;
  onMarkerClick?: (property: Property) => void;
  onBoundsChange?: (bounds: mapboxgl.LngLatBounds) => void;
  clustering?: boolean;
  priceLabels?: boolean;
  draggableMarker?: boolean;
  showRadius?: boolean;
  radiusKm?: number;
  fitBounds?: boolean;
  height?: string;
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onMarkerDrag?: (lngLat: { lng: number; lat: number }) => void;
  searchEnabled?: boolean;
  singleMarker?: boolean;
  styleToggleEnabled?: boolean;
}

// Coordonnées par défaut des villes ivoiriennes pour fallback
const CITY_CENTER_COORDS: Record<string, [number, number]> = {
  Abidjan: [-4.0083, 5.36],
  Cocody: [-3.9878, 5.3545],
  Plateau: [-4.0213, 5.3235],
  Marcory: [-3.9989, 5.301],
  Riviera: [-3.97, 5.36],
  Yopougon: [-4.0856, 5.3194],
  Bouaké: [-5.0306, 7.6936],
  Yamoussoukro: [-5.2767, 6.8277],
  'Grand-Bassam': [-3.74, 5.21],
  Bingerville: [-3.8883, 5.3536],
};

// Formater le prix pour l'affichage sur le marqueur
function formatPriceLabel(price: number): string {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M`;
  }
  if (price >= 1000) {
    return `${Math.round(price / 1000)}k`;
  }
  return price.toString();
}

// Composant de recherche intégré à la carte (désactivé car usePlacesAutocomplete manque)
interface MapSearchControlProps {
  onLocationSelect: (coords: { lng: number; lat: number }) => void;
  mapRef: React.MutableRefObject<mapboxgl.Map | null>;
}

function MapSearchControl({ onLocationSelect, mapRef }: MapSearchControlProps) {
  // Hook manquant, on retourne null
  return null;
}

export default function MapboxMap({
  center = [-4.0083, 5.36],
  zoom = 12,
  properties,
  highlightedPropertyId,
  onMarkerClick,
  onBoundsChange,
  clustering = false,
  priceLabels = false,
  draggableMarker = false,
  showRadius = false,
  radiusKm = 1,
  fitBounds = false,
  height = '100%',
  onMapClick,
  onMarkerDrag,
  searchEnabled = false,
  singleMarker = false,
  styleToggleEnabled = false,
}: MapboxMapProps) {
  // Filtrer les propriétés avec coordonnées valides et ajouter fallback
  const validProperties = properties
    .map((p) => {
      if (p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0) {
        return p;
      }
      const cityCoords = p.city ? CITY_CENTER_COORDS[p.city] : null;
      if (cityCoords) {
        const jitter = () => (Math.random() - 0.5) * 0.01;
        return {
          ...p,
          longitude: cityCoords[0] + jitter(),
          latitude: cityCoords[1] + jitter(),
        };
      }
      return p;
    })
    .filter((p) => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleType>('streets');

  const { token: mapboxToken, isLoading: tokenLoading, error: tokenError } = useMapboxToken();

  // Fonction de changement de style
  const handleStyleChange = useCallback(
    (style: MapStyleType) => {
      if (!map.current || style === mapStyle) return;

      setMapStyle(style);
      map.current.setStyle(MAP_STYLES[style]);
    },
    [mapStyle]
  );

  const getMarkerColor = (property: Property) => {
    if (property.status === 'disponible') return '#10B981';
    if (property.status === 'loue') return '#EF4444';
    if (property.status === 'en_attente') return '#F59E0B';
    return '#FF6B35';
  };

  // Créer un marqueur avec prix (style Airbnb)
  const createPriceMarker = useCallback((property: Property) => {
    const el = document.createElement('div');
    el.className = 'price-marker';
    el.innerHTML = `
      <div style="
        background: white;
        border: 2px solid ${property.status === 'disponible' ? '#FF6B35' : '#9CA3AF'};
        border-radius: 20px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 700;
        color: ${property.status === 'disponible' ? '#1F2937' : '#6B7280'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;
        position: relative;
      ">
        ${formatPriceLabel(property.monthly_rent)}
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid ${property.status === 'disponible' ? '#FF6B35' : '#9CA3AF'};
        "></div>
      </div>
    `;

    el.addEventListener('mouseenter', () => {
      const inner = el.firstElementChild as HTMLElement;
      if (inner) {
        inner.style.transform = 'scale(1.1)';
        inner.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3)';
        inner.style.zIndex = '1000';
      }
    });

    el.addEventListener('mouseleave', () => {
      const inner = el.firstElementChild as HTMLElement;
      if (inner) {
        inner.style.transform = 'scale(1)';
        inner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        inner.style.zIndex = '1';
      }
    });

    return el;
  }, []);

  // Créer un marqueur standard (cercle coloré)
  const createStandardMarker = useCallback((property: Property) => {
    const color = getMarkerColor(property);
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    el.style.cursor = 'pointer';
    el.style.transition = 'all 0.2s ease';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.color = 'white';
    el.style.fontSize = '16px';
    el.style.fontWeight = 'bold';
    el.style.position = 'relative';
    el.innerHTML = '🏠';

    el.addEventListener('mouseenter', () => {
      el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
      el.style.filter = 'brightness(1.1)';
      el.style.zIndex = '1000';
    });

    el.addEventListener('mouseleave', () => {
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.filter = 'brightness(1)';
      el.style.zIndex = '1';
    });

    return el;
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLES[mapStyle],
        center: center,
        zoom: zoom,
        attributionControl: false,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({
          showCompass: true,
          showZoom: true,
        }),
        'top-right'
      );

      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      if (onBoundsChange) {
        map.current.on('moveend', () => {
          if (map.current) {
            const bounds = map.current.getBounds();
            if (bounds) {
              onBoundsChange(bounds);
            }
          }
        });
      }

      if (onMapClick) {
        map.current.on('click', (e) => {
          onMapClick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
        });
      }

      map.current.on('load', () => {
        setMapLoaded(true);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken]);

  // Gestion des marqueurs et clustering
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Nettoyer les anciens marqueurs
    Object.values(markers.current).forEach((marker) => marker.remove());
    markers.current = {};

    // Supprimer les sources/layers de clustering existants
    if (map.current.getLayer('clusters')) {
      map.current.removeLayer('clusters');
    }
    if (map.current.getLayer('cluster-count')) {
      map.current.removeLayer('cluster-count');
    }
    if (map.current.getLayer('unclustered-point')) {
      map.current.removeLayer('unclustered-point');
    }
    if (map.current.getSource('properties-cluster')) {
      map.current.removeSource('properties-cluster');
    }

    if (validProperties.length === 0) return;

    // Mode singleMarker (pour AddPropertyPage)
    if (singleMarker && validProperties.length > 0) {
      const property = validProperties[0];
      if (!property) return;

      const color = getMarkerColor(property);

      const marker = new mapboxgl.Marker({
        color: color,
        draggable: draggableMarker,
        anchor: 'bottom',
      })
        .setLngLat([property.longitude, property.latitude])
        .addTo(map.current!);

      if (onMarkerDrag) {
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          onMarkerDrag({ lng: lngLat.lng, lat: lngLat.lat });
        });
      }

      markers.current[property.id] = marker;
      map.current?.setCenter([property.longitude, property.latitude]);
      return;
    }

    // Mode clustering
    if (clustering && validProperties.length > 5) {
      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: validProperties.map((p) => ({
          type: 'Feature' as const,
          properties: {
            id: p.id,
            title: p.title,
            monthly_rent: p.monthly_rent,
            status: p.status,
            city: p.city,
            neighborhood: p.neighborhood,
            main_image: p.main_image || p.images?.[0],
            bedrooms: p.bedrooms,
            surface_area: p.surface_area,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [p.longitude, p.latitude],
          },
        })),
      };

      map.current.addSource('properties-cluster', {
        type: 'geojson',
        data: geojsonData,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cercles des clusters
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'properties-cluster',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#FF6B35', 10, '#F59E0B', 30, '#EF4444'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 25, 30, 30],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Texte du nombre dans le cluster
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'properties-cluster',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 14,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Clic sur cluster → zoom
      map.current.on('click', 'clusters', (e) => {
        const features = map.current?.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features?.length) return;

        const clusterId = features[0]?.properties?.['cluster_id'];
        const source = map.current?.getSource('properties-cluster') as mapboxgl.GeoJSONSource;

        source?.getClusterExpansionZoom(clusterId, (err, zoomLevel) => {
          if (err) return;

          const geometry = features[0]?.geometry;
          if (geometry?.type === 'Point') {
            map.current?.easeTo({
              center: geometry.coordinates as [number, number],
              zoom: zoomLevel ?? 14,
            });
          }
        });
      });

      // Curseur pointer sur clusters
      map.current.on('mouseenter', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });

      // Marqueurs pour les points non clusterisés (avec prix si priceLabels)
      map.current.on('sourcedata', (e) => {
        if (e.sourceId !== 'properties-cluster' || !e.isSourceLoaded) return;

        const features = map.current?.querySourceFeatures('properties-cluster', {
          filter: ['!', ['has', 'point_count']],
        });

        features?.forEach((feature) => {
          const props = feature.properties;
          const id = props?.['id'];
          if (!id || markers.current[id]) return;

          const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

          const property: Property = {
            id,
            title: props?.['title'] || '',
            monthly_rent: props?.['monthly_rent'] || 0,
            longitude: coords[0],
            latitude: coords[1],
            status: props?.['status'],
            city: props?.['city'],
            neighborhood: props?.['neighborhood'],
            main_image: props?.['main_image'],
            bedrooms: props?.['bedrooms'],
            surface_area: props?.['surface_area'],
          };

          const el = priceLabels ? createPriceMarker(property) : createStandardMarker(property);

          const popupContent = `
            <div style="padding: 12px; min-width: 220px;">
              ${
                property.main_image
                  ? `<img src="${property.main_image}" alt="${property.title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />`
                  : ''
              }
              <h3 style="font-weight: bold; font-size: 15px; margin-bottom: 4px; color: #1f2937;">${property.title}</h3>
              ${
                property.city || property.neighborhood
                  ? `<p style="color: #6b7280; font-size: 13px; margin-bottom: 6px;">${property.city || ''}${property.neighborhood ? ' • ' + property.neighborhood : ''}</p>`
                  : ''
              }
              <p style="color: #ff6b35; font-weight: bold; font-size: 16px;">${(property.monthly_rent || 0).toLocaleString()} FCFA/mois</p>
              ${
                property.bedrooms || property.surface_area
                  ? `<p style="color: #6b7280; font-size: 12px; margin-top: 4px;">
                  ${property.bedrooms ? property.bedrooms + ' ch.' : ''} 
                  ${property.surface_area ? '• ' + property.surface_area + ' m²' : ''}
                </p>`
                  : ''
              }
            </div>
          `;

          const popup = new mapboxgl.Popup({
            offset: priceLabels ? 15 : 25,
            closeButton: true,
            closeOnClick: false,
            maxWidth: '280px',
          }).setHTML(popupContent);

          const marker = new mapboxgl.Marker({
            element: el,
            anchor: priceLabels ? 'bottom' : 'bottom',
          })
            .setLngLat(coords)
            .setPopup(popup)
            .addTo(map.current!);

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onMarkerClick) {
              onMarkerClick(property);
            }
          });

          markers.current[id] = marker;
        });
      });
    } else {
      // Mode standard sans clustering
      validProperties.forEach((property) => {
        const el = priceLabels ? createPriceMarker(property) : createStandardMarker(property);

        const popupContent = `
          <div style="padding: 12px; min-width: 200px;">
            ${
              property.main_image || (Array.isArray(property.images) && property.images.length > 0)
                ? `<img src="${property.main_image || property.images?.[0]}" alt="${property.title}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />`
                : ''
            }
            <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 4px; color: #1f2937;">${property.title}</h3>
            ${
              property.city || property.neighborhood
                ? `<p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">${property.city || ''}${property.neighborhood ? ' • ' + property.neighborhood : ''}</p>`
                : ''
            }
            <p style="color: #ff6b35; font-weight: bold; font-size: 18px; margin-bottom: 8px;">${(property.monthly_rent || 0).toLocaleString()} FCFA/mois</p>
            ${
              property.status
                ? `<span style="background: ${property.status === 'disponible' ? '#10B981' : '#EF4444'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                ${property.status === 'disponible' ? 'Disponible' : property.status === 'loue' ? 'Loué' : 'En attente'}
              </span>`
                : ''
            }
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: priceLabels ? 15 : 25,
          closeButton: true,
          closeOnClick: false,
          maxWidth: '300px',
        }).setHTML(popupContent);

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
        })
          .setLngLat([property.longitude, property.latitude])
          .setPopup(popup)
          .addTo(map.current!);

        el.addEventListener('click', () => {
          if (onMarkerClick) {
            onMarkerClick(property);
          }
          marker.togglePopup();
        });

        markers.current[property.id] = marker;
      });

      if (fitBounds && validProperties.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validProperties.forEach((property) => {
          bounds.extend([property.longitude, property.latitude]);
        });
        map.current?.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15,
        });
      }
    }

    // Rayon autour du premier bien
    if (showRadius && validProperties.length > 0 && map.current) {
      const property = validProperties[0];
      if (!property) return;

      const radiusInMeters = radiusKm * 1000;

      const circle = {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [property.longitude, property.latitude],
        },
        properties: {
          radius: radiusInMeters,
        },
      };

      if (!map.current.getSource('radius')) {
        map.current.addSource('radius', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [circle],
          },
        });

        map.current.addLayer({
          id: 'radius-fill',
          type: 'circle',
          source: 'radius',
          paint: {
            'circle-radius': {
              stops: [
                [0, 0],
                [20, radiusInMeters / 0.075],
              ],
              base: 2,
            },
            'circle-color': '#FF6B35',
            'circle-opacity': 0.1,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FF6B35',
            'circle-stroke-opacity': 0.5,
          },
        });
      }
    }
  }, [
    properties,
    mapLoaded,
    singleMarker,
    draggableMarker,
    fitBounds,
    showRadius,
    radiusKm,
    clustering,
    priceLabels,
    createPriceMarker,
    createStandardMarker,
    onMarkerClick,
    onMarkerDrag,
  ]);

  // Gestion du marqueur surligné
  useEffect(() => {
    if (!highlightedPropertyId) {
      Object.values(markers.current).forEach((marker) => {
        const el = marker.getElement();
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
      });
      return;
    }

    Object.entries(markers.current).forEach(([id, marker]) => {
      const el = marker.getElement();
      if (id === highlightedPropertyId) {
        el.style.transform = 'scale(1.3)';
        el.style.zIndex = '1000';
        el.style.boxShadow = '0 6px 16px rgba(255, 107, 53, 0.6)';
      } else {
        el.style.transform = 'scale(0.9)';
        el.style.zIndex = '1';
        el.style.opacity = '0.5';
      }
    });
  }, [highlightedPropertyId]);

  // Loading state
  if (tokenLoading) {
    return (
      <div
        style={{ width: '100%', height }}
        className="rounded-lg overflow-hidden bg-muted flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Chargement de la carte...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (tokenError || !mapboxToken) {
    return (
      <div
        style={{ width: '100%', height }}
        className="rounded-lg overflow-hidden bg-muted flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <MapPin className="h-8 w-8" />
          <span className="text-sm">Carte non disponible</span>
        </div>
      </div>
    );
  }

  // Fonction de recentrage sur les propriétés
  const handleResetView = () => {
    if (!map.current || validProperties.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    validProperties.forEach((p) => {
      bounds.extend([p.longitude, p.latitude]);
    });
    map.current.fitBounds(bounds, {
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      maxZoom: 15,
      duration: 1500,
    });
  };

  // Fonction de géolocalisation utilisateur
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Géolocalisation non disponible sur votre appareil');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        map.current?.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 14,
          duration: 1500,
        });

        if (userMarker.current) {
          userMarker.current.setLngLat([coords.lng, coords.lat]);
        } else {
          const el = document.createElement('div');
          el.innerHTML = `
            <div style="
              width: 18px;
              height: 18px;
              background: hsl(217, 91%, 60%);
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 0 0 6px hsla(217, 91%, 60%, 0.3), 0 2px 8px rgba(0,0,0,0.3);
              animation: userPulse 2s infinite;
            "></div>
            <style>
              @keyframes userPulse {
                0%, 100% { box-shadow: 0 0 0 6px hsla(217, 91%, 60%, 0.3), 0 2px 8px rgba(0,0,0,0.3); }
                50% { box-shadow: 0 0 0 12px hsla(217, 91%, 60%, 0.1), 0 2px 8px rgba(0,0,0,0.3); }
              }
            </style>
          `;

          userMarker.current = new mapboxgl.Marker({ element: el })
            .setLngLat([coords.lng, coords.lat])
            .addTo(map.current!);
        }

        setIsLocating(false);
      },
      (err) => {
        console.error('Erreur géolocalisation:', err);
        alert("Impossible d'obtenir votre position. Vérifiez les permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handler pour la recherche sur carte
  const handleSearchLocationSelect = useCallback(
    (coords: { lng: number; lat: number }) => {
      if (onMapClick) {
        onMapClick(coords);
      }
    },
    [onMapClick]
  );

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainer}
        style={{ width: '100%', height }}
        className="rounded-lg overflow-hidden"
        role="application"
        aria-label="Carte interactive des propriétés"
      />

      {/* Barre de recherche intégrée */}
      {searchEnabled && mapLoaded && (
        <MapSearchControl onLocationSelect={handleSearchLocationSelect} mapRef={map} />
      )}

      {/* Switch Satellite/Plan */}
      {styleToggleEnabled && mapLoaded && (
        <div className="absolute bottom-28 right-4 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-neutral-200 overflow-hidden">
            <button
              onClick={() => handleStyleChange('streets')}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors w-full ${
                mapStyle === 'streets'
                  ? 'bg-primary text-white'
                  : 'hover:bg-neutral-50 text-neutral-600'
              }`}
              aria-label="Vue Plan"
            >
              <Map className="w-4 h-4" />
              Plan
            </button>
            <div className="border-t border-neutral-200" />
            <button
              onClick={() => handleStyleChange('satellite')}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors w-full ${
                mapStyle === 'satellite'
                  ? 'bg-primary text-white'
                  : 'hover:bg-neutral-50 text-neutral-600'
              }`}
              aria-label="Vue Satellite"
            >
              <Globe className="w-4 h-4" />
              Satellite
            </button>
          </div>
        </div>
      )}

      {/* Boutons de contrôle carte */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        {/* Bouton Recentrer sur propriétés */}
        <button
          onClick={handleResetView}
          disabled={validProperties.length === 0}
          className="bg-white hover:bg-neutral-50 p-3 rounded-full shadow-lg border border-neutral-200 transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          title="Recentrer sur les propriétés"
          aria-label="Recentrer sur les propriétés"
        >
          <Focus className="w-5 h-5 text-primary" />
        </button>

        {/* Bouton Géolocalisation */}
        <button
          onClick={handleLocateUser}
          disabled={isLocating}
          className="bg-white hover:bg-neutral-50 p-3 rounded-full shadow-lg border border-neutral-200 transition-all hover:shadow-xl disabled:opacity-50"
          title="Me localiser"
          aria-label="Centrer sur ma position"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Navigation2 className="w-5 h-5 text-primary" />
          )}
        </button>
      </div>
    </div>
  );
}
