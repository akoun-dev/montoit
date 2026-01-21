import { useAuth } from '@/app/providers/AuthProvider';
import { Home, Building2, Briefcase, TrendingUp, Shield, Clock, CheckCircle } from 'lucide-react';

export default function ProfileWelcome() {
  const { profile } = useAuth();

  const getTenantWelcome = () => ({
    icon: Home,
    title: 'Bienvenue sur Mon Toit',
    subtitle: 'Votre recherche de logement commence ici',
    stats: [
      { label: 'Propriétés disponibles', value: '500+', icon: Building2 },
      { label: 'Réponse moyenne', value: '< 24h', icon: Clock },
      { label: 'Taux de satisfaction', value: '95%', icon: CheckCircle },
    ],
    tips: [
      'Complétez votre profil pour augmenter vos chances',
      'Activez les alertes pour ne manquer aucune offre',
      'Vérifiez votre identité pour gagner la confiance',
    ],
    cta: {
      label: 'Commencer ma recherche',
      href: '/recherche',
      secondary: {
        label: 'Voir mon profil',
        href: '/profil',
      },
    },
  });

  const getOwnerWelcome = () => ({
    icon: Building2,
    title: 'Gérez vos propriétés facilement',
    subtitle: 'Trouvez des locataires de confiance en quelques clics',
    stats: [
      { label: 'Vues moyennes', value: '150+', icon: TrendingUp },
      { label: 'Locataires vérifiés', value: '100%', icon: Shield },
      { label: 'Paiements automatiques', value: '24/7', icon: CheckCircle },
    ],
    tips: [
      'Ajoutez des photos de qualité pour plus de vues',
      'Répondez rapidement pour convertir plus',
      'Utilisez la signature électronique pour gagner du temps',
    ],
    cta: {
      label: 'Publier une propriété',
      href: '/ajouter-propriete',
      secondary: {
        label: 'Voir mon tableau de bord',
        href: '/dashboard/proprietaire',
      },
    },
  });

  const getAgencyWelcome = () => ({
    icon: Briefcase,
    title: 'Gérez votre agence professionnellement',
    subtitle: 'Outils complets pour maximiser vos commissions',
    stats: [
      { label: 'Propriétés illimitées', value: '∞', icon: Building2 },
      { label: 'Collaboration équipe', value: 'Inclus', icon: CheckCircle },
      { label: 'Rapports détaillés', value: 'Temps réel', icon: TrendingUp },
    ],
    tips: [
      'Invitez votre équipe pour une meilleure collaboration',
      'Utilisez le CRM pour suivre vos prospects',
      'Consultez les statistiques pour optimiser vos performances',
    ],
    cta: {
      label: 'Accéder au dashboard',
      href: '/agence/dashboard',
      secondary: {
        label: 'Gérer mon équipe',
        href: '/agence/equipe',
      },
    },
  });

  const getWelcomeContent = () => {
    switch (profile?.user_type) {
      case 'proprietaire':
        return getOwnerWelcome();
      case 'agence':
        return getAgencyWelcome();
      case 'locataire':
      default:
        return getTenantWelcome();
    }
  };

  const content = getWelcomeContent();
  const Icon = content.icon;

  const getGradient = () => {
    switch (profile?.user_type) {
      case 'proprietaire':
        return 'from-terracotta-400 via-coral-400 to-amber-400';
      case 'agence':
        return 'from-olive-400 via-green-400 to-cyan-400';
      case 'locataire':
      default:
        return 'from-cyan-400 via-blue-400 to-purple-400';
    }
  };

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-r ${getGradient()} rounded-3xl shadow-2xl border-4 border-white/20 p-8 mb-8`}
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-10 left-10 w-48 h-48 bg-white rounded-full blur-3xl animate-float"
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div className="flex items-start space-x-4 mb-6 md:mb-0">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Icon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{content.title}</h1>
              <p className="text-white/90 text-lg">{content.subtitle}</p>
            </div>
          </div>

          {profile?.full_name && (
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-white font-semibold">👋 {profile.full_name.split(' ')[0]}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {content.stats.map((stat, index) => {
            const StatIcon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <StatIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                    <div className="text-white/80 text-sm">{stat.label}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20">
          <h3 className="text-white font-bold mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Conseils pour bien démarrer
          </h3>
          <ul className="space-y-2">
            {content.tips.map((tip, index) => (
              <li key={index} className="flex items-start space-x-3 text-white/90">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <a
            href={content.cta.href}
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {content.cta.label}
          </a>
          <a
            href={content.cta.secondary.href}
            className="inline-flex items-center justify-center px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/30 transition-all border border-white/30"
          >
            {content.cta.secondary.label}
          </a>
        </div>
      </div>
    </div>
  );
}
