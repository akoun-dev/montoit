import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Shield, Eye, Download, Search, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/services/logger';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VerificationAccessLog {
  id: string;
  admin_id: string;
  target_user_id: string;
  accessed_at: string;
  access_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  admin_profile?: {
    full_name: string;
  };
  target_profile?: {
    full_name: string;
  };
}

export const VerificationAccessMonitor = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<VerificationAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [accessTypeFilter, setAccessTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7days');

  useEffect(() => {
    fetchLogs();
  }, [dateFilter, accessTypeFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      // Calculer la date de début selon le filtre
      const now = new Date();
      let startDate = new Date();
      switch (dateFilter) {
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7days':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }

      let query = supabase
        .from('verification_access_log')
        .select('*')
        .gte('accessed_at', startDate.toISOString())
        .order('accessed_at', { ascending: false })
        .limit(100);

      if (accessTypeFilter !== 'all') {
        query = query.eq('access_type', accessTypeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrichir avec les noms des profils
      const enrichedData = await Promise.all((data || []).map(async (log) => {
        const [adminProfile, targetProfile] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', log.admin_id).maybeSingle(),
          supabase.from('profiles').select('full_name').eq('id', log.target_user_id).maybeSingle()
        ]);

        return {
          ...log,
          admin_profile: adminProfile.data,
          target_profile: targetProfile.data
        };
      }));

      setLogs(enrichedData);
    } catch (error) {
      logger.error('Failed to fetch verification access logs');
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const adminName = log.admin_profile?.full_name?.toLowerCase() || '';
    const targetName = log.target_profile?.full_name?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    return adminName.includes(search) || targetName.includes(search);
  });

  const exportToCSV = () => {
    const headers = ['Date', 'Admin', 'Utilisateur Cible', 'Type d\'Accès', 'IP', 'User Agent'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.accessed_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr }),
      log.admin_profile?.full_name || 'Inconnu',
      log.target_profile?.full_name || 'Inconnu',
      log.access_type,
      log.ip_address || 'N/A',
      log.user_agent || 'N/A'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verification-access-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Export CSV réussi');
  };

  const getAccessTypeBadge = (type: string) => {
    const variants: Record<string, any> = {
      full_view: 'default',
      oneci_data: 'secondary',
      cnam_data: 'secondary',
      face_data: 'secondary'
    };
    return <Badge variant={variants[type] || 'outline'}>{type}</Badge>;
  };

  const stats = {
    total: filteredLogs.length,
    uniqueAdmins: new Set(filteredLogs.map(l => l.admin_id)).size,
    uniqueTargets: new Set(filteredLogs.map(l => l.target_user_id)).size,
    last24h: filteredLogs.filter(l => 
      new Date(l.accessed_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Monitoring des Accès aux Données de Vérification</CardTitle>
              <CardDescription>
                Traçabilité complète des accès aux données sensibles (CNI, sécurité sociale, biométrie)
              </CardDescription>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total accès</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.last24h}</div>
              <p className="text-xs text-muted-foreground">Dernières 24h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.uniqueAdmins}</div>
              <p className="text-xs text-muted-foreground">Admins uniques</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.uniqueTargets}</div>
              <p className="text-xs text-muted-foreground">Utilisateurs ciblés</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom d'admin ou utilisateur cible..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Select value={accessTypeFilter} onValueChange={setAccessTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Type d'accès" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="full_view">Vue complète</SelectItem>
              <SelectItem value="oneci_data">Données ONECI</SelectItem>
              <SelectItem value="cnam_data">Données CNAM</SelectItem>
              <SelectItem value="face_data">Données biométriques</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[200px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Dernières 24h</SelectItem>
              <SelectItem value="7days">7 derniers jours</SelectItem>
              <SelectItem value="30days">30 derniers jours</SelectItem>
              <SelectItem value="90days">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tableau des logs */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Heure</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Utilisateur Cible</TableHead>
                <TableHead>Type d'Accès</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>User Agent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Aucun accès enregistré
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {format(new Date(log.accessed_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}
                    </TableCell>
                    <TableCell>{log.admin_profile?.full_name || 'Inconnu'}</TableCell>
                    <TableCell>{log.target_profile?.full_name || 'Inconnu'}</TableCell>
                    <TableCell>{getAccessTypeBadge(log.access_type)}</TableCell>
                    <TableCell className="text-xs font-mono">{log.ip_address || 'N/A'}</TableCell>
                    <TableCell className="text-xs max-w-xs truncate" title={log.user_agent || undefined}>
                      {log.user_agent || 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
