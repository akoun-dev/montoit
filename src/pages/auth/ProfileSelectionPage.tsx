import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Building2,
  Home,
  UserCircle,
  Briefcase,
  CheckCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { normalizeUserType, translateUserType, type UserTypeEn } from '@/shared/lib/utils';
import { getDashboardRoute } from '@/shared/utils/roleRoutes';

export default function ProfileSelection() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<UserTypeEn | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const profileTypes = [
    {
      type: 'tenant' as UserTypeEn,
      icon: Home,
      title: 'Locataire',
      subtitle: 'Je cherche un logement',
      description: 'Trouvez rapidement, postulez en ligne et signez en quelques clics.',
      benefits: [
        'Candidature 100% en ligne',
        'Visites planifiables en 1 clic',
        'Signature électronique sécurisée',
      ],
      color: 'from-cyan-400 to-blue-500',
      bgColor: 'from-cyan-50 to-blue-50',
      borderColor: 'border-cyan-300',
      hoverColor: 'hover:border-cyan-500',
    },
    {
      type: 'owner' as UserTypeEn,
      icon: Building2,
      title: 'Propriétaire',
      subtitle: 'Je mets mon bien en location',
      description: 'Publiez, qualifiez les candidats et signez vos baux en ligne.',
      benefits: [
        'Locataires vérifiés',
        'Contrats et signatures digitales',
        'Suivi des paiements en temps réel',
      ],
      color: 'from-terracotta-400 to-coral-500',
      bgColor: 'from-terracotta-50 to-coral-50',
      borderColor: 'border-terracotta-300',
      hoverColor: 'hover:border-terracotta-500',
    },
    {
      type: 'agent' as UserTypeEn,
      icon: Briefcase,
      title: 'Agence Immobilière',
      subtitle: 'Je suis une agence professionnelle',
      description: 'Pilotez votre portefeuille et collaborez avec votre équipe.',
      benefits: [
        'Portefeuille multi-biens',
        'Collaboration équipe & mandats',
        'Reporting et commissions',
      ],
      color: 'from-olive-400 to-green-500',
      bgColor: 'from-olive-50 to-green-50',
      borderColor: 'border-olive-300',
      hoverColor: 'hover:border-olive-500',
    },
  ];

  const handleSubmit = async () => {
    if (!selectedType || !user) return;

    setLoading(true);
    setError('');

    try {
      const userTypeForDb = translateUserType(selectedType);

      // Récupérer le fullName depuis sessionStorage (saisi lors de l'inscription téléphone)
      const storedFullName = sessionStorage.getItem('pending_full_name');

      // Mettre à jour le profile avec le user_type et le full_name si disponible
      const updateData: {
        user_type: string;
        full_name?: string;
        updated_at: string;
      } = {
        user_type: userTypeForDb,
        updated_at: new Date().toISOString(),
      };

      // Si le full_name a été saisi lors de l'inscription téléphone, le mettre à jour
      if (storedFullName && (!profile?.full_name || profile.full_name === '')) {
        updateData.full_name = storedFullName;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Nettoyer le sessionStorage
      sessionStorage.removeItem('pending_full_name');

      // Redirection selon le type sélectionné (utiliser window.location pour éviter le re-render)
      let dashboardUrl = '/locataire/dashboard';
      if (selectedType === 'owner') {
        dashboardUrl = getDashboardRoute('proprietaire');
      } else if (selectedType === 'agent') {
        dashboardUrl = getDashboardRoute('agence');
      }
      window.location.href = dashboardUrl;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour du profil';
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/connexion');
    return null;
  }

  // If user already has a type set (not default), redirect to home
  if (profile?.user_type && normalizeUserType(profile.user_type) !== 'tenant') {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen custom-cursor relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-terracotta-400 via-coral-300 to-amber-300" />

      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-64 h-64 bg-cyan-300 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-20 w-80 h-80 bg-olive-300 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-200 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '0.5s' }}
        />
      </div>

      <div className="absolute top-10 right-10 text-white/30 transform rotate-12 text-9xl font-bold animate-float">
        ★
      </div>
      <div className="absolute bottom-20 left-20 text-white/30 transform -rotate-12 text-7xl font-bold animate-bounce-subtle">
        ♥
      </div>

      <div className="max-w-7xl w-full relative z-10">
        <div className="text-center mb-12 animate-slide-down">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Building2 className="h-12 w-12 text-white" />
            <span className="text-4xl font-bold text-white">Mon Toit</span>
          </div>

          <div className="inline-flex items-center space-x-2 mb-6 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <Sparkles className="h-5 w-5 text-amber-300" />
            <span className="text-sm font-semibold text-white">
              Bienvenue {profile?.full_name || user.email}!
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
            Choisissez votre profil
          </h1>
          <p className="text-xl md:text-2xl text-amber-100 max-w-3xl mx-auto">
            Sélectionnez le type de compte qui correspond le mieux à vos besoins
          </p>
        </div>

        {error && (
          <div className="mb-6 max-w-2xl mx-auto p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-sm font-medium animate-shake">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {profileTypes.map((profileType, index) => {
            const Icon = profileType.icon;
            const isSelected = selectedType === profileType.type;

            return (
              <div
                key={profileType.type}
                onClick={() => setSelectedType(profileType.type)}
                className={`glass-card rounded-3xl p-8 cursor-pointer transition-all duration-300 transform hover:scale-105 ${
                  isSelected ? 'ring-4 ring-white shadow-2xl scale-105' : 'hover:shadow-xl'
                } animate-scale-in`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative">
                  {isSelected && (
                    <div className="absolute -top-4 -right-4 bg-white rounded-full p-2 shadow-lg animate-bounce-subtle">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  )}

                  <div
                    className={`w-20 h-20 bg-gradient-to-br ${profileType.color} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg transform ${
                      isSelected ? 'rotate-0' : index % 2 === 0 ? '-rotate-6' : 'rotate-6'
                    } transition-transform duration-300`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{profileType.title}</h3>
                    <p className="text-sm font-semibold text-gray-600 mb-4">
                      {profileType.subtitle}
                    </p>
                    <p className="text-gray-700 leading-relaxed">{profileType.description}</p>
                  </div>

                  <div
                    className={`bg-gradient-to-br ${profileType.bgColor} rounded-2xl p-4 border-2 ${profileType.borderColor}`}
                  >
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                      Avantages
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      {profileType.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center animate-slide-up">
          <button
            onClick={handleSubmit}
            disabled={!selectedType || loading}
            className="btn-primary text-lg px-12 py-4 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-3 shadow-2xl"
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span>Chargement...</span>
              </>
            ) : (
              <>
                <span>Continuer</span>
                <ArrowRight className="h-6 w-6" />
              </>
            )}
          </button>

          {!selectedType && (
            <p className="mt-4 text-white/80 text-sm">
              Sélectionnez un type de profil ci-dessus pour continuer
            </p>
          )}
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
            <UserCircle className="h-4 w-4 text-terracotta-600" />
            <span className="text-gray-700 font-medium text-sm">
              Vous pourrez modifier ce choix plus tard depuis votre profil
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
