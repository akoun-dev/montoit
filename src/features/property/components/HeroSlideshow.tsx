import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHeroSlides, HeroSlide } from '../hooks/useHeroSlides';

// Fallback slides si erreur backend ou pas de données
const FALLBACK_SLIDES: HeroSlide[] = [
  {
    id: '1',
    image_url: '/images/hero-villa-cocody.jpg',
    title: 'Votre villa à Cocody',
    description: "Le luxe et le confort dans le quartier le plus prisé d'Abidjan",
    display_order: 1,
  },
  {
    id: '2',
    image_url: '/images/hero-residence-moderne.jpg',
    title: 'Résidences modernes sécurisées',
    description: 'Un cadre de vie exceptionnel avec toutes les commodités',
    display_order: 2,
  },
  {
    id: '3',
    image_url: '/images/hero-quartiers-abidjan.jpg',
    title: "Découvrez les quartiers d'Abidjan",
    description: 'De Plateau à Marcory, trouvez votre quartier idéal',
    display_order: 3,
  },
  {
    id: '4',
    image_url: '/images/hero-immeuble-moderne.png',
    title: 'Immeubles modernes et équipés',
    description: 'Des appartements avec vue panoramique sur Abidjan',
    display_order: 4,
  },
  {
    id: '5',
    image_url: '/images/hero-maison-moderne.jpg',
    title: 'Maisons familiales spacieuses',
    description: 'Des espaces pour créer des souvenirs inoubliables',
    display_order: 5,
  },
];

export default function HeroSlideshow() {
  const { data: backendSlides, isLoading } = useHeroSlides();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Utiliser les slides backend ou fallback
  const slides = backendSlides && backendSlides.length > 0 ? backendSlides : FALLBACK_SLIDES;

  // Auto-play
  useEffect(() => {
    if (isHovered || isLoading) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isHovered, isLoading, slides.length]);

  // Reset currentSlide si slides changent
  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="relative h-full rounded-3xl overflow-hidden shadow-2xl bg-muted animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-full rounded-3xl overflow-hidden shadow-2xl group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slides */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={slide.image_url}
              alt={slide.title}
              className="w-full h-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-2 animate-fade-in leading-tight">
                {slide.title}
              </h3>
              {slide.description && (
                <p className="text-base md:text-lg text-white/90 animate-fade-in animation-delay-200 leading-relaxed">
                  {slide.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all opacity-70 group-hover:opacity-100 shadow-lg hover:scale-110"
        aria-label="Diapositive précédente"
      >
        <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-white" />
      </button>

      <button
        onClick={goToNext}
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all opacity-70 group-hover:opacity-100 shadow-lg hover:scale-110"
        aria-label="Diapositive suivante"
      >
        <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-white" />
      </button>

      {/* Indicators */}
      <div className="hero-slide-indicators">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            onClick={() => goToSlide(index)}
            className={`hero-slide-indicator transition-all duration-300 ${
              index === currentSlide ? 'active' : ''
            }`}
            aria-label={`Aller à la diapositive ${index + 1}`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      {!isHovered && (
        <div className="absolute top-2 left-2 right-2 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 rounded-full"
            style={{
              width: `${((currentSlide + 1) / slides.length) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
