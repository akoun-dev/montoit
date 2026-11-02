/**
 * Page améliorée de gestion des mandats pour les agences
 * Vue moderne avec tableau interactif, KPIs détaillés et actions groupées
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  ChevronDown,
  Grid3x3,
  List,
  LayoutDashboard,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  MoreHorizontal,
  Eye,
  Settings,
  FileSignature,
  PenTool,
  Pause,
  Play,
  Trash2,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/app/providers/AuthProvider';
import { useAgencyMandates, type AgencyMandate } from '@/shared/hooks/useAgencyMandates';
import MandateStatusBadge from '../components/MandateStatusBadge';
import MandateQuickActions from '../components/MandateQuickActions';
import MandateDetailPanel from '../components/MandateDetailPanel';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'pending' | 'active' | 'suspended' | 'expired' | 'cancelled';
type SortField = 'created_at' | 'start_date' | 'property_title' | 'commission_rate' | 'owner_name';
type SortOrder = 'asc' | 'desc';

interface SortOption {
  field: SortField;
  label: string;
}

const SORT_OPTIONS: SortOption[] = [
  { field: 'created_at', label: 'Date de création' },
  { field: 'start_date', label: 'Date de début' },
  { field: 'property_title', label: 'Nom du bien' },
  { field: 'commission_rate', label: 'Commission' },
  { field: 'owner_name', label: 'Propriétaire' },
];

export default function EnhancedAgencyMandatesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // View and filter state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMandates, setSelectedMandates] = useState<Set<string>>(new Set());

  // Sort state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Detail panel state
  const [selectedMandate, setSelectedMandate] = useState<AgencyMandate | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const {
    myAgency,
    loading,
    agencyMandates,
    acceptMandate,
    refuseMandate,
    terminateMandate,
    suspendMandate,
    reactivateMandate,
    updateMandatePermissions,
  } = useAgencyMandates();

  // Redirect if not an agency
  useEffect(() => {
    if (user && !myAgency) {
      navigate('/agences');
    }
  }, [user, myAgency, navigate]);

  // Computed values
  const filteredAndSortedMandates = useMemo(() => {
    let result = [...agencyMandates];

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((m) => m.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((m) => {
        const matchesProperty = m.property?.title?.toLowerCase().includes(query);
        const matchesCity = m.property?.city?.toLowerCase().includes(query);
        const matchesOwner = m.property?.owner?.full_name?.toLowerCase().includes(query);
        const matchesId = m.id.toLowerCase().includes(query);
        return matchesProperty || matchesCity || matchesOwner || matchesId;
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'start_date':
          comparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          break;
        case 'property_title':
          comparison = (a.property?.title || '').localeCompare(b.property?.title || '');
          break;
        case 'commission_rate':
          comparison = a.commission_rate - b.commission_rate;
          break;
        case 'owner_name':
          comparison = (a.property?.owner?.full_name || '').localeCompare(
            b.property?.owner?.full_name || ''
          );
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [agencyMandates, statusFilter, searchQuery, sortField, sortOrder]);

  // KPIs
  const kpis = useMemo(() => {
    const activeMandates = agencyMandates.filter((m) => m.status === 'active');
    const pendingMandates = agencyMandates.filter((m) => m.status === 'pending');
    const totalRevenue = activeMandates.reduce((sum, m) => {
      const rent = m.property?.monthly_rent || 0;
      return sum + (rent * m.commission_rate) / 100;
    }, 0);

    // Expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoon = activeMandates.filter((m) => {
      if (!m.end_date) return false;
      const endDate = new Date(m.end_date);
      return endDate <= thirtyDaysFromNow;
    }).length;

    // Pending signatures
    const pendingSignatures = activeMandates.filter(
      (m) => !m.signed_mandate_url && m.cryptoneo_signature_status !== 'completed'
    ).length;

    return {
      total: agencyMandates.length,
      active: activeMandates.length,
      pending: pendingMandates.length,
      totalRevenue,
      expiringSoon,
      pendingSignatures,
      suspended: agencyMandates.filter((m) => m.status === 'suspended').length,
      expired: agencyMandates.filter((m) => m.status === 'expired').length,
      cancelled: agencyMandates.filter((m) => m.status === 'cancelled').length,
    };
  }, [agencyMandates]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleMandateSelection = (mandateId: string) => {
    const newSelection = new Set(selectedMandates);
    if (newSelection.has(mandateId)) {
      newSelection.delete(mandateId);
    } else {
      newSelection.add(mandateId);
    }
    setSelectedMandates(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedMandates.size === filteredAndSortedMandates.length) {
      setSelectedMandates(new Set());
    } else {
      setSelectedMandates(new Set(filteredAndSortedMandates.map((m) => m.id)));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CI', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
  };

  if (!user || !myAgency) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Header */}
      <div className="bg-[#2C1810]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
                <LayoutDashboard className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Tableau de bord</h1>
                <p className="text-[#E8D4C5]">
                  Gérez vos mandats de gestion locative
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/proprietaire/biens/nouveau')}
                className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Nouveau mandat
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KPICard
            icon={FileText}
            label="Total mandats"
            value={kpis.total}
            color="neutral"
          />
          <KPICard
            icon={CheckCircle2}
            label="Actifs"
            value={kpis.active}
            color="green"
          />
          <KPICard
            icon={Clock}
            label="En attente"
            value={kpis.pending}
            color="amber"
            onClick={() => setStatusFilter('pending')}
          />
          <KPICard
            icon={TrendingUp}
            label="Revenus mensuels"
            value={formatCurrency(kpis.totalRevenue)}
            color="blue"
          />
          <KPICard
            icon={AlertCircle}
            label="Expirent bientôt"
            value={kpis.expiringSoon}
            color="orange"
            onClick={() => setStatusFilter('active')}
          />
          <KPICard
            icon={FileSignature}
            label="Signatures en attente"
            value={kpis.pendingSignatures}
            color="purple"
          />
        </div>

        {/* Alerts */}
        {(kpis.expiringSoon > 0 || kpis.pendingSignatures > 0) && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">Attention requise</h3>
                <p className="text-sm text-amber-700">
                  {kpis.expiringSoon > 0 && (
                    <span>{kpis.expiringSoon} mandat(s) expirent dans les 30 jours. </span>
                  )}
                  {kpis.pendingSignatures > 0 && (
                    <span>{kpis.pendingSignatures} signature(s) en attente.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Actions Bar */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par bien, ville, propriétaire, ID..."
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="active">Actifs</option>
                <option value="suspended">Suspendus</option>
                <option value="expired">Expirés</option>
                <option value="cancelled">Résiliés</option>
              </select>

              {/* Sort */}
              <div className="relative">
                <select
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                    setSortField(field);
                    setSortOrder(order);
                  }}
                  className="pl-10 pr-10 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522] appearance-none cursor-pointer"
                >
                  {SORT_OPTIONS.map((option) => (
                    <React.Fragment key={option.field}>
                      <option value={`${option.field}-asc`}>
                        {option.label} (A-Z)
                      </option>
                      <option value={`${option.field}-desc`}>
                        {option.label} (Z-A)
                      </option>
                    </React.Fragment>
                  ))}
                </select>
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
              </div>

              {/* View Toggle */}
              <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#F16522] text-white'
                      : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <List className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-[#F16522] text-white'
                      : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  <Grid3x3 className="h-5 w-5" />
                </button>
              </div>

              {/* Export */}
              <button className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors">
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Active filters display */}
          {statusFilter !== 'all' && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-neutral-500">Filtre actif:</span>
              <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                {statusFilter === 'pending' && 'En attente'}
                {statusFilter === 'active' && 'Actifs'}
                {statusFilter === 'suspended' && 'Suspendus'}
                {statusFilter === 'expired' && 'Expirés'}
                {statusFilter === 'cancelled' && 'Résiliés'}
              </span>
              <button
                onClick={() => setStatusFilter('all')}
                className="text-red-500 hover:text-red-600 text-sm font-medium"
              >
                Effacer
              </button>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedMandates.size > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedMandates.size} mandat(s) sélectionné(s)
            </span>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors">
                Signer en masse
              </button>
              <button className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-lg text-sm font-medium transition-colors">
                Annuler la sélection
              </button>
            </div>
          </div>
        )}

        {/* Mandates List/Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
          </div>
        ) : filteredAndSortedMandates.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[#EFEBE9]">
            <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-neutral-400" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-2">
              {searchQuery || statusFilter !== 'all' ? 'Aucun mandat trouvé' : 'Aucun mandat'}
            </h3>
            <p className="text-neutral-500 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Essayez de modifier vos critères de recherche'
                : 'Commencez par inviter des propriétaires à vous confier leurs biens'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-neutral-50 border-b border-neutral-200 text-sm font-medium text-neutral-600">
              <div className="col-span-1 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedMandates.size === filteredAndSortedMandates.length && filteredAndSortedMandates.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-neutral-300 text-[#F16522] focus:ring-[#F16522]"
                />
              </div>
              <div className="col-span-4">Bien</div>
              <div className="col-span-2">Propriétaire</div>
              <div
                className="col-span-2 flex items-center cursor-pointer hover:text-neutral-900"
                onClick={() => handleSort('start_date')}
              >
                Dates
                {sortField === 'start_date' && (
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                )}
              </div>
              <div
                className="col-span-1 flex items-center cursor-pointer hover:text-neutral-900"
                onClick={() => handleSort('commission_rate')}
              >
                Commission
                {sortField === 'commission_rate' && (
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                )}
              </div>
              <div className="col-span-1">Statut</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Table Body */}
            {filteredAndSortedMandates.map((mandate) => (
              <MandateRow
                key={mandate.id}
                mandate={mandate}
                isSelected={selectedMandates.has(mandate.id)}
                onToggleSelect={() => toggleMandateSelection(mandate.id)}
                onViewDetails={() => {
                  setSelectedMandate(mandate);
                  setShowDetailPanel(true);
                }}
                onAccept={acceptMandate}
                onRefuse={refuseMandate}
                onTerminate={terminateMandate}
                onSuspend={suspendMandate}
                onReactivate={reactivateMandate}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedMandates.map((mandate) => (
              <MandateGridCard
                key={mandate.id}
                mandate={mandate}
                isSelected={selectedMandates.has(mandate.id)}
                onToggleSelect={() => toggleMandateSelection(mandate.id)}
                onViewDetails={() => {
                  setSelectedMandate(mandate);
                  setShowDetailPanel(true);
                }}
                onAccept={acceptMandate}
                onRefuse={refuseMandate}
                onTerminate={terminateMandate}
                onSuspend={suspendMandate}
                onReactivate={reactivateMandate}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedMandate && (
        <MandateDetailPanel
          mandate={selectedMandate}
          isOpen={showDetailPanel}
          onClose={() => {
            setShowDetailPanel(false);
            setSelectedMandate(null);
          }}
        />
      )}
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'neutral' | 'green' | 'amber' | 'blue' | 'orange' | 'purple';
  onClick?: () => void;
}

function KPICard({ icon: Icon, label, value, color, onClick }: KPICardProps) {
  const colorClasses = {
    neutral: 'bg-neutral-50 text-neutral-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div
      className={`bg-white rounded-2xl p-4 border border-[#EFEBE9] cursor-pointer hover:shadow-md transition-shadow ${
        onClick ? 'hover:border-[#F16522]' : ''
      }`}
      onClick={onClick}
    >
      <div className={`flex items-center gap-2 mb-2 ${colorClasses[color]}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

// Mandate Row Component (for list view)
interface MandateRowProps {
  mandate: AgencyMandate;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
  onAccept?: (id: string) => void;
  onRefuse?: (id: string) => void;
  onTerminate?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onReactivate?: (id: string) => void;
  formatDate: (date: string | null) => string;
  formatCurrency: (amount: number) => string;
}

function MandateRow({
  mandate,
  isSelected,
  onToggleSelect,
  onViewDetails,
  onAccept,
  onRefuse,
  onTerminate,
  onSuspend,
  onReactivate,
  formatDate,
  formatCurrency,
}: MandateRowProps) {
  const [showActions, setShowActions] = useState(false);

  const monthlyCommission = mandate.property?.monthly_rent
    ? (mandate.property.monthly_rent * mandate.commission_rate) / 100
    : 0;

  return (
    <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-neutral-100 hover:bg-neutral-50 transition-colors items-center">
      <div className="col-span-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-neutral-300 text-[#F16522] focus:ring-[#F16522]"
        />
      </div>

      <div className="col-span-4">
        <button
          onClick={onViewDetails}
          className="flex items-center gap-3 text-left group"
        >
          <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
            {mandate.property?.main_image ? (
              <img
                src={mandate.property.main_image}
                alt={mandate.property?.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-neutral-400" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-neutral-900 truncate group-hover:text-[#F16522] transition-colors">
              {mandate.property?.title || 'Bien'}
            </p>
            <p className="text-sm text-neutral-500 truncate">
              {mandate.property?.city}
            </p>
          </div>
        </button>
      </div>

      <div className="col-span-2">
        <p className="text-sm font-medium text-neutral-900">
          {mandate.property?.owner?.full_name || '-'}
        </p>
        <p className="text-xs text-neutral-500 truncate">
          {mandate.property?.owner?.email || ''}
        </p>
      </div>

      <div className="col-span-2">
        <p className="text-sm text-neutral-600">
          Du {formatDate(mandate.start_date)}
        </p>
        <p className="text-sm text-neutral-600">
          Au {formatDate(mandate.end_date)}
        </p>
      </div>

      <div className="col-span-1">
        <p className="text-sm font-medium text-neutral-900">
          {mandate.commission_rate}%
        </p>
        <p className="text-xs text-[#F16522]">
          {formatCurrency(monthlyCommission)}/mois
        </p>
      </div>

      <div className="col-span-1">
        <MandateStatusBadge status={mandate.status} size="sm" />
      </div>

      <div className="col-span-1 relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <MoreHorizontal className="h-5 w-5 text-neutral-500" />
        </button>

        {showActions && (
          <>
            <div className="fixed inset-0" onClick={() => setShowActions(false)} />
            <div className="absolute right-0 top-10 z-10 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 min-w-[160px]">
              <button
                onClick={() => {
                  setShowActions(false);
                  onViewDetails();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 w-full"
              >
                <Eye className="h-4 w-4" />
                Voir détails
              </button>

              {mandate.status === 'pending' && onAccept && (
                <>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      onAccept(mandate.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 w-full"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accepter
                  </button>
                  <button
                    onClick={() => {
                      setShowActions(false);
                      onRefuse?.(mandate.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <XCircle className="h-4 w-4" />
                    Refuser
                  </button>
                </>
              )}

              {mandate.status === 'active' && onSuspend && (
                <button
                  onClick={() => {
                    setShowActions(false);
                    onSuspend(mandate.id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 w-full"
                >
                  <Pause className="h-4 w-4" />
                  Suspendre
                </button>
              )}

              {mandate.status === 'suspended' && onReactivate && (
                <button
                  onClick={() => {
                    setShowActions(false);
                    onReactivate(mandate.id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 w-full"
                >
                  <Play className="h-4 w-4" />
                  Réactiver
                </button>
              )}

              {(mandate.status === 'active' || mandate.status === 'suspended') && onTerminate && (
                <button
                  onClick={() => {
                    setShowActions(false);
                    onTerminate(mandate.id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                >
                  <Trash2 className="h-4 w-4" />
                  Résilier
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Mandate Grid Card Component (for grid view)
interface MandateGridCardProps {
  mandate: AgencyMandate;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
  onAccept?: (id: string) => void;
  onRefuse?: (id: string) => void;
  onTerminate?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onReactivate?: (id: string) => void;
  formatDate: (date: string | null) => string;
  formatCurrency: (amount: number) => string;
}

function MandateGridCard({
  mandate,
  isSelected,
  onToggleSelect,
  onViewDetails,
  onAccept,
  onRefuse,
  onTerminate,
  onSuspend,
  onReactivate,
  formatDate,
  formatCurrency,
}: MandateGridCardProps) {
  const monthlyCommission = mandate.property?.monthly_rent
    ? (mandate.property.monthly_rent * mandate.commission_rate) / 100
    : 0;

  return (
    <div
      className={`bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-lg ${
        isSelected ? 'border-[#F16522]' : 'border-[#EFEBE9]'
      }`}
    >
      {/* Checkbox for bulk selection */}
      <div className="absolute top-3 left-3 z-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 rounded border-neutral-300 text-[#F16522] focus:ring-[#F16522]"
        />
      </div>

      {/* Property Image */}
      <div className="relative h-40 bg-neutral-100">
        {mandate.property?.main_image ? (
          <img
            src={mandate.property.main_image}
            alt={mandate.property?.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="h-12 w-12 text-neutral-400" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <MandateStatusBadge status={mandate.status} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <button
          onClick={onViewDetails}
          className="block text-left w-full group"
        >
          <h3 className="font-semibold text-neutral-900 truncate mb-1 group-hover:text-[#F16522] transition-colors">
            {mandate.property?.title || 'Bien'}
          </h3>
          <p className="text-sm text-neutral-500 mb-3">
            {mandate.property?.city}
          </p>
        </button>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Propriétaire</span>
            <span className="font-medium text-neutral-900">
              {mandate.property?.owner?.full_name || '-'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Commission</span>
            <span className="font-medium text-neutral-900">
              {mandate.commission_rate}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Revenu mensuel</span>
            <span className="font-medium text-[#F16522]">
              {formatCurrency(monthlyCommission)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Début</span>
            <span className="text-neutral-900">{formatDate(mandate.start_date)}</span>
          </div>
        </div>

        {/* Actions */}
        {mandate.status === 'pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => onAccept?.(mandate.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Accepter
            </button>
            <button
              onClick={() => onRefuse?.(mandate.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Refuser
            </button>
          </div>
        ) : (
          <button
            onClick={onViewDetails}
            className="w-full flex items-center justify-center gap-1.5 bg-[#F16522] hover:bg-[#d9571d] text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          >
            <Eye className="h-4 w-4" />
            Voir détails
          </button>
        )}
      </div>
    </div>
  );
}
