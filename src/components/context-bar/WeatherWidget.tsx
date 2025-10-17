import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  CloudSun,
  CloudMoon,
  Moon
} from 'lucide-react';
import { Widget } from './Widget';
import type { WeatherData } from './types';

const WEATHER_ICONS = {
  'sun': Sun,
  'moon': Moon,
  'cloud': Cloud,
  'cloud-sun': CloudSun,
  'cloud-moon': CloudMoon,
  'cloud-rain': CloudRain,
  'cloud-lightning': CloudLightning,
  'snowflake': CloudSnow
};

interface WeatherWidgetProps {
  weather: WeatherData;
  isLoading: boolean;
  error: Error | null;
  onRefresh: () => void;
}

export const WeatherWidget = ({ 
  weather, 
  isLoading, 
  error,
  onRefresh 
}: WeatherWidgetProps) => {
  const WeatherIcon = WEATHER_ICONS[weather.icon as keyof typeof WEATHER_ICONS] || Sun;

  return (
    <Widget
      isLoading={isLoading}
      hasError={!!error}
      onClick={onRefresh}
      ariaLabel="Météo actuelle - Cliquer pour rafraîchir"
    >
      <WeatherIcon className="h-4 w-4 text-warning group-hover:scale-110 transition-transform" />
      <span className="font-semibold text-sm">{weather.temperature}°C</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">
        {weather.description}
      </span>
    </Widget>
  );
};
