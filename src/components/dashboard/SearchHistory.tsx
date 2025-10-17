import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Home, DollarSign, RefreshCw, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';

interface SearchHistoryItem {
  id: string;
  search_filters: any;
  result_count: number;
  clicked_properties: string[];
  created_at: string;
}

const SearchHistory = () => {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    topCities: { city: string; count: number }[];
    avgBudget: number;
  }>({ topCities: [], avgBudget: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const fetchSearchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setHistory(data || []);
      calculateStats(data || []);
    } catch (error) {
      logger.logError(error, { context: 'SearchHistory', action: 'fetch' });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (searches: SearchHistoryItem[]) => {
    const cityCount: Record<string, number> = {};
    let totalBudget = 0;
    let budgetCount = 0;

    searches.forEach(search => {
      if (search.search_filters.city) {
        search.search_filters.city.forEach(city => {
          cityCount[city] = (cityCount[city] || 0) + 1;
        });
      }
      if (search.search_filters.max_budget) {
        totalBudget += search.search_filters.max_budget;
        budgetCount++;
      }
    });

    const topCities = Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    setStats({
      topCities,
      avgBudget: budgetCount > 0 ? totalBudget / budgetCount : 0
    });
  };

  const relaunhSearch = (filters: any) => {
    const params = new URLSearchParams();
    if (filters.city?.length) params.set('city', filters.city.join(','));
    if (filters.property_type?.length) params.set('type', filters.property_type.join(','));
    if (filters.min_budget) params.set('minPrice', filters.min_budget);
    if (filters.max_budget) params.set('maxPrice', filters.max_budget);
    if (filters.min_bedrooms) params.set('bedrooms', filters.min_bedrooms);

    navigate(`/search?${params.toString()}`);
    toast({
      title: "Recherche relancée",
      description: "Vous avez été redirigé vers les résultats",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique de recherches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Vos tendances de recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Villes les plus recherchées</h4>
              <div className="space-y-2">
                {stats.topCities.map(({ city, count }) => (
                  <div key={city} className="flex items-center justify-between">
                    <span className="text-sm">{city}</span>
                    <Badge variant="secondary">{count} fois</Badge>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Budget moyen recherché</h4>
              <p className="text-2xl font-bold text-primary">
                {stats.avgBudget > 0 ? `${stats.avgBudget.toLocaleString()} FCFA/mois` : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historique de recherches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune recherche récente
            </p>
          ) : (
            <div className="space-y-4">
              {history.map((search) => (
                <div
                  key={search.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {format(new Date(search.created_at), 'PPP à HH:mm', { locale: fr })}
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {search.search_filters.city?.map(city => (
                          <Badge key={city} variant="outline">
                            <MapPin className="h-3 w-3 mr-1" />
                            {city}
                          </Badge>
                        ))}
                        {search.search_filters.property_type?.map(type => (
                          <Badge key={type} variant="outline">
                            <Home className="h-3 w-3 mr-1" />
                            {type}
                          </Badge>
                        ))}
                        {(search.search_filters.min_budget || search.search_filters.max_budget) && (
                          <Badge variant="outline">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {search.search_filters.min_budget?.toLocaleString() || 0} - {search.search_filters.max_budget?.toLocaleString() || '∞'} FCFA
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {search.result_count} résultat{search.result_count > 1 ? 's' : ''}
                        </span>
                        {search.clicked_properties.length > 0 && (
                          <span className="text-muted-foreground">
                            {search.clicked_properties.length} bien{search.clicked_properties.length > 1 ? 's' : ''} consulté{search.clicked_properties.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => relaunhSearch(search.search_filters)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Relancer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SearchHistory;