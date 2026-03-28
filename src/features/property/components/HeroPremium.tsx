import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Star, Check, Search } from 'lucide-react';
import { useHomeStats } from '@/hooks/shared/useHomeStats';

// Animated counter component
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !hasAnimated.current && target > 0) {
          hasAnimated.current = true;
          const duration = 2000;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(target * easeOut));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString('fr-FR')}
      {suffix}
    </span>
  );
}

export default function HeroPremium() {
  const navigate = useNavigate();
  const { propertiesCount, isLoading: isLoadingStats } = useHomeStats();

  // Filter states
  const [searchCity, setSearchCity] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchMaxPrice, setSearchMaxPrice] = useState('');
  const [locationMode, setLocationMode] = useState<'all' | 'abidjan' | 'outside_abidjan'>('all');

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchCity.trim()) params.set('city', searchCity.trim());
    if (searchType) params.set('type', searchType);
    if (searchMaxPrice.trim()) params.set('maxPrice', searchMaxPrice.trim());
    navigate(`/recherche${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <section className="relative bg-gradient-to-br from-[#2C1810] via-[#1a0f0a] to-[#0f0805] overflow-hidden">
      {/* Mobile background image */}
      <div
        className="absolute inset-0 lg:hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=800&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#2C1810]/90 via-[#1a0f0a]/95 to-[#0f0805]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Orange glow effect */}
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-[#FF6C2F]/20 rounded-full blur-[150px] pointer-events-none transform translate-x-1/2 -translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-center">
          {/* Left column - Text & Search */}
          <div className="space-y-4 sm:space-y-6">
            {/* Trust badge - hidden on mobile */}
            <div className="hidden sm:inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-2">
              <Star className="w-4 h-4 text-[#FF6C2F] fill-[#FF6C2F]" />
              <span className="text-white/90 text-sm font-medium">
                N°1 DE LA CONFIANCE EN CÔTE D'IVOIRE
              </span>
            </div>

            {/* Main headline */}
            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-white">Trouvez votre</span>
                <br />
                <span className="text-[#FF6C2F]">nouveau chez-vous</span>
              </h1>
              {/* Adaptive subtitle - short on mobile, full on desktop */}
              <p className="text-sm sm:text-lg text-white/70 max-w-lg leading-relaxed">
                <span className="sm:hidden">Logements vérifiés et 100% sécurisés.</span>
                <span className="hidden sm:inline">
                  Des milliers d'appartements et villas vérifiés physiquement. Une expérience
                  humaine, simple et 100% sécurisée.
                </span>
              </p>
            </div>

            {/* ==================== ZONE DE RECHERCHE MODERNE ==================== */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 space-y-4">
              {/* Recherche rapide : Ville + Type + Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Ville */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ville ou quartier..."
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>

                {/* Type de bien */}
                <div className="relative mt-2">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      color: 'white',
                    }}
                    className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 appearance-none cursor-pointer"
                  >
                    <option value="" style={{ backgroundColor: '#2C1810', color: 'white' }}>Tous les types</option>
                    <option value="apartment" style={{ backgroundColor: '#2C1810', color: 'white' }}>Appartement</option>
                    <option value="studio" style={{ backgroundColor: '#2C1810', color: 'white' }}>Studio</option>
                    <option value="villa" style={{ backgroundColor: '#2C1810', color: 'white' }}>Villa</option>
                    <option value="house" style={{ backgroundColor: '#2C1810', color: 'white' }}>Maison</option>
                    <option value="duplex" style={{ backgroundColor: '#2C1810', color: 'white' }}>Duplex</option>
                  </select>
                </div>

                {/* Budget max */}
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Budget max (FCFA)"
                    value={searchMaxPrice}
                    onChange={(e) => setSearchMaxPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
              </div>

              {/* Actions : Localisation rapide + Bouton rechercher */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Localisation rapide */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-medium text-white/70 whitespace-nowrap">Localisation :</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLocationMode('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        locationMode === 'all'
                          ? 'bg-white text-[#2C1810] shadow-md'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      Toute la CI
                    </button>
                    <button
                      onClick={() => setLocationMode('abidjan')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        locationMode === 'abidjan'
                          ? 'bg-[#FF6C2F] text-white shadow-md'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      Abidjan
                    </button>
                    <button
                      onClick={() => setLocationMode('outside_abidjan')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        locationMode === 'outside_abidjan'
                          ? 'bg-white text-[#2C1810] shadow-md'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      Hors Abidjan
                    </button>
                  </div>
                </div>

                {/* Bouton rechercher */}
                <button
                  onClick={handleSearch}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#FF6C2F] text-white hover:bg-[#e05519] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Search className="w-4 h-4" />
                  Rechercher
                </button>
              </div>
            </div>

            {/* Properties counter - compact on mobile */}
            <div className="flex items-center gap-4 sm:gap-6 pt-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex w-12 h-12 rounded-full bg-[#FF6C2F]/20 items-center justify-center">
                  <Home className="w-6 h-6 text-[#FF6C2F]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {isLoadingStats ? (
                      <span className="inline-block animate-pulse">--</span>
                    ) : (
                      <AnimatedCounter target={propertiesCount} suffix="+" />
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-white/60">Logements</div>
                </div>
              </div>

              <div className="h-8 sm:h-12 w-px bg-white/20" />

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex w-12 h-12 rounded-full bg-green-500/20 items-center justify-center">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-white">100%</div>
                  <div className="text-xs sm:text-sm text-white/60">Sécurisés</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Image & Testimonial card (desktop only) */}
          <div className="relative hidden lg:block">
            {/* Main image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=800&q=80"
                alt="Appartement moderne à Abidjan"
                className="w-full h-[450px] object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>

            {/* Floating testimonial card - Platform testimonial (not property-specific) */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-5 max-w-xs">
              <div className="flex items-start gap-4">
                <img
                  src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=100&h=100&q=80"
                  alt="Marie K."
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FF6C2F]/20"
                />
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-neutral-600 leading-snug">
                    "Plateforme fiable avec des logements de qualité. Service excellent !"
                  </p>
                  <p className="text-xs text-neutral-400 mt-2">Marie K. — Cocody</p>
                </div>
              </div>
            </div>

            {/* Property badge */}
            <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-neutral-700">Disponible maintenant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave transition to next section */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path d="M0 60V30C240 50 480 60 720 50C960 40 1200 20 1440 30V60H0Z" fill="#FAF7F4" />
        </svg>
      </div>
    </section>
  );
}
