import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Neighborhood } from '@/data/abidjanNeighborhoods';
import { 
  MapPin, 
  TrendingUp, 
  Users, 
  DollarSign,
  Bus,
  ShoppingCart,
  GraduationCap,
  Shield,
  Heart,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface NeighborhoodCardProps {
  neighborhood: Neighborhood;
  onClose: () => void;
}

export const NeighborhoodCard = ({ neighborhood, onClose }: NeighborhoodCardProps) => {
  const formatPrice = (price: number) => `${(price / 1000).toFixed(0)}k FCFA`;
  
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Bon';
    if (score >= 4) return 'Moyen';
    return 'Faible';
  };

  const overallScore = Math.round(
    (neighborhood.scores.transport +
      neighborhood.scores.commerce +
      neighborhood.scores.education +
      neighborhood.scores.security +
      neighborhood.scores.healthcare) / 5
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 z-50"
    >
      <Card className="shadow-2xl border-2 border-primary/20 bg-background/95 backdrop-blur-sm">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-secondary/10">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-xl">
                <MapPin className="h-5 w-5 text-primary" />
                {neighborhood.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {neighborhood.description}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
          {/* Overall Score */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10">
            <div>
              <p className="text-sm text-muted-foreground">Note globale</p>
              <p className="text-2xl font-bold text-primary">{overallScore}/10</p>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {getScoreLabel(overallScore)}
            </Badge>
          </div>

          <Separator />

          {/* Price Range */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <DollarSign className="h-4 w-4 text-primary" />
              Fourchette de prix
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Min</p>
                <p className="text-sm font-bold">{formatPrice(neighborhood.priceRange.min)}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <p className="text-xs text-muted-foreground">Moyen</p>
                <p className="text-sm font-bold text-primary">{formatPrice(neighborhood.priceRange.average)}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Max</p>
                <p className="text-sm font-bold">{formatPrice(neighborhood.priceRange.max)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Scores */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Qualité de vie</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Bus className="h-4 w-4 text-green-500" />
                  <span>Transports</span>
                </div>
                <span className={`font-semibold ${getScoreColor(neighborhood.scores.transport)}`}>
                  {neighborhood.scores.transport}/10
                </span>
              </div>
              <Progress value={neighborhood.scores.transport * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-orange-500" />
                  <span>Commerces</span>
                </div>
                <span className={`font-semibold ${getScoreColor(neighborhood.scores.commerce)}`}>
                  {neighborhood.scores.commerce}/10
                </span>
              </div>
              <Progress value={neighborhood.scores.commerce * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-500" />
                  <span>Éducation</span>
                </div>
                <span className={`font-semibold ${getScoreColor(neighborhood.scores.education)}`}>
                  {neighborhood.scores.education}/10
                </span>
              </div>
              <Progress value={neighborhood.scores.education * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-500" />
                  <span>Sécurité</span>
                </div>
                <span className={`font-semibold ${getScoreColor(neighborhood.scores.security)}`}>
                  {neighborhood.scores.security}/10
                </span>
              </div>
              <Progress value={neighborhood.scores.security * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span>Santé</span>
                </div>
                <span className={`font-semibold ${getScoreColor(neighborhood.scores.healthcare)}`}>
                  {neighborhood.scores.healthcare}/10
                </span>
              </div>
              <Progress value={neighborhood.scores.healthcare * 10} className="h-2" />
            </div>
          </div>

          <Separator />

          {/* Characteristics */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Caractéristiques</p>
            <div className="flex flex-wrap gap-2">
              {neighborhood.characteristics.map((char, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {char}
                </Badge>
              ))}
            </div>
          </div>

          {/* Population */}
          {neighborhood.population && (
            <>
              <Separator />
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Population</span>
                </div>
                <span className="font-semibold">{neighborhood.population.toLocaleString()}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

