import {
  Search,
  MessageSquare,
  CreditCard,
  Home,
  PlusCircle,
  Users,
  BarChart3,
  Wrench,
  Star,
  Bell,
  HelpCircle,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

interface QuickAction {
  icon: any;
  label: string;
  href: string;
  color: string;
  description: string;
}

export default function ProfileQuickActions() {
  const { profile } = useAuth();

  const getTenantActions = (): QuickAction[] => [
    {
      icon: Search,
      label: 'Rechercher un logement',
      href: '/recherche',
      color: 'from-cyan-400 to-blue-500',
      description: 'Trouvez votre logement idéal',
    },
    {
      icon: MessageSquare,
      label: 'Mes messages',
      href: '/locataire/messages',
      color: 'from-olive-400 to-green-500',
      description: 'Contactez les propriétaires',
    },
    {
      icon: CreditCard,
      label: 'Payer mon loyer',
      href: '/paiement',
      color: 'from-coral-400 to-pink-500',
      description: 'Paiement sécurisé Mobile Money',
    },
    {
      icon: Home,
      label: 'Mon contrat',
      href: '/mes-contrats',
      color: 'from-amber-400 to-orange-500',
      description: 'Consultez votre bail',
    },
    {
      icon: Wrench,
      label: 'Demander une réparation',
      href: '/maintenance',
      color: 'from-terracotta-400 to-red-500',
      description: 'Signalez un problème',
    },
    {
      icon: Star,
      label: 'Mon score',
      href: '/score',
      color: 'from-purple-400 to-indigo-500',
      description: 'Améliorez votre profil',
    },
  ];

  const getOwnerActions = (): QuickAction[] => [
    {
      icon: PlusCircle,
      label: 'Publier un bien',
      href: '/ajouter-propriete',
      color: 'from-terracotta-400 to-coral-500',
      description: 'Ajoutez une nouvelle propriété',
    },
    {
      icon: Building2,
      label: 'Mes propriétés',
      href: '/mes-proprietes',
      color: 'from-cyan-400 to-blue-500',
      description: 'Gérez vos biens',
    },
    {
      icon: Users,
      label: 'Candidatures',
      href: '/candidatures',
      color: 'from-olive-400 to-green-500',
      description: 'Sélectionnez vos locataires',
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      href: '/proprietaire/messages',
      color: 'from-amber-400 to-orange-500',
      description: 'Répondez aux demandes',
    },
    {
      icon: BarChart3,
      label: 'Statistiques',
      href: '/dashboard/proprietaire',
      color: 'from-purple-400 to-indigo-500',
      description: 'Suivez vos revenus',
    },
    {
      icon: Wrench,
      label: 'Maintenance',
      href: '/proprietaire/maintenance',
      color: 'from-coral-400 to-pink-500',
      description: 'Demandes de réparation',
    },
  ];

  const getAgencyActions = (): QuickAction[] => [
    {
      icon: BarChart3,
      label: 'Dashboard',
      href: '/agence/dashboard',
      color: 'from-terracotta-400 to-coral-500',
      description: "Vue d'ensemble",
    },
    {
      icon: Building2,
      label: 'Propriétés',
      href: '/agence/proprietes',
      color: 'from-cyan-400 to-blue-500',
      description: 'Gérez votre portefeuille',
    },
    {
      icon: Users,
      label: 'Équipe',
      href: '/agence/equipe',
      color: 'from-olive-400 to-green-500',
      description: 'Gérez vos agents',
    },
    {
      icon: CreditCard,
      label: 'Commissions',
      href: '/agence/commissions',
      color: 'from-amber-400 to-orange-500',
      description: 'Suivi des revenus',
    },
    {
      icon: MessageSquare,
      label: 'CRM',
      href: '/agence/crm',
      color: 'from-purple-400 to-indigo-500',
      description: 'Gestion des prospects',
    },
    {
      icon: BarChart3,
      label: 'Rapports',
      href: '/agence/rapports',
      color: 'from-coral-400 to-pink-500',
      description: 'Analyses détaillées',
    },
  ];

  const getActions = () => {
    switch (profile?.user_type) {
      case 'proprietaire':
        return getOwnerActions();
      case 'agence':
        return getAgencyActions();
      case 'locataire':
      default:
        return getTenantActions();
    }
  };

  const actions = getActions();

  return (
    <div className="bg-white rounded-3xl shadow-lg border-2 border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Actions rapides</h2>
        <a
          href="/aide"
          className="text-terracotta-600 hover:text-terracotta-700 transition-colors flex items-center space-x-1 text-sm font-medium"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Besoin d'aide ?</span>
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <a
              key={index}
              href={action.href}
              className="group relative bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100 rounded-2xl p-4 hover:shadow-xl hover:border-terracotta-200 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div
                className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-center text-sm mb-1 group-hover:text-terracotta-600 transition-colors">
                {action.label}
              </h3>
              <p className="text-gray-600 text-center text-xs leading-tight">
                {action.description}
              </p>
            </a>
          );
        })}
      </div>

      {!profile?.is_verified && (
        <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl">
          <div className="flex items-start space-x-3">
            <Bell className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-sm mb-1">
                Complétez votre vérification d'identité
              </h4>
              <p className="text-gray-600 text-xs mb-3">
                Vérifiez votre identité via ONECI pour débloquer toutes les fonctionnalités et
                gagner la confiance des{' '}
                {profile?.user_type === 'locataire' ? 'propriétaires' : 'locataires'}.
              </p>
              <a
                href="/verification"
                className="inline-flex items-center space-x-2 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
              >
                <span>Commencer la vérification</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
