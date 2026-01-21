import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import { Link } from 'react-router-dom';
import { getRoleBasedRoute } from '@/shared/utils/roleRoutes';
import { supabase } from '@/integrations/supabase/client';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  AlertCircle,
  Edit,
  Star,
  ChevronRight,
} from 'lucide-react';

/**
 * Contenu du profil utilisateur - affiché dans l'onglet "Mon Profil"
 */
export default function ProfileContent() {
  const { profile } = useAuth();
  const [_editing, setEditing] = useState(false);

  // Déterminer la route du profil selon le rôle
  const getProfileRoute = () => {
    const userType = profile?.user_type?.toLowerCase();
    if (userType === 'locataire' || userType === 'tenant') {
      return '/locataire/profil';
    } else if (userType === 'proprietaire' || userType === 'owner') {
      return '/proprietaire/profil';
    } else if (userType === 'agence' || userType === 'agency') {
      return '/agences/profil';
    }
    return '/locataire/profil'; // fallback par défaut
  };

  // Routes spécifiques selon le rôle
  const getFavoritesRoute = () => {
    const userType = profile?.user_type?.toLowerCase();
    if (userType === 'locataire' || userType === 'tenant') {
      return '/locataire/favoris';
    }
    return '/locataire/favoris'; // fallback par défaut
  };

  const getSavedSearchesRoute = () => {
    const userType = profile?.user_type?.toLowerCase();
    if (userType === 'locataire' || userType === 'tenant') {
      return '/locataire/recherches-sauvegardees';
    }
    return '/locataire/recherches-sauvegardees'; // fallback par défaut
  };

  // Déterminer la route des messages selon le rôle
  const getMessagesRoute = () => {
    const userType = profile?.user_type?.toLowerCase();
    if (userType === 'locataire' || userType === 'tenant') {
      return '/locataire/messages';
    } else if (userType === 'proprietaire' || userType === 'owner') {
      return '/proprietaire/messages';
    } else if (userType === 'agence' || userType === 'agency') {
      return '/agences/messages';
    }
    return '/locataire/messages'; // fallback par défaut
  };

  const verificationItems = [
    {
      id: 'identity',
      label: 'Identité vérifiée',
      verified: profile?.is_verified || false,
      href: `${getProfileRoute()}?tab=verification`,
    },
    {
      id: 'oneci',
      label: 'ONECI',
      verified: profile?.oneci_verified || false,
      href: `${getProfileRoute()}?tab=verification`,
    },
  ];

  const trustScore = profile?.trust_score ? Math.round((profile.trust_score / 5) * 100) : 0;

  // Calculer et mettre à jour le trust score si nécessaire
  useEffect(() => {
    const calculateAndUpdateScore = async () => {
      if (!profile?.id) return;

      // Si le trust_score est null ou 0, le calculer
      if (!profile.trust_score || profile.trust_score === 0) {
        try {
          console.log('Calculating trust score for user:', profile.id);

          // Importer dynamiquement le service de scoring pour éviter les imports circulaires
          const { ScoringService } = await import('@/services/scoringService');

          const scoreBreakdown = await ScoringService.calculateGlobalTrustScore(profile.id);
          console.log('Score calculated:', scoreBreakdown);

          // Convertir le score de 0-100 vers 0-5 pour la base de données
          const normalizedScore = (scoreBreakdown.globalScore / 100) * 5;

          // Mettre à jour le score dans la base
          const { error } = await supabase
            .from('profiles')
            .update({ trust_score: normalizedScore })
            .eq('id', profile.id);

          if (error) {
            console.error('Error updating trust_score:', error);
          } else {
            console.log('Trust score updated to:', scoreBreakdown.globalScore);
          }
        } catch (error) {
          console.error('Error calculating trust score:', error);
        }
      }
    };

    calculateAndUpdateScore();
  }, [profile?.id, profile?.trust_score]);
  const getTrustScoreColor = () => {
    if (trustScore >= 70) return 'text-green-600 bg-green-100';
    if (trustScore >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'Avatar'}
                  className="w-20 h-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F16522] to-[#D95318] flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
              )}
              {profile?.is_verified && (
                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#2C1810]">
                    {profile?.full_name || 'Utilisateur'}
                  </h2>
                  <p className="text-[#6B5A4E] text-sm mt-0.5">{profile?.bio || 'Aucune bio'}</p>
                </div>

                <button
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-lg hover:bg-[#FAF7F4] text-[#6B5A4E] hover:text-[#F16522] transition-colors"
                >
                  <Edit className="h-5 w-5" />
                </button>
              </div>

              {/* Trust Score */}
              <div className="flex items-center gap-3 mt-4">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getTrustScoreColor()}`}
                >
                  <Star className="h-4 w-4" />
                  <span className="font-bold">{trustScore}</span>
                  <span className="text-sm">/100</span>
                </div>
                <Link
                  to="/locataire/mon-score"
                  className="text-sm text-[#F16522] hover:underline font-medium"
                >
                  Voir mon score
                </Link>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#EFEBE9]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FAF7F4] rounded-lg">
                <Mail className="h-4 w-4 text-[#6B5A4E]" />
              </div>
              <div>
                <p className="text-xs text-[#A69B95]">Email</p>
                <p className="text-sm text-[#2C1810] font-medium">{profile?.email || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FAF7F4] rounded-lg">
                <Phone className="h-4 w-4 text-[#6B5A4E]" />
              </div>
              <div>
                <p className="text-xs text-[#A69B95]">Téléphone</p>
                <p className="text-sm text-[#2C1810] font-medium">{profile?.phone || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FAF7F4] rounded-lg">
                <MapPin className="h-4 w-4 text-[#6B5A4E]" />
              </div>
              <div>
                <p className="text-xs text-[#A69B95]">Ville</p>
                <p className="text-sm text-[#2C1810] font-medium">{profile?.city || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Status */}
      <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#F16522]" />
            <h3 className="font-semibold text-[#2C1810]">Vérifications</h3>
          </div>
          <Link
            to={`${getProfileRoute()}?tab=verification`}
            className="text-sm text-[#F16522] hover:underline font-medium"
          >
            Gérer
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {verificationItems.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                item.verified
                  ? 'border-green-200 bg-green-50'
                  : 'border-[#EFEBE9] hover:border-[#F16522] hover:bg-[#FAF7F4]'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.verified ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-[#A69B95]" />
                )}
                <span
                  className={`font-medium ${item.verified ? 'text-green-700' : 'text-[#6B5A4E]'}`}
                >
                  {item.label}
                </span>
              </div>
              {!item.verified && <ChevronRight className="h-4 w-4 text-[#A69B95]" />}
            </Link>
          ))}
        </div>

        {!profile?.is_verified && (
          <div className="mt-4 p-4 bg-[#F16522]/5 rounded-xl border border-[#F16522]/20">
            <p className="text-sm text-[#6B5A4E]">
              <span className="font-medium text-[#F16522]">Astuce :</span> Vérifiez votre identité
              pour augmenter votre score de confiance et accéder à plus de fonctionnalités.
            </p>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to={getFavoritesRoute()}
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#EFEBE9] hover:border-[#F16522] transition-colors group"
        >
          <span className="font-medium text-[#2C1810]">Mes favoris</span>
          <ChevronRight className="h-5 w-5 text-[#A69B95] group-hover:text-[#F16522]" />
        </Link>

        <Link
          to={getSavedSearchesRoute()}
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#EFEBE9] hover:border-[#F16522] transition-colors group"
        >
          <span className="font-medium text-[#2C1810]">Mes alertes</span>
          <ChevronRight className="h-5 w-5 text-[#A69B95] group-hover:text-[#F16522]" />
        </Link>

        <Link
          to={getMessagesRoute()}
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#EFEBE9] hover:border-[#F16522] transition-colors group"
        >
          <span className="font-medium text-[#2C1810]">Messages</span>
          <ChevronRight className="h-5 w-5 text-[#A69B95] group-hover:text-[#F16522]" />
        </Link>

        <Link
          to={`${getProfileRoute()}?tab=settings`}
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#EFEBE9] hover:border-[#F16522] transition-colors group"
        >
          <span className="font-medium text-[#2C1810]">Paramètres</span>
          <ChevronRight className="h-5 w-5 text-[#A69B95] group-hover:text-[#F16522]" />
        </Link>
      </div>
    </div>
  );
}
