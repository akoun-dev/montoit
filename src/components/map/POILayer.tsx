import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { POI_CATEGORIES } from '@/data/abidjanPOI';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

export type POIType = 'school' | 'transport' | 'hospital' | 'market' | 'mall' | 'restaurant';

interface POILayerProps {
  activeLayers: POIType[];
  onLayerToggle: (layer: POIType) => void;
}

export const POILayer = ({ activeLayers, onLayerToggle }: POILayerProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="w-full bg-gradient-to-b from-background to-muted/20 border-border/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5 text-primary" />
            Points d'intérêt
          </CardTitle>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Affichez les lieux importants autour des biens
          </p>

          <Separator />

          <div className="space-y-2">
            {(Object.keys(POI_CATEGORIES) as POIType[]).map((type) => {
              const category = POI_CATEGORIES[type];
              const isActive = activeLayers.includes(type);

              return (
                <motion.div
                  key={type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary'
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={isActive}
                      onCheckedChange={() => onLayerToggle(type)}
                    />
                    <span className="text-2xl">{category.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{category.label}</p>
                    </div>
                    {isActive && (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                      >
                        Actif
                      </Badge>
                    )}
                  </label>
                </motion.div>
              );
            })}
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground">
            <p>
              <strong>{activeLayers.length}</strong> couche{activeLayers.length > 1 ? 's' : ''} active{activeLayers.length > 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

