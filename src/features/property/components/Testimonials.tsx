import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useTestimonials, type Testimonial } from '@/hooks/reviews/useTestimonials';

// Default fallback testimonials in case no data is available
const fallbackTestimonials: Testimonial[] = [
  {
    id: '1',
    content: "J'ai trouvé mon appartement en moins d'une semaine grâce à Mon Toit. La vérification des propriétés m'a vraiment rassuré. Je recommande vivement !",
    rating: 5,
    reviewerName: 'Kouamé Yao',
    reviewerAvatar: null,
    reviewerCity: 'Cocody',
    propertyTitle: null,
    createdAt: new Date().toISOString(),
    userRole: 'Locataire',
  },
  {
    id: '2',
    content: 'En tant que propriétaire, je suis impressionnée par le sérieux de la plateforme. Les locataires sont vérifiés et les paiements sont sécurisés.',
    rating: 5,
    reviewerName: 'Aminata Diallo',
    reviewerAvatar: null,
    reviewerCity: 'Plateau',
    propertyTitle: null,
    createdAt: new Date().toISOString(),
    userRole: 'Propriétaire',
  },
  {
    id: '3',
    content: "La signature électronique du bail a été un vrai plus. Tout s'est fait rapidement et de manière transparente. Excellente expérience !",
    rating: 4,
    reviewerName: 'Jean-Baptiste Konan',
    reviewerAvatar: null,
    reviewerCity: 'Marcory',
    propertyTitle: null,
    createdAt: new Date().toISOString(),
    userRole: 'Locataire',
  },
  {
    id: '4',
    content: 'Le système de score de confiance est génial. Je sais exactement à qui je loue mon bien. Mon Toit a changé ma façon de gérer mes propriétés.',
    rating: 5,
    reviewerName: 'Marie-Claire Touré',
    reviewerAvatar: null,
    reviewerCity: 'Riviera',
    propertyTitle: null,
    createdAt: new Date().toISOString(),
    userRole: 'Propriétaire',
  },
  {
    id: '5',
    content: 'Enfin une plateforme qui comprend les réalités ivoiriennes ! Le paiement via Mobile Money est super pratique. Merci Mon Toit !',
    rating: 5,
    reviewerName: 'Ousmane Koné',
    reviewerAvatar: null,
    reviewerCity: 'Yopougon',
    propertyTitle: null,
    createdAt: new Date().toISOString(),
    userRole: 'Locataire',
  },
];

function getAvatarUrl(avatarUrl: string | null, name: string): string {
  if (avatarUrl) return avatarUrl;
  // Generate avatar from initials using UI Avatars
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF6C2F&color=fff&size=100`;
}

export default function Testimonials() {
  const { data: testimonials } = useTestimonials();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Use fetched testimonials or fall back to defaults
  const displayTestimonials = (testimonials && testimonials.length > 0 ? testimonials : fallbackTestimonials) as Testimonial[];

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % displayTestimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, displayTestimonials.length]);

  const goTo = (index: number) => {
    setActiveIndex(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = () => goTo((activeIndex + 1) % displayTestimonials.length);
  const goToPrev = () => goTo((activeIndex - 1 + displayTestimonials.length) % displayTestimonials.length);

  const currentTestimonial = displayTestimonials[activeIndex];
  if (!currentTestimonial) return null;

  return (
    <section className="py-10 md:py-14 bg-neutral-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-[#FF6C2F]/10 text-[#FF6C2F] mb-3">
            Témoignages
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Ce que disent nos utilisateurs
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base">
            Des milliers d'Ivoiriens nous font confiance pour leurs projets immobiliers
          </p>
        </div>

        {/* Main testimonial */}
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-card rounded-3xl p-6 md:p-10 shadow-lg border border-border">
            {/* Quote icon */}
            <div className="absolute -top-5 left-6 w-10 h-10 bg-[#FF6C2F] rounded-xl flex items-center justify-center">
              <Quote className="h-5 w-5 text-white" />
            </div>

            {/* Content */}
            <div className="text-center pt-3">
              <p className="text-base md:text-lg text-foreground leading-relaxed mb-6">
                "{currentTestimonial.content}"
              </p>

              {/* Rating */}
              <div className="flex items-center justify-center gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < currentTestimonial.rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Author */}
              <div className="flex items-center justify-center gap-4">
                <img
                  src={getAvatarUrl(currentTestimonial.reviewerAvatar, currentTestimonial.reviewerName || 'U')}
                  alt={currentTestimonial.reviewerName || 'Utilisateur'}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#FF6C2F]"
                />
                <div className="text-left">
                  <p className="font-semibold text-foreground">
                    {currentTestimonial.reviewerName || 'Utilisateur anonyme'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentTestimonial.userRole && (
                      <>
                        {currentTestimonial.userRole}
                        {currentTestimonial.reviewerCity && ' • '}
                      </>
                    )}
                    {currentTestimonial.reviewerCity}
                  </p>
                </div>
              </div>

              {/* Property reference if available */}
              {currentTestimonial.propertyTitle && (
                <p className="text-xs text-muted-foreground mt-3 italic">
                  A propos de : {currentTestimonial.propertyTitle}
                </p>
              )}
            </div>

            {/* Navigation arrows */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 sm:px-2 md:-mx-4">
              <Button
                variant="outline"
                size="small"
                onClick={goToPrev}
                className="rounded-full bg-background shadow-md p-2 min-h-0 min-w-0 w-9 h-9 sm:w-10 sm:h-10"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="outline"
                size="small"
                onClick={goToNext}
                className="rounded-full bg-background shadow-md p-2 min-h-0 min-w-0 w-9 h-9 sm:w-10 sm:h-10"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {displayTestimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'w-8 bg-[#FF6C2F]'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
