import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxToken } from '@/hooks/shared/useMapboxToken';
import { Loader2, MapPin, Navigation2, Focus } from 'lucide-react';

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
  bedrooms?: number;
  bathrooms?: number;
  surface_area?: number;
}

interface EnhancedClusterMapProps {
  properties: Property[];
  onMarkerClick?: (property: Property) => void;
  center?: [number, number];
  zoom?: number;
  height?: string;
  fitBounds?: boolean;
}

// Coordonnées par défaut des villes ivoiriennes
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

export default function EnhancedClusterMap({
  properties,
  onMarkerClick,
  center = [-4.0083, 5.36],
  zoom = 11,
  height = '100%',
  fitBounds = true,
}: EnhancedClusterMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const { token: mapboxToken, isLoading: tokenLoading, error: tokenError } = useMapboxToken();

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

        // Centrer la carte avec animation
        map.current?.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 14,
          duration: 1500,
        });

        // Créer ou déplacer le marqueur utilisateur
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

  // Filtrer et normaliser les propriétés avec coordonnées
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

  // Initialiser la carte
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center,
      zoom: zoom,
      maxZoom: 18,
      minZoom: 4,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setIsMapLoaded(true);
      initializeLayers();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken]);

  // Initialiser les couches de clustering
  const initializeLayers = () => {
    if (!map.current) return;

    // Ajouter la source GeoJSON avec clustering
    map.current.addSource('properties', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Couche des clusters (cercles)
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'properties',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#FF6C2F', // Orange primary < 10
          10,
          '#F59E0B', // Amber 10-30
          30,
          '#EF4444', // Rouge > 30
        ],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff',
      },
    });

    // Couche du compteur dans les clusters
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'properties',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 14,
      },
      paint: {
        'text-color': '#ffffff',
      },
    });

    // Couche des points individuels
    map.current.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'properties',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': '#FF6C2F',
        'circle-radius': 10,
        'circle-stroke-width': 3,
        'circle-stroke-color': '#fff',
      },
    });

    // Clic sur un cluster : zoom
    map.current.on('click', 'clusters', (e) => {
      const features = map.current?.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });

      if (!features || !features.length) return;

      const feature = features[0];
      if (!feature?.properties) return;

      const clusterId = feature.properties['cluster_id'];
      const source = map.current?.getSource('properties') as mapboxgl.GeoJSONSource;

      source.getClusterExpansionZoom(clusterId, (err, expansionZoom) => {
        if (err || expansionZoom === undefined || expansionZoom === null) return;

        const geometry = feature.geometry as GeoJSON.Point;
        if (!geometry?.coordinates) return;

        map.current?.easeTo({
          center: geometry.coordinates as [number, number],
          zoom: expansionZoom,
        });
      });
    });

    // Clic sur un point : afficher popup
    map.current.on('click', 'unclustered-point', (e) => {
      if (!e.features || !e.features.length) return;

      const feature = e.features[0];
      if (!feature?.geometry || !feature?.properties) return;

      const geometry = feature.geometry as GeoJSON.Point;
      const coordinates = geometry.coordinates.slice() as [number, number];
      const props = feature.properties;

      // Popup HTML
      const image = props['image'];
      const title = props['title'] || '';
      const price = Number(props['price']) || 0;
      const address = props['address'] || '';
      const bedrooms = props['bedrooms'];
      const bathrooms = props['bathrooms'];
      const area = props['area'];
      const id = props['id'];

      const popupHtml = `
        <div style="padding: 12px; min-width: 220px; font-family: system-ui, -apple-system, sans-serif;">
          ${
            image
              ? `<img src="${image}" alt="${title}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />`
              : ''
          }
          <h3 style="font-weight: 700; font-size: 14px; margin-bottom: 4px; color: #2C1810;">${title}</h3>
          <p style="color: #FF6C2F; font-weight: 700; font-size: 16px; margin-bottom: 6px;">
            ${price.toLocaleString('fr-FR')} FCFA/mois
          </p>
          <p style="color: #6B5A4E; font-size: 12px; margin-bottom: 8px;">${address}</p>
          <div style="display: flex; gap: 12px; font-size: 11px; color: #A69B95;">
            ${bedrooms ? `<span>🛏 ${bedrooms} ch.</span>` : ''}
            ${bathrooms ? `<span>🚿 ${bathrooms} sdb</span>` : ''}
            ${area ? `<span>📏 ${area}m²</span>` : ''}
          </div>
        </div>
      `;

      new mapboxgl.Popup({ offset: 25, maxWidth: '280px' })
        .setLngLat(coordinates)
        .setHTML(popupHtml)
        .addTo(map.current!);

      // Callback
      if (onMarkerClick) {
        const selectedProperty = properties.find((p) => p.id === id);
        if (selectedProperty) {
          onMarkerClick(selectedProperty);
        }
      }
    });

    // Curseur pointer
    ['clusters', 'unclustered-point'].forEach((layer) => {
      map.current!.on('mouseenter', layer, () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });
      map.current!.on('mouseleave', layer, () => {
        map.current!.getCanvas().style.cursor = '';
      });
    });
  };

  // Mettre à jour les données
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const source = map.current.getSource('properties') as mapboxgl.GeoJSONSource;

    if (source) {
      const geoJsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: validProperties.map((prop) => ({
          type: 'Feature',
          properties: {
            id: prop.id,
            title: prop.title,
            price: prop.monthly_rent,
            address: `${prop.city || ''}${prop.neighborhood ? ' • ' + prop.neighborhood : ''}`,
            bedrooms: prop.bedrooms,
            bathrooms: prop.bathrooms,
            area: prop.surface_area,
            image: prop.images?.[0] || null,
          },
          geometry: {
            type: 'Point',
            coordinates: [prop.longitude, prop.latitude],
          },
        })),
      };

      source.setData(geoJsonData);

      // Ajuster les bounds si demandé
      if (fitBounds && validProperties.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validProperties.forEach((p) => {
          bounds.extend([p.longitude, p.latitude]);
        });
        map.current?.fitBounds(bounds, {
          padding: { top: 60, bottom: 60, left: 60, right: 60 },
          maxZoom: 15,
        });
      }
    }
  }, [validProperties, isMapLoaded, fitBounds]);

  // États de chargement et erreur
  if (tokenLoading) {
    return (
      <div
        style={{ width: '100%', height }}
        className="rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Chargement de la carte...</span>
        </div>
      </div>
    );
  }

  if (tokenError || !mapboxToken) {
    return (
      <div
        style={{ width: '100%', height }}
        className="rounded-xl overflow-hidden bg-neutral-100 flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <MapPin className="h-8 w-8" />
          <span className="text-sm">Carte non disponible</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg border border-neutral-200">
      <div ref={mapContainer} style={{ width: '100%', height }} />

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

      {/* Légende Premium */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-neutral-100 z-10">
        <h4 className="font-semibold text-sm mb-3 text-neutral-800">Densité des biens</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-[#FF6C2F]"></span>
            <span className="text-neutral-600">&lt; 10 biens</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-amber-500"></span>
            <span className="text-neutral-600">10 - 30 biens</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500"></span>
            <span className="text-neutral-600">&gt; 30 biens</span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-neutral-200 text-xs text-neutral-500 font-medium">
          {validProperties.length} propriétés au total
        </div>
      </div>
    </div>
  );
}
