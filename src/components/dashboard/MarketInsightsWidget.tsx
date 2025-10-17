import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, MapPin, Clock, DollarSign, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/services/logger';

interface MarketTrend {
  city: string;
  avg_price_per_sqm: number;
  total_properties: number;
  avg_rent: number;
  trend_percentage: number;
  similar_cheaper_cities: string[];
  avg_rental_days: number;
}

interface MarketInsightsData {
  trends: MarketTrend[];
  generated_at: string;
  message?: string;
}

interface MarketInsightsWidgetProps {
  className?: string;
}

export const MarketInsightsWidget = ({ className }: MarketInsightsWidgetProps) => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<MarketInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketInsights = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: functionError } = await supabase.functions.invoke(
          'analyze-market-trends',
          {
            body: {},
          }
        );

        if (functionError) throw functionError;

        setInsights(data);
      } catch (err: any) {
        logger.logError(err, { 
          context: 'MarketInsightsWidget', 
          action: 'fetch',
          userId: user?.id || 'anonymous'
        });
        setError(err.message || 'Impossible de charger les insights du marché');
      } finally {
        setLoading(false);
      }
    };

    fetchMarketInsights();
  }, [user]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Marché immobilier
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Marché immobilier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.trends.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Marché immobilier
          </CardTitle>
          <CardDescription>
            {insights?.message || 'Commencez à rechercher des biens pour voir les tendances du marché'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Marché immobilier
        </CardTitle>
        <CardDescription>
          Analyse basée sur vos recherches récentes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {insights.trends.map((trend) => (
          <div key={trend.city} className="space-y-3 pb-6 border-b last:border-b-0 last:pb-0">
            {/* City Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-lg">{trend.city}</h3>
              </div>
              <Badge variant={trend.trend_percentage >= 0 ? 'default' : 'secondary'}>
                {trend.trend_percentage >= 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(trend.trend_percentage)}%
              </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Prix moyen */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <DollarSign className="h-3 w-3" />
                  <span>Prix moyen</span>
                </div>
                <p className="text-lg font-bold">
                  {trend.avg_rent.toLocaleString()} FCFA
                </p>
                <p className="text-xs text-muted-foreground">
                  {trend.avg_price_per_sqm.toLocaleString()} FCFA/m²
                </p>
              </div>

              {/* Délai moyen */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Clock className="h-3 w-3" />
                  <span>Délai moyen</span>
                </div>
                <p className="text-lg font-bold">{trend.avg_rental_days} jours</p>
                <p className="text-xs text-muted-foreground">
                  Temps de location
                </p>
              </div>

              {/* Nombre de biens */}
              <div className="bg-muted/50 p-3 rounded-lg col-span-2">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Home className="h-3 w-3" />
                  <span>Offre disponible</span>
                </div>
                <p className="text-lg font-bold">{trend.total_properties} biens</p>
              </div>
            </div>

            {/* Quartiers similaires moins chers */}
            {trend.similar_cheaper_cities.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">
                  💡 Quartiers similaires moins chers :
                </p>
                <div className="flex flex-wrap gap-2">
                  {trend.similar_cheaper_cities.map((city) => (
                    <Badge key={city} variant="outline" className="text-xs">
                      {city}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Tendance */}
            <div className="text-xs text-muted-foreground">
              {trend.trend_percentage > 0 ? (
                <p>📈 Hausse de {trend.trend_percentage}% ce trimestre</p>
              ) : trend.trend_percentage < 0 ? (
                <p>📉 Baisse de {Math.abs(trend.trend_percentage)}% ce trimestre</p>
              ) : (
                <p>➡️ Marché stable ce trimestre</p>
              )}
            </div>
          </div>
        ))}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Mis à jour : {new Date(insights.generated_at).toLocaleDateString('fr-FR')}
        </p>
      </CardContent>
    </Card>
  );
};
