import { Search, MapPin, MessageCircle, FileText } from 'lucide-react';
import { useScrollAnimation, getAnimationClasses } from '@/hooks/shared/useScrollAnimation';
import { Link } from 'react-router-dom';

const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Recherchez',
    description: 'Parcourez les logements disponibles selon vos critères.',
  },
  {
    icon: MapPin,
    number: '02',
    title: 'Explorez',
    description: 'Consultez les informations du propriétaire et les caractéristiques du logement.',
  },
  {
    icon: MessageCircle,
    number: '03',
    title: "Manifestez votre intérêt",
    description:
      'Contactez le propriétaire ou préparez votre dossier en ligne (bientôt disponible).',
  },
  {
    icon: FileText,
    number: '04',
    title: 'Finalisez votre location',
    description: 'Les étapes de validation et de signature seront prochainement intégrées.',
  },
];

export default function HowItWorksCompact() {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>({ threshold: 0.1 });

  return (
    <section
      ref={ref}
      className="py-10 md:py-14 relative overflow-hidden bg-gradient-to-b from-[#FAF7F4] via-white to-neutral-50"
    >
      {/* Subtle decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#FF6C2F]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-[#FF6C2F]/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Header */}
        <div
          className={`text-center mb-10 md:mb-12 ${getAnimationClasses(isVisible, 'fadeUp', 0)}`}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6C2F]/10 text-[#FF6C2F] text-sm font-medium mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6C2F]" />4 étapes clés
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
            Comment ça marche ?
          </h2>
          <p className="text-muted-foreground text-base max-w-2xl mx-auto">
            Un parcours simple pour explorer les logements et manifester votre intérêt
          </p>
        </div>

        {/* Timeline - Desktop */}
        <div className="hidden lg:block relative mb-6">
          <div className="absolute top-6 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[#FF6C2F] via-[#FF6C2F]/60 to-[#FF6C2F]/30 rounded-full" />
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className={`relative ${getAnimationClasses(isVisible, 'fadeUp', index * 150)}`}
            >
              {/* Mobile/Tablet connector line */}
              {index < steps.length - 1 && (
                <div className="lg:hidden absolute left-8 top-16 w-0.5 h-[calc(100%+1.5rem)] bg-gradient-to-b from-[#FF6C2F]/40 to-[#FF6C2F]/10" />
              )}

              {/* Card */}
              <div className="relative bg-card rounded-2xl p-5 shadow-sm border border-border/50 hover:shadow-lg hover:border-[#FF6C2F]/20 transition-all duration-300 group">
                {/* Number badge */}
                <div className="absolute -top-3 left-5 flex items-center justify-center w-9 h-9 rounded-full bg-[#FF6C2F] text-white font-bold text-sm shadow-lg shadow-[#FF6C2F]/25 group-hover:scale-110 transition-transform duration-300">
                  {step.number}
                </div>

                {/* Icon container */}
                <div className="mt-5 mb-3 flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FF6C2F]/10 group-hover:bg-[#FF6C2F]/15 transition-colors duration-300">
                  <step.icon className="h-7 w-7 text-[#FF6C2F]" />
                </div>

                {/* Text content */}
                <h3 className="text-lg font-semibold text-foreground mb-1.5">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`text-center mt-8 md:mt-10 ${getAnimationClasses(isVisible, 'fadeUp', 600)}`}
        >
          <Link
            to="/recherche"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF6C2F] text-white rounded-xl font-medium hover:bg-[#e05519] transition-colors duration-200 shadow-lg shadow-[#FF6C2F]/25"
          >
            <Search className="h-5 w-5" />
            Commencer ma recherche
          </Link>
        </div>
      </div>
    </section>
  );
}
