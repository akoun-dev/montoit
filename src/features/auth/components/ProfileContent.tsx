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
  Star,
  ChevronRight,
  TrendingUp,
  Clock,
  Award,
  Loader2,
  Search,
  Heart,
} from 'lucide-react';

/**
 * Contenu du profil utilisateur - affiché dans l'onglet "Mon Profil" du UnifiedDashboard
 * Version améliorée avec scoring correct et meilleure présentation
 * Force cache refresh v2
 */
export default function ProfileContent() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    activeLeases: 0,
    pendingApplications: 0,
    upcomingVisits: 0,
  });
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);

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
    return '/locataire/profil';
  };

  // Charger les stats et le score
  useEffect(() => {
    const loadData = async () => {
      if (!profile?.id) return;

      try {
        setLoading(true);

        // Charger les stats - récupérer toutes les données puis filtrer
        const [leasesRes, appsRes, visitsRes] = await Promise.all([
          // Toutes les locations pour compter les actives
          supabase
            .from('lease_contracts')
            .select('id, status')
            .eq('tenant_id', profile.id),
          // Toutes les candidatures
          supabase
            .from('rental_applications')
            .select('id, status')
            .eq('tenant_id', profile.id),
          // Toutes les visites
          supabase
            .from('property_visits')
            .select('id, visit_date, status')
            .eq('tenant_id', profile.id),
        ]);

        // Logger les erreurs et données brutes
        if (leasesRes.error) {
          console.error('Error loading leases:', leasesRes.error);
        } else {
          console.log('All leases for tenant:', leasesRes.data);
        }
        if (appsRes.error) {
          console.error('Error loading applications:', appsRes.error);
        } else {
          console.log('All applications for tenant:', appsRes.data);
        }
        if (visitsRes.error) {
          console.error('Error loading visits:', visitsRes.error);
        } else {
          console.log('All visits for tenant:', visitsRes.data);
        }

        // Filtrer localement pour compter correctement
        const now = new Date();
        const activeLeases = leasesRes.data?.filter(
          (l) => l.status === 'actif' || l.status === 'en_attente_signature'
        ).length || 0;

        const pendingApplications = appsRes.data?.filter(
          (a) => a.status === 'en_attente' || a.status === 'en_negociation'
        ).length || 0;

        const upcomingVisits = visitsRes.data?.filter(
          (v) => {
            const visitDate = new Date(v.visit_date);
            return visitDate >= now && (v.status === 'planifie' || v.status === 'confirme');
          }
        ).length || 0;

        console.log('Computed stats:', { activeLeases, pendingApplications, upcomingVisits });

        setStats({
          activeLeases,
          pendingApplications,
          upcomingVisits,
        });

        // Charger le score recalculé
        const { ScoringService } = await import('@/services/scoringService');
        const scoreBreakdown = await ScoringService.calculateGlobalTrustScore(profile.id);
        const newScore = scoreBreakdown.globalScore;

        setScore(newScore);

        // Mettre à jour le score dans la BDD si différent
        if (profile.trust_score !== newScore) {
          await supabase.from('profiles').update({ trust_score: newScore }).eq('id', profile.id);
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profile?.id]);

  const verificationItems = [
    {
      id: 'email',
      label: 'Email vérifié',
      verified: true, // Toujours vrai avec Supabase Auth
      href: `${getProfileRoute()}?tab=verification`,
    },
    {
      id: 'oneci',
      label: 'Vérification ONECI',
      verified: profile?.oneci_verified || false,
      href: '/locataire/verification-oneci',
    },
    {
      id: 'facial',
      label: 'Reconnaissance faciale',
      verified: profile?.facial_verification_status === 'verified',
      status: profile?.facial_verification_status || 'pending',
      href: '/verification-biometrique?reset=true',
    },
  ];

  const completedVerifications = verificationItems.filter((v) => v.verified).length;
  const verificationProgress = Math.round((completedVerifications / 3) * 100);

  const getScoreColor = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'text-green-600', bg: 'bg-green-100', bar: 'bg-green-500' };
    if (score >= 70) return { text: 'Très bon', color: 'text-blue-600', bg: 'bg-blue-100', bar: 'bg-blue-500' };
    if (score >= 50) return { text: 'Bon', color: 'text-amber-600', bg: 'bg-amber-100', bar: 'bg-amber-500' };
    return { text: 'En cours', color: 'text-gray-600', bg: 'bg-gray-100', bar: 'bg-gray-500' };
  };

  const scoreInfo = getScoreColor(score);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Score Card - Hero Section */}
      <div className="bg-gradient-to-br from-[#F16522] to-[#D95318] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Votre Score de Confiance</h2>
            <p className="text-white/80 text-sm">Plus votre score est élevé, plus vous avez de chances d'être accepté</p>
          </div>
          <Link
            to="/locataire/mon-score"
            className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white font-medium transition-colors text-sm"
          >
            Voir le détail →
          </Link>
        </div>

        {/* Score Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/90 text-sm font-medium">{scoreInfo.text}</span>
            <span className="text-2xl font-bold">{score}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-500 ${scoreInfo.bar}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile?.full_name || 'Avatar'}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#F16522] to-[#D95318] flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            {profile?.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-lg">
                <CheckCircle className="h-3 w-3" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#2C1810]">
                  {profile?.full_name || 'Utilisateur'}
                </h3>
                <p className="text-sm text-[#6B5A4E]">{profile?.city || 'Ville non renseignée'}</p>
              </div>
              <Link
                to={`${getProfileRoute()}?tab=settings`}
                className="p-2 rounded-lg hover:bg-[#FAF7F4] text-[#6B5A4E] hover:text-[#F16522] transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          to="/locataire/mes-contrats"
          className="bg-white rounded-xl border border-[#EFEBE9] p-4 text-center hover:border-[#F16522] transition-colors"
        >
          <p className="text-2xl font-bold text-[#2C1810]">{stats.activeLeases}</p>
          <p className="text-xs text-[#6B5A4E] mt-1">Locations actives</p>
        </Link>
        <Link
          to="/locataire/mes-candidatures"
          className="bg-white rounded-xl border border-[#EFEBE9] p-4 text-center hover:border-[#F16522] transition-colors"
        >
          <p className="text-2xl font-bold text-[#2C1810]">{stats.pendingApplications}</p>
          <p className="text-xs text-[#6B5A4E] mt-1">Candidatures</p>
        </Link>
        <Link
          to="/locataire/mes-visites"
          className="bg-white rounded-xl border border-[#EFEBE9] p-4 text-center hover:border-[#F16522] transition-colors"
        >
          <p className="text-2xl font-bold text-[#2C1810]">{stats.upcomingVisits}</p>
          <p className="text-xs text-[#6B5A4E] mt-1">Visites planifiées</p>
        </Link>
      </div>

      {/* Verification Progress */}
      <div className="bg-white rounded-2xl border border-[#EFEBE9] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#F16522]" />
            <h3 className="font-semibold text-sm text-[#2C1810]">Vos vérifications</h3>
          </div>
          <span className="text-sm text-[#6B5A4E]">{completedVerifications}/3 complétées</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#FAF7F4] rounded-full h-2 mb-4">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-[#F16522] to-[#D95318] transition-all duration-500"
            style={{ width: `${verificationProgress}%` }}
          />
        </div>

        {/* Verification Items */}
        <div className="space-y-2">
          {verificationItems.map((item) => {
            const isVerified = item.verified;
            const isPending = !isVerified && item.status === 'pending';
            const isFailed = item.status === 'failed';

            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-colors ${
                  isVerified
                    ? 'border-green-200 bg-green-50'
                    : isPending
                      ? 'border-blue-200 bg-blue-50 hover:border-blue-300'
                      : isFailed
                        ? 'border-red-200 bg-red-50 hover:border-red-300'
                        : 'border-[#EFEBE9] hover:border-[#F16522]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isVerified ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : isPending ? (
                    <Clock className="h-4 w-4 text-blue-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-[#A69B95]" />
                  )}
                  <span className={isVerified ? 'text-green-700 font-medium' : 'text-[#6B5A4E]'}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isVerified ? (
                    <span className="text-xs text-green-600 font-medium">Completé</span>
                  ) : isPending ? (
                    <span className="text-xs text-blue-600 font-medium">À faire</span>
                  ) : (
                    <span className="text-xs text-[#A69B95]">À faire</span>
                  )}
                  <ChevronRight className="h-4 w-4 text-[#A69B95]" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Certification ANSUT Bonus */}
        <div className="mt-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900">Bonus Certification ANSUT</p>
              <p className="text-xs text-orange-600">
                Dossier validé = Score 100% automatique
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/recherche"
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#EFEBE9] hover:border-[#F16522] hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FAF7F4] rounded-lg">
              <Search className="h-5 w-5 text-[#6B5A4E]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#2C1810]">Rechercher un logement</p>
              <p className="text-xs text-[#6B5A4E]">Trouver votre futur logement</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-[#A69B95]" />
        </Link>

        <Link
          to="/locataire/favoris"
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#EFEBE9] hover:border-[#F16522] hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Heart className="h-5 w-5 text-red-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#2C1810]">Mes favoris</p>
              <p className="text-xs text-[#6B5A4E]">Vos biens favoris</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-[#A69B95]" />
        </Link>

        <Link
          to="/locataire/messages"
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#EFEBE9] hover:border-[#F16522] hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#2C1810]">Messages</p>
              <p className="text-xs text-[#6B5A4E]">Communications</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-[#A69B95]" />
        </Link>

        <Link
          to={`${getProfileRoute()}?tab=settings`}
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#EFEBE9] hover:border-[#F16522] hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-gray-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#2C1810]">Paramètres</p>
              <p className="text-xs text-[#6B5A4E]">Compléter mon profil</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-[#A69B95]" />
        </Link>
      </div>

      {/* Completion Tips - Si score < 100 */}
      {score < 100 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex gap-3">
            <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-900">Améliorez votre score</p>
              <p className="text-sm text-blue-700 mt-1">
                {score < 70
                  ? 'Complétez votre profil et ajoutez des vérifications pour atteindre 70+'
                  : score < 90
                    ? 'Vous y êtes presque ! Ajoutez les vérifications manquantes pour atteindre 100%'
                    : 'Continuez comme ça !'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
