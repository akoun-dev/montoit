import { useState } from 'react';
import { Search, MapPin, Home, Coins } from 'lucide-react';
import { useParallax } from '@/hooks/shared';

interface HeroSimplifiedProps {
  onSearch: (filters: SearchFilters) => void;
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
}

interface SearchFilters {
  city: string;
  propertyType: string;
  maxBudget: string;
}

export default function HeroSimplified({
  onSearch,
  title = 'Trouvez votre logement idéal',
  subtitle = "Des milliers de propriétés vous attendent dans toute la Côte d'Ivoire",
  backgroundImage = '/images/hero-residence-moderne.jpg',
}: HeroSimplifiedProps) {
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const { offset, isEnabled } = useParallax({ factor: 0.2 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({
      city,
      propertyType,
      maxBudget,
    });
  };

  const cities = [
    'Abidjan',
    'Bouaké',
    'Yamoussoukro',
    'San-Pédro',
    'Korhogo',
    'Man',
    'Gagnoa',
    'Abengourou',
    'Agboville',
    'Grand-Bassam',
  ];

  const propertyTypes = [
    { value: '', label: 'Tous les types' },
    { value: 'appartement', label: 'Appartement' },
    { value: 'villa', label: 'Villa' },
    { value: 'maison', label: 'Maison' },
    { value: 'studio', label: 'Studio' },
  ];

  return (
    <section
      className="relative h-[400px] md:h-[500px] overflow-hidden"
      role="banner"
      aria-label="Section de recherche de propriétés"
    >
      {/* Image de fond avec Parallax */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={backgroundImage}
          alt="Résidence moderne"
          className="w-full h-full object-cover motion-reduce:transform-none"
          style={{
            transform: isEnabled ? `translateY(${offset}px) scale(1.1)` : 'scale(1)',
            willChange: isEnabled ? 'transform' : 'auto',
          }}
          loading="eager"
        />
      </div>

      {/* Overlay noir 50% */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Contenu principal */}
      <div className="relative h-full flex items-center justify-center px-4 z-10">
        <div className="w-full max-w-6xl mx-auto">
          {/* Titre et sous-titre */}
          <div className="text-center mb-8">
            <h1 className="text-hero-title font-bold text-white leading-heading tracking-tight mb-4">
              {title}
            </h1>
            <p className="text-hero-subtitle text-white/90 leading-relaxed max-w-2xl mx-auto">
              {subtitle}
            </p>
          </div>

          {/* Formulaire de recherche */}
          <form
            onSubmit={handleSubmit}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/20"
            role="search"
            aria-label="Formulaire de recherche de propriétés"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Ville/Quartier */}
              <div className="relative">
                <label
                  htmlFor="search-city"
                  className="block text-sm font-medium text-white/90 mb-2"
                >
                  <MapPin className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Ville ou quartier
                </label>
                <select
                  id="search-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-white/90 border border-white/30 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all font-medium"
                  aria-label="Sélectionner une ville ou un quartier"
                  required
                >
                  <option value="">Choisir une localisation</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type de propriété */}
              <div className="relative">
                <label
                  htmlFor="search-type"
                  className="block text-sm font-medium text-white/90 mb-2"
                >
                  <Home className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Type de bien
                </label>
                <select
                  id="search-type"
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full bg-white/90 border border-white/30 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all font-medium"
                  aria-label="Sélectionner un type de propriété"
                >
                  {propertyTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Budget maximum */}
              <div className="relative">
                <label
                  htmlFor="search-price"
                  className="block text-sm font-medium text-white/90 mb-2"
                >
                  <Coins className="w-4 h-4 inline mr-2" aria-hidden="true" />
                  Budget max (FCFA)
                </label>
                <input
                  id="search-price"
                  type="text"
                  placeholder="Ex: 200 000"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value.replace(/[^\d]/g, ''))}
                  className="w-full bg-white/90 border border-white/30 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all font-medium"
                  aria-label="Saisir un budget maximum en FCFA"
                />
              </div>

              {/* Bouton Rechercher */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full btn-primary text-lg py-3 flex items-center justify-center gap-3 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent"
                  aria-label="Lancer la recherche de propriétés"
                >
                  <Search className="w-5 h-5" aria-hidden="true" />
                  <span>Rechercher</span>
                </button>
              </div>
            </div>

            {/* Message d'aide pour l'accessibilité */}
            <div className="mt-4 text-center">
              <p className="text-white/70 text-sm">
                💡 Laissez les champs vides pour voir toutes les annonces
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Indicateur pour améliorer l'UX sur mobile */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 md:hidden">
        <div className="flex flex-col items-center text-white/60 text-xs">
          <span>Faites défiler pour explorer</span>
          <div className="w-4 h-4 border-b-2 border-r-2 border-white/60 transform rotate-45 mt-1 animate-bounce"></div>
        </div>
      </div>
    </section>
  );
}

// Utilisation TypeScript pour les props par défaut
HeroSimplified.displayName = 'HeroSimplified';
