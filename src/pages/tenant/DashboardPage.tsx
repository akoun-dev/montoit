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
  [key: string]: unknown; // allow extra fields
}

interface Favorite {
  id: string;
  property_id: string | null;
  user_id: string;
  created_at: string | null;
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
    paymentStatus: 'up_to_date' as 'up_to_date' | 'late',
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [recentFavorites, setRecentFavorites] = useState<Favorite[]>([]);

  // Payment alerts
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
        .eq('status', 'actif')
        .maybeSingle();

      if (leaseData) {
        const lease = leaseData as unknown as LeaseContract;

        // Load property data
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
          amount: lease.monthly_rent,
          dueDate: nextPaymentDate.toISOString(),
          daysRemaining,
        });

        // Load payments
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .eq('payer_id', user.id)
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

      setStats((prev) => ({ ...prev, unreadMessages: messagesData?.length || 0 }));

      // Load maintenance requests count
      const { data: maintenanceData } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('tenant_id', user.id)
        .in('status', ['ouverte', 'en_cours']);

      setStats((prev) => ({ ...prev, maintenanceRequests: maintenanceData?.length || 0 }));

      // Load favorites
      const { data: favoritesData } = await supabase
        .from('favorites')
        .select('*, properties(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      setRecentFavorites(favoritesData || []);

      // Load saved searches (not used, removed to avoid lint error)
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }

    if (profile && profile.user_type !== 'locataire') {
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

  return (
    <TenantDashboardLayout title="Tableau de bord">
      <div>
        {/* Header */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8 dashboard-header-animate">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center icon-pulse-premium">
              <Home className="h-6 w-6 text-white" />
            </div>
            <span>Mon Tableau de Bord</span>
          </h1>
          <p className="text-[#E8D4C5] mt-2 text-lg ml-15">
            Bienvenue, {profile?.full_name || 'Locataire'}
          </p>
        </div>

        {/* Payment Alerts */}
        {paymentAlerts.length > 0 && (
          <div className="mb-6">
            <PaymentAlertsBanner
              alerts={paymentAlerts}
              onDismiss={dismissPaymentAlert}
              onPayNow={(propertyId, amount) => navigate(`/locataire/effectuer-paiement?property=${propertyId}&amount=${amount}`)}
            />
          </div>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Lease Card */}
            {activeLease ? (
              <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-1">
                <h2 className="text-xl font-bold text-[#2C1810] mb-4 flex items-center gap-2">
                  <Home className="h-6 w-6 text-[#F16522]" />
                  <span>Mon Logement Actuel</span>
                </h2>
                <div className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-6">
                  <h3 className="text-xl font-bold text-[#2C1810] mb-2">
                    {activeLease.property?.title}
                  </h3>
                  <p className="text-[#6B5A4E] mb-4">
                    {activeLease.property?.city} • {activeLease.property?.neighborhood}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#6B5A4E]">Loyer mensuel</p>
                      <p className="text-2xl font-bold text-[#F16522]">
                        {activeLease.monthly_rent.toLocaleString()} FCFA
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#6B5A4E]">Durée du bail</p>
                      <p className="text-2xl font-bold text-[#2C1810]">
                        {Math.ceil(
                          (new Date(activeLease.end_date).getTime() -
                            new Date(activeLease.start_date).getTime()) /
                            (1000 * 60 * 60 * 24 * 30)
                        )}{' '}
                        mois
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      to={`/locataire/contrat/${activeLease.id}`}
                      className="inline-flex items-center border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-2 px-4 rounded-xl transition-colors"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Voir le bail
                    </Link>
                    <Link
                      to={`/propriete/${activeLease.property_id}`}
                      className="inline-flex items-center border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-2 px-4 rounded-xl transition-colors"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      Détails du logement
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[20px] p-8 border border-[#EFEBE9] text-center card-animate-in card-hover-premium card-stagger-1">
                <div className="bg-[#FFF5F0] w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Home className="h-12 w-12 text-[#F16522]" />
                </div>
                <h3 className="text-2xl font-bold text-[#2C1810] mb-3">Aucun logement actif</h3>
                <p className="text-[#6B5A4E] mb-6">
                  Vous n'avez pas encore de bail actif. Commencez votre recherche dès maintenant!
                </p>
                <Link
                  to="/recherche"
                  className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-6 rounded-xl transition-colors inline-flex items-center"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Rechercher un logement
                </Link>
              </div>
            )}

            {/* Next Payment Card */}
            {nextPayment && (
              <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-2">
                <h2 className="text-xl font-bold text-[#2C1810] mb-4 flex items-center gap-2">
                  <Coins className="h-6 w-6 text-[#F16522]" />
                  <span>Prochain Paiement</span>
                </h2>
                <div
                  className={`rounded-xl p-6 border ${
                    stats.paymentStatus === 'late'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-[#6B5A4E] mb-1">Montant dû</p>
                      <p className="text-3xl font-bold text-[#F16522]">
                        {nextPayment.amount.toLocaleString()} FCFA
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#6B5A4E] mb-1">Date limite</p>
                      <p className="text-xl font-bold text-[#2C1810]">
                        {new Date(nextPayment.dueDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock
                        className={`h-5 w-5 ${stats.paymentStatus === 'late' ? 'text-red-600' : 'text-green-600'}`}
                      />
                      <span
                        className={`font-semibold ${stats.paymentStatus === 'late' ? 'text-red-700' : 'text-green-700'}`}
                      >
                        {nextPayment.daysRemaining > 0
                          ? `${nextPayment.daysRemaining} jours restants`
                          : 'Paiement en retard'}
                      </span>
                    </div>
                    <Link
                      to="/locataire/effectuer-paiement"
                      className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-2 px-4 rounded-xl transition-colors"
                    >
                      Payer maintenant
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Payment History */}
            {recentPayments.length > 0 && (
              <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-3">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#2C1810]">Historique des Paiements</h2>
                  <Link
                    to="/locataire/mes-paiements"
                    className="text-[#F16522] hover:underline text-sm font-medium"
                  >
                    Voir tout →
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {payment.status === 'complete' ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <Clock className="h-6 w-6 text-amber-600" />
                        )}
                        <div>
                          <p className="font-semibold text-[#2C1810]">
                            {payment.amount.toLocaleString()} FCFA
                          </p>
                          <p className="text-xs text-[#6B5A4E]">
                            {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          payment.status === 'complete'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {payment.status === 'complete' ? 'Payé' : 'En attente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-4">
              <h3 className="text-lg font-bold text-[#2C1810] mb-4">Actions Rapides</h3>
              <div className="space-y-3">
                {activeLease && (
                  <>
                    <Link
                      to="/locataire/effectuer-paiement"
                      className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                    >
                      <Coins className="h-5 w-5 mr-2" />
                      Payer mon loyer
                    </Link>
                    <Link
                      to="/locataire/maintenance"
                      className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                    >
                      <Wrench className="h-5 w-5 mr-2" />
                      Demander une réparation
                    </Link>
                    <Link
                      to={`/locataire/contrat/${activeLease.id}`}
                      className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                    >
                      <FileText className="h-5 w-5 mr-2" />
                      Voir mon bail
                    </Link>
                  </>
                )}
                <Link
                  to="/locataire/mon-score"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Award className="h-5 w-5 mr-2" />
                  Mon Trust Score
                </Link>
                <Link
                  to="/recherche"
                  className="border border-[#EFEBE9] hover:border-[#F16522] text-[#2C1810] font-medium py-3 px-4 rounded-xl transition-colors w-full flex items-center justify-center"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Rechercher un logement
                </Link>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] card-animate-in card-hover-premium card-stagger-5">
              <h3 className="text-lg font-bold text-[#2C1810] mb-4">Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <MessageSquare className="h-5 w-5 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2C1810]">Messages non lus</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.unreadMessages}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#2C1810]">Demandes en cours</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.maintenanceRequests}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Favorites */}
            {recentFavorites.length > 0 && (
              <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#2C1810] flex items-center gap-2">
                    <Heart className="h-5 w-5 text-[#F16522]" />
                    <span>Mes Favoris</span>
                  </h3>
                  <Link
                    to="/favoris"
                    className="text-[#F16522] hover:underline text-sm font-medium"
                  >
                    Voir tout →
                  </Link>
                </div>
                <div className="space-y-3">
                  {recentFavorites.map((fav) => (
                    <Link
                      key={fav.id}
                      to={`/propriete/${fav.property_id}`}
                      className="block bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-3 hover:border-[#F16522] transition-colors"
                    >
                      <p className="font-medium text-[#2C1810] truncate">{fav.properties?.title}</p>
                      <p className="text-sm text-[#6B5A4E]">{fav.properties?.city}</p>
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
