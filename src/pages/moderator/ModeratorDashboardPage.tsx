/**
 * Moderator Dashboard
 *
 * Dashboard for moderators with statistics, trends, and priority queues
 */

import { useState } from 'react';
import {
  Shield,
  Flag,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Users,
  Home as HomeIcon,
  MessageSquare,
  Star,
  FileText,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  getReportStatistics,
  type ReportStatistics,
} from '@/services/reports/reportService';

const ENTITY_ICONS = {
  property: HomeIcon,
  user: Users,
  message: MessageSquare,
  review: Star,
  contract: FileText,
};

const ENTITY_COLORS = {
  property: 'bg-blue-500',
  user: 'bg-purple-500',
  message: 'bg-green-500',
  review: 'bg-yellow-500',
  contract: 'bg-red-500',
};

export default function ModeratorDashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['reportStatistics'],
    queryFn: getReportStatistics,
    refetchInterval: 60000, // Refresh every minute
  });

  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d'>('30d');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-900 font-medium">Erreur de chargement</p>
          <p className="text-red-700 text-sm mt-1">
            {(error as Error).message}
          </p>
        </div>
      </div>
    );
  }

  const statsData = stats as ReportStatistics;
  const activeReports = statsData.pending_reports + statsData.under_review_reports;
  const resolutionRate =
    statsData.total_reports > 0
      ? Math.round((statsData.resolved_reports / statsData.total_reports) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">
                  Tableau de bord Modération
                </h1>
                <p className="text-sm text-neutral-500">
                  Vue d'ensemble de l'activité de modération
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedPeriod('7d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === '7d'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-neutral-500 hover:bg-neutral-100'
                }`}
              >
                7 jours
              </button>
              <button
                onClick={() => setSelectedPeriod('30d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === '30d'
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-neutral-500 hover:bg-neutral-100'
                }`}
              >
                30 jours
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Reports */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Flag className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
                Total
              </span>
            </div>
            <p className="text-3xl font-bold text-neutral-900">
              {statsData.total_reports.toLocaleString()}
            </p>
            <p className="text-sm text-neutral-500 mt-1">Signalements</p>
          </div>

          {/* Active Reports */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                Actif
              </span>
            </div>
            <p className="text-3xl font-bold text-neutral-900">
              {activeReports.toLocaleString()}
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              {statsData.pending_reports} en attente • {statsData.under_review_reports} en cours
            </p>
          </div>

          {/* Urgent Reports */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                Urgent
              </span>
            </div>
            <p className="text-3xl font-bold text-neutral-900">
              {(statsData.urgent_reports + statsData.high_priority_reports).toLocaleString()}
            </p>
            <p className="text-sm text-neutral-500 mt-1">
              {statsData.urgent_reports} urgent • {statsData.high_priority_reports} élevé
            </p>
          </div>

          {/* Resolution Rate */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Taux
              </span>
            </div>
            <p className="text-3xl font-bold text-neutral-900">{resolutionRate}%</p>
            <p className="text-sm text-neutral-500 mt-1">
              {statsData.resolved_reports} résolu{statsData.resolved_reports > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Reports by Type */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6">
              Signalements par type
            </h3>
            <div className="space-y-4">
              {Object.entries(statsData.reports_by_type).map(([type, count]) => {
                const Icon = ENTITY_ICONS[type as keyof typeof ENTITY_ICONS];
                const maxCount = Math.max(...Object.values(statsData.reports_by_type));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg ${ENTITY_COLORS[type as keyof typeof ENTITY_COLORS]} flex items-center justify-center`}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-neutral-700 capitalize">
                          {type === 'property'
                            ? 'Propriétés'
                            : type === 'user'
                            ? 'Utilisateurs'
                            : type === 'message'
                            ? 'Messages'
                            : type === 'review'
                            ? 'Avis'
                            : 'Contrats'}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-neutral-900">
                        {count as number}
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ENTITY_COLORS[type as keyof typeof ENTITY_COLORS]} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reports by Reason */}
          <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
            <h3 className="text-lg font-semibold text-neutral-900 mb-6">
              Principaux motifs
            </h3>
            <div className="space-y-4">
              {Object.entries(statsData.reports_by_reason)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 6)
                .map(([reason, count]) => {
                  const maxCount = Math.max(
                    ...Object.values(statsData.reports_by_reason)
                  );
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

                  const reasonLabels: Record<string, string> = {
                    fake_photos: 'Photos falsifiées',
                    fake_price: 'Prix erroné',
                    scam: 'Arnaque',
                    inappropriate: 'Inapproprié',
                    fake_profile: 'Profil fictif',
                    fake_listing: 'Annonce fictive',
                    harassment: 'Harcèlement',
                    spam: 'Spam',
                  };

                  return (
                    <div key={reason}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-neutral-700">
                          {reasonLabels[reason] || reason}
                        </span>
                        <span className="text-sm font-semibold text-neutral-900">
                          {count as number}
                        </span>
                      </div>
                      <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Priority Queue */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-neutral-900">
              File d'attente prioritaire
            </h3>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-neutral-500">
                {(statsData.urgent_reports + statsData.high_priority_reports).toLocaleString()}{" "}
                prioritaire{statsData.urgent_reports + statsData.high_priority_reports > 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {statsData.urgent_reports + statsData.high_priority_reports > 0 ? (
            <div className="space-y-3">
              {/* Urgent Reports */}
              {statsData.urgent_reports > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-900">
                        {statsData.urgent_reports} signalement{statsData.urgent_reports > 1 ? 's' : ''} urgent{statsData.urgent_reports > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-red-700">
                        Nécessite une action immédiate
                      </p>
                    </div>
                  </div>
                  <a
                    href="/admin/gestion-signalements?priority=urgent"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Voir
                  </a>
                </div>
              )}

              {/* High Priority Reports */}
              {statsData.high_priority_reports > 0 && (
                <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-900">
                        {statsData.high_priority_reports} signalement
                        {statsData.high_priority_reports > 1 ? 's' : ''} priorité élevée
                      </p>
                      <p className="text-sm text-orange-700">
                        À traiter rapidement
                      </p>
                    </div>
                  </div>
                  <a
                    href="/admin/gestion-signalements?priority=high"
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                  >
                    Voir
                  </a>
                </div>
              )}

              {/* Pending Reports */}
              {statsData.pending_reports > 0 && (
                <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-900">
                        {statsData.pending_reports} signalement
                        {statsData.pending_reports > 1 ? 's' : ''} en attente
                      </p>
                      <p className="text-sm text-amber-700">
                        En attente d'assignation
                      </p>
                    </div>
                  </div>
                  <a
                    href="/admin/gestion-signalements?status=pending"
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
                  >
                    Voir
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-neutral-900 font-medium">Tout est calme !</p>
              <p className="text-neutral-500 text-sm mt-1">
                Aucun signalement prioritaire en attente
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/admin/gestion-signalements"
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <Flag className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Tous les signalements</h3>
            <p className="text-blue-100 text-sm">
              Gérer tous les signalements en attente
            </p>
          </a>

          <a
            href="/admin/moderation-avis"
            className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <Star className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Modération des avis</h3>
            <p className="text-yellow-100 text-sm">
              Valider ou modérer les avis clients
            </p>
          </a>

          <a
            href="/admin/gestion-litiges"
            className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <FileText className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-1">Gestion des litiges</h3>
            <p className="text-purple-100 text-sm">
              Traiter les litiges locataires-propriétaires
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
