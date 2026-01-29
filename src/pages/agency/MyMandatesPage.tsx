/**
 * Page de gestion des mandats
 * Accessible aux propriétaires et aux agences
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Home,
  Download,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import useAgencyMandates, { AgencyMandate } from '@/hooks/useAgencyMandates';
import MandateCard from '../../features/agency/components/MandateCard';
import InviteAgencyDialog from '../../features/agency/components/InviteAgencyDialog';
import MandatePermissionsForm from '../../features/agency/components/MandatePermissionsForm';

type ViewMode = 'owner' | 'agency';
type StatusFilter = 'all' | 'pending' | 'active' | 'expired' | 'cancelled';
type PeriodPreset = 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'custom';

interface Property {
  id: string;
  title: string;
  city: string;
  price: number;
}

export default function MyMandatesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('owner');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedMandate, setSelectedMandate] = useState<AgencyMandate | null>(null);
  const [myProperties, setMyProperties] = useState<Property[]>([]);

  // Period filter state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('all');
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);

  const {
    agencies,
    myAgency,
    loading,
    ownerMandates,
    agencyMandates,
    createMandate,
    acceptMandate,
    refuseMandate,
    terminateMandate,
    suspendMandate,
    reactivateMandate,
    updateMandatePermissions,
  } = useAgencyMandates();

  // Detect if user is an agency (but don't auto-switch, let user choose)
  useEffect(() => {
    // Only set to agency if user is ONLY an agency (not also an owner with properties)
    if (myAgency && myProperties.length === 0) {
      setViewMode('agency');
    } else if (!myAgency && myProperties.length > 0) {
      setViewMode('owner');
    }
    // If user has both, let them choose (default to owner)
  }, [myAgency, myProperties]);

  // Load user's properties if owner
  useEffect(() => {
    const loadProperties = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('properties')
        .select('id, title, city, price')
        .eq('owner_id', user.id);

      console.log('MyMandatesPage - Loaded properties:', { count: data?.length || 0, data, error });
      setMyProperties((data || []) as Property[]);
    };

    loadProperties();
  }, [user]);

  if (!user) {
    navigate('/connexion');
    return null;
  }

  // Filter mandates based on view mode and filters
  const baseMandates = viewMode === 'owner' ? ownerMandates : agencyMandates;

  const filteredMandates = baseMandates.filter((mandate) => {
    // Status filter
    if (statusFilter !== 'all' && mandate.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesProperty = mandate.property?.title?.toLowerCase().includes(query);
      const matchesAgency = mandate.agency?.agency_name?.toLowerCase().includes(query);
      const matchesCity = mandate.property?.city?.toLowerCase().includes(query);

      if (!matchesProperty && !matchesAgency && !matchesCity) {
        return false;
      }
    }

    // Period filter
    if (periodPreset !== 'all' || startDate || endDate) {
      const mandateDate = new Date(mandate.start_date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && mandateDate < start) return false;
      if (end && mandateDate > end) return false;
    }

    return true;
  });

  // Stats
  const stats = {
    total: baseMandates.length,
    pending: baseMandates.filter((m) => m.status === 'pending').length,
    active: baseMandates.filter((m) => m.status === 'active').length,
    expired: baseMandates.filter((m) => m.status === 'expired').length,
    cancelled: baseMandates.filter((m) => m.status === 'cancelled').length,
  };

  const handleInvite = async (params: Parameters<typeof createMandate>[0]) => {
    return await createMandate(params);
  };

  const handleManagePermissions = (mandate: AgencyMandate) => {
    setSelectedMandate(mandate);
    setShowPermissionsDialog(true);
  };

  const handleSign = (mandate: AgencyMandate) => {
    // Both owners and agencies go through the choice page
    navigate(`/mandat/signer/${mandate.id}`);
  };

  const handleSavePermissions = async (
    permissions: Parameters<typeof updateMandatePermissions>[1]
  ) => {
    if (!selectedMandate) return false;
    return await updateMandatePermissions(selectedMandate.id, permissions);
  };

  // Period filter helpers
  const applyPeriodPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined;

    switch (preset) {
      case 'all':
        start = undefined;
        end = undefined;
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_3_months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = new Date();
        break;
      case 'last_6_months':
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        end = new Date();
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        // Keep current dates
        return;
    }

    setStartDate(start ? start.toISOString().split('T')[0] : undefined);
    setEndDate(end ? end.toISOString().split('T')[0] : undefined);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF' }).format(amount);

  // Get period filter display text
  const getPeriodFilterLabel = () => {
    const labels: Record<PeriodPreset, string> = {
      all: 'Toutes les périodes',
      this_month: 'Ce mois',
      last_month: 'Le mois dernier',
      last_3_months: '3 derniers mois',
      last_6_months: '6 derniers mois',
      this_year: 'Cette année',
      custom: 'Personnalisé',
    };
    return labels[periodPreset];
  };

  // Filter mandates by period
  const getFilteredByPeriodMandates = (mandates: AgencyMandate[]) => {
    if (periodPreset === 'all' && !startDate && !endDate) {
      return mandates;
    }

    return mandates.filter((mandate) => {
      const mandateDate = new Date(mandate.start_date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start && mandateDate < start) return false;
      if (end && mandateDate > end) return false;

      return true;
    });
  };

  // Export to PDF
  const exportToPDF = () => {
    const mandatesToExport = getFilteredByPeriodMandates(filteredMandates);

    const tableHTML = `
      <html>
        <head>
          <title>Mandats Agence - MonToit</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #F16522; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .filters { margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #2C1810; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
            .status-pending { background-color: #fef3c7; color: #92400e; }
            .status-active { background-color: #d1fae5; color: #065f46; }
            .status-expired { background-color: #fed7aa; color: #9a3412; }
            .status-cancelled { background-color: #fee2e2; color: #991b1b; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Mes Mandats</h1>
            <div>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
              <p><strong>Vue:</strong> ${viewMode === 'owner' ? 'Mes biens' : 'Mon agence'}</p>
            </div>
          </div>

          <div class="filters">
            <p><strong>Période:</strong> ${getPeriodFilterLabel()}</p>
            ${startDate ? `<p><strong>Date début:</strong> ${formatDate(startDate)}</p>` : ''}
            ${endDate ? `<p><strong>Date fin:</strong> ${formatDate(endDate)}</p>` : ''}
            ${statusFilter !== 'all' ? `<p><strong>Statut:</strong> ${statusFilter}</p>` : ''}
            ${searchQuery ? `<p><strong>Recherche:</strong> "${searchQuery}"</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>ID Mandat</th>
                <th>Biens</th>
                <th>Agence</th>
                <th>Dates</th>
                <th>Commission</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              ${mandatesToExport.map((m) => {
                const statusClass = `status-${m.status}`;
                const statusLabels: Record<string, string> = {
                  pending: 'En attente',
                  active: 'Actif',
                  expired: 'Expiré',
                  cancelled: 'Résilié',
                  suspended: 'Suspendu',
                };
                return `
                  <tr>
                    <td style="font-family: monospace;">${m.id.slice(0, 8).toUpperCase()}</td>
                    <td>
                      <strong>${m.property?.title || 'N/A'}</strong><br>
                      <small>${m.property?.city || ''}</small>
                    </td>
                    <td>${m.agency?.agency_name || 'N/A'}</td>
                    <td>
                      Du ${formatDate(m.start_date)}<br>
                      ${m.end_date ? `Au ${formatDate(m.end_date)}` : 'Indéterminé'}
                    </td>
                    <td>${m.commission_rate}%</td>
                    <td><span class="status ${statusClass}">${statusLabels[m.status] || m.status}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Total:</strong> ${mandatesToExport.length} mandat(s)</p>
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
    link.download = `mandats-${viewMode}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bg-[#2C1810] rounded-2xl shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#F16522] flex items-center justify-center">
                <FileText className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Mandats</h1>
                <p className="text-[#E8D4C5]">
                  {viewMode === 'owner'
                    ? 'Gérez vos mandats de gestion locative'
                    : 'Mandats de gestion qui vous sont confiés'}
                </p>
              </div>
            </div>

            {viewMode === 'owner' && (
              <button
                onClick={() => setShowInviteDialog(true)}
                className="flex items-center gap-2 bg-[#F16522] hover:bg-[#d9571d] text-white px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Inviter une agence
              </button>
            )}
          </div>

          {myAgency && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setViewMode('owner')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'owner'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Home className="h-4 w-4 inline mr-2" />
                Mes biens
              </button>
              <button
                onClick={() => setViewMode('agency')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'agency'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Building2 className="h-4 w-4 inline mr-2" />
                Mon agence
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-amber-600 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">En attente</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Actifs</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.active}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-orange-500 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Expirés</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.expired}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Résiliés</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.cancelled}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par bien, agence ou ville..."
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="active">Actifs</option>
                <option value="expired">Expirés</option>
                <option value="cancelled">Résiliés</option>
              </select>
            </div>

            {/* Period Filter */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <button
                  onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                  className="px-4 py-3 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-primary flex items-center gap-2 min-w-[180px] justify-between"
                >
                  <span>{getPeriodFilterLabel()}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {showPeriodDropdown && (
                <div className="absolute top-full mt-2 right-0 bg-card border border-border rounded-xl shadow-lg z-50 min-w-[250px]">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        applyPeriodPreset('all');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        periodPreset === 'all'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      Toutes les périodes
                    </button>
                    <button
                      onClick={() => {
                        applyPeriodPreset('this_month');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        periodPreset === 'this_month'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      Ce mois
                    </button>
                    <button
                      onClick={() => {
                        applyPeriodPreset('last_month');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        periodPreset === 'last_month'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      Le mois dernier
                    </button>
                    <button
                      onClick={() => {
                        applyPeriodPreset('last_3_months');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        periodPreset === 'last_3_months'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      3 derniers mois
                    </button>
                    <button
                      onClick={() => {
                        applyPeriodPreset('last_6_months');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        periodPreset === 'last_6_months'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      6 derniers mois
                    </button>
                    <button
                      onClick={() => {
                        applyPeriodPreset('this_year');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        periodPreset === 'this_year'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      Cette année
                    </button>
                    <div className="border-t border-border my-2"></div>
                    <button
                      onClick={() => {
                        setPeriodPreset('custom');
                        setShowPeriodDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        periodPreset === 'custom'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      Personnalisé
                    </button>
                  </div>

                  {/* Custom date range inputs */}
                  {periodPreset === 'custom' && (
                    <div className="border-t border-border p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Date de début
                        </label>
                        <input
                          type="date"
                          value={startDate || ''}
                          onChange={(e) => setStartDate(e.target.value || undefined)}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Date de fin
                        </label>
                        <input
                          type="date"
                          value={endDate || ''}
                          onChange={(e) => setEndDate(e.target.value || undefined)}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Export PDF Button */}
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
            >
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
          </div>
        </div>

        {/* Active filters display */}
        {(periodPreset !== 'all' || startDate || endDate) && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className="text-muted-foreground">Filtre période:</span>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
              {getPeriodFilterLabel()}
            </span>
            {startDate && (
              <span className="px-3 py-1 bg-muted rounded-full">
                Du {formatDate(startDate)}
              </span>
            )}
            {endDate && (
              <span className="px-3 py-1 bg-muted rounded-full">
                Au {formatDate(endDate)}
              </span>
            )}
            <button
              onClick={() => {
                setPeriodPreset('all');
                setStartDate(undefined);
                setEndDate(undefined);
              }}
              className="text-red-500 hover:text-red-600 font-medium"
            >
              Réinitialiser
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredMandates.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-2xl border border-border">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              {searchQuery || statusFilter !== 'all' ? 'Aucun mandat trouvé' : 'Aucun mandat'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {viewMode === 'owner'
                ? 'Invitez une agence pour gérer vos biens'
                : 'Les propriétaires peuvent vous confier la gestion de leurs biens'}
            </p>
            {viewMode === 'owner' && (
              <button
                onClick={() => setShowInviteDialog(true)}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium transition-colors"
              >
                <Plus className="h-5 w-5" />
                Inviter une agence
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMandates.map((mandate) => (
              <MandateCard
                key={mandate.id}
                mandate={mandate}
                viewAs={viewMode}
                onAccept={acceptMandate}
                onRefuse={refuseMandate}
                onTerminate={terminateMandate}
                onSuspend={suspendMandate}
                onReactivate={reactivateMandate}
                onManagePermissions={handleManagePermissions}
                onSign={handleSign}
              />
            ))}
          </div>
        )}
      </div>

      <InviteAgencyDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onInvite={handleInvite}
        properties={myProperties}
        agencies={agencies}
      />

      {selectedMandate && (
        <MandatePermissionsForm
          isOpen={showPermissionsDialog}
          onClose={() => {
            setShowPermissionsDialog(false);
            setSelectedMandate(null);
          }}
          mandate={selectedMandate}
          onSave={handleSavePermissions}
        />
      )}
    </>
  );
}
