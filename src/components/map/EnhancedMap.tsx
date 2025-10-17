import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Supercluster from 'supercluster';
import 'mapbox-gl/dist/mapbox-gl.css';
import DOMPurify from 'dompurify';
import { MapProperty } from '@/hooks/useMapProperties';
import { Button } from '@/components/ui/button';
import { Locate, Map, Satellite, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { logger } from '@/services/logger';
import { secureStorage } from '@/lib/secureStorage';
import { motion } from 'framer-motion';
import { ABIDJAN_POI, POI_CATEGORIES } from '@/data/abidjanPOI';
import { ABIDJAN_NEIGHBORHOODS, getPriceColor } from '@/data/abidjanNeighborhoods';
import type { POIType } from './POILayer';
import type { Neighborhood } from '@/data/abidjanNeighborhoods';

interface EnhancedMapProps {
  properties: MapProperty[];
  onPropertyClick?: (propertyId: string) => void;
  showHeatmap?: boolean;
  showClusters?: boolean;
  activePOILayers?: POIType[];
  showNeighborhoods?: boolean;
  onNeighborhoodClick?: (neighborhood: Neighborhood) => void;
}

const getStoredMapboxToken = () => {
  // Import environment validator
  try {
    const { getEnvVar } = require('@/lib/env-validation');

    // Priorité 1: Variables d'environnement validées (supporte plusieurs noms)
    const envToken = getEnvVar('VITE_MAPBOX_TOKEN') ||
                     getEnvVar('VITE_MAPBOX_PUBLIC_TOKEN') ||
                     getEnvVar('MAPBOX_PUBLIC_TOKEN');
    if (envToken) return envToken;
  } catch (error) {
    console.warn('Environment validation not available, using fallback');
  }

  // Fallback direct aux variables d'environnement (avec validation de base)
  const envToken = import.meta.env.VITE_MAPBOX_TOKEN ||
                   import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN ||
                   import.meta.env.MAPBOX_PUBLIC_TOKEN;
  if (envToken && /^pk\.[a-zA-Z0-9.-_]+$/.test(envToken)) return envToken;

  // Priorité 2: localStorage sécurisé (fallback)
  return secureStorage.getItem('mapbox_token', true) || '';
};

type MapStyle = 'streets' | 'satellite' | 'hybrid';

const MAP_STYLES: Record<MapStyle, string> = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  hybrid: 'mapbox://styles/mapbox/satellite-streets-v12',
};

