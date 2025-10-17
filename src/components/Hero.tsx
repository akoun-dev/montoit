import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle2, Mic, MicOff } from "lucide-react";
import { useVoiceSearch } from "@/hooks/useVoiceSearch";
import heroFamilyHome from "@/assets/hero/hero-family-home.jpg";
import heroSlide1 from "@/assets/hero/hero-slide-1.jpg";
import heroSlide2 from "@/assets/hero/hero-slide-2.jpg";
import heroSlide3 from "@/assets/hero/hero-slide-3.jpg";
import heroSlide4 from "@/assets/hero/hero-slide-4.jpg";
import heroImage from "@/assets/hero/image.png";

const Hero = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { isListening, transcript, isSupported, startListening, stopListening } = useVoiceSearch();

  // Slideshow images
  const heroImages = [
    heroImage,
    heroFamilyHome,
    heroSlide1,
    heroSlide2,
    heroSlide3,
    heroSlide4
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Auto-advance slideshow every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/recherche?location=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/recherche');
    }
  };

  const handleQuickSearch = (location: string) => {
    navigate(`/recherche?location=${encodeURIComponent(location)}`);
  };

  const toggleVoiceSearch = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Update search query when voice transcript changes
  useState(() => {
    if (transcript) {
      setSearchQuery(transcript);
    }
  });

  return (
    <section className="hero-section relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      {/* Slideshow Background Images - Right Side */}
      <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block">
        {heroImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image}
              alt={`Vue logement ${index + 1}`}
              className="w-full h-full object-cover"
              loading={index === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-transparent" />

        {/* Slideshow indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentImageIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Aller à l'image ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative container mx-auto px-6 sm:px-8 md:px-4 py-8 md:py-10 max-w-7xl z-10 animate-fade-in">
        <div className="max-w-2xl lg:max-w-xl animate-fade-in-slow">
          {/* Main Title - Bold and Large */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 text-foreground leading-tight tracking-tight">
            Trouvez votre logement idéal en{" "}
            <span className="text-[#E67E22]">48h</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 max-w-xl font-medium">
            La première plateforme immobilière certifiée ANSUT en Côte d'Ivoire. 100% gratuit, 100% sécurisé.
          </p>

          {/* Search bar with integrated voice */}
          <div className="relative max-w-2xl mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Cocody, Yopougon, Marcory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              type="search"
              inputMode="search"
              autoComplete="street-address"
              className="pl-12 pr-14 h-14 text-lg border-2 border-primary/20 focus:border-primary rounded-full shadow-lg"
            />
            {isSupported && (
              <button
                onClick={toggleVoiceSearch}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${
                  isListening 
                    ? 'bg-destructive text-white animate-pulse' 
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
                aria-label={isListening ? "Arrêter la recherche vocale" : "Recherche vocale"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Button 
              size="xl" 
              variant="primary-gradient"
              onClick={handleSearch}
            >
              <Search className="h-5 w-5" />
              Rechercher un logement
            </Button>
            
            <Link 
              to="/auth?type=proprietaire" 
              className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors text-sm"
            >
              Je suis propriétaire
            </Link>
          </div>

          {/* Quick search chips - discreet */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Populaire :</span>
            {['Cocody', 'Yopougon', 'Marcory'].map((location) => (
              <button
                key={location}
                onClick={() => handleQuickSearch(location)}
                className="text-xs px-3 py-2 min-h-[36px] rounded-full bg-muted hover:bg-primary/10 text-foreground hover:text-primary transition-colors"
              >
                {location}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
