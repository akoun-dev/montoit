import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  RefreshCw,
  XCircle,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronRight,
  Loader2,
  Pen,
  Shield,
  FileSignature,
  CreditCard,
  Wallet,
  Info,
  Ban,
  Users,
  User,
  Home as HomeIcon,
  Calendar,
  MapPin,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { ROUTES } from '@/shared/config/routes.config';
import {
  downloadContract,
  regenerateContract,
  deleteContract,
  sendSignatureReminder,
  cancelContract,
  terminateContract,
} from '@/services/contracts/contractService';
import { toast } from 'sonner';
import { format, addYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui';
import { Button } from '@/shared/ui/Button';
import TerminatedContractsTab from './TerminatedContractsTab';

// Types
interface Contract {
  id: string;
  contract_number: string;
  status: string;
  monthly_rent: number;
  charges_amount: number | null;
  deposit_amount: number | null;
  start_date: string;
  end_date: string;
  document_url: string | null;
  owner_signed_at: string | null;
  tenant_signed_at: string | null;
  created_at: string;
  tenant_id: string;
  properties: {
    id: string;
    title: string;
    city: string;
    main_image: string | null;
  };
  tenant_profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface Stats {
  total: number;
  brouillon: number;
  en_attente_signature: number;
  actif: number;
  expire: number;
  resilie: number;
  annule: number;
}

// Status config
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  brouillon: {
    label: 'Brouillon',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    icon: FileText,
  },
  en_attente_signature: {
    label: 'En attente',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    icon: Clock,
  },
  actif: {
    label: 'Actif',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: CheckCircle2,
  },
  expire: {
    label: 'Expiré',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: XCircle,
  },
  resilie: {
    label: 'Résilié',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: XCircle,
  },
  annule: {
    label: 'Annulé',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    icon: XCircle,
  },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'brouillon', label: 'Brouillons' },
  { value: 'en_attente_signature', label: 'En attente' },
  { value: 'actif', label: 'Actifs' },
  { value: 'expire', label: 'Expirés' },
];

type TabValue = 'actifs' | 'resilies';

const TAB_OPTIONS: { value: TabValue; label: string; icon: any }[] = [
  { value: 'actifs', label: 'Contrats Actifs', icon: CheckCircle2 },
  { value: 'resilies', label: 'Résiliés', icon: Ban },
];

