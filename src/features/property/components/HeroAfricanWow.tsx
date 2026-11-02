import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Home, Shield, CheckCircle, ChevronDown, Sparkles } from 'lucide-react';

// Golden particles component
const GoldenParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-golden-float"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `linear-gradient(135deg, rgba(255, 215, 0, ${0.3 + Math.random() * 0.4}), rgba(232, 98, 68, ${0.2 + Math.random() * 0.3}))`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${5 + Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
};

// Animated title component
const AnimatedTitle = ({ text }: { text: string }) => {
  const words = text.split(' ');

  return (
    <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
      {words.map((word, wordIdx) => (
        <span key={wordIdx} className="inline-block mr-3">
          {word.split('').map((letter, letterIdx) => (
            <span
              key={letterIdx}
              className="inline-block animate-letter-reveal"
              style={{
                animationDelay: `${wordIdx * 0.1 + letterIdx * 0.05}s`,
              }}
            >
              {letter}
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
};

export default function HeroAfricanWow() {
  const navigate = useNavigate();
  const [searchCity, setSearchCity] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchCity) params.set('city', searchCity);
    if (propertyType) params.set('type', propertyType);
    navigate(`/recherche?${params.toString()}`);
  };

  const stats = [
    { value: '1000+', label: 'Propriétés', icon: Home },
    { value: '5000+', label: 'Locataires', icon: CheckCircle },
    { value: '15+', label: 'Villes', icon: MapPin },
  ];

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 pattern-kente opacity-20" />

      {/* Golden Particles */}
      <GoldenParticles />

      {/* Gradient Orbs */}
      <div className="absolute top-20 -right-20 w-96 h-96 bg-gradient-to-br from-orange-300/30 to-amber-200/30 rounded-full blur-3xl animate-gradient-breathe" />
      <div
        className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-tr from-amber-200/30 to-orange-300/30 rounded-full blur-3xl animate-gradient-breathe"
        style={{ animationDelay: '2s' }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          {/* Left Content */}
          <div
            className={`space-y-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
          >
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-lg border border-orange-100 animate-badge-pulse">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-sm font-semibold text-gray-800">
                Plateforme certifiée ANSUT
              </span>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>

            {/* Animated Title */}
            <div className="space-y-2">
              <AnimatedTitle text="Trouvez votre" />
              <div className="relative inline-block">
                <span
                  className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gradient-african animate-slide-reveal"
                  style={{ animationDelay: '0.5s' }}
                >
                  logement idéal
                </span>
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-terracotta-gold rounded-full animate-shimmer-gold" />
              </div>
              <p
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 animate-slide-reveal"
                style={{ animationDelay: '0.7s' }}
              >
                en Côte d'Ivoire
              </p>
            </div>

            {/* Subtitle */}
            <p
              className="text-lg sm:text-xl text-gray-600 max-w-xl animate-slide-reveal"
              style={{ animationDelay: '0.9s' }}
            >
              <span className="font-semibold text-orange-600">Location sécurisée</span> •
              <span className="font-semibold text-amber-600"> Identité vérifiée</span> •
              <span className="font-semibold text-green-600"> Paiement mobile</span>
            </p>

            {/* Search Form */}
            <form
              onSubmit={handleSearch}
              className="bg-white rounded-2xl shadow-2xl p-3 border border-orange-100 animate-slide-reveal hover-lift-premium"
              style={{ animationDelay: '1.1s' }}
            >
              <div className="flex flex-col md:flex-row gap-3">
                {/* City Input */}
                <div className="flex-1 flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-orange-50/50 transition-colors group">
                  <MapPin className="h-5 w-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Où cherchez-vous ?"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
                  />
                </div>

                {/* Property Type */}
                <div className="flex-1 flex items-center space-x-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-orange-50/50 transition-colors group">
                  <Home className="h-5 w-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-gray-900 cursor-pointer"
                  >
                    <option value="">Type de bien</option>
                    <option value="appartement">Appartement</option>
                    <option value="maison">Maison</option>
                    <option value="villa">Villa</option>
                    <option value="studio">Studio</option>
                  </select>
                </div>

                {/* Search Button */}
                <button
                  type="submit"
                  className="flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-terracotta-gold text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 btn-ripple animate-pulse-glow"
                >
                  <Search className="h-5 w-5" />
                  <span>Rechercher</span>
                </button>
              </div>
            </form>

            {/* Stats */}
            <div
              className="flex flex-wrap gap-6 animate-slide-reveal"
              style={{ animationDelay: '1.3s' }}
            >
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="flex items-center space-x-3 px-4 py-2 bg-white/80 rounded-xl shadow-sm border border-orange-100 hover-lift-premium"
                    style={{ animationDelay: `${1.3 + idx * 0.1}s` }}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-terracotta-gold flex items-center justify-center">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right - Hero Image */}
          <div
            className={`relative hidden lg:block transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
          >
            <div className="relative">
              {/* Main Image */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl hover-lift-premium">
                <img
                  src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"
                  alt="Maison moderne en Côte d'Ivoire"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                {/* Price Tag */}
                <div className="absolute bottom-6 left-6 right-6 glass-african rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">À partir de</p>
                      <p className="text-2xl font-bold text-gradient-african">75,000 FCFA</p>
                      <p className="text-sm text-gray-500">par mois</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Disponible à</p>
                      <p className="text-lg font-semibold text-gray-900">Abidjan</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Card 1 */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 animate-golden-float border border-orange-100">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Vérifié</p>
                    <p className="text-xs text-gray-500">Propriétaire ANSUT</p>
                  </div>
                </div>
              </div>

              {/* Floating Card 2 */}
              <div
                className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 animate-golden-float border border-orange-100"
                style={{ animationDelay: '2s' }}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Sécurisé</p>
                    <p className="text-xs text-gray-500">Paiement protégé</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-scroll-bounce">
          <span className="text-sm text-gray-500 mb-2">Découvrir</span>
          <ChevronDown className="h-6 w-6 text-orange-500" />
        </div>
      </div>
    </section>
  );
}
