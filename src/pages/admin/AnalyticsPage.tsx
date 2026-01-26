/**
 * AnalyticsPage - Page d'analyse admin avec graphiques et statistiques
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useAnalytics } from '@/features/admin/hooks/useAnalytics';
import { AdminPeriod } from '@/types/admin';
import { FormatService } from '@/services/format/formatService';
import { AnalyticsLineChart, AnalyticsBarChart, AnalyticsPieChart, StatCard } from '@/shared/ui/charts';
import { AdminPageHeader, ExportButton } from '@/shared/ui/admin';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Users, Home, FileText, DollarSign, Activity, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<AdminPeriod>('30d');
  const [exporting, setExporting] = useState(false);

  const { data: analytics, isLoading, error, getGrowthRate } = useAnalytics(selectedPeriod);

  // Vérification accès admin
  const userType = profile?.user_type?.toLowerCase();
  const isAdmin = userType === 'admin_ansut' || userType === 'admin';

  if (!isAdmin) {
    navigate('/');
    return null;
  }

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    setExporting(true);
    try {
      // TODO: Implémenter l'export réel
      console.log(`Exporting as ${format}`);
    } finally {
      setExporting(false);
    }
  };

  const periods: { value: AdminPeriod; label: string }[] = [
    { value: '24h', label: '24 heures' },
    { value: '7d', label: '7 jours' },
    { value: '30d', label: '30 jours' },
    { value: '90d', label: '90 jours' },
    { value: '1y', label: '1 an' },
    { value: 'all', label: 'Tout' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#F16522] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl text-[#6B5A4E]">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-[#FAF7F4] p-6">
        <div className="w-full">
          <div className="bg-white rounded-2xl border border-red-200 p-8 text-center">
            <p className="text-red-600">Erreur lors du chargement des données: {error?.message || 'Erreur inconnue'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { currentPeriod, previousPeriod, userGrowth, propertyMetrics, transactionMetrics, systemMetrics } = analytics;

  // Calcul des indicateurs de croissance
  const newUserGrowth = getGrowthRate(currentPeriod.newUsers, previousPeriod?.newUsers);
  const newPropertyGrowth = getGrowthRate(currentPeriod.newProperties, previousPeriod?.newProperties);
  const transactionGrowth = getGrowthRate(currentPeriod.totalTransactions, previousPeriod?.totalTransactions);
  const revenueGrowth = getGrowthRate(currentPeriod.totalRevenue, previousPeriod?.totalRevenue);

  // Données pour les graphiques
  const userGrowthData = userGrowth.byDay.map((d) => ({
    label: d.label,
    value: d.value,
  }));

  const userTypeData = [
    { label: 'Locataires', value: userGrowth.byType.locataires, color: '#22c55e' },
    { label: 'Propriétaires', value: userGrowth.byType.proprietaires, color: '#3b82f6' },
    { label: 'Agences', value: userGrowth.byType.agences, color: '#f59e0b' },
    { label: 'Trust Agents', value: userGrowth.byType.trust_agents, color: '#06b6d4' },
    { label: 'Admins', value: userGrowth.byType.admins, color: '#8b5cf6' },
  ];

  const propertyStatusData = [
    { label: 'Disponible', value: propertyMetrics.byStatus.available, color: '#22c55e' },
    { label: 'Loué', value: propertyMetrics.byStatus.rented, color: '#3b82f6' },
    { label: 'Indisponible', value: propertyMetrics.byStatus.unavailable, color: '#6b7280' },
    { label: 'En attente', value: propertyMetrics.byStatus.pending, color: '#f59e0b' },
  ];

  const transactionStatusData = [
    { label: 'Complété', value: transactionMetrics.byStatus.completed, color: '#22c55e' },
    { label: 'En attente', value: transactionMetrics.byStatus.pending, color: '#f59e0b' },
    { label: 'En cours', value: transactionMetrics.byStatus.processing, color: '#3b82f6' },
    { label: 'Échoué', value: transactionMetrics.byStatus.failed, color: '#ef4444' },
    { label: 'Remboursé', value: transactionMetrics.byStatus.refunded, color: '#8b5cf6' },
  ];

  const revenueData = transactionMetrics.byMonth.map((d) => ({
    label: d.label,
    value: d.value,
  }));

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      {/* Header */}
      <div className="bg-[#2C1810]">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-[#F16522]" />
                Analytics
              </h1>
              <p className="text-[#E8D4C5] mt-1">Analyse détaillée de la plateforme</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as AdminPeriod)}
                className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
              >
                {periods.map((period) => (
                  <option key={period.value} value={period.value} className="text-[#2C1810]">
                    {period.label}
                  </option>
                ))}
              </select>
              <ExportButton onExport={handleExport} loading={exporting} />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPIs Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Nouveaux Utilisateurs"
            value={currentPeriod.newUsers}
            change={newUserGrowth}
            icon={Users}
            color="text-[#F16522]"
            bgColor="bg-[#FFF5F0]"
          />
          <StatCard
            title="Nouvelles Propriétés"
            value={currentPeriod.newProperties}
            change={newPropertyGrowth}
            icon={Home}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <StatCard
            title="Transactions"
            value={currentPeriod.totalTransactions}
            change={transactionGrowth}
            icon={FileText}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            title="Revenus"
            value={FormatService.formatCurrency(currentPeriod.totalRevenue)}
            change={revenueGrowth}
            icon={DollarSign}
            color="text-[#F16522]"
            bgColor="bg-[#FFF5F0]"
          />
        </div>

        {/* User Growth Chart */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
          <h3 className="text-lg font-bold text-[#2C1810] mb-6 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#F16522]" />
            Croissance des Utilisateurs
          </h3>
          <AnalyticsLineChart data={userGrowthData} color="#F16522" height={300} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Type Distribution */}
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <h3 className="text-lg font-bold text-[#2C1810] mb-6">Répartition par Type</h3>
            <AnalyticsPieChart data={userTypeData} height={280} />
          </div>

          {/* Property Status */}
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <h3 className="text-lg font-bold text-[#2C1810] mb-6">Statut des Propriétés</h3>
            <AnalyticsPieChart data={propertyStatusData} height={280} />
          </div>
        </div>

        {/* Top Cities */}
        {propertyMetrics.byCity.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <h3 className="text-lg font-bold text-[#2C1810] mb-6">Top Villes</h3>
            <div className="space-y-4">
              {propertyMetrics.byCity.slice(0, 10).map((city) => (
                <div key={city.city} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#2C1810]">{city.city}</span>
                      <span className="text-sm text-[#6B5A4E]">{city.count} propriétés</span>
                    </div>
                    <div className="w-full bg-[#FAF7F4] rounded-full h-2">
                      <div
                        className="bg-[#F16522] h-2 rounded-full transition-all"
                        style={{ width: `${city.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[#6B5A4E] w-12 text-right">{city.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction Trends */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
          <h3 className="text-lg font-bold text-[#2C1810] mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#F16522]" />
            Tendance des Transactions
          </h3>
          <AnalyticsBarChart data={revenueData} color="#F16522" height={280} />
        </div>

        {/* Transaction Status */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
          <h3 className="text-lg font-bold text-[#2C1810] mb-6">Statut des Transactions</h3>
          <AnalyticsPieChart data={transactionStatusData} height={280} />
        </div>

        {/* Transaction Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-[#6B5A4E]">Total Transactions</p>
                <p className="text-2xl font-bold text-[#2C1810]">{FormatService.formatCurrency(transactionMetrics.totalAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-[#6B5A4E]">Montant Moyen</p>
                <p className="text-2xl font-bold text-[#2C1810]">{FormatService.formatCurrency(transactionMetrics.averageAmount)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-[#6B5A4E]">Taux de Complétion</p>
                <p className="text-2xl font-bold text-[#2C1810]">{transactionMetrics.completionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Metrics */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
          <h3 className="text-lg font-bold text-[#2C1810] mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#F16522]" />
            Métriques Système
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{systemMetrics.uptime.toFixed(1)}%</p>
              <p className="text-sm text-[#6B5A4E] mt-1">Disponibilité</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{systemMetrics.errorRate.toFixed(2)}%</p>
              <p className="text-sm text-[#6B5A4E] mt-1">Taux d'erreur</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{systemMetrics.avgResponseTime}ms</p>
              <p className="text-sm text-[#6B5A4E] mt-1">Temps de réponse</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{systemMetrics.memoryUsage}%</p>
              <p className="text-sm text-[#6B5A4E] mt-1">Utilisation mémoire</p>
            </div>
          </div>
        </div>

        {/* Comparison with Previous Period */}
        {previousPeriod && (
          <div className="bg-white rounded-2xl border border-[#EFEBE9] p-6">
            <h3 className="text-lg font-bold text-[#2C1810] mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#F16522]" />
              Comparaison avec la Période Précédente
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#EFEBE9]">
                    <th className="text-left p-4 text-sm font-semibold text-[#6B5A4E]">Métrique</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#6B5A4E]">Période Actuelle</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#6B5A4E]">Période Précédente</th>
                    <th className="text-right p-4 text-sm font-semibold text-[#6B5A4E]">Évolution</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#EFEBE9]">
                    <td className="p-4 text-sm text-[#2C1810]">Nouveaux Utilisateurs</td>
                    <td className="p-4 text-sm text-right text-[#2C1810]">{currentPeriod.newUsers}</td>
                    <td className="p-4 text-sm text-right text-[#6B5A4E]">{previousPeriod.newUsers}</td>
                    <td className="p-4 text-sm text-right">
                      <span className={`inline-flex items-center gap-1 ${newUserGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {newUserGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {Math.abs(newUserGrowth).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-[#EFEBE9]">
                    <td className="p-4 text-sm text-[#2C1810]">Nouvelles Propriétés</td>
                    <td className="p-4 text-sm text-right text-[#2C1810]">{currentPeriod.newProperties}</td>
                    <td className="p-4 text-sm text-right text-[#6B5A4E]">{previousPeriod.newProperties}</td>
                    <td className="p-4 text-sm text-right">
                      <span className={`inline-flex items-center gap-1 ${newPropertyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {newPropertyGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {Math.abs(newPropertyGrowth).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-[#EFEBE9]">
                    <td className="p-4 text-sm text-[#2C1810]">Transactions</td>
                    <td className="p-4 text-sm text-right text-[#2C1810]">{currentPeriod.totalTransactions}</td>
                    <td className="p-4 text-sm text-right text-[#6B5A4E]">{previousPeriod.totalTransactions}</td>
                    <td className="p-4 text-sm text-right">
                      <span className={`inline-flex items-center gap-1 ${transactionGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transactionGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {Math.abs(transactionGrowth).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 text-sm text-[#2C1810]">Revenus</td>
                    <td className="p-4 text-sm text-right text-[#2C1810]">{FormatService.formatCurrency(currentPeriod.totalRevenue)}</td>
                    <td className="p-4 text-sm text-right text-[#6B5A4E]">{FormatService.formatCurrency(previousPeriod.totalRevenue)}</td>
                    <td className="p-4 text-sm text-right">
                      <span className={`inline-flex items-center gap-1 ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {revenueGrowth >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {Math.abs(revenueGrowth).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
