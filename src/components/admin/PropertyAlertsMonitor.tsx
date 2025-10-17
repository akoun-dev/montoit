import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Bell, Mail, Smartphone, TrendingUp, Users, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AlertStats {
  total_alerts_active: number;
  total_alerts_sent_today: number;
  total_alerts_sent_week: number;
  total_alerts_sent_month: number;
  avg_open_rate: number;
  avg_click_rate: number;
  users_with_alerts: number;
}

interface AlertHistory {
  id: string;
  alert_type: string;
  delivery_method: string;
  delivery_status: string;
  created_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  user: {
    full_name: string;
  };
  property: {
    title: string;
    city: string;
  } | null;
}

interface AlertAnalytics {
  date: string;
  alert_type: string;
  delivery_method: string;
  total_sent: number;
  opened_count: number;
  clicked_count: number;
  open_rate: number;
  click_rate: number;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

export const PropertyAlertsMonitor = () => {
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<AlertHistory[]>([]);
  const [analytics, setAnalytics] = useState<AlertAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_alert_statistics');

      if (statsError) throw statsError;
      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }

      // Fetch recent alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('alert_history')
        .select(`
          id,
          alert_type,
          delivery_method,
          delivery_status,
          created_at,
          opened_at,
          clicked_at,
          user_id,
          property_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsError) throw alertsError;

      // Fetch user and property details separately
      if (alertsData) {
        const enrichedAlerts = await Promise.all(
          alertsData.map(async (alert) => {
            const [userData, propertyData] = await Promise.all([
              alert.user_id
                ? supabase.from('profiles').select('full_name').eq('id', alert.user_id).single()
                : Promise.resolve({ data: null }),
              alert.property_id
                ? supabase.from('properties').select('title, city').eq('id', alert.property_id).single()
                : Promise.resolve({ data: null }),
            ]);

            return {
              ...alert,
              user: userData.data || { full_name: 'N/A' },
              property: propertyData.data,
            };
          })
        );
        setRecentAlerts(enrichedAlerts as any);
      }

      // Fetch analytics for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: analyticsData, error: analyticsError } = await supabase
        .from('property_alerts_analytics')
        .select('*')
        .gte('date', sevenDaysAgo.toISOString())
        .order('date', { ascending: true });

      if (analyticsError) throw analyticsError;
      setAnalytics(analyticsData || []);

    } catch (error: any) {
      logger.error('Failed to fetch property alerts data', { component: 'PropertyAlertsMonitor', error: error.message });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données des alertes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>;
  }

  const byType = analytics.reduce((acc, item) => {
    const existing = acc.find(i => i.name === item.alert_type);
    if (existing) {
      existing.value += item.total_sent;
    } else {
      acc.push({ name: item.alert_type, value: item.total_sent });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const byMethod = analytics.reduce((acc, item) => {
    const existing = acc.find(i => i.name === item.delivery_method);
    if (existing) {
      existing.value += item.total_sent;
    } else {
      acc.push({ name: item.delivery_method, value: item.total_sent });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const dailyTrend = analytics.reduce((acc, item) => {
    const date = new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
    const existing = acc.find(i => i.date === date);
    if (existing) {
      existing.total += item.total_sent;
      existing.opened += item.opened_count;
      existing.clicked += item.clicked_count;
    } else {
      acc.push({ 
        date, 
        total: item.total_sent,
        opened: item.opened_count,
        clicked: item.clicked_count,
      });
    }
    return acc;
  }, [] as { date: string; total: number; opened: number; clicked: number }[]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Alertes Actives</p>
          </div>
          <p className="text-2xl font-bold">{stats?.total_alerts_active || 0}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Envoyées Aujourd'hui</p>
          </div>
          <p className="text-2xl font-bold">{stats?.total_alerts_sent_today || 0}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Taux d'Ouverture</p>
          </div>
          <p className="text-2xl font-bold">{stats?.avg_open_rate?.toFixed(1) || 0}%</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Utilisateurs</p>
          </div>
          <p className="text-2xl font-bold">{stats?.users_with_alerts || 0}</p>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trend">
        <TabsList>
          <TabsTrigger value="trend">Tendance 7j</TabsTrigger>
          <TabsTrigger value="type">Par Type</TabsTrigger>
          <TabsTrigger value="method">Par Canal</TabsTrigger>
          <TabsTrigger value="recent">Récents</TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Évolution des Alertes</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#8b5cf6" name="Envoyées" />
                <Line type="monotone" dataKey="opened" stroke="#06b6d4" name="Ouvertes" />
                <Line type="monotone" dataKey="clicked" stroke="#10b981" name="Cliquées" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="type">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Répartition par Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="method">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Répartition par Canal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byMethod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Alertes Récentes (50 dernières)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Canal</th>
                    <th className="text-left p-2">Utilisateur</th>
                    <th className="text-left p-2">Propriété</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="text-left p-2">Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.map((alert) => (
                    <tr key={alert.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        {new Date(alert.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {alert.alert_type}
                        </span>
                      </td>
                      <td className="p-2">
                        {alert.delivery_method === 'email' && <Mail className="h-4 w-4 inline" />}
                        {alert.delivery_method === 'push' && <Smartphone className="h-4 w-4 inline" />}
                        {alert.delivery_method === 'in_app' && <Bell className="h-4 w-4 inline" />}
                      </td>
                      <td className="p-2">{alert.user?.full_name || 'N/A'}</td>
                      <td className="p-2">
                        {alert.property ? `${alert.property.title} (${alert.property.city})` : 'N/A'}
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          alert.delivery_status === 'sent' ? 'bg-green-500/10 text-green-700' :
                          alert.delivery_status === 'failed' ? 'bg-red-500/10 text-red-700' :
                          'bg-yellow-500/10 text-yellow-700'
                        }`}>
                          {alert.delivery_status}
                        </span>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2 text-xs">
                          {alert.opened_at && <span className="text-green-600">✓ Ouvert</span>}
                          {alert.clicked_at && <span className="text-blue-600">✓ Cliqué</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
