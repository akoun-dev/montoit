import { Home, Users, FileText, MapPin, Shield, TrendingUp } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

interface StatsSectionProps {
  stats: {
    propertiesCount: number;
    tenantsCount: number;
    citiesCount: number;
    contractsCount: number;
  };
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <div
      ref={ref}
      className="font-bold"
      style={{
        fontSize: 'clamp(32px, 4vw, 48px)',
        color: 'var(--color-primary-500)',
      }}
    >
      {count.toLocaleString()}
      {suffix}
    </div>
  );
}

/**
 * StatsSection - Modern Minimalism Premium Design
 *
 * Features:
 * - Clean white background
 * - 96px vertical padding
 * - Subtle shadows on cards
 * - Orange accents only on numbers
 */
export default function StatsSection({ stats }: StatsSectionProps) {
  const statItems = [
    {
      icon: Home,
      value: stats.propertiesCount,
      suffix: '+',
      label: 'Propriétés disponibles',
      description: 'Vérifiées et certifiées',
    },
    {
      icon: Users,
      value: stats.tenantsCount,
      suffix: '+',
      label: 'Utilisateurs actifs',
      description: 'Communauté grandissante',
    },
    {
      icon: FileText,
      value: stats.contractsCount,
      suffix: '+',
      label: 'Contrats signés',
      description: 'En toute sécurité',
    },
    {
      icon: MapPin,
      value: stats.citiesCount,
      suffix: '',
      label: 'Villes couvertes',
      description: "Partout en Côte d'Ivoire",
    },
  ];

  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundColor: 'var(--color-background-page)',
        paddingTop: 'var(--spacing-24)',
        paddingBottom: 'var(--spacing-24)',
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span
            className="inline-block px-4 py-2 rounded-full text-sm font-semibold mb-4"
            style={{
              backgroundColor: 'var(--color-primary-50)',
              color: 'var(--color-primary-600)',
            }}
          >
            Nos Chiffres
          </span>
          <h2
            className="font-bold mb-4"
            style={{
              fontSize: 'clamp(28px, 4vw, 40px)',
              color: 'var(--color-neutral-900)',
            }}
          >
            La confiance de milliers d'Ivoiriens
          </h2>
          <p
            className="max-w-2xl mx-auto"
            style={{
              fontSize: '18px',
              lineHeight: '1.6',
              color: 'var(--color-neutral-700)',
            }}
          >
            Mon Toit connecte chaque jour propriétaires et locataires dans un environnement sécurisé
            et certifié
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statItems.map((stat) => (
            <div
              key={stat.label}
              className="group text-center transition-all duration-300"
              style={{
                backgroundColor: 'var(--color-background-surface)',
                borderRadius: 'var(--border-radius-lg)',
                padding: 'var(--spacing-8)',
                boxShadow: 'var(--shadow-base)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--shadow-base)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Icon */}
              <div
                className="w-14 h-14 mx-auto mb-5 flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: 'var(--color-primary-500)',
                  borderRadius: 'var(--border-radius-md)',
                }}
              >
                <stat.icon className="h-7 w-7 text-white" />
              </div>

              {/* Counter */}
              <AnimatedCounter value={stat.value} suffix={stat.suffix} />

              {/* Label */}
              <h3
                className="font-semibold mt-2 mb-1"
                style={{
                  fontSize: '18px',
                  color: 'var(--color-neutral-900)',
                }}
              >
                {stat.label}
              </h3>

              {/* Description */}
              <p style={{ fontSize: '14px', color: 'var(--color-neutral-700)' }}>
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div
          className="mt-16 flex flex-wrap items-center justify-center gap-8"
          style={{ color: 'var(--color-neutral-700)' }}
        >
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6" style={{ color: 'var(--color-semantic-success)' }} />
            <span className="font-medium">Certifié ANSUT</span>
          </div>
          <div
            className="w-px h-8 hidden sm:block"
            style={{ backgroundColor: 'var(--color-neutral-200)' }}
          />
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6" style={{ color: 'var(--color-primary-500)' }} />
            <span className="font-medium">98% Satisfaction</span>
          </div>
          <div
            className="w-px h-8 hidden sm:block"
            style={{ backgroundColor: 'var(--color-neutral-200)' }}
          />
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6" style={{ color: 'var(--color-semantic-info)' }} />
            <span className="font-medium">Support 24/7</span>
          </div>
        </div>
      </div>
    </section>
  );
}
