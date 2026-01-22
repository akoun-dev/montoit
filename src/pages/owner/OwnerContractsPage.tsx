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
  CheckCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Loader2,
  Pen,
  TrendingUp,
  Shield,
  FileCheck,
  FileSignature,
  CreditCard,
  Wallet,
  Info,
  Ban,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { ROUTES } from '@/shared/config/routes.config';
import {
  downloadContract,
  regenerateContract,
  deleteContract,
  sendSignatureReminder,
} from '@/services/contracts/contractService';
import { toast } from '@/hooks/shared/useSafeToast';
import { format, addYears, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui';
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
  end_date: string; // derived from end_at
  document_url: string | null;
  owner_signed_at: string | null; // renamed from owner_signed_at
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

interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  payment_date: string | null;
  due_date: string;
  status: 'pending' | 'paid' | 'late' | 'partial';
  payment_method: string | null;
}

interface LeaseRenewal {
  id: string;
  lease_id: string;
  original_end_date: string;
  proposed_end_date: string;
  proposed_rent: number | null;
  rent_increase_percent: number | null;
  status: string;
  tenant_response_at: string | null;
  owner_response_at: string | null;
  tenant_notes: string | null;
  owner_notes: string | null;
  created_at: string;
  lease_contracts?: {
    contract_number: string;
    monthly_rent: number;
    property_id: string;
    tenant_id: string;
    properties?: {
      title: string;
      address: string;
    };
  };
  tenant_name?: string;
}

interface DepartureNotice {
  id: string;
  lease_id: string;
  initiated_by: 'tenant' | 'owner';
  notice_date: string;
  departure_date: string;
  reason: string | null;
  reason_details: string | null;
  status: string;
  deposit_return_amount: number | null;
  deposit_deductions: unknown[];
  created_at: string;
  lease_contracts?: {
    contract_number: string;
    monthly_rent: number;
    deposit_amount: number;
    property_id: string;
    tenant_id: string;
    properties?: {
      title: string;
      address: string;
    };
  };
  tenant_name?: string;
}

interface Stats {
  total: number;
  brouillon: number;
  en_attente_signature: number;
  partiellement_signe: number;
  actif: number;
  expire: number;
  resilie: number;
}

// Constants
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700', icon: FileText },
  en_attente_signature: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  partiellement_signe: {
    label: 'Partiellement signé',
    color: 'bg-blue-100 text-blue-700',
    icon: AlertCircle,
  },
  actif: { label: 'Actif', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expire: { label: 'Expiré', color: 'bg-red-100 text-red-700', icon: XCircle },
  resilie: { label: 'Résilié', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'brouillon', label: 'Brouillons' },
  { value: 'en_attente_signature', label: 'En attente' },
  { value: 'actif', label: 'Actifs' },
  { value: 'expire', label: 'Expirés' },
];

// Tab options
type TabValue = 'actifs' | 'resilies';
const TAB_OPTIONS: { value: TabValue; label: string; icon: typeof CheckCircle }[] = [
  { value: 'actifs', label: 'Contrats Actifs', icon: CheckCircle },
  { value: 'resilies', label: 'Résiliés', icon: Ban },
];

// Taux d'indexation légal en Côte d'Ivoire (exemple)
const LEGAL_INDEXATION_RATE = 0.02; // 2% annuel

