import { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Search,
  Bell,
  FileText,
  Plus,
  Loader2,
  Home,
  Building2,
  User,
  CreditCard,
  Zap,
  Droplets,
  Globe,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

// COLORS
const COLORS = {
  chocolat: '#2C1810',
  sable: '#E8D4C5',
  orange: '#F16522',
  creme: '#FAF7F4',
  grisNeutre: '#A69B95',
  grisTexte: '#6B5A4E',
  border: '#EFEBE9',
};

// Types
interface Tenant {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface Property {
  id: string;
  title: string;
  city: string;
  main_image: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method: string | null;
  due_date: string | null;
  created_at: string;
}

interface ContractWithPayments {
  id: string;
  contract_number: string;
  start_date: string;
  end_at: string;
  monthly_rent: number;
  charges_amount: number | null;
  status: string;
  tenant_id: string;
  tenant: Tenant | null;
  property: Property | null;
  payments: Payment[];
  owner_id?: string;
  agency_id?: string;
}

interface Charge {
  id: string;
  property_id: string;
  charge_type: 'water' | 'electricity' | 'internet' | 'maintenance' | 'other';
  amount: number;
  period_start: string;
  period_end: string;
  tenant_share: number;
  owner_share: number;
  status: 'pending' | 'paid';
  created_at: string;
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'late';
type PropertyFilter = 'all' | string;

// Helper Components
const StatCard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  color = 'gray',
  trend,
}: {
  icon: any;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'gray' | 'green' | 'orange' | 'blue' | 'red';
  trend?: { value: number; up: boolean };
}) => {
  const colors = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className={`p-5 rounded-xl border ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${color === 'gray' ? 'bg-gray-200' : 'bg-white'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.up ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-3.5 h-3.5 ${!trend.up && 'rotate-180'}`} />
            {trend.value}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-xs opacity-75">{subtitle}</p>}
    </div>
  );
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to format compact number
const formatCompact = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(amount);
};

const PaymentStatusBadge = ({ status, dueDate }: { status: string; dueDate?: string | null }) => {
  const isLate = dueDate && isPast(new Date(dueDate)) && status === 'pending';

  const config = {
    completed: { label: 'Payé', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle },
    pending: isLate
      ? { label: 'En retard', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle }
      : { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
    failed: { label: 'Échoué', color: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle },
    cancelled: { label: 'Annulé', color: 'text-gray-700', bg: 'bg-gray-100', icon: Clock },
  };

  const statusConfig = config[status as keyof typeof config] || config.pending;
  const Icon = statusConfig.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {statusConfig.label}
    </span>
  );
};

const ChargeTypeBadge = ({ type }: { type: string }) => {
  const config = {
    water: { label: 'Eau', color: 'text-blue-600', bg: 'bg-blue-50', icon: Droplets },
    electricity: { label: 'Électricité', color: 'text-amber-600', bg: 'bg-amber-50', icon: Zap },
    internet: { label: 'Internet', color: 'text-purple-600', bg: 'bg-purple-50', icon: Globe },
    maintenance: { label: 'Maintenance', color: 'text-gray-600', bg: 'bg-gray-50', icon: Wrench },
    other: { label: 'Autre', color: 'text-gray-600', bg: 'bg-gray-50', icon: FileText },
  };

  const typeConfig = config[type as keyof typeof config] || config.other;
  const Icon = typeConfig.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${typeConfig.bg} ${typeConfig.color}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {typeConfig.label}
    </span>
  );
};

