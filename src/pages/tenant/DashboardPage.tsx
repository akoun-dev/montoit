import { useState, useEffect, useCallback } from 'react';
import {
  Home,
  Coins,
  MessageSquare,
  Clock,
  Heart,
  Search,
  CheckCircle,
  FileText,
  Wrench,
  Award,
  Calendar,
  Bell,
  ArrowRight,
  TrendingUp,
  MapPin,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/services/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { Link, useNavigate } from 'react-router-dom';
import TenantDashboardLayout from '../../features/tenant/components/TenantDashboardLayout';
import { usePaymentAlerts } from '@/hooks/tenant/usePaymentAlerts';
import PaymentAlertsBanner from '../../features/tenant/components/PaymentAlertsBanner';

interface LeaseContract {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  status: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Property {
  id: string;
  title: string;
  city: string | null;
  neighborhood: string | null;
  images?: string[];
  [key: string]: unknown;
}

interface Favorite {
  id: string;
  property_id: string | null;
  user_id: string;
  created_at: string | null;
  properties?: Property | null;
}

interface Visit {
  id: string;
  property_id: string;
  scheduled_date: string;
  status: string;
  properties?: Property | null;
}

export default function TenantDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeLease, setActiveLease] = useState<
    (LeaseContract & { property?: Property | null }) | null
  >(null);
  const [nextPayment, setNextPayment] = useState<{
    amount: number;
    dueDate: string;
    daysRemaining: number;
  } | null>(null);
  const [stats, setStats] = useState({
    unreadMessages: 0,
    maintenanceRequests: 0,
    upcomingVisits: 0,
    favoritesCount: 0,
    paymentStatus: 'up_to_date' as 'up_to_date' | 'late',
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [recentFavorites, setRecentFavorites] = useState<Favorite[]>([]);
  const [upcomingVisits, setUpcomingVisits] = useState<Visit[]>([]);

  const { alerts: paymentAlerts, dismissAlert: dismissAlertHook } = usePaymentAlerts();

  const dismissPaymentAlert = (alertId: string) => {
    dismissAlertHook(alertId);
  };

  const loadDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      // Load active lease contract
      const { data: leaseData } = await supabase
        .from('lease_contracts')
        .select('*')
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (leaseData) {
        const lease = leaseData as unknown as LeaseContract;

        const { data: propertyData } = await supabase
          .from('properties')
          .select('*')
          .eq('id', lease.property_id)
          .single();

        setActiveLease({ ...lease, property: propertyData });

        const today = new Date();
        const nextPaymentDate = new Date(lease.start_date);

        while (nextPaymentDate < today) {
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        }

        const daysRemaining = Math.ceil(
          (nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        setNextPayment({
          amount: propertyData?.monthly_rent || 0,
          dueDate: nextPaymentDate.toISOString(),
          daysRemaining,
        });

        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('tenant_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentPayments((paymentsData || []) as unknown as Payment[]);

        const lastPayment = (paymentsData as unknown as Payment[] | null)?.[0];
        const isLate =
          lastPayment &&
          lastPayment.created_at &&
          new Date(lastPayment.created_at) <
            new Date(nextPaymentDate.getTime() - 30 * 24 * 60 * 60 * 1000);

        setStats((prev) => ({
          ...prev,
          paymentStatus: isLate ? 'late' : 'up_to_date',
        }));
      }

      // Load unread messages count
      const { data: messagesData } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      // Load maintenance requests count
      const { data: maintenanceData } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('tenant_id', user.id)
        .in('status', ['ouverte', 'in_progress']);

      // Load favorites
      const { data: favoritesData } = await supabase
        .from('favorites')
        .select('*, properties(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      setRecentFavorites(favoritesData || []);

      // Load upcoming visits
      const { data: visitsData } = await supabase
        .from('visits')
        .select('*, properties(*)')
        .eq('tenant_id', user.id)
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(3);

      setUpcomingVisits((visitsData || []) as unknown as Visit[]);

      setStats((prev) => ({
        ...prev,
        unreadMessages: messagesData?.length || 0,
        maintenanceRequests: maintenanceData?.length || 0,
        upcomingVisits: visitsData?.length || 0,
        favoritesCount: favoritesData?.length || 0,
      }));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }

    if (profile && profile.user_type !== 'tenant') {
      navigate('/');
      return;
    }

    loadDashboardData();
  }, [user, profile, navigate, loadDashboardData]);

  if (loading) {
    return (
      <TenantDashboardLayout title="Tableau de bord">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
        </div>
      </TenantDashboardLayout>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon apres-midi';
    return 'Bonsoir';
  };

  return (
    <TenantDashboardLayout title="Tableau de bord">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2C1810] via-[#3d241a] to-[#2C1810] p-6 md:p-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.03\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-[#E8D4C5] text-sm font-medium mb-1">{greeting()}</p>
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {profile?.full_name || 'Locataire'}
                </h1>
                <p className="text-[#E8D4C5]/80 mt-1 text-sm">
                  Gerez votre location et trouvez votre prochain logement
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/locataire/notifications"
                  className="relative p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <Bell className="h-5 w-5 text-white" />
                  {stats.unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#F16522] text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {stats.unreadMessages}
                    </span>
                  )}
                </Link>
                <Link
                  to="/recherche"
                  className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-5 rounded-xl transition-colors"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Rechercher</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Alerts */}
        {paymentAlerts.length > 0 && (
          <PaymentAlertsBanner
            alerts={paymentAlerts}
            onDismiss={dismissPaymentAlert}
            onPayNow={(propertyId, amount) => navigate(`/locataire/effectuer-paiement?property=${propertyId}&amount=${amount}`)}
          />
        )}

        {/* Stats Cards - Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/locataire/mes-visites"
            className="group bg-white rounded-2xl p-5 border border-[#EFEBE9] hover:border-[#F16522]/30 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <ChevronRight className="h-4 w-4 text-[#6B5A4E] group-hover:text-[#F16522] transition-colors" />
            </div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.upcomingVisits}</p>
            <p className="text-sm text-[#6B5A4E]">Visites a venir</p>
          </Link>

          <Link
            to="/locataire/favoris"
            className="group bg-white rounded-2xl p-5 border border-[#EFEBE9] hover:border-[#F16522]/30 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                <Heart className="h-5 w-5 text-red-500" />
              </div>
              <ChevronRight className="h-4 w-4 text-[#6B5A4E] group-hover:text-[#F16522] transition-colors" />
            </div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.favoritesCount}</p>
            <p className="text-sm text-[#6B5A4E]">Favoris</p>
          </Link>

          <Link
            to="/locataire/messages"
            className="group bg-white rounded-2xl p-5 border border-[#EFEBE9] hover:border-[#F16522]/30 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
              <ChevronRight className="h-4 w-4 text-[#6B5A4E] group-hover:text-[#F16522] transition-colors" />
            </div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.unreadMessages}</p>
            <p className="text-sm text-[#6B5A4E]">Messages</p>
          </Link>

          <Link
            to="/locataire/maintenance"
            className="group bg-white rounded-2xl p-5 border border-[#EFEBE9] hover:border-[#F16522]/30 hover:shadow-lg transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <Wrench className="h-5 w-5 text-emerald-600" />
              </div>
              <ChevronRight className="h-4 w-4 text-[#6B5A4E] group-hover:text-[#F16522] transition-colors" />
            </div>
            <p className="text-2xl font-bold text-[#2C1810]">{stats.maintenanceRequests}</p>
            <p className="text-sm text-[#6B5A4E]">Demandes</p>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Lease Card */}
            {activeLease ? (
              <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-[#2C1810] flex items-center gap-2">
                      <Home className="h-5 w-5 text-[#F16522]" />
                      Mon Logement Actuel
                    </h2>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">
                      Actif
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Property Image */}
                    <div className="w-full sm:w-32 h-32 rounded-xl bg-[#FAF7F4] overflow-hidden flex-shrink-0">
                      {activeLease.property?.images?.[0] ? (
                        <img
                          src={activeLease.property.images[0]}
                          alt={activeLease.property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="h-10 w-10 text-[#6B5A4E]/30" />
                        </div>
                      )}
                    </div>
                    
                    {/* Property Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-[#2C1810] truncate">
                        {activeLease.property?.title || 'Mon logement'}
                      </h3>
                      <p className="text-[#6B5A4E] text-sm flex items-center gap-1 mt-1">
                        <MapPin className="h-4 w-4" />
                        {activeLease.property?.city || 'Abidjan'} {activeLease.property?.neighborhood && `- ${activeLease.property.neighborhood}`}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-[#6B5A4E]">Loyer mensuel</p>
                          <p className="text-lg font-bold text-[#F16522]">
                            {activeLease.monthly_rent?.toLocaleString()} FCFA
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#6B5A4E]">Fin du bail</p>
                          <p className="text-lg font-bold text-[#2C1810]">
                            {new Date(activeLease.end_date).toLocaleDateString('fr-FR', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="border-t border-[#EFEBE9] p-4 bg-[#FAF7F4]/50 flex flex-wrap gap-2">
                  <Link
                    to={`/locataire/contrat/${activeLease.id}`}
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium rounded-xl transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Voir le bail
                  </Link>
                  <Link
                    to="/locataire/effectuer-paiement"
                    className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F16522] hover:bg-[#d9571d] text-white font-medium rounded-xl transition-colors text-sm"
                  >
                    <Coins className="h-4 w-4" />
                    Payer le loyer
                  </Link>
                </div>
              </div>
            ) : (
              /* No Active Lease - Search CTA */
              <div className="bg-gradient-to-br from-[#FFF5F0] to-white rounded-2xl border border-[#EFEBE9] p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-[#F16522]/10 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-10 w-10 text-[#F16522]" />
                </div>
                <h3 className="text-xl font-bold text-[#2C1810] mb-2">
                  Trouvez votre prochain logement
                </h3>
                <p className="text-[#6B5A4E] mb-6 max-w-md mx-auto">
                  Parcourez des centaines de biens verifies et trouvez le logement ideal pour vous.
                </p>
                <Link
                  to="/recherche"
                  className="inline-flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  <Search className="h-5 w-5" />
                  Commencer la recherche
                </Link>
              </div>
            )}

            {/* Next Payment Card */}
            {nextPayment && (
              <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#2C1810] flex items-center gap-2">
                    <Coins className="h-5 w-5 text-[#F16522]" />
                    Prochain Paiement
                  </h2>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    nextPayment.daysRemaining > 7
                      ? 'bg-emerald-50 text-emerald-700'
                      : nextPayment.daysRemaining > 0
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {nextPayment.daysRemaining > 0
                      ? `${nextPayment.daysRemaining} jours`
                      : 'En retard'}
                  </span>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-[#6B5A4E] mb-1">Montant du</p>
                    <p className="text-3xl font-bold text-[#2C1810]">
                      {nextPayment.amount.toLocaleString()} <span className="text-lg font-medium text-[#6B5A4E]">FCFA</span>
                    </p>
                    <p className="text-sm text-[#6B5A4E] mt-1">
                      Echeance: {new Date(nextPayment.dueDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                  </div>
                  <Link
                    to="/locataire/effectuer-paiement"
                    className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-5 rounded-xl transition-colors"
                  >
                    Payer
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 pt-4 border-t border-[#EFEBE9]">
                  <div className="flex items-center justify-between text-xs text-[#6B5A4E] mb-2">
                    <span>Progression</span>
                    <span>{Math.max(0, 30 - nextPayment.daysRemaining)}/30 jours</span>
                  </div>
                  <div className="h-2 bg-[#EFEBE9] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        nextPayment.daysRemaining > 7
                          ? 'bg-emerald-500'
                          : nextPayment.daysRemaining > 0
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, ((30 - nextPayment.daysRemaining) / 30) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Recent Payments */}
            {recentPayments.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#2C1810]">Historique des Paiements</h2>
                  <Link
                    to="/locataire/mes-paiements"
                    className="text-[#F16522] hover:text-[#d9571d] text-sm font-medium flex items-center gap-1"
                  >
                    Voir tout
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentPayments.slice(0, 3).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-[#FAF7F4] rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          payment.status === 'completed'
                            ? 'bg-emerald-100'
                            : 'bg-amber-100'
                        }`}>
                          {payment.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[#2C1810]">
                            {payment.amount.toLocaleString()} FCFA
                          </p>
                          <p className="text-xs text-[#6B5A4E]">
                            {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                            })}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          payment.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {payment.status === 'completed' ? 'Paye' : 'En attente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
              <h3 className="text-lg font-bold text-[#2C1810] mb-4">Actions Rapides</h3>
              <div className="space-y-2">
                <Link
                  to="/locataire/mon-dossier"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAF7F4] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FFF5F0] flex items-center justify-center group-hover:bg-[#F16522]/20 transition-colors">
                    <FileText className="h-5 w-5 text-[#F16522]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#2C1810]">Mon Dossier</p>
                    <p className="text-xs text-[#6B5A4E]">Gerer mes documents</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#6B5A4E]" />
                </Link>
                
                <Link
                  to="/locataire/mon-score"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAF7F4] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                    <Award className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#2C1810]">Mon Trust Score</p>
                    <p className="text-xs text-[#6B5A4E]">Voir ma note de confiance</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#6B5A4E]" />
                </Link>
                
                <Link
                  to="/locataire/mes-alertes"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAF7F4] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-[#2C1810]">Alertes</p>
                    <p className="text-xs text-[#6B5A4E]">Gerer mes alertes de recherche</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#6B5A4E]" />
                </Link>
                
                {activeLease && (
                  <Link
                    to="/locataire/maintenance"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#FAF7F4] transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <Wrench className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[#2C1810]">Maintenance</p>
                      <p className="text-xs text-[#6B5A4E]">Demander une reparation</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#6B5A4E]" />
                  </Link>
                )}
              </div>
            </div>

            {/* Upcoming Visits */}
            {upcomingVisits.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#2C1810] flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-[#F16522]" />
                    Visites
                  </h3>
                  <Link
                    to="/locataire/mes-visites"
                    className="text-[#F16522] hover:text-[#d9571d] text-sm font-medium"
                  >
                    Tout voir
                  </Link>
                </div>
                <div className="space-y-3">
                  {upcomingVisits.map((visit) => (
                    <div
                      key={visit.id}
                      className="p-3 bg-[#FAF7F4] rounded-xl"
                    >
                      <p className="font-medium text-[#2C1810] truncate text-sm">
                        {visit.properties?.title || 'Visite programmee'}
                      </p>
                      <p className="text-xs text-[#6B5A4E] flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(visit.scheduled_date).toLocaleDateString('fr-FR', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Favorites Preview */}
            {recentFavorites.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#2C1810] flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Favoris
                  </h3>
                  <Link
                    to="/locataire/favoris"
                    className="text-[#F16522] hover:text-[#d9571d] text-sm font-medium"
                  >
                    Tout voir
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recentFavorites.slice(0, 4).map((favorite) => (
                    <Link
                      key={favorite.id}
                      to={`/propriete/${favorite.property_id}`}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-[#FAF7F4]"
                    >
                      {favorite.properties?.images?.[0] ? (
                        <img
                          src={favorite.properties.images[0]}
                          alt={favorite.properties.title || ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="h-6 w-6 text-[#6B5A4E]/30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <p className="text-white text-xs font-medium truncate">
                          {favorite.properties?.title || 'Bien'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TenantDashboardLayout>
  );
}
