import { MapPin } from 'lucide-react';

interface CityCardProps {
  name: string;
  propertyCount: number;
  image?: string;
}

export default function CityCard({ name, propertyCount, image }: CityCardProps) {
  return (
    <a
      href={`/recherche?city=${encodeURIComponent(name)}`}
      className="group block relative h-48 sm:h-64 rounded-2xl overflow-hidden shadow-premium hover-lift hover:shadow-premium-hover transition-all duration-300"
    >
      {/* Image Background */}
      <div className="absolute inset-0 bg-gray-900">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-end p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          <h3 className="text-xl sm:text-2xl font-bold text-white">{name}</h3>
        </div>
        <p className="text-sm sm:text-base text-white/90">
          {propertyCount} {propertyCount > 1 ? 'propriétés' : 'propriété'}
        </p>
      </div>

      {/* Hover Arrow */}
      <div className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  );
}
