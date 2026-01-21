import { ReactNode, useState, useEffect } from 'react';
import { useFeatureFlag } from '@/hooks/shared/useFeatureFlag';
import { Map, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface MapProviderProps {
  mapboxComponent: ReactNode;
  azureMapsComponent?: ReactNode;
  fallback?: ReactNode;
  showProviderInfo?: boolean;
}

/**
 * Provider intelligent pour les cartes
 * Gère le basculement automatique entre Mapbox et Azure Maps
 */
export function MapProvider({
  mapboxComponent,
  azureMapsComponent,
  fallback,
  showProviderInfo = false,
}: MapProviderProps) {
  const { isEnabled: mapboxEnabled, isLoading: mapboxLoading } = useFeatureFlag('mapbox_maps');
  const { isEnabled: azureEnabled, isLoading: azureLoading } = useFeatureFlag('azure_maps');
  const [mapError, setMapError] = useState(false);
  const [activeProvider, setActiveProvider] = useState<'mapbox' | 'azure' | 'none'>('none');

  useEffect(() => {
    if (mapboxLoading || azureLoading) return;

    if (mapboxEnabled && !mapError) {
      setActiveProvider('mapbox');
    } else if (azureEnabled) {
      setActiveProvider('azure');
    } else {
      setActiveProvider('none');
    }
  }, [mapboxEnabled, azureEnabled, mapboxLoading, azureLoading, mapError]);

  const handleMapError = () => {
    setMapError(true);
    if (azureEnabled && activeProvider === 'mapbox') {
      setActiveProvider('azure');
    } else {
      setActiveProvider('none');
    }
  };

  const handleRetry = () => {
    setMapError(false);
    if (mapboxEnabled) {
      setActiveProvider('mapbox');
    }
  };

  if (mapboxLoading || azureLoading) {
    return (
      <div className="w-full h-full min-h-[400px] bg-muted rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (activeProvider === 'none') {
    return fallback || <MapFallback onRetry={handleRetry} />;
  }

  return (
    <div className="relative w-full h-full">
      {/* Provider Info Badge */}
      {showProviderInfo && (
        <div className="absolute top-3 left-3 z-10 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-border">
          <div className="flex items-center gap-2 text-sm">
            <Map className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              {activeProvider === 'mapbox' ? 'Mapbox' : 'Azure Maps'}
            </span>
          </div>
        </div>
      )}

      {/* Map Content with Error Boundary */}
      <MapErrorBoundary onError={handleMapError}>
        {activeProvider === 'mapbox' && mapboxComponent}
        {activeProvider === 'azure' && azureMapsComponent}
      </MapErrorBoundary>
    </div>
  );
}

/**
 * Fallback quand aucune carte n'est disponible
 */
function MapFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full h-full min-h-[400px] bg-gradient-to-br from-muted to-muted/50 rounded-xl flex items-center justify-center">
      <div className="text-center p-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Carte non disponible</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          Le service de cartographie est temporairement indisponible. Les propriétés restent
          accessibles via la liste.
        </p>
        <Button onClick={onRetry} variant="outline" size="small">
          <RefreshCw className="w-4 h-4 mr-2" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}

/**
 * Error Boundary pour les erreurs de rendu de carte
 */
import { Component, ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Map error:', error, errorInfo);
    this.props.onError();
  }

  override render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default MapProvider;