export default function AgencyPaymentsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<ContractWithPayments[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'charges'>('overview');

  // Stats
  const [stats, setStats] = useState({
    currentMonthRent: 0,
    latePayments: 0,
    lateAmount: 0,
    paymentRate: 0,
    totalRevenue: 0,
    pendingCharges: 0,
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch agency ID from user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('user_id', user.id)
        .single();

      const agencyId = profileData?.agency_id;
      if (!agencyId) {
        toast.error('Profil agence non trouvé');
        setLoading(false);
        return;
      }

      // Fetch active contracts for agency (properties under agency management)
      const { data: contractsData, error: contractsError } = await supabase
        .from('lease_contracts')
        .select(`
          id,
          contract_number,
          start_date,
          end_at,
          monthly_rent,
          charges_amount,
          status,
          tenant_id,
          owner_id,
          properties!lease_contracts_property_id_fkey (
            id,
            title,
            city,
            main_image,
            agency_id
          )
        `)
        .eq('status', 'actif')
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      // Filter contracts by agency_id in properties
      const agencyContracts = (contractsData || []).filter((c: any) =>
        c.properties?.agency_id === agencyId
      );

      // Get tenant profiles
      const tenantIds = agencyContracts.map((c: any) => c.tenant_id).filter(Boolean);
      const { data: tenantsData } = await supabase.rpc('get_public_profiles', {
        profile_user_ids: tenantIds as string[],
      });

      const tenantsMap = new Map((tenantsData || []).map((t: any) => [t.user_id, t]));

      // Get payments for each contract
      const contractsWithDetails = await Promise.all(
        agencyContracts.map(async (contract: any) => {
          const { data: paymentsData } = await supabase
            .from('payments')
            .select('*')
            .eq('contract_id', contract.id)
            .order('due_date', { ascending: false })
            .limit(12);

          return {
            ...contract,
            property: contract.properties || null,
            tenant: tenantsMap.get(contract.tenant_id) || null,
            payments: paymentsData || [],
          };
        })
      );

      setContracts(contractsWithDetails);

      // Fetch charges (if the table exists)
      try {
        const propertyIds = contractsWithDetails
          .map((c: any) => c.property?.id)
          .filter(Boolean);

        if (propertyIds.length > 0) {
          const { data: chargesData } = await (supabase as any)
            .from('property_charges')
            .select('*')
            .in('property_id', propertyIds)
            .order('created_at', { ascending: false })
            .limit(50);

          setCharges((chargesData ?? []) as Charge[]);
        } else {
          setCharges([]);
        }
      } catch (e) {
        setCharges([]);
      }

      calculateStats(contractsWithDetails);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (contractsData: ContractWithPayments[]) => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);

    let currentMonthRent = 0;
    let latePayments = 0;
    let lateAmount = 0;
    let totalPaid = 0;
    let totalExpected = 0;

    contractsData.forEach((contract) => {
      currentMonthRent += contract.monthly_rent;
      totalExpected += contract.monthly_rent;

      contract.payments.forEach((payment) => {
        if (payment.due_date) {
          const dueDate = new Date(payment.due_date);

          if (payment.status === 'pending' && isPast(dueDate)) {
            latePayments++;
            lateAmount += payment.amount;
          }

          if (payment.status === 'completed' && payment.payment_date) {
            const paymentDate = new Date(payment.payment_date);
            if (paymentDate >= currentMonthStart && paymentDate <= currentMonthEnd) {
              totalPaid += payment.amount;
            }
          }
        }
      });
    });

    const paymentRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

    setStats({
      currentMonthRent,
      latePayments,
      lateAmount,
      paymentRate,
      totalRevenue: totalPaid,
      pendingCharges: charges.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.tenant_share, 0),
    });
  };

  const sendPaymentReminder = async (_tenantId: string, tenantName: string) => {
    try {
      toast.success(`Rappel envoyé à ${tenantName || 'le locataire'}`);
    } catch (error) {
      toast.error('Erreur lors de l\'envoi du rappel');
    }
  };

  const markAsPaid = async (paymentId: string) => {
    try {
      const { error } = await supabase.from('payments').update({ status: 'completed', payment_date: new Date().toISOString() }).eq('id', paymentId);

      if (error) throw error;

      toast.success('Paiement marqué comme payé');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du paiement');
    }
  };

  // Filter payments based on current filters
  const filteredPayments = (() => {
    let result = contracts.flatMap((contract) =>
      contract.payments.map((payment) => ({
        ...payment,
        contract,
      }))
    );

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item: any) => {
        const matchesTenant = item.contract.tenant?.full_name?.toLowerCase().includes(query);
        const matchesProperty = item.contract.property?.title?.toLowerCase().includes(query);
        return matchesTenant || matchesProperty;
      });
    }

    if (statusFilter !== 'all') {
      result = result.filter((item: any) => {
        if (statusFilter === 'paid') return item.status === 'completed';
        if (statusFilter === 'pending') return item.status === 'pending';
        if (statusFilter === 'late') {
          return item.status === 'pending' && item.due_date && isPast(new Date(item.due_date));
        }
        return true;
      });
    }

    if (propertyFilter !== 'all') {
      result = result.filter((item: any) => item.contract.property?.id === propertyFilter);
    }

    return result;
  })();

  const uniqueProperties = Array.from(new Set(contracts.map((c) => c.property?.id).filter(Boolean))) as string[];

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
              <Wallet className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Paiements & Charges</h1>
              <p className="text-[#E8D4C5]">Suivez les loyers et gérez les charges locatives</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Calendar}
            label="Loyer ce mois"
            value={`${formatCompact(stats.currentMonthRent)} FCFA`}
            color="gray"
          />
          <StatCard
            icon={AlertCircle}
            label="En retard"
            value={stats.latePayments}
            subtitle={`${formatCompact(stats.lateAmount)} FCFA`}
            color="red"
          />
          <StatCard
            icon={CheckCircle}
            label="Taux de paiement"
            value={`${stats.paymentRate}%`}
            subtitle={`${Math.round((stats.paymentRate / 100) * stats.currentMonthRent)} FCFA collectés`}
            color="green"
            trend={{ value: 5, up: true }}
          />
          <StatCard
            icon={CreditCard}
            label="Charges en attente"
            value={`${formatCompact(stats.pendingCharges)} FCFA`}
            subtitle="À facturer aux locataires"
            color="orange"
          />
        </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border overflow-hidden mb-6" style={{ borderColor: COLORS.border }}>
              <div className="flex border-b" style={{ borderColor: COLORS.border }}>
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                    activeTab === 'overview'
                      ? 'text-white bg-[#F16522]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Vue d'ensemble
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('payments')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                    activeTab === 'payments'
                      ? 'text-white bg-[#F16522]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Paiements
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('charges')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                    activeTab === 'charges'
                      ? 'text-white bg-[#F16522]'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="w-4 h-4" />
                    Charges
                  </div>
                </button>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.chocolat }}>
                        Résumé des paiements du mois
                      </h3>
                      {contracts.length === 0 ? (
                        <div className="text-center py-12">
                          <Home className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-500">Aucun contrat actif trouvé</p>
                          <p className="text-sm text-gray-400 mt-1">Les contrats actifs apparaîtront ici</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {contracts.map((contract) => {
                            const currentMonthPayment = contract.payments.find((p) => {
                              if (!p.due_date) return false;
                              const dueDate = new Date(p.due_date);
                              const now = new Date();
                              return dueDate >= startOfMonth(now) && dueDate <= endOfMonth(now);
                            });

                            let paymentStatus: 'paid' | 'pending' | 'late' = 'pending';
                            let paymentAmount = contract.monthly_rent;

                            if (currentMonthPayment) {
                              if (currentMonthPayment.status === 'completed') {
                                paymentStatus = 'paid';
                                paymentAmount = currentMonthPayment.amount;
                              } else if (currentMonthPayment.status === 'pending' && currentMonthPayment.due_date && isPast(new Date(currentMonthPayment.due_date))) {
                                paymentStatus = 'late';
                              }
                            }

                            return (
                              <div
                                key={contract.id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border hover:bg-gray-100 transition-colors"
                                style={{ borderColor: COLORS.border }}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white border" style={{ borderColor: COLORS.border }}>
                                    {contract.property?.main_image ? (
                                      <img
                                        src={contract.property.main_image}
                                        alt={contract.property.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                        <Home className="w-6 h-6 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold" style={{ color: COLORS.chocolat }}>
                                      {contract.property?.title || 'Bien sans titre'}
                                    </p>
                                    <p className="text-sm text-gray-600">{contract.tenant?.full_name || 'Locataire'}</p>
                                    <p className="text-xs text-gray-400">{contract.contract_number}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="font-bold" style={{ color: COLORS.chocolat }}>
                                      {formatCurrency(paymentAmount)}
                                    </p>
                                    {paymentStatus === 'paid' && (
                                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                        <CheckCircle className="w-3 h-3" />
                                        Payé
                                      </span>
                                    )}
                                    {paymentStatus === 'pending' && (
                                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                        <Clock className="w-3 h-3" />
                                        En attente
                                      </span>
                                    )}
                                    {paymentStatus === 'late' && (
                                      <span className="inline-flex items-center gap-1 text-xs text-red-600">
                                        <AlertCircle className="w-3 h-3" />
                                        En retard
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 items-center">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Rechercher..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          style={{ borderColor: COLORS.border }}
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        style={{ borderColor: COLORS.border }}
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="paid">Payés</option>
                        <option value="pending">En attente</option>
                        <option value="late">En retard</option>
                      </select>

                      <select
                        value={propertyFilter}
                        onChange={(e) => setPropertyFilter(e.target.value as PropertyFilter)}
                        className="px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        style={{ borderColor: COLORS.border }}
                      >
                        <option value="all">Tous les biens</option>
                        {uniqueProperties.map((propId) => {
                          const prop = contracts.find((c) => c.property?.id === propId)?.property;
                          return (
                            <option key={propId} value={propId}>
                              {prop?.title || 'Bien sans titre'}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Payments List */}
                    <div className="space-y-3">
                      {filteredPayments.length === 0 ? (
                        <div className="text-center py-12">
                          <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-gray-500">
                            {contracts.length === 0
                              ? 'Aucun contrat trouvé'
                              : searchQuery || statusFilter !== 'all' || propertyFilter !== 'all'
                                ? 'Aucun paiement ne correspond aux filtres'
                                : 'Aucun paiement enregistré'}
                          </p>
                          {contracts.length > 0 && searchQuery === '' && statusFilter === 'all' && propertyFilter === 'all' && (
                            <p className="text-sm text-gray-400 mt-2">
                              Les paiements seront affichés ici une fois enregistrés
                            </p>
                          )}
                        </div>
                      ) : (
                        filteredPayments.map((payment: any) => (
                          <div
                            key={payment.id}
                            className="p-4 bg-gray-50 rounded-xl border hover:bg-gray-100 transition-colors"
                            style={{ borderColor: COLORS.border }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-white">
                                  {payment.contract.tenant?.avatar_url ? (
                                    <img
                                      src={payment.contract.tenant.avatar_url}
                                      alt={payment.contract.tenant.full_name || ''}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <User className="w-5 h-5 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-semibold" style={{ color: COLORS.chocolat }}>
                                    {payment.contract.tenant?.full_name || 'Locataire'}
                                  </p>
                                  <p className="text-sm text-gray-600">{payment.contract.property?.title || 'Bien'}</p>
                                  {payment.due_date && (
                                    <p className="text-xs text-gray-500">
                                      Échéance: {format(new Date(payment.due_date), 'dd MMM yyyy', { locale: fr })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-bold" style={{ color: COLORS.chocolat }}>
                                    {formatCurrency(payment.amount)}
                                  </p>
                                  <PaymentStatusBadge status={payment.status} dueDate={payment.due_date} />
                                </div>
                                {payment.status === 'pending' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() =>
                                        sendPaymentReminder(
                                          payment.contract.tenant_id,
                                          payment.contract.tenant?.full_name || ''
                                        )
                                      }
                                      className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                                      title="Envoyer un rappel"
                                    >
                                      <Bell className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => markAsPaid(payment.id)}
                                      className="p-2 rounded-lg hover:bg-green-100 transition-colors"
                                      title="Marquer comme payé"
                                    >
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Charges Tab */}
                {activeTab === 'charges' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold" style={{ color: COLORS.chocolat }}>
                        Charges locatives
                      </h3>
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-white transition-colors"
                        style={{ backgroundColor: COLORS.orange }}
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter une charge
                      </button>
                    </div>

                    {charges.length === 0 ? (
                      <div className="text-center py-12">
                        <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500">Aucune charge enregistrée</p>
                        <p className="text-sm text-gray-400 mt-1">Ajoutez des charges pour suivre les dépenses communes</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {charges.map((charge) => {
                          const property = contracts.find((c) => c.property?.id === charge.property_id)?.property;
                          return (
                            <div
                              key={charge.id}
                              className="p-4 bg-gray-50 rounded-xl border hover:bg-gray-100 transition-colors"
                              style={{ borderColor: COLORS.border }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-gray-400" />
                                  </div>
                                  <div>
                                    <p className="font-semibold" style={{ color: COLORS.chocolat }}>
                                      {property?.title || 'Bien'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {format(new Date(charge.period_start), 'dd MMM yyyy', { locale: fr })} -{' '}
                                      {format(new Date(charge.period_end), 'dd MMM yyyy', { locale: fr })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <ChargeTypeBadge type={charge.charge_type} />
                                  <div className="text-right">
                                    <p className="font-bold" style={{ color: COLORS.chocolat }}>
                                      {formatCurrency(charge.tenant_share)}
                                    </p>
                                    <p className="text-xs text-gray-500">Part locataire</p>
                                  </div>
                                  <span
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                                      charge.status === 'paid'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {charge.status === 'paid' ? 'Payé' : 'En attente'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
      </div>
    </div>
  );
}