export default function OwnerContractsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    brouillon: 0,
    en_attente_signature: 0,
    partiellement_signe: 0,
    actif: 0,
    expire: 0,
    resilie: 0,
  });
  const [activeTab, setActiveTab] = useState<TabValue>('actifs');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedContract, setExpandedContract] = useState<string | null>(null);

  // Renewal states
  const [renewals, setRenewals] = useState<LeaseRenewal[]>([]);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [renewalForm, setRenewalForm] = useState({
    proposedEndDate: '',
    proposedRent: '',
    rentIncreasePercent: '',
    notes: '',
  });

  // Departure notice states
  const [departureNotices, setDepartureNotices] = useState<DepartureNotice[]>([]);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    departureDate: '',
    reason: '',
    reasonDetails: '',
  });

  // Deposit modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositForm, setDepositForm] = useState({
    returnAmount: '',
    deductions: '',
    deductionReason: '',
  });

  // Detail modal states for drill-down from stats cards
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailModalType, setDetailModalType] = useState<string | null>(null); // 'brouillon', 'en_attente_signature', 'actif', 'expire', 'resilie', 'signed', 'pending_signature'
  const [detailPeriod, setDetailPeriod] = useState<'all' | '3m' | '6m' | '1y'>('all');

  useEffect(() => {
    if (user) {
      loadContracts();
      loadPayments();
      // TODO: Uncomment when lease_renewals table exists
      // loadRenewals();
      // TODO: Uncomment when departure_notices table exists
      // loadDepartureNotices();
    }
  }, [user]);

  const loadContracts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('lease_contracts')
        .select(
          `
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
        `
        )
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
        partiellement_signe: 0,
        actif: 0,
        expire: 0,
        resilie: 0,
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

  // TODO: Re-enable when rent_payments table exists
  // const loadPayments = async () => {
  //   if (!user) return;
  //   try {
  //     const contractIds = contracts.map((c) => c.id);
  //     if (contractIds.length === 0) return;
  //     const { data, error } = await supabase
  //       .from('rent_payments')
  //       .select('*')
  //       .in('contract_id', contractIds)
  //       .order('due_date', { ascending: false })
  //       .limit(100);
  //     if (error) throw error;
  //     setPayments(data || []);
  //   } catch (error) {
  //     console.error('Error loading payments:', error);
  //   }
  // };
  const loadPayments = async () => {
    // No-op - payments table doesn't exist yet
  };

  // TODO: Re-enable when lease_renewals table exists
  // const loadRenewals = async () => { ... };
  const loadRenewals = async () => {
    // No-op - lease_renewals table doesn't exist yet
  };

  // TODO: Re-enable when departure_notices table exists
  // const loadDepartureNotices = async () => { ... };
  const loadDepartureNotices = async () => {
    // No-op - departure_notices table doesn't exist yet
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

  // Get payments for a specific contract
  // TODO: Re-enable when rent_payments table exists
  // const getContractPayments = (contractId: string) => {
  //   return payments
  //     .filter((p) => p.contract_id === contractId)
  //     .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
  //     .slice(0, 6);
  // };
  const getContractPayments = (_contractId: string) => {
    return [];
  };

  // Check if contract needs indexation
  // TODO: Re-enable when next_indexation_date column exists
  // const getIndexationAlert = (contract: Contract) => { ... };
  const getIndexationAlert = (_contract: Contract) => {
    return null;
  };

  // Get contracts needing indexation
  // TODO: Re-enable when next_indexation_date column exists
  const getIndexationAlerts = () => {
    return [];
  };

  // Get deposit status badge
  // TODO: Re-enable when deposit_status column exists
  const getDepositStatusBadge = (_depositStatus: string | null) => {
    return null;
  };

  // Get signature status component
  const getFileSignatureStatus = (contract: Contract) => {
    const bothSigned = contract.owner_signed_at && contract.tenant_signed_at;
    const landlordSigned = !!contract.owner_signed_at;
    const tenantSigned = !!contract.tenant_signed_at;

    return (
      <div className="flex items-center gap-2">
        {bothSigned ? (
          <div className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
            <FileSignature className="h-4 w-4" />
            <span className="text-xs font-semibold">Signé électroniquement</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-semibold">
              {landlordSigned && !tenantSigned
                ? 'En attente signature locataire'
                : !landlordSigned && tenantSigned
                  ? 'En attente votre signature'
                  : 'En attente signatures'}
            </span>
          </div>
        )}
      </div>
    );
  };

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

  const handleRegenerate = async (contractId: string) => {
    setActionLoading(contractId);
    try {
      await regenerateContract(contractId);
      toast.success('PDF régénéré avec succès');
      loadContracts();
    } catch {
      toast.error('Erreur lors de la régénération');
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
      // Update contract status from brouillon to en_attente_signature
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

  const openRenewalModal = (contract: Contract) => {
    setSelectedContract(contract);
    setRenewalForm({
      proposedEndDate: format(addYears(new Date(contract.end_date), 1), 'yyyy-MM-dd'),
      proposedRent: contract.monthly_rent.toString(),
      rentIncreasePercent: '0',
      notes: '',
    });
    setShowRenewalModal(true);
  };

  // TODO: Re-enable when lease_renewals table exists
  // const handleCreateRenewal = async () => { ... };
  const handleCreateRenewal = async () => {
    toast.error('Fonctionnalité non disponible - table lease_renewals manquante');
  };

  const getExpiringContracts = () => {
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    return contracts.filter(
      (contract) =>
        contract.status === 'actif' &&
        new Date(contract.end_date) <= in90Days &&
        !renewals.some((r) => r.lease_id === contract.id && r.status === 'pending')
    );
  };

  const getRenewalBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
      tenant_accepted: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'Accepté par locataire',
      },
      tenant_rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Refusé par locataire' },
      finalized: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Finalisé' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Expiré' },
    };
    const style = styles[status] ?? styles['pending'];
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${style?.bg ?? ''} ${style?.text ?? ''}`}
      >
        {style?.label ?? status}
      </span>
    );
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);

  // Helper function to get contracts for detail modal based on type and period
  const getDetailContracts = () => {
    let filtered = [...contracts];

    // Filter by status/type
    switch (detailModalType) {
      case 'brouillon':
        filtered = filtered.filter((c) => c.status === 'brouillon');
        break;
      case 'en_attente_signature':
        filtered = filtered.filter((c) => c.status === 'en_attente_signature');
        break;
      case 'partiellement_signe':
        filtered = filtered.filter((c) => c.status === 'partiellement_signe');
        break;
      case 'actif':
        filtered = filtered.filter((c) => c.status === 'actif');
        break;
      case 'expire':
        filtered = filtered.filter((c) => c.status === 'expire');
        break;
      case 'resilie':
        filtered = filtered.filter((c) => c.status === 'resilie');
        break;
      case 'signed':
        filtered = filtered.filter((c) => c.owner_signed_at && c.tenant_signed_at);
        break;
      case 'pending_signature':
        filtered = filtered.filter((c) => !c.owner_signed_at || !c.tenant_signed_at);
        break;
      default:
        break;
    }

    // Filter by period
    if (detailPeriod !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (detailPeriod) {
        case '3m':
          cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case '6m':
          cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
          break;
        case '1y':
          cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter((c) => new Date(c.created_at) >= cutoffDate);
    }

    return filtered;
  };

  // Open detail modal
  const openDetailModal = (type: string) => {
    setDetailModalType(type);
    setDetailPeriod('all');
    setShowDetailModal(true);
  };

  // Get detail modal title and description
  const getDetailModalInfo = () => {
    const infoMap: Record<string, { title: string; description: string; icon: typeof FileText }> = {
      brouillon: {
        title: 'Brouillons',
        description: 'Contrats en cours de rédaction',
        icon: FileText,
      },
      en_attente_signature: {
        title: 'En attente de signature',
        description: 'Contrats envoyés pour signature',
        icon: Clock,
      },
      partiellement_signe: {
        title: 'Partiellement signés',
        description: 'Contrats signés par une seule partie',
        icon: AlertCircle,
      },
      actif: {
        title: 'Contrats actifs',
        description: 'Baux en cours de validité',
        icon: CheckCircle,
      },
      expire: {
        title: 'Contrats expirés',
        description: 'Baux arrivés à échéance',
        icon: XCircle,
      },
      resilie: {
        title: 'Contrats résiliés',
        description: 'Baux terminés avant leur échéance',
        icon: XCircle,
      },
      signed: {
        title: 'Contrats signés',
        description: 'Baux signés par toutes les parties',
        icon: FileSignature,
      },
      pending_signature: {
        title: 'En attente de signature',
        description: 'Contrats en attente de signature',
        icon: Clock,
      },
    };

    return infoMap[detailModalType || ''] || { title: 'Détails', description: '', icon: FileText };
  };

  // Export to PDF functionality
  const exportToPDF = async () => {
    const contractsToExport = getDetailContracts();
    const info = getDetailModalInfo();

    // Create a simple HTML table for PDF
    const tableHTML = `
      <html>
        <head>
          <title>${info.title} - MonToit</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #F16522; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #2C1810; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .status-actif { background-color: #d1fae5; color: #065f46; }
            .status-brouillon { background-color: #f3f4f6; color: #374151; }
            .status-en_attente { background-color: #fef3c7; color: #92400e; }
            .status-expire, .status-resilie { background-color: #fee2e2; color: #991b1b; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>${info.title}</h1>
          <p>${info.description}</p>
          <p>Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
          <table>
            <thead>
              <tr>
                <th>N° Contrat</th>
                <th>Locataire</th>
                <th>Biens</th>
                <th>Loyer</th>
                <th>Caution</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${contractsToExport.map((c) => {
                const statusConfig = getStatusConfig(c.status);
                const statusClass = `status-${c.status}`;
                return `
                  <tr>
                    <td>${c.contract_number}</td>
                    <td>${c.tenant_profile?.full_name || 'N/A'}</td>
                    <td>${c.properties.title}</td>
                    <td>${formatCurrency(c.monthly_rent)}</td>
                    <td>${formatCurrency(c.deposit_amount || 0)}</td>
                    <td>${formatDate(c.start_date)}</td>
                    <td>${formatDate(c.end_date)}</td>
                    <td><span class="status ${statusClass}">${statusConfig.label}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>Total: ${contractsToExport.length} contrat(s)</p>
            <p>Document généré par MonToit - Plateforme de location immobilière en Côte d'Ivoire</p>
          </div>
        </body>
      </html>
    `;

    // Create a blob and download
    const blob = new Blob([tableHTML], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contrats-${detailModalType}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Export PDF généré avec succès');
  };

  const openNoticeModal = (contract: Contract) => {
    setSelectedContract(contract);
    const defaultDate = new Date();
    defaultDate.setMonth(defaultDate.getMonth() + 3);
    setNoticeForm({
      departureDate: format(defaultDate, 'yyyy-MM-dd'),
      reason: '',
      reasonDetails: '',
    });
    setShowNoticeModal(true);
  };

  // TODO: Re-enable when departure_notices table exists
  // const handleCreateNotice = async () => { ... };
  const handleCreateNotice = async () => {
    toast.error('Fonctionnalité non disponible - table departure_notices manquante');
  };

  const getNoticeBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
      acknowledged: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Accusé réception' },
      inventory_scheduled: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        label: 'État des lieux prévu',
      },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Terminé' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Annulé' },
    };
    const style = styles[status] ?? styles['pending'];
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${style?.bg ?? ''} ${style?.text ?? ''}`}
      >
        {style?.label ?? status}
      </span>
    );
  };

  const getStatusConfig = (status: string) => {
    return (
      STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: FileText }
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleProcessDeposit = async (contract: Contract) => {
    setSelectedContract(contract);
    setDepositForm({
      returnAmount: contract.deposit_amount?.toString() || '',
      deductions: '0',
      deductionReason: '',
    });
    setShowDepositModal(true);
  };

  // TODO: Re-enable when deposit_status column exists
  // const handleUpdateDeposit = async () => { ... };
  const handleUpdateDeposit = async () => {
    toast.error('Fonctionnalité non disponible - colonnes deposit_status manquantes');
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] bg-background flex items-center justify-center rounded-2xl">
        Veuillez vous connecter
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-background flex items-center justify-center rounded-2xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const indexationAlerts = getIndexationAlerts();

  return (
    <>
      {/* Header */}
      <div className="bg-[#2C1810]">
        <div className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Contrats</h1>
                <p className="text-[#E8D4C5] mt-1">Gérez tous vos baux de location</p>
              </div>
            </div>
            <Link
              to={ROUTES.CONTRACTS.CREATE.split(':')[0]}
              className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Créer un contrat</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 py-8 space-y-8">
        {/* Tabs Navigation */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 inline-flex gap-2">
          {TAB_OPTIONS.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-[#F16522] text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
                {tab.value === 'actifs' && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {stats.actif}
                  </span>
                )}
                {tab.value === 'resilies' && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {stats.resilie}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'resilies' ? (
          <TerminatedContractsTab stats={stats} onRefresh={loadContracts} />
        ) : (
          <>
        {/* Stats Dashboard - Only show for Actifs tab */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div
            onClick={() => stats.total > 0 && openDetailModal('all')}
            className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer ${
              stats.total > 0 ? 'hover:border-orange-300 hover:scale-[1.02]' : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <FileText className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                Total
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            {stats.total > 0 && (
              <p className="text-xs text-gray-400 mt-1">Cliquez pour voir les détails</p>
            )}
          </div>

          <div
            onClick={() => stats.brouillon > 0 && openDetailModal('brouillon')}
            className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all ${
              stats.brouillon > 0
                ? 'hover:border-gray-400 hover:scale-[1.02] cursor-pointer'
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <FileText className="h-5 w-5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                Brouillons
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-600">{stats.brouillon}</p>
            {stats.brouillon > 0 && (
              <p className="text-xs text-gray-400 mt-1">Cliquez pour voir les détails</p>
            )}
          </div>

          <div
            onClick={() => stats.en_attente_signature > 0 && openDetailModal('en_attente_signature')}
            className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all ${
              stats.en_attente_signature > 0
                ? 'hover:border-amber-300 hover:scale-[1.02] cursor-pointer'
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <Clock className="h-5 w-5 text-amber-400" />
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                En attente
              </span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{stats.en_attente_signature}</p>
            {stats.en_attente_signature > 0 && (
              <p className="text-xs text-amber-400 mt-1">Cliquez pour voir les détails</p>
            )}
          </div>

          <div
            onClick={() => stats.actif > 0 && openDetailModal('actif')}
            className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all ${
              stats.actif > 0
                ? 'hover:border-green-300 hover:scale-[1.02] cursor-pointer'
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Actifs
              </span>
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.actif}</p>
            {stats.actif > 0 && (
              <p className="text-xs text-green-400 mt-1">Cliquez pour voir les détails</p>
            )}
          </div>

          <div
            onClick={() => stats.expire > 0 && openDetailModal('expire')}
            className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all ${
              stats.expire > 0
                ? 'hover:border-red-300 hover:scale-[1.02] cursor-pointer'
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <XCircle className="h-5 w-5 text-red-400" />
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                Expirés
              </span>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.expire}</p>
            {stats.expire > 0 && (
              <p className="text-xs text-red-400 mt-1">Cliquez pour voir les détails</p>
            )}
          </div>

          <div
            onClick={() => stats.resilie > 0 && openDetailModal('resilie')}
            className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all ${
              stats.resilie > 0
                ? 'hover:border-red-300 hover:scale-[1.02] cursor-pointer'
                : 'cursor-default'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <XCircle className="h-5 w-5 text-red-400" />
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                Résiliés
              </span>
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.resilie}</p>
            {stats.resilie > 0 && (
              <p className="text-xs text-red-400 mt-1">Cliquez pour voir les détails</p>
            )}
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            onClick={() => contracts.filter((c) => c.status === 'actif').length > 0 && openDetailModal('actif')}
            className={`bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100 transition-all ${
              contracts.filter((c) => c.status === 'actif').length > 0
                ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer'
                : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-700 font-medium">Revenu mensuel total</p>
                <p className="text-2xl font-bold text-green-800">
                  {formatCurrency(
                    contracts
                      .filter((c) => c.status === 'actif')
                      .reduce((sum, c) => sum + c.monthly_rent, 0)
                  )}
                </p>
              </div>
            </div>
            {contracts.filter((c) => c.status === 'actif').length > 0 && (
              <p className="text-xs text-green-600">Cliquez pour voir les détails</p>
            )}
          </div>

          <div
            onClick={() => contracts.filter((c) => c.status === 'actif' && c.deposit_amount).length > 0 && openDetailModal('actif')}
            className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 transition-all ${
              contracts.filter((c) => c.status === 'actif' && c.deposit_amount).length > 0
                ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer'
                : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-700 font-medium">Caution totale détenue</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(
                    contracts
                      .filter((c) => c.status === 'actif')
                      .reduce((sum, c) => sum + (c.deposit_amount || 0), 0)
                  )}
                </p>
              </div>
            </div>
            {contracts.filter((c) => c.status === 'actif' && c.deposit_amount).length > 0 && (
              <p className="text-xs text-blue-600">Cliquez pour voir les détails</p>
            )}
          </div>

          <div
            onClick={() => contracts.filter((c) => c.owner_signed_at && c.tenant_signed_at).length > 0 && openDetailModal('signed')}
            className={`bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100 transition-all ${
              contracts.filter((c) => c.owner_signed_at && c.tenant_signed_at).length > 0
                ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer'
                : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-700 font-medium">Contrats signés</p>
                <p className="text-2xl font-bold text-purple-800">
                  {contracts.filter((c) => c.owner_signed_at && c.tenant_signed_at).length}
                </p>
              </div>
            </div>
            {contracts.filter((c) => c.owner_signed_at && c.tenant_signed_at).length > 0 && (
              <p className="text-xs text-purple-600">Cliquez pour voir les détails</p>
            )}
          </div>

          <div
            onClick={() => contracts.filter((c) => !c.owner_signed_at || !c.tenant_signed_at).length > 0 && openDetailModal('pending_signature')}
            className={`bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-100 transition-all ${
              contracts.filter((c) => !c.owner_signed_at || !c.tenant_signed_at).length > 0
                ? 'hover:shadow-md hover:scale-[1.02] cursor-pointer'
                : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-amber-700 font-medium">En attente signature</p>
                <p className="text-2xl font-bold text-amber-800">
                  {contracts.filter((c) => !c.owner_signed_at || !c.tenant_signed_at).length}
                </p>
              </div>
            </div>
            {contracts.filter((c) => !c.owner_signed_at || !c.tenant_signed_at).length > 0 && (
              <p className="text-xs text-amber-600">Cliquez pour voir les détails</p>
            )}
          </div>
        </div>

        {/* Indexation Alerts - TODO: Re-enable when next_indexation_date column exists */}
        {/* {indexationAlerts.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-6">
            ...
          </div>
        )} */}

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-wrap gap-2 flex-1">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filter === option.value
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
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
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Contracts List */}
        {filteredContracts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun contrat</h3>
            <p className="text-gray-500 mb-4">
              {filter !== 'all'
                ? 'Aucun contrat ne correspond à ce filtre'
                : 'Créez votre premier contrat de bail'}
            </p>
            <Link
              to={ROUTES.CONTRACTS.CREATE.split(':')[0]}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition-all inline-flex items-center shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5 mr-2" />
              Créer un contrat
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredContracts.map((contract) => {
              const statusConfig = getStatusConfig(contract.status);
              const StatusIcon = statusConfig.icon;
              const isLoading = actionLoading === contract.id;
              const isExpanded = expandedContract === contract.id;
              // const contractPayments = getContractPayments(contract.id); // TODO: Re-enable when rent_payments exists
              // const indexationAlert = getIndexationAlert(contract); // TODO: Re-enable when next_indexation_date exists

              return (
                <div
                  key={contract.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Main Card */}
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Property Image */}
                      <div className="lg:w-48 h-40 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        {contract.properties.main_image ? (
                          <img
                            src={contract.properties.main_image}
                            alt={contract.properties.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building className="h-12 w-12 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Contract Info */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-sm text-gray-500">
                                {contract.contract_number}
                              </span>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusConfig.color}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                              {contract.properties.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {contract.tenant_profile?.full_name || 'Locataire non renseigné'}
                            </p>
                          </div>

                          {/* FileSignature Status */}
                          {getFileSignatureStatus(contract)}
                        </div>

                        {/* Key Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">Loyer mensuel</p>
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrency(contract.monthly_rent)}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">Caution</p>
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrency(contract.deposit_amount || 0)}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">Début bail</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatDate(contract.start_date)}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">Fin bail</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatDate(contract.end_date)}
                            </p>
                          </div>
                        </div>

                        {/* Indexation Alert - TODO: Re-enable when next_indexation_date column exists */}
                        {/* {indexationAlert && ( ... )} */}

                        {/* Deposit Status - TODO: Re-enable when deposit_status column exists */}
                        {contract.deposit_amount && (
                          <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center gap-3">
                              <Shield className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-xs text-blue-600 font-medium">
                                  Dépôt de garantie
                                </p>
                                <p className="text-sm font-bold text-blue-900">
                                  {formatCurrency(contract.deposit_amount)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Expand/Collapse Button */}
                        {contract.status === 'actif' && (
                          <button
                            onClick={() => setExpandedContract(isExpanded ? null : contract.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <span>Masquer les détails</span>
                                <ChevronRight className="h-4 w-4 rotate-90" />
                              </>
                            ) : (
                              <>
                                <span>Voir les détails et paiements</span>
                                <ChevronRight className="h-4 w-4" />
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">
                        <button
                          onClick={() => navigate(`/contrat/${contract.id}`)}
                          className="flex-1 lg:flex-none px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
                          disabled={isLoading}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden lg:inline">Voir</span>
                        </button>

                        {!contract.owner_signed_at && contract.status !== 'brouillon' && (
                          <button
                            onClick={() => navigate(`/proprietaire/signer-contrat/${contract.id}`)}
                            className="flex-1 lg:flex-none px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                            disabled={isLoading}
                          >
                            <Pen className="h-4 w-4" />
                            <span className="hidden lg:inline">Signer</span>
                          </button>
                        )}

                        {contract.document_url && (
                          <button
                            onClick={() => handleDownload(contract)}
                            className="flex-1 lg:flex-none px-4 py-2.5 bg-blue-100 hover:bg-blue-200 rounded-xl text-sm font-medium text-blue-700 transition-colors flex items-center justify-center gap-2"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            <span className="hidden lg:inline">PDF</span>
                          </button>
                        )}

                        {contract.status === 'brouillon' && (
                          <>
                            <button
                              onClick={() => navigate(`/contrat/${contract.id}/editer`)}
                              className="flex-1 lg:flex-none px-4 py-2.5 bg-purple-100 hover:bg-purple-200 rounded-xl text-sm font-medium text-purple-700 transition-colors flex items-center justify-center gap-2"
                              disabled={isLoading}
                            >
                              <RefreshCw className="h-4 w-4" />
                              <span className="hidden lg:inline">Modifier</span>
                            </button>
                            <button
                              onClick={() => handleRegenerate(contract.id)}
                              className="flex-1 lg:flex-none px-4 py-2.5 bg-indigo-100 hover:bg-indigo-200 rounded-xl text-sm font-medium text-indigo-700 transition-colors flex items-center justify-center gap-2"
                              disabled={isLoading}
                            >
                              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                              <span className="hidden lg:inline">Générer PDF</span>
                            </button>
                            <button
                              onClick={() => handleSendForSignature(contract.id)}
                              className="flex-1 lg:flex-none px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl text-sm font-medium text-white transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                              disabled={isLoading}
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span className="hidden lg:inline">Envoyer pour signature</span>
                            </button>
                            <button
                              onClick={() => handleDelete(contract)}
                              className="flex-1 lg:flex-none px-4 py-2.5 bg-red-100 hover:bg-red-200 rounded-xl text-sm font-medium text-red-700 transition-colors flex items-center justify-center gap-2"
                              disabled={isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {contract.status === 'actif' &&
                          !renewals.some(
                            (r) => r.lease_id === contract.id && r.status === 'pending'
                          ) && (
                            // TODO: Re-enable when lease_renewals table exists
                            <button
                              onClick={() => toast.error('Fonctionnalité non disponible')}
                              className="flex-1 lg:flex-none px-4 py-2.5 bg-green-100 hover:bg-green-200 rounded-xl text-sm font-medium text-green-700 transition-colors flex items-center justify-center gap-2"
                              disabled={isLoading}
                            >
                              <RefreshCw className="h-4 w-4" />
                              <span className="hidden lg:inline">Renouveler</span>
                            </button>
                          )}

                        {/* TODO: Re-enable when deposit_status column exists */}
                        {/* {contract.deposit_amount && contract.deposit_status === 'held' && ...} */}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && contract.status === 'actif' && (
                    <div className="border-t border-gray-100 bg-gray-50 p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Payment History - TODO: Re-enable when rent_payments table exists */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-gray-600" />
                            Historique des paiements
                          </h4>
                          <p className="text-sm text-gray-500 text-center py-4">
                            Fonctionnalité non disponible
                          </p>
                        </div>

                        {/* Additional Details */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <Info className="h-4 w-4 text-gray-600" />
                            Informations complémentaires
                          </h4>
                          <div className="space-y-3">
                            <div className="p-3 bg-white rounded-lg border border-gray-100">
                              <p className="text-xs text-gray-500">Charges mensuelles</p>
                              <p className="text-sm font-bold text-gray-900">
                                {formatCurrency(contract.charges_amount || 0)}
                              </p>
                            </div>
                            {contract.tenant_profile?.email && (
                              <div className="p-3 bg-white rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500">Email locataire</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {contract.tenant_profile.email}
                                </p>
                              </div>
                            )}
                            {contract.tenant_profile?.phone && (
                              <div className="p-3 bg-white rounded-lg border border-gray-100">
                                <p className="text-xs text-gray-500">Téléphone locataire</p>
                                <p className="text-sm font-medium text-gray-900">
                                  {contract.tenant_profile.phone}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>
        )}
      </div>

      {/* Modals - Only show for Actifs tab */}
      {activeTab === 'actifs' && (
        <>
      {/* Renewal Modal - Only show for Actifs tab */}
      <Dialog open={showRenewalModal} onOpenChange={setShowRenewalModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Proposer un renouvellement</DialogTitle>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-medium text-gray-900">{selectedContract.properties.title}</p>
                <p className="text-sm text-gray-500">
                  {selectedContract.tenant_profile?.full_name}
                </p>
                <p className="text-sm text-gray-500">
                  Loyer actuel: {formatCurrency(selectedContract.monthly_rent)}
                </p>
                <p className="text-sm text-gray-500">
                  Fin actuelle:{' '}
                  {format(new Date(selectedContract.end_date), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Nouvelle date de fin
                </label>
                <input
                  type="date"
                  value={renewalForm.proposedEndDate}
                  onChange={(e) =>
                    setRenewalForm((prev) => ({ ...prev, proposedEndDate: e.target.value }))
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Nouveau loyer (FCFA)
                  </label>
                  <input
                    type="number"
                    value={renewalForm.proposedRent}
                    onChange={(e) =>
                      setRenewalForm((prev) => ({ ...prev, proposedRent: e.target.value }))
                    }
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Augmentation (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={renewalForm.rentIncreasePercent}
                    onChange={(e) => {
                      const percent = parseFloat(e.target.value) || 0;
                      const newRent = selectedContract.monthly_rent * (1 + percent / 100);
                      setRenewalForm((prev) => ({
                        ...prev,
                        rentIncreasePercent: e.target.value,
                        proposedRent: Math.round(newRent).toString(),
                      }));
                    }}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={renewalForm.notes}
                  onChange={(e) => setRenewalForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  placeholder="Message pour le locataire..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setShowRenewalModal(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleCreateRenewal}
              disabled={actionLoading !== null}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Envoyer la proposition
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Modal */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Restituer le dépôt de garantie</DialogTitle>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Dépôt de garanti</p>
                    <p className="text-lg font-bold text-blue-900">
                      {formatCurrency(selectedContract.deposit_amount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Montant à restituer (FCFA)
                </label>
                <input
                  type="number"
                  value={depositForm.returnAmount}
                  onChange={(e) =>
                    setDepositForm((prev) => ({ ...prev, returnAmount: e.target.value }))
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Déductions (FCFA)
                </label>
                <input
                  type="number"
                  value={depositForm.deductions}
                  onChange={(e) =>
                    setDepositForm((prev) => ({ ...prev, deductions: e.target.value }))
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Motif des déductions (optionnel)
                </label>
                <textarea
                  value={depositForm.deductionReason}
                  onChange={(e) =>
                    setDepositForm((prev) => ({ ...prev, deductionReason: e.target.value }))
                  }
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  placeholder="Dégradations, réparations nécessaires..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setShowDepositModal(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleUpdateDeposit}
              disabled={actionLoading !== null}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Confirmer la restitution
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Departure Notice Modal */}
      <Dialog open={showNoticeModal} onOpenChange={setShowNoticeModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Donner un préavis de départ</DialogTitle>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="font-medium text-gray-900">{selectedContract.properties.title}</p>
                <p className="text-sm text-gray-500">
                  {selectedContract.tenant_profile?.full_name}
                </p>
                <p className="text-sm text-gray-500">
                  Caution: {formatCurrency(selectedContract.deposit_amount || 0)}
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl flex items-start gap-3 border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  En Côte d'Ivoire, le délai de préavis légal est généralement de 3 mois pour les
                  baux d'habitation.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Date de départ souhaitée
                </label>
                <input
                  type="date"
                  value={noticeForm.departureDate}
                  onChange={(e) =>
                    setNoticeForm((prev) => ({ ...prev, departureDate: e.target.value }))
                  }
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Motif du préavis
                </label>
                <select
                  value={noticeForm.reason}
                  onChange={(e) => setNoticeForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">Sélectionnez un motif</option>
                  <option value="end_of_lease">Fin de bail</option>
                  <option value="mutual_agreement">Accord mutuel</option>
                  <option value="non_payment">Non-paiement du loyer</option>
                  <option value="breach_of_contract">Violation du contrat</option>
                  <option value="property_sale">Vente du bien</option>
                  <option value="personal_use">Reprise pour usage personnel</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Détails (optionnel)
                </label>
                <textarea
                  value={noticeForm.reasonDetails}
                  onChange={(e) =>
                    setNoticeForm((prev) => ({ ...prev, reasonDetails: e.target.value }))
                  }
                  rows={3}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  placeholder="Informations supplémentaires..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <button
              onClick={() => setShowNoticeModal(false)}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleCreateNotice}
              disabled={actionLoading !== null}
              className="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Envoyer le préavis
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal - Drill-down from stats cards */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="rounded-2xl max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-gray-900 text-xl">
                  {(() => {
                    const info = getDetailModalInfo();
                    const Icon = info.icon;
                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#F16522] rounded-xl flex items-center justify-center">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        {info.title}
                      </div>
                    );
                  })()}
                </DialogTitle>
                <p className="text-sm text-gray-500 mt-1">{getDetailModalInfo().description}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Period Filter */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setDetailPeriod('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    detailPeriod === 'all'
                      ? 'bg-[#F16522] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tout
                </button>
                <button
                  onClick={() => setDetailPeriod('3m')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    detailPeriod === '3m'
                      ? 'bg-[#F16522] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  3 derniers mois
                </button>
                <button
                  onClick={() => setDetailPeriod('6m')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    detailPeriod === '6m'
                      ? 'bg-[#F16522] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  6 derniers mois
                </button>
                <button
                  onClick={() => setDetailPeriod('1y')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    detailPeriod === '1y'
                      ? 'bg-[#F16522] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Dernière année
                </button>
              </div>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Exporter PDF
              </button>
            </div>

            {/* Contracts Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {getDetailContracts().length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucun contrat trouvé pour cette sélection</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          N° Contrat
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Locataire
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Bien
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Loyer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Caution
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Début
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Fin
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getDetailContracts().map((contract) => {
                        const statusConfig = getStatusConfig(contract.status);
                        const StatusIcon = statusConfig.icon;
                        return (
                          <tr key={contract.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">
                              {contract.contract_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {contract.tenant_profile?.full_name || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {contract.properties.title}
                              <div className="text-xs text-gray-400">{contract.properties.city}</div>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                              {formatCurrency(contract.monthly_rent)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {formatCurrency(contract.deposit_amount || 0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(contract.start_date)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {formatDate(contract.end_date)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  setShowDetailModal(false);
                                  navigate(`/contrat/${contract.id}`);
                                }}
                                className="text-[#F16522] hover:text-[#d9571d] text-sm font-medium"
                              >
                                Voir détails
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary */}
            {getDetailContracts().length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total des contrats affichés</span>
                  <span className="font-bold text-gray-900">{getDetailContracts().length}</span>
                </div>
                {detailModalType === 'actif' && (
                  <>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-600">Revenu mensuel total</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(
                          getDetailContracts().reduce((sum, c) => sum + c.monthly_rent, 0)
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-600">Caution totale détenue</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(
                          getDetailContracts().reduce((sum, c) => sum + (c.deposit_amount || 0), 0)
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t">
            <button
              onClick={() => setShowDetailModal(false)}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              Fermer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </>
  );
}
