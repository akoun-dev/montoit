import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  Home,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  MapPin,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types
interface Tenant {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  trust_score: number | null;
}

interface Property {
  id: string;
  title: string;
  city: string;
  monthly_rent: number;
  main_image: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method: string | null;
  due_date: string | null;
}

interface ContractWithDetails {
  id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  status: string;
  tenant_id: string;
  tenant: Tenant | null;
  property: Property | null;
  payments: Payment[];
}

type PeriodFilter = 'all' | 'current_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year';
type StatusFilter = 'all' | 'paid' | 'pending' | 'late';

const PERIOD_FILTERS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Toutes les périodes' },
  { value: 'current_month', label: 'Ce mois' },
  { value: 'last_month', label: 'Le mois dernier' },
  { value: 'last_3_months', label: '3 derniers mois' },
  { value: 'last_6_months', label: '6 derniers mois' },
  { value: 'this_year', label: 'Cette année' },
];

// Helper component
const StatCard = ({
  icon: Icon,
  label,
  value,
  color = 'gray',
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: 'gray' | 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'amber';
}) => {
  const colors = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
  };

  return (
    <div className={`p-5 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color === 'gray' ? 'bg-gray-200' : 'bg-white'}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const config = {
    completed: { label: 'Payé', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
    pending: { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
    failed: { label: 'Échoué', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
    cancelled: { label: 'Annulé', color: 'text-gray-700', bg: 'bg-gray-100', icon: XCircle },
  };

  const statusConfig = config[status as keyof typeof config] || config.pending;
  const Icon = statusConfig.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {statusConfig.label}
    </span>
  );
};

export default function MyTenantsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<StatusFilter>('all');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch active contracts with tenant and property info
      const { data: contractsData, error: contractsError } = await supabase
        .from('lease_contracts')
        .select(`
          id,
          contract_number,
          start_date,
          end_at,
          monthly_rent,
          status,
          tenant_id,
          properties!lease_contracts_property_id_fkey (
            id,
            title,
            city,
            main_image
          )
        `)
        .eq('owner_id', user.id)
        .eq('status', 'actif')
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      // Get tenant profiles
      const tenantIds = (contractsData || []).map((c) => c.tenant_id).filter(Boolean);
      const { data: tenantsData } = await supabase.rpc('get_public_profiles', {
        profile_user_ids: tenantIds,
      });

      const tenantsMap = new Map((tenantsData || []).map((t: any) => [t.user_id, t]));

      // Get payments for each contract
      const contractsWithDetails = await Promise.all(
        (contractsData || []).map(async (contract: any) => {
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('*')
            .eq('contract_id', contract.id)
            .order('due_date', { ascending: false })
            .limit(12);

          return {
            ...contract,
            end_date: contract.end_at || contract.end_date,
            tenant: tenantsMap.get(contract.tenant_id) || null,
            property: contract.properties,
            payments: (paymentsData || []) as Payment[],
          };
        })
      );

      setContracts(contractsWithDetails as ContractWithDetails[]);
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Erreur lors du chargement des locataires');
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTenant = contract.tenant?.full_name?.toLowerCase().includes(query);
      const matchesProperty = contract.property?.title?.toLowerCase().includes(query);
      const matchesEmail = contract.tenant?.email?.toLowerCase().includes(query);

      if (!matchesTenant && !matchesProperty && !matchesEmail) {
        return false;
      }
    }

    // Payment status filter
    if (paymentStatusFilter !== 'all') {
      const latestPayment = contract.payments[0];
      if (!latestPayment) return false;

      const isPaid = latestPayment.status === 'completed';
      const isPending = latestPayment.status === 'pending';
      const isLate = latestPayment.due_date && new Date(latestPayment.due_date) < new Date() && latestPayment.status === 'pending';

      if (paymentStatusFilter === 'paid' && !isPaid) return false;
      if (paymentStatusFilter === 'pending' && !isPending) return false;
      if (paymentStatusFilter === 'late' && !isLate) return false;
    }

    return true;
  });

  // Filter payments by period for each contract
  const getPaymentsInPeriod = (payments: Payment[]): Payment[] => {
    if (periodFilter === 'all') return payments;

    const now = new Date();
    let startDate: Date | null = null;

    switch (periodFilter) {
      case 'current_month':
        startDate = startOfMonth(now);
        break;
      case 'last_month':
        startDate = startOfMonth(subMonths(now, 1));
        break;
      case 'last_3_months':
        startDate = startOfMonth(subMonths(now, 3));
        break;
      case 'last_6_months':
        startDate = startOfMonth(subMonths(now, 6));
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    if (!startDate) return payments;

    return payments.filter((p) => {
      const paymentDate = p.payment_date ? new Date(p.payment_date) : new Date(p.due_date || 0);
      return paymentDate >= startDate;
    });
  };

  // Calculate stats
  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === 'actif').length,
    totalRevenue: contracts.reduce((sum, c) => sum + c.monthly_rent, 0),
    onTimePayments: contracts.reduce((sum, c) => {
      const paid = c.payments.filter((p) => p.status === 'completed').length;
      return sum + paid;
    }, 0),
    pendingPayments: contracts.reduce((sum, c) => {
      const pending = c.payments.filter((p) => p.status === 'pending').length;
      return sum + pending;
    }, 0),
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!user) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Veuillez vous connecter</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl shadow-sm mb-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Locataires</h1>
              <p className="text-[#E8D4C5]">Gérez vos locataires et suivez les paiements</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            icon={Users}
            label="Total locataires"
            value={stats.total}
          />
          <StatCard
            icon={CheckCircle}
            label="Locataires actifs"
            value={stats.active}
            color="green"
          />
          <StatCard
            icon={DollarSign}
            label="Revenu mensuel"
            value={formatCurrency(stats.totalRevenue)}
            color="blue"
          />
          <StatCard
            icon={CheckCircle}
            label="Paiements à jour"
            value={stats.onTimePayments}
            color="green"
          />
          <StatCard
            icon={Clock}
            label="Paiements en attente"
            value={stats.pendingPayments}
            color="amber"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un locataire..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {/* Period Filter */}
            <div className="relative">
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700">
                  {PERIOD_FILTERS.find((f) => f.value === periodFilter)?.label || 'Période'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showPeriodDropdown && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                  <div className="p-2">
                    {PERIOD_FILTERS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setPeriodFilter(option.value);
                          setShowPeriodDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          periodFilter === option.value
                            ? 'bg-orange-50 text-orange-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="paid">Payés</option>
                <option value="pending">En attente</option>
                <option value="late">En retard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tenants List */}
        {filteredContracts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun locataire</h3>
            <p className="text-gray-500">
              {searchQuery || paymentStatusFilter !== 'all'
                ? 'Aucun locataire ne correspond aux critères de recherche'
                : 'Vous n\'avez pas encore de locataire. Créez un contrat pour commencer.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map((contract) => {
              const isExpanded = expandedTenant === contract.id;
              const periodPayments = getPaymentsInPeriod(contract.payments);
              const totalPaid = periodPayments
                .filter((p) => p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0);
              const totalPending = periodPayments
                .filter((p) => p.status === 'pending')
                .reduce((sum, p) => sum + p.amount, 0);

              return (
                <div
                  key={contract.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Main Card */}
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row gap-5">
                      {/* Property Image */}
                      <div className="lg:w-44 h-36 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                        {contract.property?.main_image ? (
                          <img
                            src={contract.property.main_image}
                            alt={contract.property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="h-10 w-10 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Tenant Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <span className="font-semibold text-gray-900">
                                {contract.property?.title || 'Propriété'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{contract.property?.city || ''}</span>
                            </div>
                          </div>
                        </div>

                        {/* Tenant Details */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-3">
                          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            {contract.tenant?.avatar_url ? (
                              <img
                                src={contract.tenant.avatar_url}
                                alt={contract.tenant.full_name || ''}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <Users className="w-6 h-6 text-orange-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">
                              {contract.tenant?.full_name || 'Locataire'}
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                              {contract.tenant?.email && (
                                <a
                                  href={`mailto:${contract.tenant.email}`}
                                  className="flex items-center gap-1 hover:text-orange-500 transition-colors"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span className="truncate">{contract.tenant.email}</span>
                                </a>
                              )}
                              {contract.tenant?.phone && (
                                <a
                                  href={`tel:${contract.tenant.phone}`}
                                  className="flex items-center gap-1 hover:text-orange-500 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                  <span>{contract.tenant.phone}</span>
                                </a>
                              )}
                            </div>
                          </div>
                          {contract.tenant?.trust_score && (
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Score</p>
                              <p className="font-bold text-green-600">{contract.tenant.trust_score}%</p>
                            </div>
                          )}
                        </div>

                        {/* Contract Details */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Loyer</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              {formatCurrency(contract.monthly_rent)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Début</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              {formatDate(contract.start_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Fin</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              {formatDate(contract.end_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Contrat</p>
                            <p className="font-semibold text-gray-900 text-sm font-mono">
                              #{contract.contract_number.slice(-6).toUpperCase()}
                            </p>
                          </div>
                        </div>

                        {/* Payment Summary for Period */}
                        {periodFilter !== 'all' && (
                          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg mb-3">
                            <div className="flex-1">
                              <p className="text-xs text-blue-700 mb-1">Total payé cette période</p>
                              <p className="font-bold text-blue-800">{formatCurrency(totalPaid)}</p>
                            </div>
                            {totalPending > 0 && (
                              <div className="flex-1">
                                <p className="text-xs text-amber-700 mb-1">En attente</p>
                                <p className="font-bold text-amber-800">{formatCurrency(totalPending)}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setExpandedTenant(isExpanded ? null : contract.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            <CreditCard className="w-4 h-4" />
                            {isExpanded ? 'Masquer' : 'Voir les paiements'}
                          </button>
                          <Link
                            to={`/contrat/${contract.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Home className="w-4 h-4" />
                            Voir le contrat
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment History */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-orange-500" />
                        Historique des paiements
                        {periodFilter !== 'all' && (
                          <span className="text-sm font-normal text-gray-500">
                            ({PERIOD_FILTERS.find((f) => f.value === periodFilter)?.label})
                          </span>
                        )}
                      </h4>

                      {periodPayments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>Aucun paiement pour cette période</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Montant</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Méthode</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
                              </tr>
                            </thead>
                            <tbody>
                              {periodPayments.map((payment) => (
                                <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4 text-sm text-gray-900">
                                    {payment.payment_date
                                      ? formatDate(payment.payment_date)
                                      : payment.due_date
                                        ? `${formatDate(payment.due_date)} (échéance)`
                                        : '-'}
                                  </td>
                                  <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                                    {formatCurrency(payment.amount)}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-600">
                                    {payment.payment_method || '-'}
                                  </td>
                                  <td className="py-3 px-4">
                                    <PaymentStatusBadge status={payment.status} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
