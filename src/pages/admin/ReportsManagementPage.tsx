/**
 * Reports Management Page - Admin
 *
 * Page for administrators and moderators to manage user reports
 */

import { useState } from 'react';
import React from 'react';
import {
  Shield,
  Flag,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  User,
  Home,
  MessageSquare,
  Star,
  FileText,
  Eye,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReports,
  updateReportStatus,
  assignReport,
  updateReportPriority,
  deleteReport,
  type ReportFilters,
  type ReportListItem,
  type ReportStatus,
  type ReportType,
  type ReportPriority,
} from '@/services/reports/reportService';
import { Button } from '@/shared/ui/Button';

const ENTITY_ICONS: Record<ReportType, React.ElementType> = {
  property: Home,
  user: User,
  message: MessageSquare,
  review: Star,
  contract: FileText,
};

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; icon: React.ElementType; color: string }
> = {
  pending: {
    label: 'En attente',
    icon: Clock,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  under_review: {
    label: 'En cours',
    icon: Eye,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  resolved: {
    label: 'Résolu',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  dismissed: {
    label: 'Rejeté',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  escalated: {
    label: 'Éscaladé',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
};

const PRIORITY_CONFIG: Record<
  ReportPriority,
  { label: string; color: string }
> = {
  low: { label: 'Faible', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Moyen', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'Élevé', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
};

export default function ReportsManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<ReportListItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());

  // Filters
  const [filters, setFilters] = useState<ReportFilters>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', filters, page],
    queryFn: () => getReports(filters, page, 20),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: ReportStatus; notes?: string }) =>
      updateReportStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const _assignMutation = useMutation({
    mutationFn: ({ id, moderatorId }: { id: string; moderatorId: string }) =>
      assignReport(id, moderatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: ReportPriority }) =>
      updateReportPriority(id, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setSelectedReport(null);
    },
  });

  const handleFilterChange = (key: keyof ReportFilters, value: string | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const handleBulkSelect = (id: string) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedReports(newSelected);
  };

  const handleSelectAll = () => {
    if (data && selectedReports.size === data.data.length) {
      setSelectedReports(new Set());
    } else if (data) {
      setSelectedReports(new Set(data.data.map((r) => r.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedReports.size === 0) return;

    for (const id of selectedReports) {
      switch (bulkAction) {
        case 'resolve':
          await updateStatusMutation.mutateAsync({ id, status: 'resolved' });
          break;
        case 'dismiss':
          await updateStatusMutation.mutateAsync({ id, status: 'dismissed' });
          break;
        case 'urgent':
          await updatePriorityMutation.mutateAsync({ id, priority: 'urgent' });
          break;
      }
    }

    setSelectedReports(new Set());
    setBulkAction('');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Gestion des Signalements
                </h1>
                <p className="text-sm text-neutral-500">
                  {data?.count || 0} signalement{data?.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filtres
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl p-6 mb-6 border border-neutral-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Statut
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) =>
                    handleFilterChange('status', e.target.value || undefined)
                  }
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="under_review">En cours</option>
                  <option value="resolved">Résolu</option>
                  <option value="dismissed">Rejeté</option>
                  <option value="escalated">Éscaladé</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Type
                </label>
                <select
                  value={filters.type || ''}
                  onChange={(e) =>
                    handleFilterChange('type', e.target.value || undefined)
                  }
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Tous les types</option>
                  <option value="property">Propriété</option>
                  <option value="user">Utilisateur</option>
                  <option value="message">Message</option>
                  <option value="review">Avis</option>
                  <option value="contract">Contrat</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Priorité
                </label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) =>
                    handleFilterChange('priority', e.target.value || undefined)
                  }
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Toutes les priorités</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">Élevé</option>
                  <option value="medium">Moyen</option>
                  <option value="low">Faible</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Rechercher
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={filters.search || ''}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Description, titre..."
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedReports.size > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <p className="text-sm text-orange-900">
              {selectedReports.size} signalement{selectedReports.size > 1 ? 's' : ''} sélectionné
              {selectedReports.size > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-2 border border-orange-300 rounded-lg text-sm bg-white"
              >
                <option value="">Action groupée...</option>
                <option value="resolve">Marquer résolu</option>
                <option value="dismiss">Rejeter</option>
                <option value="urgent">Marquer urgent</option>
              </select>
              <Button
                onClick={handleBulkAction}
                disabled={!bulkAction}
                size="sm"
              >
                Appliquer
              </Button>
            </div>
          </div>
        )}

        {/* Reports List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-neutral-500">Chargement des signalements...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-900 font-medium">Erreur lors du chargement</p>
            <p className="text-red-700 text-sm mt-1">
              {(error as Error).message}
            </p>
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-neutral-50 border-b border-neutral-200 text-sm font-semibold text-neutral-700">
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedReports.size === data.data.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="col-span-2">Entité</div>
                <div className="col-span-2">Motif</div>
                <div className="col-span-2">Signalé par</div>
                <div className="col-span-1">Statut</div>
                <div className="col-span-1">Priorité</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1"></div>
              </div>

              {/* Table Rows */}
              {data.data.map((report) => {
                const StatusIcon = STATUS_CONFIG[report.status].icon;
                const EntityIcon = ENTITY_ICONS[report.report_type];

                return (
                  <div
                    key={report.id}
                    className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer ${
                      selectedReport?.id === report.id ? 'bg-orange-50' : ''
                    }`}
                    onClick={() => setSelectedReport(report)}
                  >
                    <div className="col-span-1 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedReports.has(report.id)}
                        onChange={() => handleBulkSelect(report.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                      />
                    </div>

                    <div className="col-span-2 flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          report.report_type === 'property'
                            ? 'bg-blue-100 text-blue-600'
                            : report.report_type === 'user'
                            ? 'bg-purple-100 text-purple-600'
                            : report.report_type === 'message'
                            ? 'bg-green-100 text-green-600'
                            : report.report_type === 'review'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        <EntityIcon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-neutral-900 truncate">
                          {report.entity_title || 'N/A'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {report.report_type === 'property'
                            ? 'Propriété'
                            : report.report_type === 'user'
                            ? 'Utilisateur'
                            : report.report_type === 'message'
                            ? 'Message'
                            : report.report_type === 'review'
                            ? 'Avis'
                            : 'Contrat'}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <span className="text-sm text-neutral-700 truncate">
                        {report.reason}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {report.reporter_name || 'Anonyme'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {report.reporter_id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${STATUS_CONFIG[report.status].color}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_CONFIG[report.status].label}
                      </span>
                    </div>

                    <div className="col-span-1 flex items-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_CONFIG[report.priority].color}`}
                      >
                        {PRIORITY_CONFIG[report.priority].label}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center text-sm text-neutral-500">
                      {new Date(report.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>

                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReport(report);
                        }}
                        className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4 text-neutral-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-neutral-500">
                Affichage de {(page - 1) * 20 + 1} à {Math.min(page * 20, data.count)} sur {data.count}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= data.count}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
            <Flag className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Aucun signalement
            </h3>
            <p className="text-neutral-500">
              {Object.keys(filters).length > 0
                ? 'Aucun signalement ne correspond à vos critères de recherche.'
                : 'Aucun signalement pour le moment.'}
            </p>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-900">Détails du signalement</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                <XCircle className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {/* Entity Info */}
              <div>
                <p className="text-sm font-semibold text-neutral-900 mb-3">Entité signalée</p>
                <div className="bg-neutral-50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedReport.report_type === 'property'
                          ? 'bg-blue-100 text-blue-600'
                          : selectedReport.report_type === 'user'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {React.createElement(ENTITY_ICONS[selectedReport.report_type], {
                        className: 'w-5 h-5',
                      })}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">
                        {selectedReport.entity_title || 'N/A'}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {selectedReport.report_type} • ID: {selectedReport.entity_id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  {selectedReport.entity_report_count > 1 && (
                    <div className="mt-3 pt-3 border-t border-neutral-200">
                      <p className="text-xs text-orange-600 font-medium">
                        ⚠️ Ce contenu a été signalé {selectedReport.entity_report_count} fois
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Report Info */}
              <div>
                <p className="text-sm font-semibold text-neutral-900 mb-3">Détails du signalement</p>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-neutral-200">
                    <span className="text-sm text-neutral-500">Motif</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {selectedReport.reason}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-neutral-200">
                    <span className="text-sm text-neutral-500">Statut</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${STATUS_CONFIG[selectedReport.status].color}`}
                    >
                      {React.createElement(STATUS_CONFIG[selectedReport.status].icon, {
                        className: 'w-3 h-3',
                      })}
                      {STATUS_CONFIG[selectedReport.status].label}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-neutral-200">
                    <span className="text-sm text-neutral-500">Priorité</span>
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_CONFIG[selectedReport.priority].color}`}
                    >
                      {PRIORITY_CONFIG[selectedReport.priority].label}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-neutral-200">
                    <span className="text-sm text-neutral-500">Signalé par</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {selectedReport.reporter_name || 'Anonyme'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-neutral-200">
                    <span className="text-sm text-neutral-500">Date</span>
                    <span className="text-sm text-neutral-900">
                      {new Date(selectedReport.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>

              {selectedReport.description && (
                <div>
                  <p className="text-sm font-semibold text-neutral-900 mb-2">Description</p>
                  <p className="text-sm text-neutral-700 bg-neutral-50 rounded-xl p-4">
                    {selectedReport.description}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-neutral-200">
                {selectedReport.status === 'pending' || selectedReport.status === 'under_review' ? (
                  <>
                    <Button
                      onClick={() =>
                        updateStatusMutation.mutate(
                          { id: selectedReport.id, status: 'resolved' },
                          { onSuccess: () => setSelectedReport(null) }
                        )
                      }
                      disabled={updateStatusMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Résoudre
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        updateStatusMutation.mutate(
                          { id: selectedReport.id, status: 'dismissed' },
                          { onSuccess: () => setSelectedReport(null) }
                        )
                      }
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeter
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        deleteMutation.mutate(selectedReport.id)
                      }
                      disabled={deleteMutation.isPending}
                    >
                      Supprimer
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedReport(null)}
                    className="w-full"
                  >
                    Fermer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
