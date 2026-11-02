/**
 * Page Kanban de gestion des mandats pour les agences
 * Vue moderne en colonnes avec drag & drop, KPIs détaillés et actions rapides
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Download,
  Grid3x3,
  List,
  LayoutDashboard,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Columns,
  MapPin,
  Eye,
  Pause,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/app/providers/AuthProvider';
import { useAgencyMandates, type AgencyMandate } from '@/hooks/useAgencyMandates';
import MandateStatusBadge from '../components/MandateStatusBadge';
import MandateDetailPanel from '../components/MandateDetailPanel';

type ViewMode = 'kanban' | 'list' | 'grid';

// Column configuration for Kanban view
const KANBAN_COLUMNS = [
  { id: 'pending', label: 'En attente', icon: Clock, color: 'amber' },
  { id: 'active', label: 'Actifs', icon: CheckCircle2, color: 'green' },
  { id: 'suspended', label: 'Suspendus', icon: Pause, color: 'orange' },
  { id: 'expired', label: 'Expirés', icon: XCircle, color: 'red' },
] as const;

export default function AgencyMandatesKanbanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
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
  } = useAgencyMandates();

  useEffect(() => {
    if (user && !myAgency) {
      navigate('/agences');
    }
  }, [user, myAgency, navigate]);

  // Filter mandates by search
  const filteredMandates = useMemo(() => {
    if (!searchQuery) return agencyMandates;
    const query = searchQuery.toLowerCase();
    return agencyMandates.filter((m: AgencyMandate) => {
      const matchesProperty = m.property?.title?.toLowerCase().includes(query);
      const matchesCity = m.property?.city?.toLowerCase().includes(query);
      const matchesOwner = m.owner?.full_name?.toLowerCase().includes(query);
      const matchesId = m.id.toLowerCase().includes(query);
      return matchesProperty || matchesCity || matchesOwner || matchesId;
    });
  }, [agencyMandates, searchQuery]);

  // Group mandates by status for Kanban
  const mandatesByStatus = useMemo(() => {
    const grouped = {
      pending: filteredMandates.filter((m) => m.status === 'pending'),
      active: filteredMandates.filter((m) => m.status === 'active'),
      suspended: filteredMandates.filter((m) => m.status === 'suspended'),
      expired: filteredMandates.filter((m) => m.status === 'expired'),
      cancelled: filteredMandates.filter((m) => m.status === 'cancelled'),
    };
    return grouped;
  }, [filteredMandates]);

  // KPIs
  const kpis = useMemo(() => {
    const activeMandates = agencyMandates.filter((m: AgencyMandate) => m.status === 'active');
    const pendingMandates = agencyMandates.filter((m: AgencyMandate) => m.status === 'pending');
    const totalRevenue = activeMandates.reduce((sum: number, m: AgencyMandate) => {
      const rent = m.property?.price || 0;
      return sum + (rent * m.commission_rate) / 100;
    }, 0);

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoon = activeMandates.filter((m: AgencyMandate) => {
      if (!m.end_date) return false;
      return new Date(m.end_date) <= thirtyDaysFromNow;
    }).length;

    const pendingSignatures = activeMandates.filter(
      (m: AgencyMandate) => !m.signed_mandate_url && m.cryptoneo_signature_status !== 'completed'
    ).length;

    return {
      total: agencyMandates.length,
      active: activeMandates.length,
      pending: pendingMandates.length,
      totalRevenue,
      expiringSoon,
      pendingSignatures,
      suspended: mandatesByStatus.suspended.length,
      expired: mandatesByStatus.expired.length,
    };
  }, [agencyMandates, mandatesByStatus]);

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
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Gestion des mandats</h1>
                <p className="text-[#E8D4C5]">
                  {kpis.active} mandats actifs • {formatCurrency(kpis.totalRevenue)}/mois
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
          <KPICard icon={FileText} label="Total" value={kpis.total} color="neutral" />
          <KPICard icon={CheckCircle2} label="Actifs" value={kpis.active} color="green" />
          <KPICard icon={Clock} label="En attente" value={kpis.pending} color="amber" />
          <KPICard icon={TrendingUp} label="Revenus/mois" value={formatCurrency(kpis.totalRevenue)} color="blue" />
          <KPICard icon={AlertCircle} label="Expirent bientôt" value={kpis.expiringSoon} color="orange" />
          <KPICard icon={Users} label="Suspendus" value={kpis.suspended} color="purple" />
        </div>

        {/* Alerts */}
        {(kpis.expiringSoon > 0 || kpis.pendingSignatures > 0 || kpis.pending > 0) && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {kpis.pending > 0 && (
              <AlertCard
                type="info"
                title="Mandats en attente"
                message={`${kpis.pending} mandat(s) attendent votre validation`}
                count={kpis.pending}
              />
            )}
            {kpis.expiringSoon > 0 && (
              <AlertCard
                type="warning"
                title="Expiration proche"
                message={`${kpis.expiringSoon} mandat(s) expirent dans les 30 jours`}
                count={kpis.expiringSoon}
              />
            )}
            {kpis.pendingSignatures > 0 && (
              <AlertCard
                type="info"
                title="Signatures en attente"
                message={`${kpis.pendingSignatures} signature(s) à compléter`}
                count={kpis.pendingSignatures}
              />
            )}
          </div>
        )}

        {/* Filters and Actions Bar */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par bien, ville, propriétaire..."
                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-3 transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-[#F16522] text-white'
                      : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                  title="Vue Kanban"
                >
                  <Columns className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-[#F16522] text-white'
                      : 'bg-white text-neutral-600 hover:bg-neutral-50'
                  }`}
                  title="Vue liste"
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
                  title="Vue grille"
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
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F16522]"></div>
          </div>
        ) : viewMode === 'kanban' ? (
          /* Kanban View */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                mandates={mandatesByStatus[column.id as keyof typeof mandatesByStatus]}
                onViewDetails={(mandate) => {
                  setSelectedMandate(mandate);
                  setShowDetailPanel(true);
                }}
                onAccept={acceptMandate}
                onRefuse={refuseMandate}
                onSuspend={suspendMandate}
                onReactivate={reactivateMandate}
                onTerminate={terminateMandate}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>
        ) : viewMode === 'list' ? (
          /* List View */
          <MandatesListView
            mandates={filteredMandates}
            onViewDetails={(mandate) => {
              setSelectedMandate(mandate);
              setShowDetailPanel(true);
            }}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
          />
        ) : (
          /* Grid View */
          <MandatesGridView
            mandates={filteredMandates}
            onViewDetails={(mandate) => {
              setSelectedMandate(mandate);
              setShowDetailPanel(true);
            }}
            formatCurrency={formatCurrency}
          />
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
}

function KPICard({ icon: Icon, label, value, color }: KPICardProps) {
  const colorClasses = {
    neutral: 'bg-neutral-50 text-neutral-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#EFEBE9] hover:shadow-md transition-shadow">
      <div className={`flex items-center gap-2 mb-2 ${colorClasses[color]}`}>
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

// Alert Card Component
interface AlertCardProps {
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  count: number;
}

function AlertCard({ type, title, message, count }: AlertCardProps) {
  const colors = {
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[type]} flex items-start gap-3`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
        type === 'info' ? 'bg-blue-200 text-blue-700' :
        type === 'warning' ? 'bg-amber-200 text-amber-700' :
        'bg-red-200 text-red-700'
      }`}>
        {count}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm opacity-80">{message}</p>
      </div>
    </div>
  );
}

// Kanban Column Component
interface KanbanColumnProps {
  column: { id: string; label: string; icon: React.ElementType; color: string };
  mandates: AgencyMandate[];
  onViewDetails: (mandate: AgencyMandate) => void;
  onAccept?: (id: string) => void;
  onRefuse?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onReactivate?: (id: string) => void;
  onTerminate?: (id: string) => void;
  formatDate: (date: string | null) => string;
  formatCurrency: (amount: number) => string;
}

function KanbanColumn({
  column,
  mandates,
  onViewDetails,
  onAccept,
  onRefuse,
  onSuspend,
  onReactivate,
  onTerminate,
  formatDate,
  formatCurrency,
}: KanbanColumnProps) {
  const colorClasses = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className="flex-shrink-0 w-80">
      {/* Column Header */}
      <div className={`p-3 rounded-t-xl border ${colorClasses[column.color as keyof typeof colorClasses]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <column.icon className="h-5 w-5" />
            <span className="font-semibold">{column.label}</span>
          </div>
          <span className="bg-white/50 px-2 py-1 rounded-full text-sm font-bold">
            {mandates.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="bg-neutral-100 rounded-b-xl p-3 min-h-[400px] space-y-3">
        {mandates.length === 0 ? (
          <div className="text-center py-8 text-neutral-400">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun mandat</p>
          </div>
        ) : (
          mandates.map((mandate) => (
            <KanbanCard
              key={mandate.id}
              mandate={mandate}
              onClick={() => onViewDetails(mandate)}
              onAccept={onAccept}
              onRefuse={onRefuse}
              onSuspend={onSuspend}
              onReactivate={onReactivate}
              onTerminate={onTerminate}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Kanban Card Component
interface KanbanCardProps {
  mandate: AgencyMandate;
  onClick: () => void;
  onAccept?: (id: string) => void;
  onRefuse?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onReactivate?: (id: string) => void;
  onTerminate?: (id: string) => void;
  formatDate: (date: string | null) => string;
  formatCurrency: (amount: number) => string;
}

function KanbanCard({
  mandate,
  onClick,
  onAccept,
  onRefuse,
  onSuspend: _onSuspend,
  onReactivate: _onReactivate,
  onTerminate: _onTerminate,
  formatDate,
  formatCurrency,
}: KanbanCardProps) {
  const monthlyCommission = mandate.property?.price
    ? (mandate.property.price * mandate.commission_rate) / 100
    : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-neutral-200 p-4 cursor-pointer hover:shadow-md hover:border-[#F16522]/50 transition-all"
    >
      {/* Property Image & Status */}
      <div className="relative mb-3">
        <div className="h-28 rounded-lg bg-neutral-100 overflow-hidden">
          {mandate.property?.main_image ? (
            <img
              src={mandate.property.main_image}
              alt={mandate.property?.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="h-8 w-8 text-neutral-400" />
            </div>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <MandateStatusBadge status={mandate.status} size="sm" />
        </div>
      </div>

      {/* Property Info */}
      <h4 className="font-semibold text-neutral-900 mb-1 line-clamp-1">
        {mandate.property?.title || 'Bien'}
      </h4>
      <div className="flex items-center gap-1 text-sm text-neutral-500 mb-3">
        <MapPin className="h-3 w-3" />
        <span className="line-clamp-1">{mandate.property?.city}</span>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Propriétaire</span>
          <span className="font-medium text-neutral-900 truncate max-w-[120px]">
            {mandate.owner?.full_name || '-'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Commission</span>
          <span className="font-bold text-[#F16522]">
            {mandate.commission_rate}% ({formatCurrency(monthlyCommission)})
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-500">Début</span>
          <span className="text-neutral-900">{formatDate(mandate.start_date)}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-3 pt-3 border-t border-neutral-100">
        {mandate.status === 'pending' ? (
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAccept?.(mandate.id);
              }}
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              Accepter
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefuse?.(mandate.id);
              }}
              className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-sm font-medium"
            >
              Refuser
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="w-full py-2 bg-[#F16522] hover:bg-[#d9571d] text-white rounded-lg text-sm font-medium"
          >
            Voir détails
          </button>
        )}
      </div>
    </div>
  );
}

// List View Component
interface MandatesListViewProps {
  mandates: AgencyMandate[];
  onViewDetails: (mandate: AgencyMandate) => void;
  formatDate: (date: string | null) => string;
  formatCurrency: (amount: number) => string;
}

function MandatesListView({ mandates, onViewDetails, formatDate, formatCurrency }: MandatesListViewProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-neutral-50 border-b border-neutral-200 text-sm font-medium text-neutral-600">
        <div className="col-span-4">Bien</div>
        <div className="col-span-2">Propriétaire</div>
        <div className="col-span-2">Dates</div>
        <div className="col-span-2">Commission</div>
        <div className="col-span-1">Statut</div>
        <div className="col-span-1">Actions</div>
      </div>

      {/* Table Body */}
      {mandates.map((mandate) => {
        const monthlyCommission = mandate.property?.price
          ? (mandate.property.price * mandate.commission_rate) / 100
          : 0;

        return (
          <div
            key={mandate.id}
            onClick={() => onViewDetails(mandate)}
            className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-neutral-100 hover:bg-neutral-50 transition-colors items-center cursor-pointer"
          >
            <div className="col-span-4">
              <div className="flex items-center gap-3">
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
                  <p className="font-medium text-neutral-900 truncate">
                    {mandate.property?.title || 'Bien'}
                  </p>
                  <p className="text-sm text-neutral-500 truncate">
                    {mandate.property?.city}
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <p className="text-sm font-medium text-neutral-900">
                {mandate.owner?.full_name || '-'}
              </p>
            </div>

            <div className="col-span-2">
              <p className="text-sm text-neutral-600">
                Du {formatDate(mandate.start_date)}
              </p>
            </div>

            <div className="col-span-2">
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

            <div className="col-span-1">
              <button className="p-2 hover:bg-neutral-100 rounded-lg">
                <Eye className="h-5 w-5 text-neutral-500" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Grid View Component
interface MandatesGridViewProps {
  mandates: AgencyMandate[];
  onViewDetails: (mandate: AgencyMandate) => void;
  formatCurrency: (amount: number) => string;
}

function MandatesGridView({ mandates, onViewDetails, formatCurrency }: MandatesGridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {mandates.map((mandate) => {
        const monthlyCommission = mandate.property?.price
          ? (mandate.property.price * mandate.commission_rate) / 100
          : 0;

        return (
          <div
            key={mandate.id}
            onClick={() => onViewDetails(mandate)}
            className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden cursor-pointer hover:shadow-lg hover:border-[#F16522]/50 transition-all"
          >
            {/* Image */}
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
              <div className="absolute top-3 right-3">
                <MandateStatusBadge status={mandate.status} size="sm" />
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-neutral-900 truncate mb-1">
                {mandate.property?.title || 'Bien'}
              </h3>
              <p className="text-sm text-neutral-500 mb-4">
                {mandate.property?.city}
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Propriétaire</span>
                  <span className="font-medium text-neutral-900 truncate max-w-[120px]">
                    {mandate.owner?.full_name || '-'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Commission</span>
                  <span className="font-medium text-neutral-900">
                    {mandate.commission_rate}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Revenu/mois</span>
                  <span className="font-medium text-[#F16522]">
                    {formatCurrency(monthlyCommission)}
                  </span>
                </div>
              </div>

              <button className="w-full py-2 bg-[#F16522] hover:bg-[#d9571d] text-white rounded-lg text-sm font-medium">
                Voir détails
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
