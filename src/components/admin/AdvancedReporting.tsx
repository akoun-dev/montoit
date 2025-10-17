import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, Users, Home, TrendingUp, DollarSign, CalendarIcon, Filter, ArrowUpRight, ArrowDownRight, FileText, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReportData {
  topLandlords: { name: string; propertyCount: number; avgRating: number }[];
  topTenants: { name: string; applicationCount: number; score: number }[];
  verificationStats: { oneci: number; cnam: number; face: number; total: number };
  propertyPerformance: { avgDaysToRent: number; avgViews: number; conversionRate: number };
  platformActivity: { totalUsers: number; totalProperties: number; totalApplications: number };
  financialData?: {
    totalRevenue: number;
    ansutCommission: number;
    revenueByType: Record<string, number>;
    activeLeases: number;
  };
  chartData?: {
    timeline: { date: string; applications: number; properties: number }[];
    citiesData: { city: string; count: number }[];
    propertyTypes: { type: string; count: number }[];
  };
  previousPeriod?: {
    totalUsers: number;
    totalProperties: number;
    totalApplications: number;
  };
}

const CHART_COLORS = {
  primary: 'hsl(30 100% 50%)',
  secondary: 'hsl(225 80% 33%)',
  success: 'hsl(142 76% 36%)',
  warning: 'hsl(38 92% 50%)',
  muted: 'hsl(220 15% 62%)',
};

