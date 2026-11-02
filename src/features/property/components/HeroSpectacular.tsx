import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface HeroSpectacularProps {
  onSearch: (city: string, type: string, price: string) => void;
}

export default function HeroSpectacular({ onSearch }: HeroSpectacularProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchCity, setSearchCity] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [titleVisible, setTitleVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // Parallax scroll handler
  const handleScroll = useCallback(() => {
    if (!prefersReducedMotion) {
      setScrollY(window.scrollY);
    }
  }, [prefersReducedMotion]);

  // Scroll listener for parallax
  useEffect(() => {
    if (prefersReducedMotion) return;

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll, prefersReducedMotion]);

  // Calculate parallax transform (subtle 0.3 factor)
  const parallaxOffset = prefersReducedMotion ? 0 : scrollY * 0.3;

  const heroImages = [
    '/images/hero/hero1.jpg',
    '/images/hero/hero2.jpg',
    '/images/hero/hero3.jpg',
    '/images/hero/hero4.jpg',
  ];

  const title = 'Trouvez votre logement en toute confiance';
  const subtitle = 'Identité certifiée • Paiement sécurisé • Pour tous les Ivoiriens';

  // Auto-rotation diaporama
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

  // Animation titre lettre par lettre
  useEffect(() => {
    setTimeout(() => setTitleVisible(true), 300);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchCity, propertyType, maxPrice);
  };

  // Générer particules
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 15}s`,
    duration: `${15 + Math.random() * 10}s`,
  }));

  return (
    <section className="relative h-[500px] sm:h-[600px] bg-gray-900 overflow-hidden hero-overlay-enhanced">
      {/* Diaporama avec effet parallaxe */}
      {heroImages.map((image, index) => (
        <div
          key={image}
          className={`hero-slide-image absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            transform: `translateY(${parallaxOffset}px) scale(1.1)`,
            willChange: prefersReducedMotion ? 'auto' : 'transform',
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${image})`,
              transform: 'scale(1.1)', // Extra scale to prevent white edges during parallax
            }}
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>
      ))}

      {/* Vignette cinématique */}
      <div className="hero-vignette"></div>

      {/* Particules flottantes */}
      <div className="hero-particles">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="hero-particle"
            style={{
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      {/* Waves animées */}
      <div className="hero-waves">
        <div className="hero-wave"></div>
        <div className="hero-wave"></div>
        <div className="hero-wave"></div>
      </div>

      {/* Contenu principal */}
      <div className="relative h-full flex items-center justify-center px-4 z-10">
        <div className="w-full">
          {/* Titre avec effet spectaculaire */}
          <div className="text-center mb-6 sm:mb-8 px-4 hero-glow-orange">
            <h1 className="hero-title-spectacular hero-text-enhanced text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
              {titleVisible &&
                title.split('').map((char, index) => (
                  <span
                    key={index}
                    className="hero-title-letter"
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                ))}
            </h1>
            <p className="hero-subtitle-spectacular hero-text-enhanced text-base sm:text-lg md:text-2xl font-medium px-4">
              {subtitle}
            </p>
          </div>

          {/* Search Bar avec glassmorphism avancé */}
          <form
            onSubmit={handleSubmit}
            className="hero-search-spectacular rounded-2xl sm:rounded-full p-4 sm:p-2"
            role="search"
            aria-label="Recherche de propriétés"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center divide-y sm:divide-y-0 sm:divide-x divide-white/20 gap-y-1 sm:gap-y-0">
              {/* Où */}
              <div className="flex-1 px-4 sm:px-6 py-3 sm:py-4">
                <label
                  htmlFor="search-city"
                  className="block text-xs font-semibold text-white/90 mb-2"
                >
                  Où ?
                </label>
                <input
                  id="search-city"
                  type="text"
                  placeholder="Abidjan, Cocody..."
                  className="w-full bg-transparent text-sm sm:text-base text-white placeholder-white/60 focus:outline-none focus:ring-0 border-b border-transparent focus:border-white/30 transition-colors duration-200 pb-1"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  aria-label="Ville ou quartier de recherche"
                />
              </div>

              {/* Type */}
              <div className="flex-1 px-4 sm:px-6 py-3 sm:py-4">
                <label
                  htmlFor="search-type"
                  className="block text-xs font-semibold text-white/90 mb-2"
                >
                  Type
                </label>
                <select
                  id="search-type"
                  className="w-full bg-transparent text-sm sm:text-base text-white focus:outline-none focus:ring-0 border-b border-transparent focus:border-white/30 transition-colors duration-200 pb-1 cursor-pointer"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  aria-label="Type de propriété"
                >
                  <option value="" className="bg-gray-900">
                    Tous
                  </option>
                  <option value="appartement" className="bg-gray-900">
                    Appartement
                  </option>
                  <option value="villa" className="bg-gray-900">
                    Villa
                  </option>
                  <option value="studio" className="bg-gray-900">
                    Studio
                  </option>
                  <option value="maison" className="bg-gray-900">
                    Maison
                  </option>
                </select>
              </div>

              {/* Prix max */}
              <div className="flex-1 px-4 sm:px-6 py-3 sm:py-4">
                <label
                  htmlFor="search-price"
                  className="block text-xs font-semibold text-white/90 mb-2"
                >
                  Prix max
                </label>
                <input
                  id="search-price"
                  type="text"
                  placeholder="500 000 FCFA"
                  className="w-full bg-transparent text-sm sm:text-base text-white placeholder-white/60 focus:outline-none focus:ring-0 border-b border-transparent focus:border-white/30 transition-colors duration-200 pb-1"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  aria-label="Prix maximum"
                />
              </div>

              {/* Bouton Rechercher avec ripple */}
              <div className="px-3 py-3 sm:py-2">
                <button
                  type="submit"
                  className="hero-button-ripple hero-button-enhanced w-full sm:w-auto px-6 sm:px-10 py-3.5 sm:py-3 gradient-orange hover:shadow-orange-hover text-white font-semibold rounded-xl sm:rounded-full transition-all duration-300 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent min-h-[48px]"
                  aria-label="Lancer la recherche"
                >
                  <Search className="h-5 w-5 hero-icon-animated" aria-hidden="true" />
                  <span>Rechercher</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Boutons de navigation latéraux */}
      <button
        onClick={() =>
          setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length)
        }
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
        aria-label="Diapositive précédente"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>

      <button
        onClick={() => setCurrentSlide((prev) => (prev + 1) % heroImages.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
        aria-label="Diapositive suivante"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>

      {/* Indicateurs premium */}
      <div className="hero-slide-indicators">
        {heroImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`hero-slide-indicator ${index === currentSlide ? 'active' : ''} focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900 hover:scale-110 transition-transform duration-200`}
            aria-label={`Aller à la diapositive ${index + 1}`}
            aria-current={index === currentSlide ? 'true' : 'false'}
          />
        ))}
      </div>
    </section>
  );
}
