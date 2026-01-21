import {
  Search,
  Shield,
  FileText,
  Home as HomeIcon,
  Users,
  CheckCircle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Award,
  Lock,
  Zap,
  MapPin,
  MessageCircle,
} from 'lucide-react';
import { useMemo } from 'react';
import PageHeader from '@/shared/components/PageHeader';
import FooterCTA from '@/shared/components/FooterCTA';
import SEOHead from '@/shared/components/SEOHead';
import { useHomeStats } from '@/hooks/shared/useHomeStats';

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  imagePosition?: 'left' | 'right';
}

function StepCard({
  number,
  title,
  description,
  icon,
  features,
  imagePosition = 'right',
}: StepCardProps) {
  return (
    <div
      className={`flex flex-col ${imagePosition === 'left' ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 items-center mb-16 animate-fade-in`}
    >
      <div className="flex-1">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#2C1810] flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {number}
          </div>
          <div className="w-16 h-16 rounded-2xl bg-[#F16522] flex items-center justify-center shadow-lg">
            {icon}
          </div>
        </div>
        <h3 className="text-2xl font-bold text-[#2C1810] mb-4">{title}</h3>
        <p className="text-[#6B5A4E] text-lg mb-6 leading-relaxed">{description}</p>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-[#F16522] flex-shrink-0 mt-1" />
              <span className="text-[#6B5A4E]">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1">
        <div className="bg-[#2C1810] rounded-[20px] p-8 shadow-2xl transform hover:scale-105 transition-all duration-300">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <div className="text-6xl mb-4">
              {number === 1 ? '🔍' : number === 2 ? '📋' : number === 3 ? '📩' : '📝'}
            </div>
            <div className="text-sm uppercase tracking-wider text-[#E8D4C5] mb-2">
              Étape {number}
            </div>
            <div className="text-xl font-bold">{title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksPage() {
  const homeStats = useHomeStats();

  // Format properties count for display - show loading indicator if loading
  const getPropertiesCountText = () => {
    if (homeStats.isLoading) {
      return 'Chargement...';
    }
    const count = homeStats.propertiesCount;
    return `${count}+ logements disponibles`;
  };

  const tenantSteps = useMemo(() => [
    {
      number: 1,
      title: 'Recherchez',
      description: 'Parcourez les logements disponibles selon vos critères.',
      icon: <Search className="h-8 w-8 text-white" />,
      features: [
        'Recherche par ville, commune ou quartier',
        'Filtres par type de bien et budget',
        getPropertiesCountText(),
      ],
      imagePosition: 'right' as const,
    },
    {
      number: 2,
      title: 'Explorez',
      description: 'Consultez les informations du propriétaire et les caractéristiques du logement.',
      icon: <MapPin className="h-8 w-8 text-white" />,
      features: [
        'Fiches logement avec photos et description',
        'Caractéristiques principales (surface, pièces, prix)',
        'Informations du propriétaire quand disponibles',
      ],
      imagePosition: 'left' as const,
    },
    {
      number: 3,
      title: "Manifestez votre intérêt",
      description:
        'Contactez le propriétaire ou préparez votre dossier en ligne (bientôt disponible).',
      icon: <MessageCircle className="h-8 w-8 text-white" />,
      features: [
        'Prise de contact avec le propriétaire (si activée)',
        'Préparation de dossier en ligne (bientôt disponible)',
        "Suivi des échanges en cours d'intégration",
      ],
      imagePosition: 'right' as const,
    },
    {
      number: 4,
      title: 'Finalisez votre location',
      description:
        'Les étapes de validation et de signature seront prochainement intégrées.',
      icon: <FileText className="h-8 w-8 text-white" />,
      features: [
        'Validation du dossier en préparation',
        'Signature en ligne à venir',
        'Paiement intégré en cours de déploiement',
      ],
      imagePosition: 'left' as const,
    },
  ], [homeStats.isLoading, homeStats.propertiesCount]);

  const ownerSteps = [
    {
      title: 'Créez votre compte',
      description: 'Créez votre compte propriétaire ou agence en quelques minutes.',
      features: [
        'Profil propriétaire/agence',
        'Coordonnées de contact',
        'Tableau de bord de base',
      ],
    },
    {
      title: 'Publiez votre bien',
      description: 'Ajoutez votre propriété avec photos et description détaillée.',
      features: [
        "Ajout d'annonce",
        'Gestion des photos',
        'Mise en ligne après validation',
        'Modification des informations',
      ],
    },
    {
      title: 'Recevez des demandes',
      description: "Recevez des messages d'intérêt et échangez avec les locataires.",
      features: [
        'Contact direct (si activé)',
        'Suivi des demandes',
        'Historique de base',
        'Réponses aux demandes',
      ],
    },
    {
      title: 'Préparez la location',
      description: 'Les étapes de contrat et de validation seront intégrées progressivement.',
      features: [
        'Contrat en préparation',
        'Signature en ligne à venir',
        'Archivage en cours',
      ],
    },
    {
      title: 'Suivez vos paiements',
      description: 'Le suivi des paiements sera disponible prochainement.',
      features: ['Paiements intégrés à venir', 'Historique en préparation', 'Notifications en cours'],
    },
  ];

  const securityFeatures = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Certification ANSUT (en cours)',
      description: "Démarche de conformité en cours de déploiement.",
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: 'Sécurité des données',
      description: 'Chiffrement et protection des données personnelles.',
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: 'Signature électronique (à venir)',
      description: 'Intégration de la signature en ligne en préparation.',
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Automatisations (à venir)',
      description: 'Traitements et notifications en cours de déploiement.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <SEOHead
        title="Comment ça marche | Mon Toit"
        description="Découvrez le parcours MVP en 4 étapes : recherchez, explorez, manifestez votre intérêt et finalisez votre location (certaines étapes arrivent bientôt)."
        keywords="guide, comment ça marche, location immobilière, côte d'ivoire, étapes, processus"
      />

      <PageHeader
        title="Comment ça marche ?"
        subtitle="Trouvez un logement en 4 étapes clés"
        icon={<Sparkles className="h-8 w-8 text-white" />}
        breadcrumbs={[{ label: 'Comment ça marche', href: '/comment-ca-marche' }]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Section Intro */}
        <div className="text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center space-x-2 bg-[#F16522]/10 text-[#F16522] px-6 py-3 rounded-full font-semibold mb-6">
            <HomeIcon className="h-5 w-5" />
            <span>Pour les Locataires</span>
          </div>
          <h2 className="text-4xl font-bold text-[#2C1810] mb-4">
            4 étapes pour démarrer votre recherche
          </h2>
          <p className="text-xl text-[#6B5A4E] max-w-3xl mx-auto">
            Un parcours simple pour explorer les logements et manifester votre intérêt. Les
            fonctionnalités avancées sont déployées progressivement.
          </p>
        </div>

        {/* Étapes Locataires */}
        <div className="mb-32">
          {tenantSteps.map((step, index) => (
            <StepCard key={index} {...step} />
          ))}
        </div>

        {/* Section Propriétaires */}
        <div className="bg-[#2C1810] rounded-[24px] p-8 md:p-12 mb-20 animate-slide-up">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-[#F16522] text-white px-6 py-3 rounded-full font-semibold mb-6">
              <Users className="h-5 w-5" />
              <span>Pour les Propriétaires</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Parcours propriétaire en 5 étapes
            </h2>
            <p className="text-xl text-[#E8D4C5] max-w-3xl mx-auto">
              Un parcours clair, avec des fonctionnalités qui évoluent progressivement
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownerSteps.map((step, index) => (
              <div
                key={index}
                className="bg-white rounded-[20px] p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:border-[#F16522] border-2 border-transparent"
              >
                <div className="w-12 h-12 bg-[#F16522] rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4">
                  {index + 1}
                </div>
                <h3 className="text-xl font-bold text-[#2C1810] mb-2">{step.title}</h3>
                <p className="text-[#6B5A4E] mb-4">{step.description}</p>
                <ul className="space-y-2">
                  {step.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-sm text-[#6B5A4E]">
                      <CheckCircle className="h-4 w-4 text-[#F16522] flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Section Sécurité */}
        <div className="mb-20 animate-fade-in">
          <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-[#2C1810]/10 text-[#2C1810] px-6 py-3 rounded-full font-semibold mb-6">
            <Shield className="h-5 w-5" />
            <span>Sécurité & Conformité</span>
          </div>
          <h2 className="text-4xl font-bold text-[#2C1810] mb-4">
            Votre sécurité est notre priorité
          </h2>
          <p className="text-xl text-[#6B5A4E] max-w-3xl mx-auto">
            Les fonctionnalités avancées de conformité et de signature arrivent progressivement
          </p>
        </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {securityFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-[20px] p-6 shadow-lg border-2 border-[#EFEBE9] hover:border-[#F16522] transition-all duration-300"
              >
                <div className="w-12 h-12 bg-[#2C1810] rounded-xl flex items-center justify-center text-white mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-[#2C1810] mb-2">{feature.title}</h3>
                <p className="text-[#6B5A4E] text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-[#2C1810] rounded-[24px] p-12 mb-20 text-white animate-slide-up">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2 text-[#F16522]">
                {homeStats.isLoading ? (
                  <span className="inline-block animate-pulse">--</span>
                ) : (
                  `${homeStats.propertiesCount}+`
                )}
              </div>
              <div className="text-xl text-[#E8D4C5]">Propriétés disponibles</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2 text-[#F16522]">5</div>
              <div className="text-xl text-[#E8D4C5]">Villes Couvertes</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2 text-[#F16522]">En cours</div>
              <div className="text-xl text-[#E8D4C5]">Modules en déploiement</div>
            </div>
          </div>
        </div>
      </div>

      <FooterCTA
        title="Prêt à commencer ?"
        subtitle="Rejoignez des centaines d'utilisateurs qui font confiance à Mon Toit pour leur location immobilière"
        icon={TrendingUp}
        buttons={[
          {
            label: 'Commencer maintenant',
            href: '/inscription',
            icon: ArrowRight,
            variant: 'primary',
          },
          {
            label: 'Explorer les biens',
            href: '/recherche',
            icon: Search,
            variant: 'secondary',
          },
        ]}
      />
    </div>
  );
}
