import { useState } from 'react';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useWeather } from '@/hooks/useWeather';
import { LocationWidget } from './context-bar/LocationWidget';
import { WeatherWidget } from './context-bar/WeatherWidget';
import { ClockWidget } from './context-bar/ClockWidget';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

const ContextBar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { formatTime, formatDate, dayPeriod } = useCurrentTime();
  const { location, isLoading: locationLoading, error: locationError, refresh: refreshLocation } = useGeolocation();
  const { weather, isLoading: weatherLoading, error: weatherError, refresh: refreshWeather } = useWeather();

  const handleLocationRefresh = async () => {
    await refreshLocation();
    toast.success('Localisation actualisée');
  };

  const handleWeatherRefresh = async () => {
    await refreshWeather();
    toast.success('Météo actualisée');
  };

  return (
    <div 
      className="w-full bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 border-b border-border/50 backdrop-blur-md relative z-30"
      role="banner"
      aria-label="Barre d'informations contextuelles"
    >
      {isCollapsed ? (
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="h-8 flex items-center justify-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsCollapsed(false)}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              Infos contextuelles
            </Button>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="py-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 md:gap-6 text-sm flex-1 justify-center">
                <LocationWidget
                  location={location}
                  isLoading={locationLoading}
                  error={locationError}
                  onRefresh={handleLocationRefresh}
                />

                <span className="text-border/40" aria-hidden="true">•</span>

                <WeatherWidget
                  weather={weather}
                  isLoading={weatherLoading}
                  error={weatherError}
                  onRefresh={handleWeatherRefresh}
                />

                <span className="text-border/40 hidden md:inline" aria-hidden="true">•</span>

                <div className="hidden md:block">
                  <ClockWidget
                    formatTime={formatTime}
                    formatDate={formatDate}
                    dayPeriod={dayPeriod}
                  />
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsCollapsed(true)}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContextBar;
