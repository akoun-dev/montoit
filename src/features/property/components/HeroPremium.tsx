import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Star, Check, HomeIcon, Wallet } from 'lucide-react';
import { useHomeStats } from '@/hooks/shared/useHomeStats';
import UnifiedSearchBar from '@/shared/ui/UnifiedSearchBar';

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
  const [selectedType, setSelectedType] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [customBudget, setCustomBudget] = useState('');
  const [showCustomBudget, setShowCustomBudget] = useState(false);

  const propertyTypes = [
    { value: 'appartement', label: 'Appartements' },
    { value: 'studio', label: 'Studios' },
    { value: 'villa', label: 'Villas' },
  ];

  const budgetOptions = [
    { value: '150000', label: '≤ 150k' },
    { value: '300000', label: '≤ 300k' },
    { value: '500000', label: '≤ 500k' },
    { value: 'custom', label: 'Autre...' },
  ];

  const handleFilterSearch = () => {
    const params = new URLSearchParams();
    if (selectedType) params.set('type', selectedType);
    if (showCustomBudget && customBudget) {
      params.set('maxPrice', customBudget);
    } else if (selectedBudget && selectedBudget !== 'custom') {
      params.set('maxPrice', selectedBudget);
    }
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

            {/* Search bar - Modern unified search */}
            <UnifiedSearchBar variant="hero" />

            {/* Quick filters */}
            <div className="flex flex-wrap gap-3 items-center mt-3">
              {/* Property types */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/50">Type:</span>
                <div className="flex flex-wrap gap-1.5">
                  {propertyTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(selectedType === type.value ? '' : type.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedType === type.value
                          ? 'bg-white text-[#2C1810]'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-white/50">Budget:</span>
                <div className="flex flex-wrap gap-1.5">
                  {budgetOptions.map((budget) => (
                    <button
                      key={budget.value}
                      onClick={() => {
                        if (budget.value === 'custom') {
                          setShowCustomBudget(!showCustomBudget);
                          if (!showCustomBudget) {
                            setSelectedBudget('custom');
                          } else {
                            setSelectedBudget('');
                            setCustomBudget('');
                          }
                        } else {
                          setShowCustomBudget(false);
                          setSelectedBudget(selectedBudget === budget.value ? '' : budget.value);
                          setCustomBudget('');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        (budget.value === 'custom' && showCustomBudget) || selectedBudget === budget.value
                          ? 'bg-green-500 text-white'
                          : 'bg-white/10 text-white/80 hover:bg-white/20'
                      }`}
                    >
                      {budget.label}
                    </button>
                  ))}
                </div>

                {/* Custom budget input */}
                {showCustomBudget && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={customBudget}
                      onChange={(e) => setCustomBudget(e.target.value)}
                      placeholder="Ex: 200000"
                      className="px-3 py-1.5 text-sm border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 w-44"
                      onKeyDown={(e) => e.key === 'Enter' && handleFilterSearch()}
                    />
                    <button
                      onClick={handleFilterSearch}
                      className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
                    >
                      ✓
                    </button>
                  </div>
                )}
              </div>

              {/* Search button */}
              {(selectedType || selectedBudget || customBudget) && (
                <button
                  onClick={handleFilterSearch}
                  className="px-4 py-2 bg-[#FF6C2F] text-white rounded-lg text-xs font-semibold hover:bg-[#e05519] transition-colors shadow-lg"
                >
                  Rechercher
                </button>
              )}
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
