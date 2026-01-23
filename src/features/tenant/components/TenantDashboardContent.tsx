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
} from 'lucide-react';
import { format } from 'date-fns';
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
        .eq('payer_id', user.id)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-[#EFEBE9]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5A4E]">Baux actifs</p>
              <p className="text-2xl font-bold text-[#2C1810] mt-1">
                {leases.filter((l) => ['actif', 'en_cours', 'signé'].includes(l.status)).length}
              </p>
            </div>
            <div className="p-3 bg-[#F16522]/10 rounded-xl">
              <FileText className="h-5 w-5 text-[#F16522]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-[#EFEBE9]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5A4E]">Paiements à venir</p>
              <p className="text-2xl font-bold text-[#2C1810] mt-1">
                {upcomingPayments.filter((p) => p.status === 'en_attente').length}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <Link
          to="/locataire/mes-visites"
          className="bg-white rounded-2xl p-5 border border-[#EFEBE9] hover:border-[#F16522] transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5A4E]">Mes Visites</p>
              <p className="text-sm font-medium text-[#F16522] mt-1 group-hover:underline">
                Voir tout →
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Link>

        <Link
          to="/locataire/maintenance"
          className="bg-white rounded-2xl p-5 border border-[#EFEBE9] hover:border-[#F16522] transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6B5A4E]">Maintenance</p>
              <p className="text-sm font-medium text-[#F16522] mt-1 group-hover:underline">
                Signaler →
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl">
              <Wrench className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Active Leases */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#2C1810]">Mes Baux</h2>
          <Link to="/locataire/mes-contrats" className="text-sm text-[#F16522] hover:underline font-medium">
            Voir tous
          </Link>
        </div>

        {leases.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-8 text-center">
            <FileText className="h-12 w-12 text-[#A69B95] mx-auto mb-3" />
            <p className="text-[#6B5A4E]">Aucun bail actif</p>
            <Link
              to="/recherche"
              className="text-[#F16522] hover:underline text-sm font-medium mt-2 inline-block"
            >
              Rechercher un logement
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {leases.slice(0, 3).map((lease) => (
              <Link
                key={lease.id}
                to={`/locataire/contrat/${lease.id}`}
                className="flex items-center gap-4 bg-white rounded-2xl border border-[#EFEBE9] p-4 hover:border-[#F16522] transition-colors group"
              >
                {lease.property?.main_image ? (
                  <img
                    src={lease.property.main_image}
                    alt={lease.property.title}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#FAF7F4] flex items-center justify-center">
                    <FileText className="h-6 w-6 text-[#A69B95]" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#2C1810] truncate">
                      {lease.property?.title || `Contrat ${lease.contract_number}`}
                    </p>
                    {getStatusBadge(lease.status)}
                  </div>
                  <p className="text-sm text-[#6B5A4E] mt-0.5">
                    {lease.property?.city} •{' '}
                    {format(new Date(lease.start_date), 'MMM yyyy', { locale: fr })} -{' '}
                    {format(new Date(lease.end_date), 'MMM yyyy', { locale: fr })}
                  </p>
                  <p className="text-sm font-semibold text-[#F16522] mt-1">
                    {lease.monthly_rent?.toLocaleString('fr-FR')} FCFA/mois
                  </p>
                </div>

                <ChevronRight className="h-5 w-5 text-[#A69B95] group-hover:text-[#F16522] transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Payments */}
      {upcomingPayments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#2C1810]">Paiements à venir</h2>
            <Link
              to="/locataire/mes-paiements"
              className="text-sm text-[#F16522] hover:underline font-medium"
            >
              Historique
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-[#EFEBE9] divide-y divide-[#EFEBE9]">
            {upcomingPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-[#2C1810]">
                    {payment.payment_type === 'loyer' ? 'Loyer' : payment.payment_type}
                  </p>
                  <p className="text-sm text-[#6B5A4E]">
                    Échéance :{' '}
                    {payment.due_date
                      ? format(new Date(payment.due_date), 'd MMMM yyyy', { locale: fr })
                      : 'Non définie'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[#2C1810]">
                    {payment.amount?.toLocaleString('fr-FR')} FCFA
                  </p>
                  <Link
                    to={`/locataire/effectuer-paiement?payment=${payment.id}`}
                    className="text-sm text-[#F16522] hover:underline font-medium"
                  >
                    Payer →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
