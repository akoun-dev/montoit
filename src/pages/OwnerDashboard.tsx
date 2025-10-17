import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PropertyStatsCompact } from '@/components/dashboard/PropertyStatsCompact';
import PropertyStats from '@/components/dashboard/PropertyStats';
import ViewsChart from '@/components/dashboard/ViewsChart';
import ApplicationsChart from '@/components/dashboard/ApplicationsChart';
import MarketComparison from '@/components/dashboard/MarketComparison';
import { TopPropertiesTable } from '@/components/dashboard/TopPropertiesTable';
import { PropertyPerformanceTable } from '@/components/dashboard/PropertyPerformanceTable';
import { UrgentActionsCardCompact } from '@/components/dashboard/UrgentActionsCardCompact';
import RevenueForecast from '@/components/dashboard/RevenueForecast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicBreadcrumb } from '@/components/navigation/DynamicBreadcrumb';
import { RefreshCw, Eye, Download, FileText, BarChart3 } from 'lucide-react';
import { StickyHeader } from '@/components/ui/sticky-header';
import { toast } from 'sonner';
import { logger } from '@/services/logger';
import { useOwnerAnalytics } from '@/hooks/useOwnerAnalytics';

const OwnerDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { analytics, stats: analyticsStats, loading: analyticsLoading } = useOwnerAnalytics();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalViews: 0,
    totalFavorites: 0,
    totalApplications: 0,
    averageRent: 0,
    occupancyRate: 0,
  });
  
  const [viewsData, setViewsData] = useState<Array<{ date: string; views: number; favorites: number }>>([]);
  const [applicationsData, setApplicationsData] = useState<Array<{ property: string; pending: number; approved: number; rejected: number }>>([]);
  const [marketData, setMarketData] = useState<Array<{ propertyType: string; myAverage: number; marketAverage: number; difference: number; trend: 'up' | 'down' | 'neutral' }>>([]);
  const [topProperties, setTopProperties] = useState<Array<{ id: string; title: string; views: number; favorites: number; applications: number; conversionRate: number }>>([]);
  const [urgentActions, setUrgentActions] = useState<Array<{ id: string; type: 'overdue_application' | 'expiring_lease' | 'incomplete_property'; title: string; description: string; priority: 'critical' | 'important' | 'info'; link: string; daysOverdue?: number }>>([]);
  const [reports, setReports] = useState<Array<{
    id: string;
    period_start: string;
    period_end: string;
    report_type: string;
    generated_at: string;
    period_label: string;
    report_data: any;
  }>>([]);

  useEffect(() => {
    if (user && profile) {
      fetchDashboardData();
    }
  }, [user, profile]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch properties
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id);

      if (propertiesError) throw propertiesError;

      // Fetch all properties for market comparison
      const { data: allProperties } = await supabase
        .from('properties')
        .select('property_type, monthly_rent');

      // Fetch favorites count
      const { data: favorites } = await supabase
        .from('user_favorites')
        .select('property_id')
        .in('property_id', properties?.map(p => p.id) || []);

      // Fetch applications
      const { data: applications } = await supabase
        .from('rental_applications')
        .select('property_id, status, created_at')
        .in('property_id', properties?.map(p => p.id) || []);

      // Calculate stats
      const totalProperties = properties?.length || 0;
      const totalViews = properties?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
      const totalFavorites = favorites?.length || 0;
      const totalApplications = applications?.length || 0;
      const averageRent = properties?.reduce((sum, p) => sum + p.monthly_rent, 0) / Math.max(totalProperties, 1) || 0;
      const occupiedProperties = properties?.filter(p => p.status === 'loué').length || 0;
      const occupancyRate = Math.round((occupiedProperties / Math.max(totalProperties, 1)) * 100);

      setStats({
        totalProperties,
        totalViews,
        totalFavorites,
        totalApplications,
        averageRent: Math.round(averageRent),
        occupancyRate,
      });

      // Generate mock views data (last 30 days)
      const viewsChartData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          views: Math.floor(Math.random() * 50) + 10,
          favorites: Math.floor(Math.random() * 10) + 2,
        };
      });
      setViewsData(viewsChartData);

      // Applications by property
      const applicationsChart = properties?.slice(0, 5).map(property => {
        const propertyApps = applications?.filter(a => a.property_id === property.id) || [];
        return {
          property: property.title.slice(0, 20) + (property.title.length > 20 ? '...' : ''),
          pending: propertyApps.filter(a => a.status === 'pending').length,
          approved: propertyApps.filter(a => a.status === 'approved').length,
          rejected: propertyApps.filter(a => a.status === 'rejected').length,
        };
      }) || [];
      setApplicationsData(applicationsChart);

      // Market comparison
      const propertyTypes = [...new Set(properties?.map(p => p.property_type) || [])];
      const marketComparison = propertyTypes.map(type => {
        const myProperties = properties?.filter(p => p.property_type === type) || [];
        const myAverage = myProperties.reduce((sum, p) => sum + p.monthly_rent, 0) / Math.max(myProperties.length, 1);
        
        const marketProperties = allProperties?.filter(p => p.property_type === type) || [];
        const marketAverage = marketProperties.reduce((sum, p) => sum + p.monthly_rent, 0) / Math.max(marketProperties.length, 1);
        
        const difference = Math.round(((myAverage - marketAverage) / marketAverage) * 100);
        
        return {
          propertyType: type.charAt(0).toUpperCase() + type.slice(1),
          myAverage: Math.round(myAverage),
          marketAverage: Math.round(marketAverage),
          difference,
          trend: (difference > 5 ? 'up' : difference < -5 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
        };
      });
      setMarketData(marketComparison);

      // Top performing properties
      const propertiesWithMetrics = properties?.map(property => {
        const propertyFavorites = favorites?.filter(f => f.property_id === property.id).length || 0;
        const propertyApps = applications?.filter(a => a.property_id === property.id).length || 0;
        const conversionRate = property.view_count > 0 
          ? Math.round((propertyApps / property.view_count) * 100) 
          : 0;
        
        return {
          id: property.id,
          title: property.title,
          views: property.view_count || 0,
          favorites: propertyFavorites,
          applications: propertyApps,
          conversionRate,
        };
      }).sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 5) || [];
      
      setTopProperties(propertiesWithMetrics);

      // Generate urgent actions
      const actions: Array<{ id: string; type: 'overdue_application' | 'expiring_lease' | 'incomplete_property'; title: string; description: string; priority: 'critical' | 'important' | 'info'; link: string; daysOverdue?: number }> = [];
      
      // Check overdue applications (>48h)
      const now = new Date();
      const overdueApps = applications?.filter(app => {
        if (app.status !== 'pending') return false;
        const createdAt = new Date(app.created_at);
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        return hoursDiff > 48;
      }) || [];

      if (overdueApps.length > 0) {
        actions.push({
          id: 'overdue-apps',
          type: 'overdue_application',
          title: `${overdueApps.length} candidature${overdueApps.length > 1 ? 's' : ''} en attente`,
          description: 'Des candidatures attendent une réponse depuis plus de 48h',
          priority: 'critical',
          link: '/applications',
          daysOverdue: Math.floor(Math.max(...overdueApps.map(app => {
            const createdAt = new Date(app.created_at);
            return (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          }))),
        });
      }

      // Check incomplete properties
      const incompleteProperties = properties?.filter(p => 
        !p.main_image || !p.description || p.description.length < 50
      ) || [];

      if (incompleteProperties.length > 0) {
        actions.push({
          id: 'incomplete-props',
          type: 'incomplete_property',
          title: `${incompleteProperties.length} bien${incompleteProperties.length > 1 ? 's' : ''} incomplet${incompleteProperties.length > 1 ? 's' : ''}`,
          description: 'Ajoutez photos et descriptions pour améliorer vos annonces',
          priority: 'important',
          link: '/my-properties',
        });
      }

      setUrgentActions(actions);

      // Fetch report history
      const { data: reportHistory } = await supabase
        .from('report_history')
        .select('*')
        .eq('owner_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(12);

      if (reportHistory) {
        const formattedReports = reportHistory.map(report => ({
          ...report,
          period_label: `${new Date(report.period_start).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} - ${new Date(report.period_end).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
        }));
        setReports(formattedReports);
      }

    } catch (error) {
      logger.logError(error, { context: 'OwnerDashboard', action: 'fetchDashboardData' });
    } finally {
      setLoading(false);
    }
  };

  const viewReport = (report: any) => {
    toast.info('Prévisualisation du rapport', {
      description: `Rapport ${report.report_type} - ${report.period_label}`
    });
  };

  const downloadReport = (report: any) => {
    const blob = new Blob([JSON.stringify(report.report_data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${report.report_type}-${report.period_start}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport téléchargé');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile || (profile.user_type !== 'proprietaire' && profile.user_type !== 'agence')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="max-w-7xl mx-auto space-y-4">
          <DynamicBreadcrumb />
          <StickyHeader className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Tableau de Bord</h1>
              <p className="text-sm text-muted-foreground">
                Analysez les performances de vos biens
              </p>
            </div>
            <Button onClick={fetchDashboardData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </StickyHeader>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Stats Overview Compact */}
              <PropertyStatsCompact stats={stats} />

          {/* Urgent Actions + Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <UrgentActionsCardCompact className="lg:col-span-1" />
            <div className="lg:col-span-2 grid grid-cols-2 gap-4 h-[320px]">
              <ViewsChart data={viewsData} className="h-full" />
              <ApplicationsChart data={applicationsData} className="h-full" />
            </div>
          </div>

          {/* Revenue & Market Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[280px]">
            <RevenueForecast 
              currentRevenue={stats.averageRent * stats.totalProperties} 
              occupancyRate={stats.occupancyRate}
              className="h-full"
            />
            <MarketComparison data={marketData} className="h-full" />
          </div>

          {/* Top Properties Table */}
          <TopPropertiesTable properties={topProperties} />

              {/* Report History */}
              {reports.length > 0 && (
                <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Historique des Rapports
                </CardTitle>
                <CardDescription>
                  Consultez vos rapports de performance des 12 derniers mois
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Période</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Généré le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {report.period_label}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {report.report_type === 'monthly' ? 'Mensuel' : 
                             report.report_type === 'quarterly' ? 'Trimestriel' : 'Annuel'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(report.generated_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => viewReport(report)}
                            title="Voir le rapport"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => downloadReport(report)}
                            title="Télécharger"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {/* Analytics KPIs */}
              <PropertyStats
                stats={{
                  totalProperties: analyticsStats?.total_properties || 0,
                  totalViews: analyticsStats?.total_views_7d || 0,
                  totalFavorites: 0,
                  totalApplications: analyticsStats?.total_applications || 0,
                  averageRent: 0,
                  occupancyRate: analyticsStats?.avg_conversion_rate || 0
                }}
              />

              {/* Charts Grid */}
              <div className="grid gap-6 lg:grid-cols-3">
                <ViewsChart data={[]} loading={analyticsLoading} className="lg:col-span-2" />
              </div>

              {/* Performance Table */}
              <PropertyPerformanceTable properties={analytics} loading={analyticsLoading} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OwnerDashboard;
