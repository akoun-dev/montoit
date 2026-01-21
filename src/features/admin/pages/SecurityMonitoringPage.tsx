/**
 * Page de monitoring de sécurité pour les administrateurs
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  AlertTriangle,
  Shield,
  Activity,
  Download,
  Filter,
  RefreshCw,
  Ban,
  User,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { securityMonitoring } from '@/shared/services/securityMonitoring.service';
import { formatDate } from '@/shared/utils/date';
import { LoadingSpinner } from '@/shared/ui/loading-spinner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SecurityMonitoringPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24); // hours

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 60000); // Rafraîchir chaque minute
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      const data = await securityMonitoring.getSecurityMetrics(timeRange);
      setMetrics(data);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des métriques');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - timeRange * 60 * 60 * 1000);

      const events = await securityMonitoring.exportEvents(startDate, endDate);

      // Créer le fichier CSV
      const headers = ['Timestamp', 'Type', 'Severity', 'User ID', 'IP Address', 'Details'];
      const csvContent = [
        headers.join(','),
        ...events.map((event) =>
          [
            event.created_at,
            event.type,
            event.severity,
            event.user_id || '',
            event.ip_address || '',
            JSON.stringify(event.details || {}),
          ]
            .map((field) => `"${field}"`)
            .join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-events-${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Export réussi');
    } catch (error: any) {
      toast.error("Erreur lors de l'export");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  const chartData = Object.entries(metrics?.eventsByHour || {}).map(([hour, count]) => ({
    hour: `${hour}h`,
    count,
  }));

  const pieData = Object.entries(metrics?.eventsByType || {}).map(([type, count]) => ({
    name: type,
    value: count,
  }));

  const severityData = [
    { name: 'Low', value: metrics?.eventsBySeverity?.LOW || 0, color: '#10B981' },
    { name: 'Medium', value: metrics?.eventsBySeverity?.MEDIUM || 0, color: '#F59E0B' },
    { name: 'High', value: metrics?.eventsBySeverity?.HIGH || 0, color: '#EF4444' },
    { name: 'Critical', value: metrics?.eventsBySeverity?.CRITICAL || 0, color: '#7C3AED' },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring de Sécurité</h1>
          <p className="text-gray-600">Vue d'ensemble des événements de sécurité</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border rounded-md"
          >
            <option value={1}>Dernière heure</option>
            <option value={24}>Dernières 24h</option>
            <option value={168}>Dernière semaine</option>
            <option value={720}>Dernier mois</option>
          </select>
          <Button onClick={loadMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Alertes critiques */}
      {(metrics?.eventsBySeverity?.CRITICAL || 0) > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Alertes critiques détectées</AlertTitle>
          <AlertDescription className="text-red-700">
            {metrics.eventsBySeverity.CRITICAL} événement(s) critique(s) nécessitent une attention
            immédiate.
          </AlertDescription>
        </Alert>
      )}

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Événements</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">Dernières {timeRange}h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Événements Critiques</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics?.eventsBySeverity?.CRITICAL || 0}
            </div>
            <p className="text-xs text-muted-foreground">Nécessitent une action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Bloquées</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.blockedIPs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Actuellement bloquées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Offenders</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.topOffenders?.[0]?.count || 0}</div>
            <p className="text-xs text-muted-foreground">Max événements</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="events">Événements</TabsTrigger>
          <TabsTrigger value="blocked">IPs Bloquées</TabsTrigger>
          <TabsTrigger value="offenders">Top Offenders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Graphique par heure */}
            <Card>
              <CardHeader>
                <CardTitle>Événements par heure</CardTitle>
                <CardDescription>Distribution des événements de sécurité</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Graphique par type */}
            <Card>
              <CardHeader>
                <CardTitle>Événements par type</CardTitle>
                <CardDescription>Répartition des types d'événements</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Graphique par sévérité */}
            <Card>
              <CardHeader>
                <CardTitle>Événements par sévérité</CardTitle>
                <CardDescription>Niveau de gravité des événements</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={severityData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Bar dataKey="value" fill={(entry: any) => entry.color} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Types d'événements */}
            <Card>
              <CardHeader>
                <CardTitle>Détail par type</CardTitle>
                <CardDescription>Nombre d'événements par catégorie</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(metrics?.eventsByType || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{type}</span>
                      <Badge variant={count > 10 ? 'destructive' : 'secondary'}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Types d'événements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Fréquence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(metrics?.eventsByType || {}).map(([type, count]) => (
                    <TableRow key={type}>
                      <TableCell className="font-medium">{type}</TableCell>
                      <TableCell>{count}</TableCell>
                      <TableCell>
                        {Math.round((count / (metrics?.totalEvents || 1)) * 100)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <Card>
            <CardHeader>
              <CardTitle>IPs Bloquées</CardTitle>
              <CardDescription>Adresses IP actuellement bloquées</CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.blockedIPs?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Adresse IP</TableHead>
                      <TableHead>Bloquée le</TableHead>
                      <TableHead>Raison</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.blockedIPs.map((block: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{block.ip}</TableCell>
                        <TableCell>{formatDate(new Date(block.blockedAt))}</TableCell>
                        <TableCell>{block.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune IP bloquée actuellement</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offenders">
          <Card>
            <CardHeader>
              <CardTitle>Top Offenders</CardTitle>
              <CardDescription>Utilisateurs et IPs avec le plus d'événements</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Identifiant</TableHead>
                    <TableHead>Événements</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics?.topOffenders?.map((offender: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        {offender.ip ? (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>IP</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>Utilisateur</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">{offender.ip || offender.userId}</TableCell>
                      <TableCell>
                        <Badge variant={offender.count > 10 ? 'destructive' : 'secondary'}>
                          {offender.count}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