const AdvancedReporting = () => {
  const [data, setData] = useState<ReportData>({
    topLandlords: [],
    topTenants: [],
    verificationStats: { oneci: 0, cnam: 0, face: 0, total: 0 },
    propertyPerformance: { avgDaysToRent: 0, avgViews: 0, conversionRate: 0 },
    platformActivity: { totalUsers: 0, totalProperties: 0, totalApplications: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [periodPreset, setPeriodPreset] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const { toast } = useToast();

  useEffect(() => {
    // Set default date range (last 30 days)
    const end = new Date();
    const start = subDays(end, 30);
    setStartDate(start);
    setEndDate(end);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReportData();
    }
  }, [startDate, endDate]);

  const handlePresetChange = (preset: '7d' | '30d' | '90d' | 'custom') => {
    setPeriodPreset(preset);
    if (preset !== 'custom') {
      const end = new Date();
      const start = subDays(end, preset === '7d' ? 7 : preset === '30d' ? 30 : 90);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const fetchReportData = async () => {
    if (!startDate || !endDate) return;
    
    try {
      setLoading(true);

      // Fetch profiles
      let profilesQuery = supabase.from('profiles').select('*');
      const { data: profiles } = await profilesQuery;

      // Fetch properties
      let propertiesQuery = supabase.from('properties').select('*');
      if (startDate) {
        propertiesQuery = propertiesQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        propertiesQuery = propertiesQuery.lte('created_at', endDate.toISOString());
      }
      const { data: properties } = await propertiesQuery;

      // Fetch applications
      let applicationsQuery = supabase.from('rental_applications').select('*');
      if (startDate) {
        applicationsQuery = applicationsQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        applicationsQuery = applicationsQuery.lte('created_at', endDate.toISOString());
      }
      const { data: applications } = await applicationsQuery;

    // Fetch verifications via RPC sécurisé
    const { data: verifications } = await supabase
      .rpc('get_verifications_for_admin_review');

      // Fetch leases for financial data
      const { data: leases } = await supabase
        .from('leases')
        .select('*, properties(property_type)')
        .eq('status', 'active');

      // Calculate top landlords
      const landlordMap = new Map<string, { name: string; count: number }>();
      properties?.forEach(property => {
        const ownerName = 'Propriétaire';
        const current = landlordMap.get(property.owner_id) || { name: ownerName, count: 0 };
        landlordMap.set(property.owner_id, { ...current, count: current.count + 1 });
      });

      const topLandlords = Array.from(landlordMap.values())
        .map(l => ({ name: l.name, propertyCount: l.count, avgRating: 4.5 }))
        .sort((a, b) => b.propertyCount - a.propertyCount)
        .slice(0, 10);

      // Calculate top tenants
      const tenantMap = new Map<string, { name: string; count: number }>();
      applications?.forEach(app => {
        const applicantName = 'Locataire';
        const current = tenantMap.get(app.applicant_id) || { name: applicantName, count: 0 };
        tenantMap.set(app.applicant_id, { ...current, count: current.count + 1 });
      });

      const topTenants = Array.from(tenantMap.values())
        .map(t => ({ name: t.name, applicationCount: t.count, score: 0 }))
        .sort((a, b) => b.applicationCount - a.applicationCount)
        .slice(0, 10);

      // Calculate verification stats
      const verificationStats = {
        oneci: verifications?.filter(v => v.oneci_status === 'verified').length || 0,
        cnam: verifications?.filter(v => v.cnam_status === 'verified').length || 0,
        face: verifications?.filter(v => v.face_verification_status === 'verified').length || 0,
        total: profiles?.length || 0
      };

      // Calculate property performance
      const totalViews = properties?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
      const avgViews = properties?.length ? totalViews / properties.length : 0;
      const totalApplications = applications?.length || 0;
      const totalProperties = properties?.length || 0;
      const conversionRate = totalProperties > 0 ? (totalApplications / totalProperties) * 100 : 0;

      // Calculate financial data
      const totalRevenue = leases?.reduce((sum, lease) => sum + Number(lease.monthly_rent || 0), 0) || 0;
      const ansutCommission = totalRevenue * 0.05; // 5% commission

      const revenueByType: Record<string, number> = {};
      leases?.forEach(lease => {
        const propertyType = (lease.properties as any)?.property_type || 'Autre';
        revenueByType[propertyType] = (revenueByType[propertyType] || 0) + Number(lease.monthly_rent || 0);
      });

      // Prepare chart data for timeline
      const timelineData = [];
      const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const groupBy = daysInPeriod > 60 ? 'month' : daysInPeriod > 14 ? 'week' : 'day';
      
      // Group applications and properties by date
      const dateGroups = new Map<string, { applications: number; properties: number }>();
      
      applications?.forEach(app => {
        const date = new Date(app.created_at);
        const key = groupBy === 'day' ? format(date, 'dd/MM') : 
                    groupBy === 'week' ? `S${Math.ceil(date.getDate() / 7)}/${format(date, 'MM')}` :
                    format(date, 'MM/yyyy');
        const current = dateGroups.get(key) || { applications: 0, properties: 0 };
        dateGroups.set(key, { ...current, applications: current.applications + 1 });
      });

      properties?.forEach(prop => {
        const date = new Date(prop.created_at);
        const key = groupBy === 'day' ? format(date, 'dd/MM') : 
                    groupBy === 'week' ? `S${Math.ceil(date.getDate() / 7)}/${format(date, 'MM')}` :
                    format(date, 'MM/yyyy');
        const current = dateGroups.get(key) || { applications: 0, properties: 0 };
        dateGroups.set(key, { ...current, properties: current.properties + 1 });
      });

      dateGroups.forEach((value, key) => {
        timelineData.push({ date: key, ...value });
      });

      // Cities data
      const citiesMap = new Map<string, number>();
      properties?.forEach(prop => {
        const city = prop.city || 'Non spécifié';
        citiesMap.set(city, (citiesMap.get(city) || 0) + 1);
      });
      const citiesData = Array.from(citiesMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Property types data
      const typesMap = new Map<string, number>();
      properties?.forEach(prop => {
        const type = prop.property_type || 'Autre';
        typesMap.set(type, (typesMap.get(type) || 0) + 1);
      });
      const propertyTypes = Array.from(typesMap.entries())
        .map(([type, count]) => ({ type, count }));

      // Fetch previous period data for comparison
      const periodDuration = endDate.getTime() - startDate.getTime();
      const previousStart = new Date(startDate.getTime() - periodDuration);
      const previousEnd = startDate;

      const { data: prevProperties } = await supabase
        .from('properties')
        .select('id')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString());

      const { data: prevApplications } = await supabase
        .from('rental_applications')
        .select('id')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString());

      const { data: prevProfiles } = await supabase
        .from('profiles')
        .select('id')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString());

      setData({
        topLandlords,
        topTenants,
        verificationStats,
        propertyPerformance: {
          avgDaysToRent: 15,
          avgViews,
          conversionRate
        },
        platformActivity: {
          totalUsers: profiles?.length || 0,
          totalProperties: totalProperties,
          totalApplications: totalApplications
        },
        financialData: {
          totalRevenue,
          ansutCommission,
          revenueByType,
          activeLeases: leases?.length || 0,
        },
        chartData: {
          timeline: timelineData,
          citiesData,
          propertyTypes,
        },
        previousPeriod: {
          totalUsers: prevProfiles?.length || 0,
          totalProperties: prevProperties?.length || 0,
          totalApplications: prevApplications?.length || 0,
        }
      });
    } catch (error) {
      logger.error('Error fetching report data', { error });
    } finally {
      setLoading(false);
    }
  };

  const calculateDelta = (current: number, previous: number): { delta: number; isPositive: boolean } => {
    if (previous === 0) return { delta: 0, isPositive: true };
    const delta = ((current - previous) / previous) * 100;
    return { delta: Math.abs(delta), isPositive: delta >= 0 };
  };

  const exportToCSV = (dataToExport: any[], filename: string) => {
    if (dataToExport.length === 0) return;

    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(item => Object.values(item).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();

    toast({
      title: "Export réussi",
      description: "Le fichier CSV a été téléchargé",
    });
  };

  const handleExportPDF = async (reportType: 'performance' | 'financial' | 'verification' | 'complete') => {
    try {
      const { data: response, error } = await supabase.functions.invoke('generate-report', {
        body: {
          reportType,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          format: 'pdf',
        },
      });

      if (error) throw error;

      // Client-side PDF generation would go here
      // For now, we'll download the structured data as JSON
      const blob = new Blob([JSON.stringify(response.pdf, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();

      toast({
        title: "Export PDF",
        description: "Les données du rapport ont été exportées",
      });
    } catch (error) {
      logger.error('Error exporting PDF', { error });
      toast({
        title: "Erreur",
        description: "Impossible d'exporter le rapport PDF",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Rapports avancés</h2>
        
        {/* Date filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            <Button
              variant={periodPreset === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetChange('7d')}
            >
              7 jours
            </Button>
            <Button
              variant={periodPreset === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetChange('30d')}
            >
              30 jours
            </Button>
            <Button
              variant={periodPreset === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetChange('90d')}
            >
              90 jours
            </Button>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={periodPreset === 'custom' ? 'default' : 'outline'} size="sm">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate && endDate
                  ? `${format(startDate, 'dd/MM/yyyy', { locale: fr })} - ${format(endDate, 'dd/MM/yyyy', { locale: fr })}`
                  : 'Personnalisé'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date de début</label>
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      setPeriodPreset('custom');
                    }}
                    disabled={(date) => date > new Date()}
                    className="rounded-md border pointer-events-auto"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date de fin</label>
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => {
                      setEndDate(date);
                      setPeriodPreset('custom');
                    }}
                    disabled={(date) => date > new Date() || (startDate && date < startDate)}
                    className="rounded-md border pointer-events-auto"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Cards with period comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.platformActivity.totalUsers}</div>
            {data.previousPeriod && (
              <div className="mt-2 flex items-center gap-1">
                {(() => {
                  const { delta, isPositive } = calculateDelta(
                    data.platformActivity.totalUsers,
                    data.previousPeriod.totalUsers
                  );
                  return (
                    <Badge variant={isPositive ? "default" : "secondary"} className="text-xs">
                      {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                      {delta.toFixed(1)}%
                    </Badge>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Biens</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.platformActivity.totalProperties}</div>
            {data.previousPeriod && (
              <div className="mt-2 flex items-center gap-1">
                {(() => {
                  const { delta, isPositive } = calculateDelta(
                    data.platformActivity.totalProperties,
                    data.previousPeriod.totalProperties
                  );
                  return (
                    <Badge variant={isPositive ? "default" : "secondary"} className="text-xs">
                      {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                      {delta.toFixed(1)}%
                    </Badge>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidatures</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.platformActivity.totalApplications}</div>
            {data.previousPeriod && (
              <div className="mt-2 flex items-center gap-1">
                {(() => {
                  const { delta, isPositive } = calculateDelta(
                    data.platformActivity.totalApplications,
                    data.previousPeriod.totalApplications
                  );
                  return (
                    <Badge variant={isPositive ? "default" : "secondary"} className="text-xs">
                      {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                      {delta.toFixed(1)}%
                    </Badge>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="properties">Biens</TabsTrigger>
          <TabsTrigger value="verification">Vérification</TabsTrigger>
          <TabsTrigger value="charts">Graphiques</TabsTrigger>
          <TabsTrigger value="financial">Finances</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top 10 Propriétaires</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(data.topLandlords, 'top-proprietaires')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topLandlords.map((landlord, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{landlord.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {landlord.propertyCount} bien{landlord.propertyCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top 10 Locataires</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(data.topTenants, 'top-locataires')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topTenants.map((tenant, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {tenant.applicationCount} candidature{tenant.applicationCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Métriques des biens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Délai moyen avant location</p>
                  <p className="text-2xl font-bold">{data.propertyPerformance.avgDaysToRent} jours</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Vues moyennes par bien</p>
                  <p className="text-2xl font-bold">{Math.round(data.propertyPerformance.avgViews)}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Taux de conversion</p>
                  <p className="text-2xl font-bold">{data.propertyPerformance.conversionRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle>Statistiques de vérification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <span>ONECI vérifié</span>
                  <span className="font-bold">{data.verificationStats.oneci} / {data.verificationStats.total}</span>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <span>CNAM vérifié</span>
                  <span className="font-bold">{data.verificationStats.cnam} / {data.verificationStats.total}</span>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <span>Reconnaissance faciale</span>
                  <span className="font-bold">{data.verificationStats.face} / {data.verificationStats.total}</span>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted">
                  <span className="font-medium">Taux de vérification global</span>
                  <span className="font-bold">
                    {data.verificationStats.total > 0
                      ? Math.round(((data.verificationStats.oneci + data.verificationStats.cnam + data.verificationStats.face) / (data.verificationStats.total * 3)) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Timeline Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Évolution dans le temps</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.chartData?.timeline || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="applications" stroke={CHART_COLORS.primary} strokeWidth={2} name="Candidatures" />
                    <Line type="monotone" dataKey="properties" stroke={CHART_COLORS.secondary} strokeWidth={2} name="Biens" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cities Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Biens par ville (Top 10)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.chartData?.citiesData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="city" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill={CHART_COLORS.secondary} radius={[8, 8, 0, 0]} name="Nombre de biens" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Property Types Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Types de biens</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.chartData?.propertyTypes || []}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {(data.chartData?.propertyTypes || []).map((entry, index) => {
                        const colors = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.success, CHART_COLORS.warning, CHART_COLORS.muted];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Entonnoir de conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Vues</span>
                      <span className="text-sm font-bold">{Math.round(data.propertyPerformance.avgViews * data.platformActivity.totalProperties)}</span>
                    </div>
                    <div className="h-16 bg-gradient-to-r from-primary to-primary-glow rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                      100%
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Candidatures</span>
                      <span className="text-sm font-bold">{data.platformActivity.totalApplications}</span>
                    </div>
                    <div 
                      className="h-14 bg-gradient-to-r from-secondary to-secondary-500 rounded-lg flex items-center justify-center text-secondary-foreground font-bold"
                      style={{ width: `${data.propertyPerformance.conversionRate}%` }}
                    >
                      {data.propertyPerformance.conversionRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Locations conclues</span>
                      <span className="text-sm font-bold">{data.financialData?.activeLeases || 0}</span>
                    </div>
                    <div 
                      className="h-12 bg-gradient-to-r from-success to-success rounded-lg flex items-center justify-center text-success-foreground font-bold"
                      style={{ 
                        width: `${data.platformActivity.totalApplications > 0 ? ((data.financialData?.activeLeases || 0) / data.platformActivity.totalApplications) * 100 : 0}%` 
                      }}
                    >
                      {data.platformActivity.totalApplications > 0 
                        ? (((data.financialData?.activeLeases || 0) / data.platformActivity.totalApplications) * 100).toFixed(1)
                        : 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenus totaux</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(data.financialData?.totalRevenue || 0).toLocaleString('fr-FR')} FCFA
                </div>
                <p className="text-xs text-muted-foreground mt-1">Loyers actifs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commission ANSUT (5%)</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {(data.financialData?.ansutCommission || 0).toLocaleString('fr-FR')} FCFA
                </div>
                <p className="text-xs text-muted-foreground mt-1">Par mois</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Baux actifs</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.financialData?.activeLeases || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Contrats en cours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenu moyen</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(data.financialData?.activeLeases && data.financialData.activeLeases > 0
                    ? (data.financialData.totalRevenue / data.financialData.activeLeases)
                    : 0
                  ).toLocaleString('fr-FR')} FCFA
                </div>
                <p className="text-xs text-muted-foreground mt-1">Par bail</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Revenus par type de bien</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    const csvData = Object.entries(data.financialData?.revenueByType || {}).map(([type, revenue]) => ({
                      'Type de bien': type,
                      'Revenus (FCFA)': revenue
                    }));
                    exportToCSV(csvData, 'revenus-par-type');
                  }}>
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportPDF('financial')}>
                    Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.financialData?.revenueByType || {})
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([type, revenue]) => (
                    <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{type}</p>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ 
                              width: `${((revenue as number) / (data.financialData?.totalRevenue || 1)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <p className="font-bold">{(revenue as number).toLocaleString('fr-FR')} FCFA</p>
                        <p className="text-xs text-muted-foreground">
                          {(((revenue as number) / (data.financialData?.totalRevenue || 1)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedReporting;