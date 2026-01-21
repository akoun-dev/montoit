import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Bookmark, Bell, BellOff, Search, Trash2, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface SearchFilters {
  city?: string;
  property_type?: string;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  furnished?: boolean;
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
  notifications_enabled: boolean | null;
  created_at: string | null;
}

interface PropertyAlert {
  id: string;
  city: string | null;
  property_type: string | null;
  min_price: number | null;
  max_price: number | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
  is_active: boolean | null;
  last_notified_at: string | null;
  created_at: string | null;
}

export default function SavedSearches() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [alerts, setAlerts] = useState<PropertyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: searchesData } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const formattedSearches: SavedSearch[] = (searchesData || []).map((s) => ({
        id: s.id,
        name: s.name,
        filters: (s.filters as SearchFilters) || {},
        notifications_enabled: s.notifications_enabled,
        created_at: s.created_at,
      }));

      setSearches(formattedSearches);

      const { data: alertsData } = await supabase
        .from('property_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      setAlerts((alertsData || []) as PropertyAlert[]);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlert = async (searchId: string, currentStatus: boolean | null) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .update({ notifications_enabled: !currentStatus })
        .eq('id', searchId);

      if (error) throw error;

      setSearches((prev) =>
        prev.map((s) => (s.id === searchId ? { ...s, notifications_enabled: !currentStatus } : s))
      );
    } catch (err) {
      console.error('Error toggling alert:', err);
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    if (!confirm('Supprimer cette recherche sauvegardée ?')) return;

    try {
      const { error } = await supabase.from('saved_searches').delete().eq('id', searchId);

      if (error) throw error;

      setSearches((prev) => prev.filter((s) => s.id !== searchId));
    } catch (err) {
      console.error('Error deleting search:', err);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('property_alerts')
        .update({ is_active: false })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error('Error deleting alert:', err);
    }
  };

  const handleExecuteSearch = (search: SavedSearch) => {
    const params = new URLSearchParams();
    const filters = search.filters;

    if (filters.city) params.set('city', filters.city);
    if (filters.property_type) params.set('type', filters.property_type);
    if (filters.min_price) params.set('minPrice', filters.min_price.toString());
    if (filters.max_price) params.set('maxPrice', filters.max_price.toString());
    if (filters.min_bedrooms) params.set('bedrooms', filters.min_bedrooms.toString());
    if (filters.furnished !== undefined)
      params.set('furnished', filters.furnished.toString());

    navigate(`/recherche?${params.toString()}`);
  };

  const getSearchSummary = (search: SavedSearch) => {
    const parts: string[] = [];
    const filters = search.filters;

    if (filters.property_type) {
      const types: Record<string, string> = {
        appartement: 'Appartement',
        maison: 'Maison',
        studio: 'Studio',
        villa: 'Villa',
      };
      parts.push(types[filters.property_type] || filters.property_type);
    }

    if (filters.city) parts.push(filters.city);

    if (filters.min_bedrooms) parts.push(`${filters.min_bedrooms}+ chambres`);

    if (filters.min_price || filters.max_price) {
      if (filters.min_price && filters.max_price) {
        parts.push(
          `${filters.min_price.toLocaleString()} - ${filters.max_price.toLocaleString()} FCFA`
        );
      } else if (filters.min_price) {
        parts.push(`À partir de ${filters.min_price.toLocaleString()} FCFA`);
      } else if (filters.max_price) {
        parts.push(`Jusqu'à ${filters.max_price.toLocaleString()} FCFA`);
      }
    }

    if (filters.furnished) parts.push('Meublé');

    return parts.join(' • ') || 'Recherche personnalisée';
  };

  const getAlertSummary = (alert: PropertyAlert) => {
    const parts: string[] = [];

    if (alert.property_type) parts.push(alert.property_type);
    if (alert.city) parts.push(alert.city);
    if (alert.min_bedrooms) parts.push(`${alert.min_bedrooms}+ ch.`);
    if (alert.min_price || alert.max_price) {
      if (alert.min_price && alert.max_price) {
        parts.push(
          `${alert.min_price.toLocaleString()} - ${alert.max_price.toLocaleString()} FCFA`
        );
      } else if (alert.min_price) {
        parts.push(`Min ${alert.min_price.toLocaleString()} FCFA`);
      } else if (alert.max_price) {
        parts.push(`Max ${alert.max_price.toLocaleString()} FCFA`);
      }
    }

    return parts.join(' • ') || 'Alerte personnalisée';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="w-full px-4">
        {/* Header Banner */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
              <Bookmark className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Recherches Sauvegardées</h1>
              <p className="text-[#E8D4C5] mt-1">Gérez vos recherches et recevez des alertes</p>
            </div>
          </div>
        </div>

        {/* Alertes actives */}
        {alerts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <span>Alertes actives ({alerts.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-card border border-border rounded-[20px] p-4 relative hover:border-primary/30 transition-colors"
                >
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-semibold text-foreground">Alerte active</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{getAlertSummary(alert)}</p>
                  {alert.last_notified_at && (
                    <p className="text-xs text-muted-foreground">
                      Dernière notification:{' '}
                      {new Date(alert.last_notified_at).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mes recherches */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Mes recherches ({searches.length})</h2>
          <Link
            to="/recherche"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-full hover:bg-muted transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Nouvelle recherche</span>
          </Link>
        </div>

        <div className="space-y-4">
          {searches.map((search) => (
            <div
              key={search.id}
              className="bg-card border border-border rounded-[20px] p-6 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-foreground mb-1">{search.name}</h3>
                  <p className="text-muted-foreground mb-2">{getSearchSummary(search)}</p>
                  {search.created_at && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Créée le {new Date(search.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAlert(search.id, search.notifications_enabled)}
                    className={`p-2.5 rounded-xl transition-colors ${
                      search.notifications_enabled
                        ? 'bg-green-100 text-green-600 hover:bg-green-200'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    title={
                      search.notifications_enabled
                        ? 'Notifications activées'
                        : 'Notifications désactivées'
                    }
                  >
                    {search.notifications_enabled ? (
                      <Bell className="w-5 h-5" />
                    ) : (
                      <BellOff className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteSearch(search.id)}
                    className="p-2.5 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {search.notifications_enabled && (
                <div className="p-3 bg-green-50 rounded-xl mb-4 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-800 font-medium">Notifications activées</span>
                </div>
              )}

              <button
                onClick={() => handleExecuteSearch(search)}
                className="w-full py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                <span>Lancer la recherche</span>
              </button>
            </div>
          ))}

          {searches.length === 0 && (
            <div className="text-center py-16 bg-card border border-border rounded-[20px]">
              <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Bookmark className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-xl font-semibold text-foreground mb-2">
                Aucune recherche sauvegardée
              </p>
              <p className="text-muted-foreground mb-6">
                Sauvegardez vos recherches pour les retrouver facilement
              </p>
              <Link
                to="/recherche"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Commencer une recherche</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
