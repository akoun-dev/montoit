/**
 * AnalyticsPage - Complete analytics dashboard with charts and statistics
 */

import { useState } from 'react';
import {
  BarChart3,
  Users,
  Home,
  CreditCard,
  RefreshCw,
  Download,
  TrendingUp,
  Building,
  Wallet,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import {
  StatCard,
  AnalyticsLineChart,
  AnalyticsBarChart,
  AnalyticsPieChart,
  AnalyticsAreaChart,
} from '@/shared/ui/charts';
import { useAnalytics } from '@/hooks/shared/useAnalytics';
import type { AnalyticsPeriod } from '@/types/analytics.types';

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '3 mois' },
  { value: '1y', label: '1 an' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d');
  const { overview, users, properties, transactions, isLoading, refetch } = useAnalytics(period);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">Statistiques et performances de la plateforme</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex rounded-lg border border-border bg-card p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  period === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button variant="outline" size="small" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button variant="outline" size="small">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Utilisateurs"
          value={overview?.totalUsers ?? 0}
          icon={Users}
          growth={overview?.usersGrowth}
        />
        <StatCard
          title="Propriétés"
          value={overview?.totalProperties ?? 0}
          icon={Home}
          growth={overview?.propertiesGrowth}
        />
        <StatCard
          title="Contrats"
          value={overview?.totalContracts ?? 0}
          icon={Building}
          growth={overview?.contractsGrowth}
        />
        <StatCard
          title="Revenus"
          value={formatCurrency(overview?.totalRevenue ?? 0)}
          icon={CreditCard}
          growth={overview?.revenueGrowth}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4 hidden sm:inline" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4 hidden sm:inline" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="properties" className="gap-2">
            <Home className="h-4 w-4 hidden sm:inline" />
            Propriétés
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-2">
            <Wallet className="h-4 w-4 hidden sm:inline" />
            Finance
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <AnalyticsLineChart
                data={users?.monthlyRegistrations ?? []}
                title="Inscriptions mensuelles"
                color="hsl(var(--primary))"
              />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <AnalyticsPieChart
                data={users?.byType ?? []}
                title="Répartition des utilisateurs"
                donut
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <AnalyticsBarChart
              data={properties?.byCity ?? []}
              title="Propriétés par ville"
              horizontal
              height={250}
            />
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Utilisateurs actifs</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{users?.activeUsers ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Taux de vérification</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {users?.verificationRate ?? 0}%
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Nouveaux ce mois</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {users?.monthlyRegistrations?.[users.monthlyRegistrations.length - 1]?.value ?? 0}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <AnalyticsAreaChart
                data={users?.monthlyRegistrations ?? []}
                title="Évolution des inscriptions"
                gradient
              />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <AnalyticsPieChart data={users?.byType ?? []} title="Types d'utilisateurs" />
            </div>
          </div>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Total propriétés</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {overview?.totalProperties ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Taux d'occupation</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {properties?.occupancyRate ?? 0}%
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Nouvelles ce mois</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {properties?.monthlyListings?.[properties.monthlyListings.length - 1]?.value ?? 0}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <AnalyticsLineChart
                data={properties?.monthlyListings ?? []}
                title="Publications mensuelles"
              />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <AnalyticsBarChart
                data={properties?.byCity ?? []}
                title="Top villes"
                horizontal
                height={250}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <AnalyticsPieChart data={properties?.byType ?? []} title="Types de biens" />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <AnalyticsPieChart data={properties?.byStatus ?? []} title="Statuts des propriétés" />
            </div>
          </div>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Revenus totaux</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {formatCurrency(transactions?.totalCompleted ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">En attente</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">
                {formatCurrency(transactions?.totalPending ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Ce mois</p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {formatCurrency(
                  transactions?.monthlyRevenue?.[transactions.monthlyRevenue.length - 1]?.value ?? 0
                )}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <AnalyticsAreaChart
              data={transactions?.monthlyRevenue ?? []}
              title="Revenus mensuels"
              color="hsl(var(--chart-2))"
              height={350}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <AnalyticsPieChart
                data={transactions?.byPaymentMethod ?? []}
                title="Méthodes de paiement"
              />
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <AnalyticsPieChart
                data={transactions?.byStatus ?? []}
                title="Statuts des paiements"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
