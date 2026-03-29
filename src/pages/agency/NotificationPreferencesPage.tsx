/**
 * Page des préférences de notification pour les agences
 *
 * Permet de configurer les notifications par catégorie et par canal:
 * - Catégories: verification_result, document_request, payment, contract, message, system, profile
 * - Canaux: Email, SMS, Push
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Save,
  Loader2,
  Check,
  Mail,
  MessageSquare,
  Smartphone,
  FileCheck,
  FileText,
  CreditCard,
  MessageCircle,
  AlertCircle,
  User,
  Building,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/providers/AuthProvider';
import notificationService from '@/services/notification.service';

// Catégories de notifications avec icônes et descriptions
const NOTIFICATION_CATEGORIES = [
  {
    id: 'verification_result',
    label: 'Résultats de vérification',
    description: 'Notifications sur le statut de vérification des dossiers',
    icon: FileCheck,
    color: 'text-[#F16522]',
    bgColor: 'bg-[#F16522]/10',
  },
  {
    id: 'document_request',
    label: 'Demandes de documents',
    description: 'Notifications lors des demandes de documents',
    icon: FileText,
    color: 'text-[#F16522]',
    bgColor: 'bg-[#F16522]/10',
  },
  {
    id: 'payment',
    label: 'Paiements',
    description: 'Notifications relatives aux paiements et factures',
    icon: CreditCard,
    color: 'text-[#F16522]',
    bgColor: 'bg-[#F16522]/10',
  },
  {
    id: 'contract',
    label: 'Contrats',
    description: 'Notifications concernant les contrats de bail',
    icon: MessageCircle,
    color: 'text-[#F16522]',
    bgColor: 'bg-[#F16522]/10',
  },
  {
    id: 'message',
    label: 'Messages',
    description: 'Notifications pour les nouveaux messages',
    icon: MessageSquare,
    color: 'text-[#F16522]',
    bgColor: 'bg-[#F16522]/10',
  },
  {
    id: 'system',
    label: 'Système',
    description: 'Notifications système et maintenance',
    icon: AlertCircle,
    color: 'text-[#F16522]',
    bgColor: 'bg-[#F16522]/10',
  },
  {
    id: 'profile',
    label: 'Profil',
    description: 'Notifications liées à votre profil',
    icon: User,
    color: 'text-[#F16522]',
    bgColor: 'bg-[#F16522]/10',
  },
] as const;

// Canaux de notification
const NOTIFICATION_CHANNELS = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: Smartphone },
  { id: 'push', label: 'Push', icon: Bell },
] as const;

type NotificationCategory = typeof NOTIFICATION_CATEGORIES[number]['id'];
type NotificationChannel = typeof NOTIFICATION_CHANNELS[number]['id'];

interface NotificationPreference {
  user_id: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  categories: Record<string, boolean>;
}

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference>({
    user_id: '',
    email_enabled: true,
    sms_enabled: true,
    push_enabled: true,
    categories: {},
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [initialPreferences, setInitialPreferences] = useState<NotificationPreference | null>(null);

  // Charger les préférences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const prefs = await notificationService.getUserPreferences(user.id);
        setPreferences(prefs);
        setInitialPreferences(prefs);
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        toast.error('Erreur lors du chargement des préférences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  // Basculer une préférence (canal global)
  const handleToggleChannel = (channel: NotificationChannel) => {
    setPreferences((prev) => {
      const newPreferences = { ...prev };
      if (channel === 'email') {
        newPreferences.email_enabled = !prev.email_enabled;
      } else if (channel === 'sms') {
        newPreferences.sms_enabled = !prev.sms_enabled;
      } else if (channel === 'push') {
        newPreferences.push_enabled = !prev.push_enabled;
      }
      return newPreferences;
    });
    setHasChanges(true);
  };

  // Basculer une préférence (catégorie)
  const handleToggleCategory = (category: NotificationCategory) => {
    setPreferences((prev) => {
      const currentVal = prev.categories[category];
      const newPreferences = {
        ...prev,
        categories: {
          ...prev.categories,
          [category]: currentVal === undefined ? true : !currentVal,
        },
      };
      return newPreferences;
    });
    setHasChanges(true);
  };

  // Sauvegarder les préférences
  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      await notificationService.updateUserPreferences(user.id, preferences);
      setInitialPreferences(preferences);
      setHasChanges(false);
      toast.success('Préférences enregistrées avec succès');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Erreur lors de l\'enregistrement des préférences');
    } finally {
      setSaving(false);
    }
  };

  // Activer/désactiver tous les canaux
  const handleToggleAllChannels = (enabled: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      email_enabled: enabled,
      sms_enabled: enabled,
      push_enabled: enabled,
    }));
    setHasChanges(true);
  };

  // Activer/désactiver toutes les catégories
  const handleToggleAllCategories = (enabled: boolean) => {
    setPreferences((prev) => {
      const newCategories: Record<string, boolean> = {};
      NOTIFICATION_CATEGORIES.forEach((cat) => {
        newCategories[cat.id] = enabled;
      });
      return {
        ...prev,
        categories: newCategories,
      };
    });
    setHasChanges(true);
  };

  // Vérifier si un canal est activé
  const isChannelEnabled = (channel: NotificationChannel): boolean => {
    if (channel === 'email') return preferences.email_enabled;
    if (channel === 'sms') return preferences.sms_enabled;
    if (channel === 'push') return preferences.push_enabled;
    return false;
  };

  // Vérifier si une catégorie est activée
  const isCategoryEnabled = (category: NotificationCategory): boolean => {
    return preferences.categories[category] !== false;
  };

  // Compter les catégories activées
  const enabledCategoriesCount = NOTIFICATION_CATEGORIES.filter((cat) =>
    isCategoryEnabled(cat.id)
  ).length;

  if (loading) {
    return (
      <div className="min-h-[75vh] bg-[#FAF7F4] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#F16522] mx-auto mb-4" />
          <p className="text-[#6B5A4E]">Chargement des préférences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] bg-[#FAF7F4] px-2 sm:px-4 pb-4 pt-6 lg:pt-2">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-[#EFEBE9]"
            >
              <ChevronRight className="w-5 h-5 text-[#8B7466] rotate-180" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#6B5A4E]">Préférences de notification</h1>
              <p className="text-[#8B7466] mt-1">Gérez vos alertes par catégorie et par canal</p>
            </div>
          </div>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#F16522] text-white rounded-xl hover:bg-[#E55A1D] disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Canaux globaux */}
        <div className="bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm overflow-hidden">
          <div className="bg-[#F16522]/10 px-6 py-4 border-b border-[#EFEBE9]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Bell className="w-5 h-5 text-[#F16522]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#6B5A4E]">Canaux de notification</h2>
                  <p className="text-sm text-[#8B7466] mt-0.5">Choisissez comment recevoir vos notifications</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAllChannels(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Tout activer
                </button>
                <button
                  onClick={() => handleToggleAllChannels(false)}
                  className="px-3 py-1.5 text-xs font-medium bg-[#8B7466] text-white rounded-lg hover:bg-[#6B5A4E] transition-colors"
                >
                  Tout désactiver
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {NOTIFICATION_CHANNELS.map((channel) => {
                const ChannelIcon = channel.icon;
                const isEnabled = isChannelEnabled(channel.id as NotificationChannel);

                return (
                  <button
                    key={channel.id}
                    onClick={() => handleToggleChannel(channel.id as NotificationChannel)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isEnabled
                        ? 'border-[#F16522] bg-[#F16522]/10'
                        : 'border-[#EFEBE9] hover:border-[#8B7466]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isEnabled ? 'bg-white' : 'bg-[#FAF7F4]'}`}>
                        <ChannelIcon className={`w-5 h-5 ${isEnabled ? 'text-[#F16522]' : 'text-[#8B7466]'}`} />
                      </div>
                      <span className={`font-medium ${isEnabled ? 'text-[#6B5A4E]' : 'text-[#8B7466]'}`}>
                        {channel.label}
                      </span>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isEnabled ? 'border-[#F16522] bg-[#F16522]' : 'border-[#EFEBE9]'
                    }`}>
                      {isEnabled && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Catégories de notifications */}
        <div className="bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm overflow-hidden">
          <div className="bg-[#F16522]/10 px-6 py-4 border-b border-[#EFEBE9]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Building className="w-5 h-5 text-[#F16522]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#6B5A4E]">Catégories de notifications</h2>
                  <p className="text-sm text-[#8B7466] mt-0.5">
                    {enabledCategoriesCount} sur {NOTIFICATION_CATEGORIES.length} catégories activées
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleAllCategories(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Tout activer
                </button>
                <button
                  onClick={() => handleToggleAllCategories(false)}
                  className="px-3 py-1.5 text-xs font-medium bg-[#8B7466] text-white rounded-lg hover:bg-[#6B5A4E] transition-colors"
                >
                  Tout désactiver
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {NOTIFICATION_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isEnabled = isCategoryEnabled(category.id);

                return (
                  <button
                    key={category.id}
                    onClick={() => handleToggleCategory(category.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      isEnabled
                        ? 'border-[#F16522] bg-[#F16522]/10'
                        : 'border-[#EFEBE9] hover:border-[#8B7466]'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isEnabled ? 'bg-white' : 'bg-[#FAF7F4]'}`}>
                      <Icon className={`w-5 h-5 ${isEnabled ? 'text-[#F16522]' : 'text-[#8B7466]'}`} />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-medium text-sm ${isEnabled ? 'text-[#6B5A4E]' : 'text-[#8B7466]'}`}>
                        {category.label}
                      </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isEnabled ? 'border-[#F16522] bg-[#F16522]' : 'border-[#EFEBE9]'
                    }`}>
                      {isEnabled && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-8 p-4 bg-[#F16522]/10 border border-[#F16522]/20 rounded-[24px]">
        <div className="flex items-start gap-3">
          <Building className="w-5 h-5 text-[#F16522] mt-0.5 flex-shrink-0" />
          <div className="text-sm text-[#6B5A4E]">
            <p className="font-medium mb-1">Paramètres d'agence</p>
            <p className="text-[#8B7466]">
              Ces préférences s'appliquent à votre compte agence. Les notifications push nécessitent
              l'application mobile MonToit.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
