import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { EnhancedMap } from '@/components/map/EnhancedMap';
import { MapFilters, MapFiltersState } from '@/components/map/MapFilters';
import { POILayer, POIType } from '@/components/map/POILayer';
import { NeighborhoodCard } from '@/components/map/NeighborhoodCard';
import { useMapProperties, useMapStats } from '@/hooks/useMapProperties';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Map as MapIcon, 
  TrendingUp, 
  Activity,
  Layers,
  Eye,
  EyeOff,
  MapPinned
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { KentePattern } from '@/components/ui/african-patterns';
import type { Neighborhood } from '@/data/abidjanNeighborhoods';

const SmartMapV2 = () => {
  const navigate = useNavigate();
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showNeighborhoods, setShowNeighborhoods] = useState(true);
  const [activePOILayers, setActivePOILayers] = useState<POIType[]>([]);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<Neighborhood | null>(null);
  
  const [filters, setFilters] = useState<MapFiltersState>({
    minPrice: 0,
    maxPrice: 2000000,
    propertyType: 'all',
    minBedrooms: 1,
    maxBedrooms: 5,
    amenities: [],
  });

  const queryFilters = {
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    propertyType: filters.propertyType === 'all' ? undefined : filters.propertyType,
    minBedrooms: filters.minBedrooms,
    maxBedrooms: filters.maxBedrooms,
    amenities: filters.amenities.length > 0 ? filters.amenities : undefined,
  };

  const { data: properties = [], isLoading, error } = useMapProperties({
    filters: queryFilters,
    refetchInterval: 30000,
  });

  const stats = useMapStats(properties);

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/properties/${propertyId}`);
  };

  const handlePOILayerToggle = (layer: POIType) => {
    setActivePOILayers(prev =>
      prev.includes(layer)
        ? prev.filter(l => l !== layer)
        : [...prev, layer]
    );
  };

  const handleNeighborhoodClick = (neighborhood: Neighborhood) => {
    setSelectedNeighborhood(neighborhood);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24">
        {/* Hero Section */}
        <section className="relative py-8 bg-gradient-to-r from-primary/10 via-secondary/5 to-primary/10">
          <KentePattern />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Badge variant="secondary" className="mb-4">
                  <MapIcon className="h-3 w-3 mr-1" />
                  Carte Intelligente V2
                </Badge>
                <h1 className="text-h1 mb-4">
                  Explorez <span className="text-gradient-primary">Abidjan</span> intelligemment
                </h1>
                <p className="text-body-lg text-muted-foreground">
                  Découvrez les biens avec clustering, heatmap, POI, zones de quartiers et analyse complète
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar with Filters */}
              <motion.div
                className="lg:w-80 flex-shrink-0 space-y-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {isLoading ? (
                  <Card className="p-6">
                    <Skeleton className="h-8 w-full mb-4" />
                    <Skeleton className="h-32 w-full mb-4" />
                    <Skeleton className="h-8 w-full mb-4" />
                    <Skeleton className="h-32 w-full" />
                  </Card>
                ) : (
                  <>
                    <MapFilters
                      filters={filters}
                      onFiltersChange={setFilters}
                      stats={stats}
                    />

                    {/* Heatmap Toggle */}
                    <Card className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-secondary" />
                          <span className="text-sm font-semibold">Heatmap des prix</span>
                        </div>
                        <Button
                          size="sm"
                          variant={showHeatmap ? 'default' : 'outline'}
                          onClick={() => setShowHeatmap(!showHeatmap)}
                        >
                          {showHeatmap ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Visualisez les zones de prix sur la carte
                      </p>
                    </Card>

                    {/* Neighborhoods Toggle */}
                    <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPinned className="h-4 w-4 text-primary" />
                          <Label htmlFor="neighborhoods-toggle" className="text-sm font-semibold cursor-pointer">
                            Zones de quartiers
                          </Label>
                        </div>
                        <Switch
                          id="neighborhoods-toggle"
                          checked={showNeighborhoods}
                          onCheckedChange={setShowNeighborhoods}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Afficher les délimitations et prix par quartier
                      </p>
                    </Card>

                    {/* POI Layers */}
                    <POILayer
                      activeLayers={activePOILayers}
                      onLayerToggle={handlePOILayerToggle}
                    />

                    {/* Quick Stats */}
                    <Card className="p-4">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Statistiques rapides
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quartiers</span>
                          <span className="font-semibold">{stats.neighborhoods}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prix min</span>
                          <span className="font-semibold">{(stats.minPrice / 1000).toFixed(0)}k FCFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Prix max</span>
                          <span className="font-semibold">{(stats.maxPrice / 1000).toFixed(0)}k FCFA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">POI actifs</span>
                          <span className="font-semibold">{activePOILayers.length}</span>
                        </div>
                      </div>
                    </Card>
                  </>
                )}
              </motion.div>

              {/* Map Container */}
              <motion.div
                className="flex-1 min-h-[600px] lg:min-h-[800px]"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="h-full overflow-hidden shadow-2xl border-border/50">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center bg-muted/20">
                      <div className="text-center">
                        <Layers className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
                        <p className="text-muted-foreground">Chargement de la carte...</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="h-full flex items-center justify-center bg-muted/20">
                      <div className="text-center">
                        <p className="text-destructive mb-2">Erreur de chargement</p>
                        <p className="text-sm text-muted-foreground">
                          Impossible de charger les propriétés
                        </p>
                      </div>
                    </div>
                  ) : (
                    <EnhancedMap
                      properties={properties}
                      onPropertyClick={handlePropertyClick}
                      showHeatmap={showHeatmap}
                      showClusters={true}
                      activePOILayers={activePOILayers}
                      showNeighborhoods={showNeighborhoods}
                      onNeighborhoodClick={handleNeighborhoodClick}
                    />
                  )}
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Neighborhood Card Overlay */}
        <AnimatePresence>
          {selectedNeighborhood && (
            <NeighborhoodCard
              neighborhood={selectedNeighborhood}
              onClose={() => setSelectedNeighborhood(null)}
            />
          )}
        </AnimatePresence>

        {/* Info Section */}
        <section className="py-12 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-h2 mb-6">
                Une carte <span className="text-gradient-secondary">vraiment intelligente</span>
              </h2>
              <div className="grid md:grid-cols-4 gap-6 mt-8">
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Layers className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Clustering</h3>
                  <p className="text-sm text-muted-foreground">
                    Regroupement intelligent des biens
                  </p>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">Heatmap</h3>
                  <p className="text-sm text-muted-foreground">
                    Zones de prix visualisées
                  </p>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <MapPinned className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">POI</h3>
                  <p className="text-sm text-muted-foreground">
                    Écoles, transports, commerces
                  </p>
                </Card>

                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold mb-2">Analyse</h3>
                  <p className="text-sm text-muted-foreground">
                    Statistiques par quartier
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SmartMapV2;

