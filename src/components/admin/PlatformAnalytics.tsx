import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList, ScatterChart, Scatter, ZAxis } from 'recharts';
import { TrendingUp, Users, Home, FileText, Download, Activity, CheckCircle, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsData {
  userGrowth: { date: string; count: number }[];
  applicationsByWeek: { week: string; count: number }[];
  propertyDistribution: { city: string; count: number }[];
  topProperties: { title: string; views: number }[];
}

interface AdvancedMetrics {
  conversionRate: number;
  avgResponseTime: number;
  activeUsersRate: number;
  certificationRate: number;
  retentionRate: number;
}

interface FunnelData {
  step: string;
  value: number;
  fill: string;
}

interface HeatmapData {
  day: string;
  hour: number;
  activity: number;
}

interface ScatterData {
  title: string;
  rent: number;
  surface: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const PlatformAnalytics = () => {
  const [data, setData] = useState<AnalyticsData>({
    userGrowth: [],
    applicationsByWeek: [],
    propertyDistribution: [],
    topProperties: []
  });
  const [metrics, setMetrics] = useState<AdvancedMetrics>({
    conversionRate: 0,
    avgResponseTime: 0,
    activeUsersRate: 0,
    certificationRate: 0,
    retentionRate: 0
  });
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [scatterData, setScatterData] = useState<ScatterData[]>([]);
  const [period, setPeriod] = useState('30');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const daysAgo = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // User growth
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      if (profilesError) throw profilesError;

      // Applications with more details
      const { data: applications, error: applicationsError } = await supabase
        .from('rental_applications')
        .select('created_at, status, reviewed_at, applicant_id')
        .gte('created_at', startDate.toISOString());

      if (applicationsError) throw applicationsError;

      // Properties with city filter
      let propertiesQuery = supabase
        .from('properties')
        .select('city, view_count, title, monthly_rent, surface_area');
      
      if (selectedCity !== 'all') {
        propertiesQuery = propertiesQuery.eq('city', selectedCity);
      }

      const { data: properties, error: propertiesError } = await propertiesQuery;
      if (propertiesError) throw propertiesError;

      // Leases for certification rate
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('certification_status, created_at, landlord_signed_at, tenant_signed_at')
        .gte('created_at', startDate.toISOString());

      if (leasesError) throw leasesError;

      // Search history for activity
      const { data: searches, error: searchesError } = await supabase
        .from('search_history')
        .select('created_at, user_id')
        .gte('created_at', startDate.toISOString());

      if (searchesError) throw searchesError;

      // User favorites
      const { data: favorites, error: favoritesError } = await supabase
        .from('user_favorites')
        .select('created_at, user_id')
        .gte('created_at', startDate.toISOString());

      if (favoritesError) throw favoritesError;

      // Extract cities for filter
      const uniqueCities = Array.from(new Set(properties?.map(p => p.city).filter(Boolean) || []));
      setCities(uniqueCities);

      // Process user growth
      const userGrowthMap = new Map<string, number>();
      profiles?.forEach(profile => {
        const date = new Date(profile.created_at).toISOString().split('T')[0];
        userGrowthMap.set(date, (userGrowthMap.get(date) || 0) + 1);
      });
      const userGrowth = Array.from(userGrowthMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Process applications by week
      const applicationsByWeekMap = new Map<string, number>();
      applications?.forEach(app => {
        const week = new Date(app.created_at).toISOString().split('T')[0];
        applicationsByWeekMap.set(week, (applicationsByWeekMap.get(week) || 0) + 1);
      });
      const applicationsByWeek = Array.from(applicationsByWeekMap.entries())
        .map(([week, count]) => ({ week, count }))
        .sort((a, b) => a.week.localeCompare(b.week));

      // Process property distribution
      const cityMap = new Map<string, number>();
      properties?.forEach(property => {
        cityMap.set(property.city, (cityMap.get(property.city) || 0) + 1);
      });
      const propertyDistribution = Array.from(cityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top properties by views
      const topProperties = properties
        ?.sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 10)
        .map(p => ({ title: p.title, views: p.view_count || 0 })) || [];

      // Calculate advanced metrics
      const totalApplications = applications?.length || 0;
      const acceptedApplications = applications?.filter(a => a.status === 'accepted').length || 0;
      const conversionRate = totalApplications > 0 ? (acceptedApplications / totalApplications) * 100 : 0;

      const reviewedApplications = applications?.filter(a => a.reviewed_at) || [];
      const avgResponseTime = reviewedApplications.length > 0
        ? reviewedApplications.reduce((sum, app) => {
            const created = new Date(app.created_at).getTime();
            const reviewed = new Date(app.reviewed_at!).getTime();
            return sum + (reviewed - created) / (1000 * 60 * 60);
          }, 0) / reviewedApplications.length
        : 0;

      const totalUsers = profiles?.length || 0;
      const activeUserIds = new Set([
        ...(applications?.map(a => a.applicant_id) || []),
        ...(searches?.map(s => s.user_id) || []),
        ...(favorites?.map(f => f.user_id) || [])
      ]);
      const activeUsersRate = totalUsers > 0 ? (activeUserIds.size / totalUsers) * 100 : 0;

      const totalLeases = leases?.length || 0;
      const certifiedLeases = leases?.filter(l => l.certification_status === 'certified').length || 0;
      const certificationRate = totalLeases > 0 ? (certifiedLeases / totalLeases) * 100 : 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const returningUsers = new Set(
        [...(searches || []), ...(favorites || [])]
          .filter(item => new Date(item.created_at) > thirtyDaysAgo)
          .map(item => item.user_id)
      );
      const retentionRate = totalUsers > 0 ? (returningUsers.size / totalUsers) * 100 : 0;

      setMetrics({
        conversionRate,
        avgResponseTime,
        activeUsersRate,
        certificationRate,
        retentionRate
      });

      // Funnel data
      const signups = profiles?.length || 0;
      const searchCount = searches?.length || 0;
      const applicationsCount = applications?.length || 0;
      const signedLeases = leases?.filter(l => l.landlord_signed_at && l.tenant_signed_at).length || 0;

      setFunnelData([
        { step: 'Inscriptions', value: signups, fill: 'hsl(var(--chart-1))' },
        { step: 'Recherches', value: searchCount, fill: 'hsl(var(--chart-2))' },
        { step: 'Candidatures', value: applicationsCount, fill: 'hsl(var(--chart-3))' },
        { step: 'Baux signés', value: signedLeases, fill: 'hsl(var(--chart-4))' }
      ]);

      // Heatmap data
      const activityByDayHour = new Map<string, number>();
      [...(searches || []), ...(applications || [])].forEach(item => {
        const date = new Date(item.created_at);
        const day = date.toLocaleDateString('fr-FR', { weekday: 'short' });
        const hour = date.getHours();
        const key = `${day}-${hour}`;
        activityByDayHour.set(key, (activityByDayHour.get(key) || 0) + 1);
      });

      const days = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
      const heatmap: HeatmapData[] = [];
      days.forEach(day => {
        for (let hour = 0; hour < 24; hour++) {
          heatmap.push({
            day,
            hour,
            activity: activityByDayHour.get(`${day}-${hour}`) || 0
          });
        }
      });
      setHeatmapData(heatmap);

      // Scatter data
      const scatter: ScatterData[] = properties
        ?.filter(p => p.monthly_rent && p.surface_area)
        .map(p => ({
          title: p.title,
          rent: Number(p.monthly_rent),
          surface: Number(p.surface_area)
        })) || [];
      setScatterData(scatter);

      setData({
        userGrowth,
        applicationsByWeek,
        propertyDistribution,
        topProperties
      });
    } catch (error) {
      logger.error('Error fetching analytics', { error, period });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ['Métrique', 'Valeur'],
      ['Taux de conversion', `${metrics.conversionRate.toFixed(2)}%`],
      ['Temps de réponse moyen', `${metrics.avgResponseTime.toFixed(2)}h`],
      ['Taux d\'utilisateurs actifs', `${metrics.activeUsersRate.toFixed(2)}%`],
      ['Taux de certification', `${metrics.certificationRate.toFixed(2)}%`],
      ['Taux de rétention', `${metrics.retentionRate.toFixed(2)}%`],
      [''],
      ['Funnel de conversion'],
      ...funnelData.map(f => [f.step, f.value.toString()]),
      [''],
      ['Propriétés par ville'],
      ...data.propertyDistribution.map(p => [p.city, p.count.toString()])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="h-[300px] flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold">Analytiques de la plateforme</h2>
        <div className="flex gap-2">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ville" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="365">1 an</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Taux de conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Candidatures acceptées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Temps de réponse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">Délai moyen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Utilisateurs actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsersRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Taux d'engagement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Certification ANSUT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.certificationRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Baux certifiés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Rétention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.retentionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Utilisateurs revenus</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="applications">Candidatures</TabsTrigger>
          <TabsTrigger value="properties">Biens</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="heatmap">Activité</TabsTrigger>
          <TabsTrigger value="scatter">Loyer/Surface</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Croissance des inscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Inscriptions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Candidatures par semaine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.applicationsByWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" name="Candidatures" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Répartition par ville
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.propertyDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ city, percent }) => `${city}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.propertyDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top 10 des biens les plus vus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.topProperties} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="title" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="views" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Funnel de conversion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="step" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Heatmap d'activité (Jour × Heure)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="grid grid-cols-24 gap-1 min-w-[800px]">
                  {['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(day => (
                    <div key={day} className="col-span-24 grid grid-cols-24 gap-1">
                      <div className="text-xs font-medium flex items-center">{day}</div>
                      {Array.from({ length: 24 }, (_, hour) => {
                        const activity = heatmapData.find(d => d.day === day && d.hour === hour)?.activity || 0;
                        const maxActivity = Math.max(...heatmapData.map(d => d.activity));
                        const opacity = maxActivity > 0 ? activity / maxActivity : 0;
                        return (
                          <div
                            key={hour}
                            className="h-8 rounded"
                            style={{
                              backgroundColor: `hsl(var(--primary) / ${opacity})`,
                              border: '1px solid hsl(var(--border))'
                            }}
                            title={`${day} ${hour}h: ${activity} activités`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  Plus la couleur est foncée, plus il y a d'activité à ce moment
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scatter" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Loyer vs Surface (détection d'anomalies)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="surface" 
                    name="Surface" 
                    unit=" m²"
                    label={{ value: 'Surface (m²)', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="rent" 
                    name="Loyer" 
                    unit=" FCFA"
                    label={{ value: 'Loyer (FCFA)', angle: -90, position: 'insideLeft' }}
                  />
                  <ZAxis range={[60, 400]} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-card p-3 border border-border rounded shadow-lg">
                            <p className="font-semibold text-sm">{data.title}</p>
                            <p className="text-xs">Surface: {data.surface} m²</p>
                            <p className="text-xs">Loyer: {data.rent.toLocaleString()} FCFA</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="Propriétés" data={scatterData} fill="hsl(var(--primary))" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PlatformAnalytics;