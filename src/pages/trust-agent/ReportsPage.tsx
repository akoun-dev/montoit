import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Building,
  Scale,
  DollarSign,
  FileText,
  Award,
  Activity,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';

interface TimeRange {
  value: 'week' | 'month' | 'quarter' | 'year';
  label: string;
}

const TIME_RANGES: TimeRange[] = [
  { value: 'week', label: 'Cette semaine' },
  { value: 'month', label: 'Ce mois' },
  { value: 'quarter', label: 'Ce trimestre' },
  { value: 'year', label: 'Cette année' },
];

interface PerformanceMetrics {
  totalMissions: number;
  completedMissions: number;
  pendingMissions: number;
  averageCompletionTime: number;
  satisfactionScore: number;
  totalRevenue: number;
}

interface DisputeMetrics {
  totalDisputes: number;
  resolvedDisputes: number;
  activeDisputes: number;
  escalatedDisputes: number;
  resolutionRate: number;
  averageResolutionTime: number;
}

interface VerificationMetrics {
  propertiesVerified: number;
  usersVerified: number;
  pendingVerifications: number;
  verificationRate: number;
}

interface TrendData {
  label: string;
  value: number;
  change?: number;
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGES[1]); // Default to month
  const [showExportMenu, setShowExportMenu] = useState(false);

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalMissions: 0,
    completedMissions: 0,
    pendingMissions: 0,
    averageCompletionTime: 0,
    satisfactionScore: 0,
    totalRevenue: 0,
  });

  const [disputeMetrics, setDisputeMetrics] = useState<DisputeMetrics>({
    totalDisputes: 0,
    resolvedDisputes: 0,
    activeDisputes: 0,
    escalatedDisputes: 0,
    resolutionRate: 0,
    averageResolutionTime: 0,
  });

  const [verificationMetrics, setVerificationMetrics] = useState<VerificationMetrics>({
    propertiesVerified: 0,
    usersVerified: 0,
    pendingVerifications: 0,
    verificationRate: 0,
  });

  const [missionTrends, setMissionTrends] = useState<TrendData[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<TrendData[]>([]);
  const [disputeTrends, setDisputeTrends] = useState<TrendData[]>([]);

  useEffect(() => {
    loadMetrics();
  }, [timeRange, user]);

  const loadMetrics = async () => {
    try {
      setLoading(true);

      // Calculate date range based on timeRange
      const now = new Date();
      let startDate = new Date();

      switch (timeRange.value) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Load mission metrics
      const { data: missions } = await supabase
        .from('cev_missions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      const completedMissions = missions?.filter((m) => m.status === 'completed') || [];
      const pendingMissions = missions?.filter((m) => m.status === 'pending' || m.status === 'assigned' || m.status === 'in_progress') || [];

      setPerformanceMetrics({
        totalMissions: missions?.length || 0,
        completedMissions: completedMissions.length,
        pendingMissions: pendingMissions.length,
        averageCompletionTime: 2.5, // Placeholder - would calculate from actual data
        satisfactionScore: 4.7, // Placeholder - would come from reviews
        totalRevenue: 450000, // Placeholder - would calculate from payments
      });

      // Load dispute metrics
      const { data: disputes } = await supabase
        .from('disputes' as never)
        .select('*')
        .gte('created_at', startDate.toISOString()) as unknown as { data: { status: string }[] | null; error: unknown };

      const disputesData = disputes || [];
      const resolvedDisputes = disputesData.filter((d) => d.status === 'resolved');
      const activeDisputes = disputesData.filter((d) => d.status === 'under_mediation' || d.status === 'awaiting_response');
      const escalatedDisputes = disputesData.filter((d) => d.status === 'escalated');

      setDisputeMetrics({
        totalDisputes: disputesData.length,
        resolvedDisputes: resolvedDisputes.length,
        activeDisputes: activeDisputes.length,
        escalatedDisputes: escalatedDisputes.length,
        resolutionRate: disputesData.length > 0 ? Math.round((resolvedDisputes.length / disputesData.length) * 100) : 0,
        averageResolutionTime: 3.2, // Placeholder
      });

      // Load verification metrics
      const { data: verifiedProperties } = await supabase
        .from('properties')
        .select('*')
        .eq('ansut_verified', true)
        .gte('ansut_verification_date', startDate.toISOString());

      setVerificationMetrics({
        propertiesVerified: verifiedProperties?.length || 0,
        usersVerified: 28, // Placeholder
        pendingVerifications: 15, // Placeholder
        verificationRate: 85, // Placeholder
      });

      // Generate trend data (simplified)
      const trends = generateTrendData(timeRange.value);
      setMissionTrends(trends.missions);
      setRevenueTrends(trends.revenue);
      setDisputeTrends(trends.disputes);

    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTrendData = (range: string): { missions: TrendData[]; revenue: TrendData[]; disputes: TrendData[] } => {
    // Simplified trend generation - in production, this would aggregate actual data
    const periods = range === 'week' ? 7 : range === 'month' ? 4 : range === 'quarter' ? 12 : 12;

    return {
      missions: Array.from({ length: periods }, (_, i) => ({
        label: range === 'week' ? `Jour ${i + 1}` : range === 'month' ? `Semaine ${i + 1}` : `Mois ${i + 1}`,
        value: Math.floor(Math.random() * 20) + 5,
        change: Math.random() > 0.5 ? Math.random() * 20 : -Math.random() * 10,
      })),
      revenue: Array.from({ length: periods }, (_, i) => ({
        label: range === 'week' ? `Jour ${i + 1}` : range === 'month' ? `Semaine ${i + 1}` : `Mois ${i + 1}`,
        value: Math.floor(Math.random() * 100000) + 50000,
        change: Math.random() > 0.5 ? Math.random() * 15 : -Math.random() * 8,
      })),
      disputes: Array.from({ length: periods }, (_, i) => ({
        label: range === 'week' ? `Jour ${i + 1}` : range === 'month' ? `Semaine ${i + 1}` : `Mois ${i + 1}`,
        value: Math.floor(Math.random() * 8) + 1,
        change: Math.random() > 0.5 ? Math.random() * 10 : -Math.random() * 15,
      })),
    };
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    // In production, this would generate and download the report
    console.log(`Exporting report as ${format}`);
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    change?: number,
    icon: React.ElementType,
    color: string = 'blue'
  ) => {
    const Icon = icon;
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      orange: 'bg-orange-100 text-orange-700',
      purple: 'bg-purple-100 text-purple-700',
      red: 'bg-red-100 text-red-700',
      cyan: 'bg-cyan-100 text-cyan-700',
    };

    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {change !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  {change >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(change)}%
                  </span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTrendChart = (data: TrendData[], color: string, label: string) => {
    const maxValue = Math.max(...data.map((d) => d.value));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{label}</h4>
          <Badge variant="outline">{timeRange.label}</Badge>
        </div>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-16">{item.label}</span>
              <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                <div
                  className={`h-full ${color} transition-all duration-500`}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {item.value}
                </span>
              </div>
              {item.change !== undefined && (
                <span className={`text-xs w-12 text-right ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-purple-600" />
                Rapports et Analytics
              </h1>
              <p className="text-muted-foreground">Suivez vos performances et analysez vos statistiques</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exporter
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg z-10">
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      onClick={() => handleExport('pdf')}
                    >
                      <FileText className="h-4 w-4" />
                      Exporter en PDF
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                      onClick={() => handleExport('excel')}
                    >
                      <BarChart3 className="h-4 w-4" />
                      Exporter en Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Time Range Selector */}
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {TIME_RANGES.map((range) => (
            <Button
              key={range.value}
              variant={timeRange.value === range.value ? 'secondary' : 'outline'}
              size="small"
              onClick={() => setTimeRange(range)}
            >
              {range.label}
            </Button>
          ))}
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="disputes">Litiges</TabsTrigger>
            <TabsTrigger value="verifications">Vérifications</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {renderMetricCard('Total Missions', performanceMetrics.totalMissions, 12, FileText, 'blue')}
              {renderMetricCard('Taux de complétion', `${performanceMetrics.totalMissions > 0 ? Math.round((performanceMetrics.completedMissions / performanceMetrics.totalMissions) * 100) : 0}%`, 8, CheckCircle2, 'green')}
              {renderMetricCard('Litiges résolus', disputeMetrics.resolvedDisputes, -5, Scale, 'purple')}
              {renderMetricCard('Revenus', `${performanceMetrics.totalRevenue.toLocaleString()} FCFA`, 15, DollarSign, 'emerald')}
            </div>

            {/* Performance Overview */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Satisfaction Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Score de Satisfaction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${performanceMetrics.satisfactionScore * 25.13} 251.3`}
                          className="text-amber-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{performanceMetrics.satisfactionScore}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Note moyenne</p>
                      <p className="text-xs text-muted-foreground mt-1">Basée sur les évaluations reçues</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resolution Rate */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    Taux de Résolution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="relative w-24 h-24">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${disputeMetrics.resolutionRate * 2.51} 251.3`}
                          className="text-green-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold">{disputeMetrics.resolutionRate}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Litiges résolus</p>
                      <p className="text-xs text-muted-foreground mt-1">{disputeMetrics.resolvedDisputes} / {disputeMetrics.totalDisputes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Activité Récente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">Missions complétées</p>
                        <p className="text-xs text-muted-foreground">Cette période</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{performanceMetrics.completedMissions}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-medium text-sm">Missions en attente</p>
                        <p className="text-xs text-muted-foreground">Requiert votre attention</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-orange-600">{performanceMetrics.pendingMissions}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">Propriétés vérifiées</p>
                        <p className="text-xs text-muted-foreground">Certification ANSUT</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-green-600">{verificationMetrics.propertiesVerified}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Missions Tab */}
          <TabsContent value="missions" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {renderMetricCard('Total Missions', performanceMetrics.totalMissions, undefined, FileText, 'blue')}
              {renderMetricCard('Complétées', performanceMetrics.completedMissions, 12, CheckCircle2, 'green')}
              {renderMetricCard('En attente', performanceMetrics.pendingMissions, -5, Clock, 'orange')}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tendance des Missions</CardTitle>
              </CardHeader>
              <CardContent>
                {renderTrendChart(missionTrends, 'bg-blue-500', 'Missions par période')}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Détails des Missions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">CEV Complète</p>
                        <p className="text-xs text-muted-foreground">Visite complète du logement</p>
                      </div>
                    </div>
                    <span className="font-semibold">45%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Vérification Photos</p>
                        <p className="text-xs text-muted-foreground">Validation des photos</p>
                      </div>
                    </div>
                    <span className="font-semibold">30%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100">
                        <FileText className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">État des Lieux</p>
                        <p className="text-xs text-muted-foreground">Entrée/Sortie</p>
                      </div>
                    </div>
                    <span className="font-semibold">25%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              {renderMetricCard('Total Litiges', disputeMetrics.totalDisputes, undefined, Scale, 'purple')}
              {renderMetricCard('Résolus', disputeMetrics.resolvedDisputes, 8, CheckCircle2, 'green')}
              {renderMetricCard('Actifs', disputeMetrics.activeDisputes, undefined, AlertTriangle, 'orange')}
              {renderMetricCard('Escaladés', disputeMetrics.escalatedDisputes, -10, AlertTriangle, 'red')}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Tendance des Litiges</CardTitle>
              </CardHeader>
              <CardContent>
                {renderTrendChart(disputeTrends, 'bg-purple-500', 'Nouveaux litiges par période')}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Temps Moyen de Résolution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-purple-600">{disputeMetrics.averageResolutionTime}</p>
                    <p className="text-sm text-muted-foreground mt-2">jours en moyenne</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Taux de Réussite</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <p className="text-4xl font-bold text-green-600">{disputeMetrics.resolutionRate}%</p>
                    <p className="text-sm text-muted-foreground mt-2">des litiges résolus</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Verifications Tab */}
          <TabsContent value="verifications" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {renderMetricCard('Propriétés vérifiées', verificationMetrics.propertiesVerified, 15, Building, 'green')}
              {renderMetricCard('Utilisateurs vérifiés', verificationMetrics.usersVerified, 10, Users, 'blue')}
              {renderMetricCard('En attente', verificationMetrics.pendingVerifications, undefined, Clock, 'orange')}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Taux de Vérification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-muted" />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${verificationMetrics.verificationRate * 3.52} 351.9`}
                        className="text-green-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold">{verificationMetrics.verificationRate}%</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Propriétés certifiées</span>
                      <span className="font-semibold">{verificationMetrics.propertiesVerified}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Utilisateurs certifiés</span>
                      <span className="font-semibold">{verificationMetrics.usersVerified}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">En attente de vérification</span>
                      <span className="font-semibold text-orange-600">{verificationMetrics.pendingVerifications}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
