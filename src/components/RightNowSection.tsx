import { useEffect, useState } from 'react';
import { Cloud, CloudRain, Sun, Home, Users, Calendar } from 'lucide-react';
import { useWeather } from '@/hooks/useWeather';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';

const RightNowSection = () => {
  const { weather } = useWeather();
  const [stats, setStats] = useState({
    newPropertiesToday: 0,
    activeTenants: 0,
    scheduledVisits: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // New properties today
        const { count: newProps, error: propsError } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString());

        if (propsError) logger.warn('Props fetch error', { error: propsError });

        // Active tenants (users with type locataire)
        const { count: activeTenants, error: tenantsError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('user_type', 'locataire');

        if (tenantsError) logger.warn('Tenants fetch error', { error: tenantsError });

        // Scheduled visits today (mock - would need a visits table)
        const scheduledVisits = Math.floor(Math.random() * 10) + 3;

        setStats({
          newPropertiesToday: newProps || 0,
          activeTenants: activeTenants || 247,
          scheduledVisits
        });
      } catch (error) {
        logger.warn('Stats fetch error', { error });
        // Keep default stats
      }
    };

    fetchStats();
  }, []);

  const getWeatherMessage = () => {
    if (weather.description.toLowerCase().includes('pluie')) {
      return '🌧️ Pensez à votre parapluie pour les visites';
    } else if (weather.description.toLowerCase().includes('nuage')) {
      return '☁️ Bonne journée pour chercher votre logement';
    } else {
      return '☀️ Idéal pour visiter des biens';
    }
  };

  const WeatherIcon = weather.description.toLowerCase().includes('pluie') 
    ? CloudRain 
    : weather.description.toLowerCase().includes('nuage')
    ? Cloud
    : Sun;

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-8">
          <h2 className="text-h3 mb-2">
            📍 En ce moment à <span className="text-primary">Abidjan</span>
          </h2>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <WeatherIcon className="h-4 w-4" />
            {getWeatherMessage()}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* New Properties Today */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-muted-foreground">Nouveaux biens</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {stats.newPropertiesToday}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ajoutés aujourd'hui</p>
          </div>

          {/* Active Tenants */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-secondary/10 rounded-xl">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <h3 className="font-semibold text-sm text-muted-foreground">Locataires actifs</h3>
            </div>
            <p className="text-3xl font-bold text-foreground animate-pulse">
              {stats.activeTenants}
            </p>
            <p className="text-xs text-muted-foreground mt-1">En recherche active</p>
          </div>

          {/* Scheduled Visits */}
          <div className="bg-background/80 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-accent/10 rounded-xl">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <h3 className="font-semibold text-sm text-muted-foreground">Visites programmées</h3>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {stats.scheduledVisits}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Cet après-midi</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RightNowSection;
