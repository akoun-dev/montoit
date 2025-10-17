import { MapPin, ArrowRight, Cloud, CloudRain, Sun } from "lucide-react";
import { Button } from "./ui/button";
import PropertyMap from "./PropertyMap";
import { Link } from "react-router-dom";
import { useWeather } from "@/hooks/useWeather";
import { Badge } from "./ui/badge";

/**
 * Mock featured properties data for map demonstration
 * These are example properties located in different neighborhoods of Abidjan
 * In production, this would be fetched from the database
 */
const featuredProperties = [
  {
    id: "1",
    title: "Appartement 3 pièces - Cocody",
    city: "Cocody",
    monthly_rent: 350000,
    latitude: 5.3599,
    longitude: -3.9889,
    main_image: null
  },
  {
    id: "2",
    title: "Villa F4 - Plateau",
    city: "Plateau",
    monthly_rent: 550000,
    latitude: 5.3244,
    longitude: -4.0125,
    main_image: null
  },
  {
    id: "3",
    title: "Studio moderne - Marcory",
    city: "Marcory",
    monthly_rent: 180000,
    latitude: 5.2869,
    longitude: -3.9967,
    main_image: null
  },
  {
    id: "4",
    title: "Duplex 5 pièces - Riviera",
    city: "Riviera",
    monthly_rent: 650000,
    latitude: 5.3736,
    longitude: -3.9609,
    main_image: null
  }
];

/**
 * ExploreMap component displays an interactive map with featured properties
 * and current weather information for Abidjan
 */
const ExploreMap = () => {
  const { weather } = useWeather();
  
  /**
   * Navigate to property detail page when marker is clicked
   */
  const handlePropertyClick = (propertyId: string) => {
    window.location.href = `/properties/${propertyId}`;
  };

  /**
   * Generate contextual weather message based on current conditions
   */
  const getWeatherMessage = () => {
    if (weather.description.toLowerCase().includes('pluie')) {
      return 'Pensez à votre parapluie';
    } else if (weather.description.toLowerCase().includes('nuage')) {
      return 'Bonne journée pour chercher';
    } else {
      return 'Idéal pour visiter';
    }
  };

  const WeatherIcon = weather.description.toLowerCase().includes('pluie') 
    ? CloudRain 
    : weather.description.toLowerCase().includes('nuage')
    ? Cloud
    : Sun;

  return (
    <section className="relative py-12">
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 mb-4">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              Exploration interactive
            </span>
          </div>
          
          <h2 className="text-h2 mb-4">
            Découvrez les biens par <span className="text-primary">quartier</span>
          </h2>
          
          <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto">
            Explorez la carte interactive d'Abidjan et trouvez votre futur logement dans le quartier de vos rêves
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden shadow-elevated border border-border/50 bg-background relative">
          {/* Weather Badge */}
          <Badge className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur-sm border border-border/50 shadow-md flex items-center gap-2 text-sm px-3 py-2">
            <WeatherIcon className="h-4 w-4 text-warning" />
            <span>{weather.temperature}°C à Abidjan - {getWeatherMessage()}</span>
          </Badge>

          <div className="h-[60vh] md:h-[700px]">
            <PropertyMap 
              properties={featuredProperties}
              onPropertyClick={handlePropertyClick}
              showLocationButton={true}
            />
          </div>
        </div>

        <div className="text-center mt-8">
          <Button asChild size="lg" className="group">
            <Link to="/recherche">
              Voir toutes les annonces
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ExploreMap;
