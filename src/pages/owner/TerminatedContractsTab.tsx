import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  XCircle,
  Eye,
  Download,
  Building,
  Calendar,
  Filter,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { format, startOfDay, endOfDay, subMonths, subYears } from 'date-fns';
import { fr } from 'date-fns/locale';

// Types
interface TerminatedContract {
  id: string;
  contract_number: string;
  status: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  terminated_at: string | null;
  document_url: string | null;
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

// Period filter options
type PeriodFilter = 'all' | 'last_3_months' | 'last_6_months' | 'last_year' | 'custom';

interface PeriodFilterOption {
  value: PeriodFilter;
  label: string;
}

const PERIOD_FILTERS: PeriodFilterOption[] = [
  { value: 'all', label: 'Tous' },
  { value: 'last_3_months', label: '3 derniers mois' },
  { value: 'last_6_months', label: '6 derniers mois' },
  { value: 'last_year', label: 'Dernière année' },
  { value: 'custom', label: 'Personnalisé' },
];

interface TerminatedContractsTabProps {
  stats: { resilie: number; annule: number };
  onRefresh: () => void;
}

export default function TerminatedContractsTab({ stats, onRefresh }: TerminatedContractsTabProps) {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<TerminatedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  useEffect(() => {
    loadTerminatedContracts();
  }, [user]);

  const loadTerminatedContracts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lease_contracts')
        .select(
          `
          id,
          contract_number,
          status,
          monthly_rent,
          start_date,
          end_at,
          document_url,
          terminated_at,
          tenant_id,
          properties!lease_contracts_property_id_fkey (
            id,
            title,
            city,
            main_image
          )
        `
        )
        .eq('owner_id', user.id)
        .in('status', ['resilie', 'annule'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch tenant profiles
      const tenantIds = [...new Set((data || []).map((c: any) => c.tenant_id))];
      const { data: profiles } = await supabase.rpc('get_public_profiles', {
        profile_user_ids: tenantIds,
      });

      const profilesMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const contractsWithTenants = (data || []).map((contract: any) => ({
        ...contract,
        end_date: contract.end_at || contract.end_date,
        properties: contract.properties,
        tenant_profile: profilesMap.get(contract.tenant_id) || null,
      })) as TerminatedContract[];

      setContracts(contractsWithTenants);
    } catch (error) {
      console.error('Error loading terminated contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd MMM yyyy', { locale: fr });
  };

  // Filter contracts based on search query and period
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.tenant_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.properties.title.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Period filter
      if (periodFilter === 'all') return true;

      const terminatedDate = contract.terminated_at
        ? new Date(contract.terminated_at)
        : new Date(contract.end_date);

      const now = new Date();

      switch (periodFilter) {
        case 'last_3_months':
          return terminatedDate >= subMonths(now, 3);
        case 'last_6_months':
          return terminatedDate >= subMonths(now, 6);
        case 'last_year':
          return terminatedDate >= subYears(now, 1);
        case 'custom':
          if (!customStartDate || !customEndDate) return true;
          const start = startOfDay(new Date(customStartDate));
          const end = endOfDay(new Date(customEndDate));
          return terminatedDate >= start && terminatedDate <= end;
        default:
          return true;
      }
    });
  }, [contracts, searchQuery, periodFilter, customStartDate, customEndDate]);

  const currentPeriodLabel = PERIOD_FILTERS.find((f) => f.value === periodFilter)?.label || 'Période';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Contrats Terminés</h2>
            <p className="text-sm text-gray-500">{stats.resilie + stats.annule} contrat(s)</p>
          </div>
        </div>

        <button
          onClick={() => {
            loadTerminatedContracts();
            onRefresh();
          }}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Period Filter */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors min-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{currentPeriodLabel}</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showPeriodDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showPeriodDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                <div className="p-2 space-y-1">
                  {PERIOD_FILTERS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setPeriodFilter(option.value);
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        periodFilter === option.value
                          ? 'bg-red-50 text-red-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Custom date range inputs */}
                {periodFilter === 'custom' && (
                  <div className="p-4 border-t border-gray-100 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Date début
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Date fin
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par n° contrat, locataire ou bien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des contrats terminés...</p>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun contrat terminé</h3>
          <p className="text-gray-500">
            {searchQuery || periodFilter !== 'all'
              ? 'Aucun contrat ne correspond aux critères de recherche'
              : 'Vous n\'avez pas encore de contrat résilié ou annulé'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => (
            <div
              key={contract.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
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
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                            contract.status === 'annule'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            <XCircle className="h-3 w-3" />
                            {contract.status === 'annule' ? 'Annulé' : 'Résilié'}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {contract.properties.title}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {contract.tenant_profile?.full_name || 'Locataire non renseigné'}
                        </p>
                      </div>
                    </div>

                    {/* Key Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1">Loyer final</p>
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency(contract.monthly_rent)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1">Début bail</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(contract.start_date)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1">Fin prévue</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatDate(contract.end_date)}
                        </p>
                      </div>
                      <div className={`rounded-xl p-3 border ${
                        contract.status === 'annule'
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-red-50 border border-red-100'
                      }`}>
                        <p className={`text-xs mb-1 ${
                          contract.status === 'annule' ? 'text-gray-600' : 'text-red-600'
                        } font-medium`}>
                          {contract.status === 'annule' ? 'Annulé le' : 'Résilié le'}
                        </p>
                        <p className={`text-sm font-bold ${
                          contract.status === 'annule' ? 'text-gray-900' : 'text-red-900'
                        }`}>
                          {contract.terminated_at
                            ? formatDate(contract.terminated_at)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Tenant Contact Info */}
                    {(contract.tenant_profile?.email || contract.tenant_profile?.phone) && (
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        {contract.tenant_profile?.email && (
                          <a
                            href={`mailto:${contract.tenant_profile.email}`}
                            className="hover:text-red-600 transition-colors"
                          >
                            {contract.tenant_profile.email}
                          </a>
                        )}
                        {contract.tenant_profile?.phone && (
                          <a
                            href={`tel:${contract.tenant_profile.phone}`}
                            className="hover:text-red-600 transition-colors"
                          >
                            {contract.tenant_profile.phone}
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0">
                    <Link
                      to={`/contrat/${contract.id}`}
                      className="flex-1 lg:flex-none px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium text-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="hidden lg:inline">Voir détails</span>
                    </Link>

                    {contract.document_url && (
                      <a
                        href={contract.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 lg:flex-none px-4 py-2.5 bg-blue-100 hover:bg-blue-200 rounded-xl text-sm font-medium text-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden lg:inline">PDF</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
