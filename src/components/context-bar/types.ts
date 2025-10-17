export interface WidgetProps {
  isLoading?: boolean;
  hasError?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  tooltip?: React.ReactNode;
}

export interface GeolocationData {
  city: string;
  neighborhood?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface WeatherData {
  temperature: number;
  description: string;
  icon: string;
  humidity?: number;
  windSpeed?: number;
  feelsLike?: number;
}