export const EnhancedMap = ({ 
  properties, 
  onPropertyClick,
  showHeatmap = false,
  showClusters = true,
  activePOILayers = [],
  showNeighborhoods = false,
  onNeighborhoodClick
}: EnhancedMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const poiMarkers = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [mapboxToken] = useState(getStoredMapboxToken());
  const clusterIndex = useRef<Supercluster | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      if (!mapboxToken) {
        logger.warn('Mapbox token not configured');
        return;
      }

      mapboxgl.accessToken = mapboxToken;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLES[mapStyle],
        center: [-4.0305, 5.3599], // Abidjan
        zoom: 11,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      map.current.on('load', () => {
        setMapReady(true);
        logger.info('Map loaded successfully');
      });

      // Update clusters on zoom/pan
      map.current.on('moveend', () => {
        if (showClusters) {
          updateClusters();
        }
      });

    } catch (error) {
      logger.logError(error, { context: 'Map initialization' });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapStyle, mapboxToken]);

  // Initialize clustering
  useEffect(() => {
    if (!showClusters || properties.length === 0) return;

    const points = properties.map(property => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        propertyId: property.id,
        price: property.monthly_rent,
        title: property.title,
        city: property.city,
        image: property.main_image,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [property.longitude, property.latitude],
      },
    }));

    clusterIndex.current = new Supercluster({
      radius: 60,
      maxZoom: 16,
      minPoints: 3,
    });

    clusterIndex.current.load(points);
    updateClusters();
  }, [properties, showClusters, mapReady]);

  // Update clusters
  const updateClusters = () => {
    if (!map.current || !clusterIndex.current || !mapReady) return;

    const bounds = map.current.getBounds();
    const zoom = Math.floor(map.current.getZoom());

    const clusters = clusterIndex.current.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom
    );

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Add cluster/point markers
    clusters.forEach(cluster => {
      const [lng, lat] = cluster.geometry.coordinates;
      const isCluster = cluster.properties.cluster;

      if (isCluster) {
        const count = cluster.properties.point_count;
        const clusterId = cluster.properties.cluster_id;
        
        const leaves = clusterIndex.current!.getLeaves(clusterId, Infinity);
        const avgPrice = leaves.reduce((sum, leaf) => sum + leaf.properties.price, 0) / leaves.length;

        const el = document.createElement('div');
        el.className = 'cluster-marker';

        // Create safe DOM structure for cluster marker
        const container = document.createElement('div');
        container.className = 'relative group cursor-pointer';

        const glowEffect = document.createElement('div');
        glowEffect.className = 'absolute -inset-2 bg-gradient-to-r from-primary to-secondary rounded-full blur-md opacity-30 group-hover:opacity-50 transition-opacity';

        const markerContent = document.createElement('div');
        markerContent.className = 'relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary border-3 border-white shadow-xl flex flex-col items-center justify-center text-white group-hover:scale-110 transition-transform';

        const countSpan = document.createElement('span');
        countSpan.className = 'text-lg font-bold';
        countSpan.textContent = count.toString();

        const priceSpan = document.createElement('span');
        priceSpan.className = 'text-xs opacity-90';
        priceSpan.textContent = `${(avgPrice / 1000).toFixed(0)}k`;

        markerContent.appendChild(countSpan);
        markerContent.appendChild(priceSpan);
        container.appendChild(glowEffect);
        container.appendChild(markerContent);
        el.appendChild(container);

        el.addEventListener('click', () => {
          const expansionZoom = clusterIndex.current!.getClusterExpansionZoom(clusterId);
          map.current!.easeTo({
            center: [lng, lat],
            zoom: expansionZoom,
          });
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map.current!);

        markers.current.push(marker);
      } else {
        const property = cluster.properties;
        const el = document.createElement('div');
        el.className = 'property-marker';

        // Safe DOM manipulation for property marker
        const propertyContainer = document.createElement('div');
        propertyContainer.className = 'relative group cursor-pointer';

        const propertyGlow = document.createElement('div');
        propertyGlow.className = 'absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-25 group-hover:opacity-50 transition-opacity';

        const propertyMarker = document.createElement('div');
        propertyMarker.className = 'relative w-12 h-12 rounded-full bg-primary border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs group-hover:scale-110 transition-transform';
        propertyMarker.textContent = `${(property.price / 1000).toFixed(0)}k`;

        propertyContainer.appendChild(propertyGlow);
        propertyContainer.appendChild(propertyMarker);
        el.appendChild(propertyContainer);

        // Create safe popup DOM content to prevent XSS
        const popupContent = document.createElement('div');
        popupContent.className = 'min-w-[220px]';

        if (property.image) {
          const img = document.createElement('img');
          img.src = DOMPurify.sanitize(property.image);
          img.alt = DOMPurify.sanitize(property.title);
          img.className = 'w-full h-32 object-cover rounded-t-lg mb-2';
          popupContent.appendChild(img);
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'p-3';

        const title = document.createElement('h3');
        title.className = 'font-semibold text-sm mb-2 text-foreground';
        title.textContent = DOMPurify.sanitize(property.title);
        contentDiv.appendChild(title);

        const locationDiv = document.createElement('div');
        locationDiv.className = 'flex items-center gap-1 text-xs text-muted-foreground mb-2';

        const svgIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgIcon.setAttribute('class', 'w-3 h-3');
        svgIcon.setAttribute('fill', 'none');
        svgIcon.setAttribute('stroke', 'currentColor');
        svgIcon.setAttribute('viewBox', '0 0 24 24');

        const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path1.setAttribute('stroke-linecap', 'round');
        path1.setAttribute('stroke-linejoin', 'round');
        path1.setAttribute('stroke-width', '2');
        path1.setAttribute('d', 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z');

        const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path2.setAttribute('stroke-linecap', 'round');
        path2.setAttribute('stroke-linejoin', 'round');
        path2.setAttribute('stroke-width', '2');
        path2.setAttribute('d', 'M15 11a3 3 0 11-6 0 3 3 0 016 0z');

        svgIcon.appendChild(path1);
        svgIcon.appendChild(path2);

        const citySpan = document.createElement('span');
        citySpan.textContent = DOMPurify.sanitize(property.city);

        locationDiv.appendChild(svgIcon);
        locationDiv.appendChild(citySpan);
        contentDiv.appendChild(locationDiv);

        const pricePara = document.createElement('p');
        pricePara.className = 'text-base font-bold text-primary';

        const priceSpan = document.createElement('span');
        priceSpan.textContent = `${property.price.toLocaleString()} FCFA`;

        const perMonthSpan = document.createElement('span');
        perMonthSpan.className = 'text-xs font-normal';
        perMonthSpan.textContent = '/mois';

        pricePara.appendChild(priceSpan);
        pricePara.appendChild(perMonthSpan);
        contentDiv.appendChild(pricePara);

        const button = document.createElement('button');
        button.className = 'mt-3 w-full px-3 py-1.5 bg-primary text-white rounded-md text-xs font-medium hover:bg-primary/90 transition-colors';
        button.textContent = 'Voir les détails';
        button.addEventListener('click', () => {
          if (onPropertyClick) {
            onPropertyClick(property.propertyId);
          }
        });

        contentDiv.appendChild(button);
        popupContent.appendChild(contentDiv);

        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          className: 'property-popup',
        }).setDOMContent(popupContent);

        el.addEventListener('click', () => {
          if (onPropertyClick) {
            onPropertyClick(property.propertyId);
          }
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);

        markers.current.push(marker);
      }
    });
  };

  // Add heatmap layer
  useEffect(() => {
    if (!map.current || !mapReady || !showHeatmap) return;

    const sourceId = 'properties-heatmap';
    const layerId = 'price-heatmap';

    if (map.current.getLayer(layerId)) {
      map.current.removeLayer(layerId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }

    map.current.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: properties.map(p => ({
          type: 'Feature',
          properties: { price: p.monthly_rent },
          geometry: {
            type: 'Point',
            coordinates: [p.longitude, p.latitude],
          },
        })),
      },
    });

    map.current.addLayer({
      id: layerId,
      type: 'heatmap',
      source: sourceId,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'price'], 0, 0, 2000000, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
        'heatmap-opacity': 0.6,
      },
    });
  }, [properties, showHeatmap, mapReady]);

  // Add POI markers
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Clear existing POI markers
    poiMarkers.current.forEach(marker => marker.remove());
    poiMarkers.current = [];

    // Filter POI by active layers
    const filteredPOI = ABIDJAN_POI.filter(poi => activePOILayers.includes(poi.type));

    filteredPOI.forEach(poi => {
      const category = POI_CATEGORIES[poi.type];
      const el = document.createElement('div');

      // Safe DOM manipulation for POI marker
      const poiContainer = document.createElement('div');
      poiContainer.className = 'poi-marker cursor-pointer';

      const poiMarker = document.createElement('div');
      poiMarker.className = 'w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 transition-transform';
      poiMarker.style.backgroundColor = category.color;

      const iconSpan = document.createElement('span');
      iconSpan.className = 'text-lg';
      iconSpan.textContent = category.icon;

      poiMarker.appendChild(iconSpan);
      poiContainer.appendChild(poiMarker);
      el.appendChild(poiContainer);

      // Safe popup content for POI
      const poiPopupContent = document.createElement('div');
      poiPopupContent.className = 'p-2';

      const poiName = document.createElement('p');
      poiName.className = 'font-semibold text-sm';
      poiName.textContent = poi.name;

      const categoryLabel = document.createElement('p');
      categoryLabel.className = 'text-xs text-muted-foreground';
      categoryLabel.textContent = category.label;

      poiPopupContent.appendChild(poiName);
      poiPopupContent.appendChild(categoryLabel);

      if (poi.description) {
        const descPara = document.createElement('p');
        descPara.className = 'text-xs mt-1';
        descPara.textContent = poi.description;
        poiPopupContent.appendChild(descPara);
      }

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false })
        .setDOMContent(poiPopupContent);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([poi.longitude, poi.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      poiMarkers.current.push(marker);
    });
  }, [activePOILayers, mapReady]);

  // Add neighborhood zones
  useEffect(() => {
    if (!map.current || !mapReady || !showNeighborhoods) return;

    ABIDJAN_NEIGHBORHOODS.forEach((neighborhood, index) => {
      const sourceId = `neighborhood-${neighborhood.id}`;
      const layerId = `neighborhood-layer-${neighborhood.id}`;
      const labelLayerId = `neighborhood-label-${neighborhood.id}`;

      // Remove existing layers
      if (map.current!.getLayer(labelLayerId)) map.current!.removeLayer(labelLayerId);
      if (map.current!.getLayer(layerId)) map.current!.removeLayer(layerId);
      if (map.current!.getSource(sourceId)) map.current!.removeSource(sourceId);

      // Create polygon from bounds
      const polygon = {
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [[
            [neighborhood.bounds.west, neighborhood.bounds.north],
            [neighborhood.bounds.east, neighborhood.bounds.north],
            [neighborhood.bounds.east, neighborhood.bounds.south],
            [neighborhood.bounds.west, neighborhood.bounds.south],
            [neighborhood.bounds.west, neighborhood.bounds.north],
          ]],
        },
        properties: {
          name: neighborhood.name,
          avgPrice: neighborhood.priceRange.average,
        },
      };

      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: polygon,
      });

      const color = getPriceColor(neighborhood.priceRange.average);

      // Add fill layer
      map.current!.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': color,
          'fill-opacity': 0.15,
        },
      });

      // Add border
      map.current!.addLayer({
        id: `${layerId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': color,
          'line-width': 2,
          'line-opacity': 0.5,
        },
      });

      // Add label
      map.current!.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'text-field': neighborhood.name,
          'text-size': 14,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        },
        paint: {
          'text-color': color,
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
      });

      // Click handler
      map.current!.on('click', layerId, () => {
        if (onNeighborhoodClick) {
          onNeighborhoodClick(neighborhood);
        }
      });

      // Cursor pointer
      map.current!.on('mouseenter', layerId, () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });
      map.current!.on('mouseleave', layerId, () => {
        map.current!.getCanvas().style.cursor = '';
      });
    });
  }, [showNeighborhoods, mapReady, onNeighborhoodClick]);

  const handleLocate = () => {
    if (navigator.geolocation && map.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          map.current!.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
            zoom: 14,
          });
        },
        (error) => logger.logError(error, { context: 'Geolocation' })
      );
    }
  };

  if (!mapboxToken) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <p className="text-muted-foreground">Mapbox token non configuré</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full rounded-lg" />

      {/* Map Controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button size="icon" variant="secondary" className="shadow-lg bg-background/90 backdrop-blur-sm" onClick={handleLocate}>
            <Locate className="h-4 w-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button size="icon" variant="secondary" className="shadow-lg bg-background/90 backdrop-blur-sm" onClick={() => map.current?.zoomIn()}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button size="icon" variant="secondary" className="shadow-lg bg-background/90 backdrop-blur-sm" onClick={() => map.current?.zoomOut()}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>

      {/* Style Switcher */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        {(['streets', 'satellite', 'hybrid'] as MapStyle[]).map((style) => (
          <motion.div key={style} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              variant={mapStyle === style ? 'default' : 'secondary'}
              className="shadow-lg bg-background/90 backdrop-blur-sm"
              onClick={() => setMapStyle(style)}
            >
              {style === 'streets' && <Map className="h-4 w-4 mr-1" />}
              {style === 'satellite' && <Satellite className="h-4 w-4 mr-1" />}
              {style === 'hybrid' && <Layers className="h-4 w-4 mr-1" />}
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