// Helper components
const StatCard = ({
  icon: Icon,
  label,
  value,
  color = 'gray',
  onClick
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: 'gray' | 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'amber';
  onClick?: () => void;
}) => {
  const colors = {
    gray: 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
    red: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border transition-all cursor-pointer ${colors[color]}`}
    >
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

const StatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.brouillon;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

export default function OwnerContractsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    brouillon: 0,
    en_attente_signature: 0,
    actif: 0,
    expire: 0,
    resilie: 0,
    annule: 0,
  });
  const [activeTab, setActiveTab] = useState<TabValue>('actifs');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  // Modal states for contract actions
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [terminateModalOpen, setTerminateModalOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (user) {
      loadContracts();
    }
  }, [user]);

  const loadContracts = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('lease_contracts')
        .select(`
          id,
          contract_number,
          status,
          monthly_rent,
          charges_amount,
          deposit_amount,
          start_date,
          end_at,
          document_url,
          created_at,
          tenant_id,
          owner_signed_at,
          tenant_signed_at,
          properties!lease_contracts_property_id_fkey (
            id,
            title,
            city,
            main_image
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch tenant profiles
      const tenantIds = [...new Set((data || []).map((c) => c.tenant_id))];
      const { data: profiles } = await supabase.rpc('get_public_profiles', {
        profile_user_ids: tenantIds,
      });

      const profilesMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const contractsWithTenants = (data || []).map((contract: any) => ({
        ...contract,
        end_date: contract.end_at || contract.end_date,
        properties: contract.properties,
        tenant_profile: profilesMap.get(contract.tenant_id) || null,
      })) as Contract[];

      setContracts(contractsWithTenants);

      // Calculate stats
      const newStats: Stats = {
        total: contractsWithTenants.length,
        brouillon: 0,
        en_attente_signature: 0,
        actif: 0,
        expire: 0,
        resilie: 0,
        annule: 0,
      };
      contractsWithTenants.forEach((c) => {
        const status = c.status as keyof Stats;
        if (status in newStats && status !== 'total') {
          newStats[status]++;
        }
      });
      setStats(newStats);
    } catch (error) {
      console.error('Error loading contracts:', error);
      toast.error('Erreur lors du chargement des contrats');
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const matchesFilter = filter === 'all' || contract.status === filter;
      const matchesSearch =
        searchQuery === '' ||
        contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.tenant_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.properties.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [contracts, filter, searchQuery]);

  const handleDownload = async (contract: Contract) => {
    if (!contract.document_url) {
      toast.error('Aucun document disponible');
      return;
    }
    setActionLoading(contract.id);
    try {
      await downloadContract(contract.document_url, `contrat-${contract.contract_number}.pdf`);
      toast.success('Téléchargement démarré');
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (contract: Contract) => {
    if (contract.status !== 'brouillon') {
      toast.error('Seuls les brouillons peuvent être supprimés');
      return;
    }

    if (!confirm(`Supprimer le contrat ${contract.contract_number} ?`)) return;

    setActionLoading(contract.id);
    try {
      await deleteContract(contract.id);
      toast.success('Contrat supprimé');
      loadContracts();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendForSignature = async (contractId: string) => {
    setActionLoading(contractId);
    try {
      const { error } = await supabase
        .from('lease_contracts')
        .update({ status: 'en_attente_signature' })
        .eq('id', contractId);

      if (error) throw error;

      toast.success('Contrat envoyé pour signature');
      loadContracts();
    } catch (error) {
      console.error('Error sending for signature:', error);
      toast.error('Erreur lors de l\'envoi pour signature');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelContract = async (contract: Contract) => {
    setSelectedContract(contract);
    setReason('');
    setCancelModalOpen(true);
  };

  const confirmCancelContract = async () => {
    if (!selectedContract) return;

    setActionLoading(selectedContract.id);
    try {
      await cancelContract(selectedContract.id, reason);
      toast.success('Contrat annulé avec succès');
      setCancelModalOpen(false);
      setSelectedContract(null);
      setReason('');
      loadContracts();
    } catch (error: any) {
      console.error('Error canceling contract:', error);
      toast.error(error.message || 'Erreur lors de l\'annulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTerminateContract = async (contract: Contract) => {
    setSelectedContract(contract);
    setReason('');
    setTerminateModalOpen(true);
  };

  const confirmTerminateContract = async () => {
    if (!selectedContract) return;

    setActionLoading(selectedContract.id);
    try {
      await terminateContract(selectedContract.id, reason);
      toast.success('Contrat résilié avec succès');
      setTerminateModalOpen(false);
      setSelectedContract(null);
      setReason('');
      loadContracts();
    } catch (error: any) {
      console.error('Error terminating contract:', error);
      toast.error(error.message || 'Erreur lors de la résiliation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminder = async (contract: Contract) => {
    setActionLoading(contract.id);
    try {
      await sendSignatureReminder(contract.id, contract.tenant_id);
      toast.success('Rappel envoyé au locataire');
    } catch {
      toast.error("Erreur lors de l'envoi du rappel");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegenerate = async (contractId: string) => {
    setActionLoading(contractId);
    try {
      await regenerateContract(contractId);
      toast.success('Contrat régénéré avec succès');
      loadContracts();
    } catch {
      toast.error('Erreur lors de la régénération du contrat');
    } finally {
      setActionLoading(null);
    }
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

  const getStatusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.brouillon;

  const getFileSignatureStatus = (contract: Contract) => {
    const bothSigned = contract.owner_signed_at && contract.tenant_signed_at;
    const landlordSigned = !!contract.owner_signed_at;
    const tenantSigned = !!contract.tenant_signed_at;

    return (
      <div className="flex items-center gap-2">
        {bothSigned ? (
          <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
            <FileSignature className="h-4 w-4" />
            <span className="text-xs font-semibold">Signé</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-semibold">
              {landlordSigned && !tenantSigned
                ? 'En attente locataire'
                : !landlordSigned && tenantSigned
                  ? 'En attente propriétaire'
                  : 'En attente'}
            </span>
          </div>
        )}
      </div>
    );
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

  // Calculate financial stats
  const activeContracts = contracts.filter((c) => c.status === 'actif');
  const totalRevenue = activeContracts.reduce((sum, c) => sum + c.monthly_rent, 0);
  const totalDeposits = activeContracts.reduce((sum, c) => sum + (c.deposit_amount || 0), 0);

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#2C1810] rounded-2xl shadow-sm mb-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Contrats</h1>
                <p className="text-[#E8D4C5]">Gérez vos baux de location</p>
              </div>
            </div>

            <Link
              to={ROUTES.CONTRACTS.CREATE.split(':')[0]}
              className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Nouveau contrat</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 inline-flex gap-2 p-1 mb-8">
          {TAB_OPTIONS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as TabValue)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
                {tab.value === 'actifs' && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {stats.actif}
                  </span>
                )}
                {tab.value === 'resilies' && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {stats.resilie + stats.annule}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'resilies' ? (
          <TerminatedContractsTab stats={stats} onRefresh={loadContracts} />
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard
                icon={FileText}
                label="Total"
                value={stats.total}
              />
              <StatCard
                icon={FileText}
                label="Brouillons"
                value={stats.brouillon}
                color="gray"
              />
              <StatCard
                icon={Clock}
                label="En attente"
                value={stats.en_attente_signature}
                color="amber"
              />
              <StatCard
                icon={CheckCircle2}
                label="Actifs"
                value={stats.actif}
                color="green"
              />
              <StatCard
                icon={XCircle}
                label="Expirés"
                value={stats.expire}
                color="red"
              />
              <StatCard
                icon={Ban}
                label="Résiliés"
                value={stats.resilie}
                color="red"
              />
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Revenu mensuel</p>
                    <p className="text-2xl font-bold text-green-800">
                      {formatCurrency(totalRevenue)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Caution totale</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {formatCurrency(totalDeposits)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-5 border border-purple-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-700 font-medium">Locataires actifs</p>
                    <p className="text-2xl font-bold text-purple-800">
                      {activeContracts.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-wrap gap-2 flex-1">
                  {FILTER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFilter(option.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filter === option.value
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="relative sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Contracts List */}
            {filteredContracts.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun contrat</h3>
                <p className="text-gray-500 mb-4">
                  {filter !== 'all'
                    ? 'Aucun contrat ne correspond à ce filtre'
                    : 'Créez votre premier contrat de location'}
                </p>
                <Link
                  to={ROUTES.CONTRACTS.CREATE.split(':')[0]}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg"
                >
                  <Plus className="h-5 w-5" />
                  Créer un contrat
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredContracts.map((contract) => {
                  const statusConfig = getStatusConfig(contract.status);
                  const StatusIcon = statusConfig.icon;
                  const isLoading = actionLoading === contract.id;
                  const isExpanded = expandedContract === contract.id;

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
                            {contract.properties.main_image ? (
                              <img
                                src={contract.properties.main_image}
                                alt={contract.properties.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Building className="h-10 w-10 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* Contract Info */}
                          <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <HomeIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                  <span className="font-semibold text-gray-900 line-clamp-1">
                                    {contract.properties.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate">{contract.properties.city}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <StatusBadge status={contract.status} />
                              </div>
                            </div>

                            {/* Tenant Info */}
                            <div className="flex items-center gap-2 mb-3">
                              <User className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-gray-700">
                                {contract.tenant_profile?.full_name || 'Locataire non renseigné'}
                              </span>
                            </div>

                            {/* Key Details */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Loyer mensuel</p>
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(contract.monthly_rent)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Caution</p>
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(contract.deposit_amount || 0)}
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
                            </div>

                            {/* Signature Status */}
                            <div className="mb-3">
                              {getFileSignatureStatus(contract)}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => navigate(`/proprietaire/contrats/${contract.id}`)}
                                className="flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                <span>Voir</span>
                              </Button>

                              {contract.document_url && (
                                <Button
                                  variant="outline"
                                  size="small"
                                  onClick={() => handleDownload(contract)}
                                  disabled={isLoading}
                                  className="flex items-center gap-2"
                                >
                                  {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                  <span>PDF</span>
                                </Button>
                              )}

                              {contract.status === 'brouillon' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => navigate(`/proprietaire/contrats/${contract.id}/editer`)}
                                    className="flex items-center gap-2"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Modifier</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => handleRegenerate(contract.id)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2"
                                  >
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                    <span>Générer</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => handleSendForSignature(contract.id)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Envoyer</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => handleDelete(contract)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="hidden sm:inline">Supprimer</span>
                                  </Button>
                                </>
                              )}

                              {contract.status === 'en_attente_signature' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => handleSendReminder(contract)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  >
                                    {isLoading ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="w-4 h-4" />
                                    )}
                                    <span>Rappel</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => handleCancelContract(contract)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    {actionLoading === contract.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Ban className="w-4 h-4" />
                                    )}
                                    <span className="hidden sm:inline">Annuler</span>
                                  </Button>
                                </>
                              )}

                              {contract.status === 'actif' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => navigate(`/proprietaire/contrats/${contract.id}`)}
                                    className="flex items-center gap-2"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>Voir</span>
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="small"
                                    onClick={() => handleTerminateContract(contract)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    {actionLoading === contract.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Ban className="w-4 h-4" />
                                    )}
                                    <span className="hidden sm:inline">Résilier</span>
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal d'annulation de contrat */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Ban className="w-5 h-5 text-red-600" />
              Annuler le contrat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Êtes-vous sûr de vouloir annuler le contrat <strong>{selectedContract?.contract_number}</strong> ?
            </p>
            <div>
              <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Motif de l'annulation <span className="text-gray-400">(optionnel)</span>
              </label>
              <textarea
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez pourquoi vous annulez ce contrat..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelModalOpen(false);
                setSelectedContract(null);
                setReason('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelContract}
              disabled={actionLoading !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Annulation...
                </>
              ) : (
                'Confirmer l\'annulation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de résiliation de contrat */}
      <Dialog open={terminateModalOpen} onOpenChange={setTerminateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Ban className="w-5 h-5 text-red-600" />
              Résilier le contrat
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Êtes-vous sûr de vouloir résilier le contrat <strong>{selectedContract?.contract_number}</strong> ?
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              ⚠️ Cette action est irréversible. Le contrat sera marqué comme résilié et la propriété redevenue disponible.
            </p>
            <div>
              <label htmlFor="terminate-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Motif de la résiliation <span className="text-gray-400">(optionnel)</span>
              </label>
              <textarea
                id="terminate-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Expliquez pourquoi vous résiliez ce contrat..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTerminateModalOpen(false);
                setSelectedContract(null);
                setReason('');
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmTerminateContract}
              disabled={actionLoading !== null}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Résiliation...
                </>
              ) : (
                'Confirmer la résiliation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
