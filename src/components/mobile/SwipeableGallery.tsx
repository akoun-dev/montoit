import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

interface SwipeableGalleryProps {
  images: string[];
  alt?: string;
  className?: string;
  showNavigation?: boolean;
  autoplay?: boolean;
}

/**
 * Galerie d'images avec swipe tactile
 * - Swipe horizontal fluide
 * - Pagination avec points
 * - Navigation optionnelle (flèches)
 * - Autoplay optionnel
 * - Optimisé mobile
 */
export const SwipeableGallery = ({
  images,
  alt = 'Image',
  className = '',
  showNavigation = false,
  autoplay = false,
}: SwipeableGalleryProps) => {
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-64 bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Aucune image disponible</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <Swiper
        modules={[Pagination, Navigation]}
        spaceBetween={0}
        slidesPerView={1}
        pagination={{ 
          clickable: true,
          bulletClass: 'swiper-pagination-bullet !bg-white/60',
          bulletActiveClass: 'swiper-pagination-bullet-active !bg-white',
        }}
        navigation={showNavigation ? {
          nextEl: '.swiper-button-next-custom',
          prevEl: '.swiper-button-prev-custom',
        } : false}
        autoplay={autoplay ? {
          delay: 3000,
          disableOnInteraction: false,
        } : false}
        loop={images.length > 1}
        className="w-full h-64 rounded-lg overflow-hidden"
      >
        {images.map((image, index) => (
          <SwiperSlide key={index}>
            <img
              src={image}
              alt={`${alt} ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation personnalisée */}
      {showNavigation && images.length > 1 && (
        <>
          <button
            className="swiper-button-prev-custom absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors"
            aria-label="Image précédente"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <button
            className="swiper-button-next-custom absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors"
            aria-label="Image suivante"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </>
      )}

      {/* Compteur d'images */}
      {images.length > 1 && (
        <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
          {images.length} photos
        </div>
      )}
    </div>
  );
};

