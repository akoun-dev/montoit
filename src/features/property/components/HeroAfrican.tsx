import { useState } from 'react';
import { Search, MapPin, Home, ChevronDown } from 'lucide-react';
import { useParallax } from '@/hooks/shared';

interface HeroAfricanProps {
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

export default function HeroAfrican({ onSearch }: HeroAfricanProps) {
  const [city, setCity] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [maxBudget, setMaxBudget] = useState('');
  const { offset, isEnabled } = useParallax({ factor: 0.2 });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ city, propertyType, maxBudget });
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image with Overlay and Parallax */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80"
          alt="Belle villa africaine"
          className="w-full h-full object-cover motion-reduce:transform-none"
          style={{
            transform: isEnabled ? `translateY(${offset}px) scale(1.15)` : 'scale(1)',
            willChange: isEnabled ? 'transform' : 'auto',
          }}
        />
        {/* Gradient Overlay - Warm terracotta tones */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(62, 39, 35, 0.85) 0%, rgba(194, 112, 59, 0.6) 50%, rgba(139, 69, 19, 0.7) 100%)',
          }}
        />
        {/* Subtle Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Content */}
      <div className="container relative z-10 py-20">
        <div className="w-full mx-auto text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 animate-fade-in-up"
            style={{
              background:
                'linear-gradient(135deg, rgba(212, 165, 116, 0.3), rgba(184, 134, 11, 0.3))',
              border: '1px solid rgba(212, 165, 116, 0.5)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-[#d4a574] animate-pulse" />
            <span className="text-sm font-medium text-[#f5deb3]">
              Plateforme N°1 en Côte d'Ivoire
            </span>
          </div>

          {/* Main Title */}
          <h1
            className="font-display text-hero text-white mb-6 animate-fade-in-up delay-100"
            style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
          >
            Trouvez votre{' '}
            <span
              className="relative inline-block"
              style={{
                background: 'linear-gradient(135deg, #d4a574, #f5deb3)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              chez vous
            </span>
            <br />
            en Côte d'Ivoire
          </h1>

          {/* Subtitle */}
          <p className="text-body-lg text-white/90 mb-12 max-w-2xl mx-auto animate-fade-in-up delay-200">
            Plus de 1 500 logements vérifiés vous attendent. Appartements, villas et studios dans
            les meilleurs quartiers d'Abidjan et partout en CI.
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-xl animate-fade-in-up delay-300"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* City */}
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--terracotta-500)]" />
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-14 pl-12 pr-10 bg-[var(--sand-100)] border-2 border-transparent rounded-xl text-[var(--earth-900)] font-medium appearance-none cursor-pointer transition-all focus:border-[var(--terracotta-500)] focus:outline-none"
                >
                  <option value="">Toutes les villes</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--earth-700)] pointer-events-none" />
              </div>

              {/* Property Type */}
              <div className="relative">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--terracotta-500)]" />
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full h-14 pl-12 pr-10 bg-[var(--sand-100)] border-2 border-transparent rounded-xl text-[var(--earth-900)] font-medium appearance-none cursor-pointer transition-all focus:border-[var(--terracotta-500)] focus:outline-none"
                >
                  <option value="">Type de bien</option>
                  {propertyTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--earth-700)] pointer-events-none" />
              </div>

              {/* Budget */}
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--terracotta-500)] font-bold">
                  ₣
                </span>
                <select
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="w-full h-14 pl-12 pr-10 bg-[var(--sand-100)] border-2 border-transparent rounded-xl text-[var(--earth-900)] font-medium appearance-none cursor-pointer transition-all focus:border-[var(--terracotta-500)] focus:outline-none"
                >
                  <option value="">Budget max</option>
                  {budgets.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--earth-700)] pointer-events-none" />
              </div>

              {/* Search Button */}
              <button
                type="submit"
                className="h-14 px-8 bg-[var(--terracotta-500)] hover:bg-[var(--terracotta-600)] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <Search className="h-5 w-5" />
                <span>Rechercher</span>
              </button>
            </div>

            {/* Quick Links */}
            <div className="mt-6 pt-6 border-t border-[var(--sand-200)] flex flex-wrap items-center justify-center gap-4 text-sm">
              <span className="text-[var(--earth-700)]">Populaires :</span>
              {['Cocody', 'Plateau', 'Marcory', 'Yopougon'].map((district) => (
                <button
                  key={district}
                  type="button"
                  onClick={() => {
                    setCity('Abidjan');
                    onSearch({ city: 'Abidjan', propertyType: '', maxBudget: '' });
                  }}
                  className="px-4 py-2 rounded-full bg-[var(--terracotta-50)] text-[var(--terracotta-600)] font-medium hover:bg-[var(--terracotta-100)] transition-colors"
                >
                  {district}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--sand-50)] to-transparent" />

      {/* Floating decorative shapes */}
      <div
        className="absolute top-20 right-10 w-20 h-20 rounded-full opacity-20 animate-float"
        style={{ background: 'linear-gradient(135deg, #d4a574, #f5deb3)' }}
      />
      <div
        className="absolute bottom-40 left-10 w-16 h-16 rounded-full opacity-15 animate-float delay-200"
        style={{ background: 'linear-gradient(135deg, #c2703b, #a85d30)' }}
      />
    </section>
  );
}
