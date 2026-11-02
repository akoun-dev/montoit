import { useState } from 'react';
import { Search, MapPin, Home, ChevronDown } from 'lucide-react';

interface HeroMinimalistProps {
  onSearch: (filters: { city: string; propertyType: string; maxBudget: string }) => void;
}

const cities = [
  'Abidjan',
  'Yamoussoukro',
  'Bouaké',
  'San-Pédro',
  'Korhogo',
  'Man',
  'Daloa',
  'Gagnoa',
];

const propertyTypes = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'villa', label: 'Villa' },
  { value: 'studio', label: 'Studio' },
  { value: 'maison', label: 'Maison' },
  { value: 'duplex', label: 'Duplex' },
];

const budgets = [
  { value: '100000', label: "Jusqu'à 100 000 FCFA" },
  { value: '200000', label: "Jusqu'à 200 000 FCFA" },
  { value: '350000', label: "Jusqu'à 350 000 FCFA" },
  { value: '500000', label: "Jusqu'à 500 000 FCFA" },
  { value: '750000', label: "Jusqu'à 750 000 FCFA" },
  { value: '1000000', label: 'Plus de 750 000 FCFA' },
];

/**
 * HeroMinimalist - Modern Minimalism Premium Design
 *
 * Features:
 * - Single static image (no carousel)
 * - 50% black overlay for contrast
 * - Clean white search form
 * - 64px title, clear hierarchy
 * - No particles, waves, or animations
 */
export default function HeroMinimalist({ onSearch }: HeroMinimalistProps) {
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ city, propertyType, maxBudget });
  };

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden"
      style={{ height: 'var(--hero-height, 500px)' }}
    >
      {/* Single Static Background Image */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80"
          alt="Belle villa moderne"
          className="w-full h-full object-cover"
          loading="eager"
        />
        {/* 50% Black Overlay - WCAG Compliant */}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: 'var(--hero-overlay-opacity, 0.5)' }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full w-full mx-auto px-4 md:px-6 py-16">
        {/* Title - 64px Bold White */}
        <div className="text-center mb-8">
          <h1
            className="text-white font-bold mb-4 leading-tight"
            style={{
              fontSize: 'clamp(36px, 6vw, 64px)',
              lineHeight: '1.1',
              letterSpacing: '-0.02em',
            }}
          >
            Trouvez votre logement
            <br />
            <span className="text-[var(--color-primary-500)]">en toute confiance</span>
          </h1>

          {/* Subtitle - 18px White 90% */}
          <p
            className="text-white/90 max-w-2xl mx-auto"
            style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              lineHeight: '1.6',
            }}
          >
            Identité certifiée • Paiement sécurisé • Plus de 1 500 logements vérifiés en Côte
            d'Ivoire
          </p>
        </div>

        {/* Search Form - White Background, Clean */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl p-2 md:p-2 shadow-xl"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          <div className="flex flex-col md:flex-row items-stretch">
            {/* City Select */}
            <div className="relative flex-1 border-b md:border-b-0 md:border-r border-[var(--color-neutral-200)]">
              <MapPin
                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5"
                style={{ color: 'var(--color-primary-500)' }}
              />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                aria-label="Sélectionner une ville"
                className="w-full h-14 pl-12 pr-10 bg-transparent text-[var(--color-neutral-900)] font-medium appearance-none cursor-pointer transition-colors focus:outline-none focus:bg-[var(--color-neutral-50)]"
                style={{ borderRadius: 'var(--border-radius-md)' }}
              >
                <option value="">Où ?</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-neutral-400)] pointer-events-none" />
            </div>

            {/* Property Type Select */}
            <div className="relative flex-1 border-b md:border-b-0 md:border-r border-[var(--color-neutral-200)]">
              <Home
                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5"
                style={{ color: 'var(--color-primary-500)' }}
              />
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                aria-label="Sélectionner un type de bien"
                className="w-full h-14 pl-12 pr-10 bg-transparent text-[var(--color-neutral-900)] font-medium appearance-none cursor-pointer transition-colors focus:outline-none focus:bg-[var(--color-neutral-50)]"
                style={{ borderRadius: 'var(--border-radius-md)' }}
              >
                <option value="">Type</option>
                {propertyTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-neutral-400)] pointer-events-none" />
            </div>

            {/* Budget Select */}
            <div className="relative flex-1 border-b md:border-b-0 md:border-r border-[var(--color-neutral-200)]">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 font-bold"
                style={{ color: 'var(--color-primary-500)' }}
              >
                ₣
              </span>
              <select
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                aria-label="Sélectionner un budget maximum"
                className="w-full h-14 pl-12 pr-10 bg-transparent text-[var(--color-neutral-900)] font-medium appearance-none cursor-pointer transition-colors focus:outline-none focus:bg-[var(--color-neutral-50)]"
                style={{ borderRadius: 'var(--border-radius-md)' }}
              >
                <option value="">Prix max</option>
                {budgets.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-neutral-400)] pointer-events-none" />
            </div>

            {/* Search Button - Primary Orange */}
            <div className="p-2">
              <button
                type="submit"
                className="w-full md:w-auto h-12 px-8 flex items-center justify-center gap-2 text-white font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: 'var(--color-primary-500)',
                  borderRadius: 'var(--border-radius-md)',
                  minWidth: '140px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-600)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-500)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Search className="h-5 w-5" />
                <span>Rechercher</span>
              </button>
            </div>
          </div>
        </form>

        {/* Quick Links */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="text-white/70">Populaires :</span>
          {['Cocody', 'Plateau', 'Marcory', 'Yopougon'].map((district) => (
            <button
              key={district}
              type="button"
              onClick={() => {
                setCity('Abidjan');
                onSearch({ city: 'Abidjan', propertyType: '', maxBudget: '' });
              }}
              className="px-4 py-2 rounded-full bg-white/10 text-white font-medium backdrop-blur-sm transition-all hover:bg-white/20"
            >
              {district}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
