import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  FileText,
  CreditCard,
  Calendar,
  Wrench,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Home,
  Search,
  Bell,
  Clock,
  Star,
  MapPin,
} from 'lucide-react';
import { format, differenceInDays, isPast, isWithinDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LeaseContract {
  id: string;
  contract_number: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  status: string;
  property: {
    title: string;
    city: string;
    main_image: string | null;
  } | null;
}

interface Payment {
  id: string;
  amount: number;
  due_date: string | null;
  status: string | null;
  payment_type: string;
}

/**
 * Contenu du dashboard locataire - affiché dans l'onglet "Mes Locations"
 */
export default function TenantDashboardContent() {
  const { user } = useAuth();
  const [leases, setLeases] = useState<LeaseContract[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchTenantData();
    }
  }, [user?.id]);

  const fetchTenantData = async () => {
    if (!user?.id) return;

    try {
      // Fetch active leases
      const { data: leasesData, error: leasesError } = await supabase
        .from('lease_contracts')
        .select(
          `
          id,
          contract_number,
          monthly_rent,
          start_date,
          end_date,
          status,
          property:property_id (
            title,
            city,
            main_image
          )
        `
        )
        .eq('tenant_id', user.id)
        .order('start_date', { ascending: false });

      if (leasesError) throw leasesError;

      setLeases((leasesData as unknown as LeaseContract[]) || []);

      // Fetch upcoming payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, due_date, status, payment_type')
        .eq('tenant_id', user.id)
        .gte('due_date', new Date().toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5);

      if (paymentsError) throw paymentsError;
      setUpcomingPayments(paymentsData || []);
    } catch (error) {
      console.error('Error fetching tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const defaultConfig = {
      label: 'Brouillon',
      className: 'bg-yellow-100 text-yellow-700',
      icon: AlertCircle,
    };
    const statusConfig: Record<
      string,
      { label: string; className: string; icon: React.ElementType }
    > = {
      actif: { label: 'Actif', className: 'bg-green-100 text-green-700', icon: CheckCircle },
      en_cours: { label: 'En cours', className: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      signé: { label: 'Signé', className: 'bg-green-100 text-green-700', icon: CheckCircle },
      terminé: { label: 'Terminé', className: 'bg-gray-100 text-gray-700', icon: AlertCircle },
      brouillon: defaultConfig,
    };
    const config = statusConfig[status || 'brouillon'] ?? defaultConfig;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const getPaymentUrgency = (dueDate: string | null) => {
    if (!dueDate) return { level: 'normal', className: 'text-gray-500', label: 'Non définie' };
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return { level: 'overdue', className: 'text-red-600 font-semibold', label: 'En retard' };
    if (days <= 3) return { level: 'urgent', className: 'text-orange-600 font-semibold', label: `${days} jour${days > 1 ? 's' : ''}` };
    if (days <= 7) return { level: 'soon', className: 'text-amber-600', label: `${days} jour${days > 1 ? 's' : ''}` };
    return { level: 'normal', className: 'text-gray-500', label: `${days} jour${days > 1 ? 's' : ''}` };
  };

  const activeLease = leases.find((l) => ['actif', 'en_cours', 'signé'].includes(l.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Card - Show active lease or search CTA */}
      {!activeLease ? (
        <div className="bg-gradient-to-br from-[#F16522]/10 to-[#F16522]/5 rounded-2xl border border-[#F16522]/20 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#F16522]/10 rounded-xl">
              <Home className="h-6 w-6 text-[#F16522]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#2C1810]">Trouvez votre prochain logement</h3>
              <p className="text-[#6B5A4E] mt-1">
                Explorez les annonces disponibles et postulez en ligne
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <Link
                  to="/recherche"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F16522] text-white hover:bg-[#D95318] transition-colors font-medium shadow-lg shadow-orange-500/20"
                >
                  <Search className="h-4 w-4" />
                  Rechercher
                </Link>
                <Link
                  to="/locataire/favoris"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#EFEBE9] text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522] transition-colors font-medium"
                >
                  <Star className="h-4 w-4" />
                  Mes favoris
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-[#F16522]/10 to-[#F16522]/5 rounded-2xl border border-[#F16522]/20 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Home className="h-5 w-5 text-[#F16522]" />
            <h3 className="text-lg font-semibold text-[#2C1810]">Mon logement actuel</h3>
          </div>
          <Link
            to={`/locataire/contrat/${activeLease.id}`}
            className="flex items-center gap-4 bg-white rounded-xl p-4 hover:shadow-md transition-all group"
          >
            {activeLease.property?.main_image ? (
              <img
                src={activeLease.property.main_image}
                alt={activeLease.property.title}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-[#FAF7F4] flex items-center justify-center">
                <Home className="h-8 w-8 text-[#A69B95]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-[#2C1810] truncate">
                  {activeLease.property?.title || 'Mon logement'}
                </p>
                {getStatusBadge(activeLease.status)}
              </div>
              <div className="flex items-center gap-1 text-sm text-[#6B5A4E] mt-1">
                <MapPin className="h-3 w-3" />
                {activeLease.property?.city || 'Non spécifié'}
              </div>
              <p className="text-lg font-bold text-[#F16522] mt-2">
                {activeLease.monthly_rent?.toLocaleString('fr-FR')} FCFA
                <span className="text-sm font-normal text-[#6B5A4E]">/mois</span>
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-[#A69B95] group-hover:text-[#F16522] transition-colors" />
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          to="/locataire/mes-visites"
          className="bg-white rounded-xl p-4 border border-[#EFEBE9] hover:border-[#F16522] hover:shadow-md transition-all group"
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-sm font-medium text-[#2C1810] mt-2">Visites</p>
            <p className="text-xs text-[#6B5A4E]">Planifier</p>
          </div>
        </Link>

        <Link
          to="/locataire/mes-candidatures"
          className="bg-white rounded-xl p-4 border border-[#EFEBE9] hover:border-[#F16522] hover:shadow-md transition-all group"
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-[#2C1810] mt-2">Candidatures</p>
            <p className="text-xs text-[#6B5A4E]">Suivre</p>
          </div>
        </Link>

        <Link
          to="/locataire/mes-paiements"
          className="bg-white rounded-xl p-4 border border-[#EFEBE9] hover:border-[#F16522] hover:shadow-md transition-all group"
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
              <CreditCard className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-[#2C1810] mt-2">Paiements</p>
            <p className="text-xs text-[#6B5A4E]">Historique</p>
          </div>
        </Link>

        <Link
          to="/locataire/maintenance"
          className="bg-white rounded-xl p-4 border border-[#EFEBE9] hover:border-[#F16522] hover:shadow-md transition-all group"
        >
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
              <Wrench className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-sm font-medium text-[#2C1810] mt-2">Maintenance</p>
            <p className="text-xs text-[#6B5A4E]">Signaler</p>
          </div>
        </Link>
      </div>

      {/* Urgent Payments Alert */}
      {upcomingPayments.length > 0 && upcomingPayments.some((p) => {
        const urgency = getPaymentUrgency(p.due_date);
        return urgency.level === 'overdue' || urgency.level === 'urgent';
      }) && (
        <div className="bg-red-50 rounded-xl border border-red-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Paiements urgents</h3>
          </div>
          <div className="space-y-2">
            {upcomingPayments
              .filter((p) => {
                const urgency = getPaymentUrgency(p.due_date);
                return urgency.level === 'overdue' || urgency.level === 'urgent';
              })
              .slice(0, 2)
              .map((payment) => {
                const urgency = getPaymentUrgency(payment.due_date);
                return (
                  <div key={payment.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div>
                      <p className="font-medium text-[#2C1810]">
                        {payment.payment_type === 'loyer' ? 'Loyer' : payment.payment_type}
                      </p>
                      <p className={`text-xs ${urgency.className} flex items-center gap-1`}>
                        <Clock className="h-3 w-3" />
                        {payment.due_date
                          ? format(new Date(payment.due_date), 'd MMM', { locale: fr })
                          : 'Non définie'}
                        {' • '}{urgency.label}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#2C1810]">
                        {payment.amount?.toLocaleString('fr-FR')} FCFA
                      </p>
                      <Link
                        to={`/locataire/effectuer-paiement?payment=${payment.id}`}
                        className="text-xs text-[#F16522] hover:underline font-medium"
                      >
                        Payer →
                      </Link>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* All Leases */}
      {leases.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#2C1810]">Tous mes baux</h2>
            <Link to="/locataire/mes-contrats" className="text-sm text-[#F16522] hover:underline font-medium">
              Voir tous →
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-[#EFEBE9] divide-y divide-[#EFEBE9]">
            {leases.slice(0, 3).map((lease) => (
              <Link
                key={lease.id}
                to={`/locataire/contrat/${lease.id}`}
                className="flex items-center gap-3 p-3 hover:bg-[#FAF7F4] transition-colors group"
              >
                {lease.property?.main_image ? (
                  <img
                    src={lease.property.main_image}
                    alt={lease.property.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#FAF7F4] flex items-center justify-center">
                    <FileText className="h-5 w-5 text-[#A69B95]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#2C1810] truncate">
                      {lease.property?.title || `Contrat ${lease.contract_number}`}
                    </p>
                    {getStatusBadge(lease.status)}
                  </div>
                  <p className="text-xs text-[#6B5A4E] mt-0.5">
                    {lease.property?.city}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#A69B95] group-hover:text-[#F16522] transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Payments (non-urgent) */}
      {upcomingPayments.length > 0 && !upcomingPayments.every((p) => {
        const urgency = getPaymentUrgency(p.due_date);
        return urgency.level === 'overdue' || urgency.level === 'urgent';
      }) && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#2C1810]">Échéances à venir</h2>
            <Link
              to="/locataire/mes-paiements"
              className="text-sm text-[#F16522] hover:underline font-medium"
            >
              Voir tout →
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-[#EFEBE9] divide-y divide-[#EFEBE9]">
            {upcomingPayments
              .filter((p) => {
                const urgency = getPaymentUrgency(p.due_date);
                return urgency.level !== 'overdue' && urgency.level !== 'urgent';
              })
              .slice(0, 3)
              .map((payment) => {
                const urgency = getPaymentUrgency(payment.due_date);
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-medium text-[#2C1810]">
                        {payment.payment_type === 'loyer' ? 'Loyer' : payment.payment_type}
                      </p>
                      <p className={`text-xs ${urgency.className} flex items-center gap-1`}>
                        <Clock className="h-3 w-3" />
                        {payment.due_date
                          ? format(new Date(payment.due_date), 'd MMMM yyyy', { locale: fr })
                          : 'Date non définie'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#2C1810]">
                        {payment.amount?.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
