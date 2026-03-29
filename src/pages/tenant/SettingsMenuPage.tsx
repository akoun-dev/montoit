/**
 * Page principale du menu Paramètres pour les locataires
 *
 * Permet d'accéder à tous les paramètres du locataire:
 * - Notifications (préférences de réception)
 * - Compte & Profil (profil, sécurité, sessions)
 * - Aide & Support (FAQ, contact, signalement)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  User,
  MessageCircle,
  LogOut,
  ChevronRight,
  Shield,
  Lock,
  Globe,
  HelpCircle,
  AlertCircle,
  ExternalLink,
  Bug,
  Star,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconText: string;
  items: SettingItem[];
  action?: {
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    variant?: 'default' | 'danger';
  };
}

interface SettingItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ElementType;
  onClick: () => void;
  badge?: string;
  badgeColor?: string;
}

export default function TenantSettingsMenuPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/connexion');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setSigningOut(false);
    }
  };

  const sections: SettingSection[] = [
    {
      id: 'account',
      title: 'Compte',
      description: 'Gérez vos informations personnelles',
      icon: User,
      iconBg: 'bg-[#F16522]/10',
      iconText: 'text-[#F16522]',
      items: [
        {
          id: 'profile',
          label: 'Mon profil',
          description: 'Informations personnelles et coordonnées',
          icon: User,
          onClick: () => navigate('/locataire/profil'),
        },
        {
          id: 'security',
          label: 'Sécurité',
          description: 'Mot de passe et 2FA',
          icon: Shield,
          onClick: () => navigate('/locataire/parametres/securite'),
        },
        {
          id: 'sessions',
          label: 'Sessions',
          description: 'Appareils connectés',
          icon: Globe,
          onClick: () => navigate('/locataire/parametres/sessions'),
        },
      ],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Gérez vos alertes',
      icon: Bell,
      iconBg: 'bg-[#F16522]/10',
      iconText: 'text-[#F16522]',
      items: [
        {
          id: 'preferences',
          label: 'Préférences',
          description: 'Choisissez vos notifications',
          icon: Bell,
          onClick: () => navigate('/locataire/parametres/notifications'),
        },
        {
          id: 'notifications-center',
          label: 'Historique',
          description: 'Voir toutes vos notifications',
          icon: Bell,
          onClick: () => navigate('/locataire/notifications'),
        },
      ],
    },
    {
      id: 'help',
      title: 'Aide',
      description: 'Besoin d\'aide ?',
      icon: HelpCircle,
      iconBg: 'bg-[#F16522]/10',
      iconText: 'text-[#F16522]',
      items: [
        {
          id: 'faq',
          label: 'FAQ',
          description: 'Questions fréquentes',
          icon: HelpCircle,
          onClick: () => navigate('/faq'),
        },
        {
          id: 'contact',
          label: 'Contact',
          description: 'Nous contacter',
          icon: MessageCircle,
          onClick: () => navigate('/contact'),
        },
        {
          id: 'support-tickets',
          label: 'Mes tickets',
          description: 'Suivre mes demandes',
          icon: Bug,
          onClick: () => navigate('/locataire/support/tickets'),
        },
      ],
    },
    {
      id: 'more',
      title: 'Plus',
      description: 'Autres options',
      icon: ExternalLink,
      iconBg: 'bg-[#F16522]/10',
      iconText: 'text-[#F16522]',
      items: [
        {
          id: 'review',
          label: 'Noter l\'app',
          description: 'Donner votre avis',
          icon: Star,
          onClick: () => {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isIOS) {
              window.open('https://apps.apple.com/app/votre-app-id', '_blank');
            } else {
              window.open('https://play.google.com/store/apps/details?id=votre.app.id', '_blank');
            }
          },
        },
        {
          id: 'legal',
          label: 'Mentions légales',
          description: 'CGU et confidentialité',
          icon: ExternalLink,
          onClick: () => navigate('/aide?section=legal'),
        },
      ],
    },
  ];

  return (
    <div className="min-h-[75vh] bg-[#FAF7F4] px-2 sm:px-4 pb-4 pt-6 lg:pt-2">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-[#EFEBE9]"
          >
            <ChevronRight className="w-5 h-5 text-[#8B7466] rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#6B5A4E]">Paramètres</h1>
            <p className="text-[#8B7466] mt-1">Gérez votre compte et vos préférences</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.id}
            className="bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm overflow-hidden"
          >
            {/* Section Header */}
            <div className={`${section.iconBg} px-6 py-4 sm:px-6 border-b border-[#EFEBE9]`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-white rounded-xl shadow-sm`}>
                  <section.icon className={`w-6 h-6 ${section.iconText}`} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-[#6B5A4E]">{section.title}</h2>
                  <p className="text-xs text-[#8B7466] mt-0.5">{section.description}</p>
                </div>
              </div>
            </div>

            {/* Section Items */}
            <div className="divide-y divide-[#EFEBE9]">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-4 sm:p-4 hover:bg-[#FAF7F4] transition-colors text-left group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {item.icon && (
                      <div className="p-2 bg-[#FAF7F4] rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                        <item.icon className="w-5 h-5 text-[#8B7466]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#6B5A4E]">{item.label}</span>
                        {item.badge && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${item.badgeColor || 'bg-[#F16522]'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-[#8B7466] mt-0.5">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#8B7466] group-hover:text-[#6B5A4E] transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm p-5 hover:bg-red-50 hover:border-red-200 transition-all group"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-lg font-semibold text-red-600">
              {signingOut ? 'Déconnexion...' : 'Se déconnecter'}
            </span>
          </div>
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center">
        <p className="text-xs text-[#8B7466]">
          Version de l\'application - Espace Locataire
        </p>
      </div>
    </div>
  );
}
