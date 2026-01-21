import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
  viewAllText?: string;
}

export default function Carousel({
  children,
  title,
  subtitle,
  viewAllLink,
  viewAllText = 'Voir tout',
}: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div>
      {/* Header */}
      {(title || viewAllLink) && (
        <div className="flex items-center justify-between mb-4 sm:mb-6 px-4 sm:px-0">
          <div>
            {title && (
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-sm sm:text-base text-gray-600">{subtitle}</p>}
          </div>
          {viewAllLink && (
            <a
              href={viewAllLink}
              className="text-orange-500 hover:text-orange-600 font-semibold text-sm sm:text-base flex-shrink-0"
            >
              {viewAllText}
            </a>
          )}
        </div>
      )}

      {/* Carousel */}
      <div className="relative group">
        {/* Left Arrow - Hidden on mobile */}
        <button
          onClick={() => scroll('left')}
          className="hidden md:flex absolute left-0 top-1/3 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
          aria-label="Précédent"
        >
          <ChevronLeft className="h-6 w-6 text-gray-900" />
        </button>

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto scroll-smooth px-4 sm:px-0 pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>

        {/* Right Arrow - Hidden on mobile */}
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute right-0 top-1/3 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
          aria-label="Suivant"
        >
          <ChevronRight className="h-6 w-6 text-gray-900" />
        </button>
      </div>

      {/* Mobile scroll indicator */}
      <div className="md:hidden text-center mt-3">
        <p className="text-xs text-gray-500">← Faites défiler →</p>
      </div>
    </div>
  );
}
