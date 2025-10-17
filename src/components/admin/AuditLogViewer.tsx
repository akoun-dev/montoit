import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DataTable, Column } from './DataTable';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Download, Search, ChevronDown, ChevronRight, Calendar as CalendarIcon, AlertTriangle, Shield, Activity, Clock } from 'lucide-react';
import { format, startOfToday, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { handleError } from '@/lib/errorHandler';
import { logger } from '@/services/logger';

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  notes: string | null;
  created_at: string;
  admin?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface SuspiciousActivity {
  admin_id: string;
  admin_name: string;
  activity_type: string;
  details: string;
  log_count: number;
  timestamp: string;
}

const actionTypeLabels: Record<string, string> = {
  lease_certified: 'Bail certifié',
  lease_rejected: 'Bail rejeté',
  lease_pending: 'Bail en attente',
  role_assigned: 'Rôle attribué',
  role_revoked: 'Rôle révoqué',
  dispute_open: 'Litige ouvert',
  dispute_resolved: 'Litige résolu',
  dispute_in_progress: 'Litige en cours',
  dispute_closed: 'Litige fermé',
};

const getActionBadgeVariant = (actionType: string) => {
  if (actionType.includes('certified') || actionType.includes('resolved')) return 'default';
  if (actionType.includes('rejected') || actionType.includes('revoked')) return 'destructive';
  if (actionType.includes('assigned')) return 'secondary';
  return 'outline';
};

const ITEMS_PER_PAGE = 50;

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(startOfToday(), 7),
    to: endOfDay(new Date()),
  });
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const isSuperAdmin = hasRole('super_admin');

  useEffect(() => {
    fetchAuditLogs();
  }, [dateRange]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, actionFilter, targetFilter]);

  useEffect(() => {
    if (filteredLogs.length > 0) {
      const suspicious = detectSuspiciousActivity(filteredLogs);
      setSuspiciousActivities(suspicious);
      
      // Envoyer des alertes si des activités suspectes sont détectées
      if (suspicious.length > 0 && isSuperAdmin) {
        sendSuspiciousActivityAlerts(suspicious);
      }
    }
  }, [filteredLogs, isSuperAdmin]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const { data: logsData, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrichir avec les profils admin
      if (logsData && logsData.length > 0) {
        const adminIds = Array.from(new Set(logsData.map(log => log.admin_id)));
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', adminIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedLogs = logsData.map(log => ({
          ...log,
          admin: profileMap.get(log.admin_id) ? {
            full_name: profileMap.get(log.admin_id)!.full_name,
            avatar_url: profileMap.get(log.admin_id)!.avatar_url
          } : undefined
        }));

        setLogs(enrichedLogs);
      } else {
        setLogs([]);
      }
    } catch (error: any) {
      handleError(error, 'Impossible de charger les logs d\'audit');
    } finally {
      setLoading(false);
    }
  };

  const detectSuspiciousActivity = (logs: AuditLog[]): SuspiciousActivity[] => {
    const suspicious: SuspiciousActivity[] = [];
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const officeHoursStart = 8; // 8h
    const officeHoursEnd = 18; // 18h

    // Détecter les actions en masse (>10 actions en 1 minute)
    const recentLogs = logs.filter(log => new Date(log.created_at) > oneMinuteAgo);
    const logsByAdmin = recentLogs.reduce((acc, log) => {
      if (!acc[log.admin_id]) acc[log.admin_id] = [];
      acc[log.admin_id].push(log);
      return acc;
    }, {} as Record<string, AuditLog[]>);

    Object.entries(logsByAdmin).forEach(([adminId, adminLogs]) => {
      if (adminLogs.length > 10) {
        suspicious.push({
          admin_id: adminId,
          admin_name: adminLogs[0].admin?.full_name || 'Inconnu',
          activity_type: 'Actions en masse',
          details: `${adminLogs.length} actions en moins d'une minute`,
          log_count: adminLogs.length,
          timestamp: adminLogs[0].created_at,
        });
      }
    });

    // Détecter les IPs multiples pour un même admin
    const adminIPs: Record<string, Set<string>> = {};
    logs.forEach(log => {
      if (log.ip_address) {
        if (!adminIPs[log.admin_id]) adminIPs[log.admin_id] = new Set();
        adminIPs[log.admin_id].add(log.ip_address);
      }
    });

    Object.entries(adminIPs).forEach(([adminId, ips]) => {
      if (ips.size > 3) {
        const adminLog = logs.find(l => l.admin_id === adminId);
        suspicious.push({
          admin_id: adminId,
          admin_name: adminLog?.admin?.full_name || 'Inconnu',
          activity_type: 'IPs multiples',
          details: `Connexions depuis ${ips.size} adresses IP différentes`,
          log_count: ips.size,
          timestamp: adminLog?.created_at || new Date().toISOString(),
        });
      }
    });

    // Détecter les actions critiques hors des heures de bureau
    const criticalActions = ['role_assigned', 'role_revoked', 'lease_rejected'];
    const offHoursActions = logs.filter(log => {
      const hour = new Date(log.created_at).getHours();
      return criticalActions.includes(log.action_type) && 
             (hour < officeHoursStart || hour >= officeHoursEnd);
    });

    const offHoursByAdmin = offHoursActions.reduce((acc, log) => {
      if (!acc[log.admin_id]) acc[log.admin_id] = [];
      acc[log.admin_id].push(log);
      return acc;
    }, {} as Record<string, AuditLog[]>);

    Object.entries(offHoursByAdmin).forEach(([adminId, adminLogs]) => {
      if (adminLogs.length > 0) {
        suspicious.push({
          admin_id: adminId,
          admin_name: adminLogs[0].admin?.full_name || 'Inconnu',
          activity_type: 'Actions critiques hors heures',
          details: `${adminLogs.length} action(s) critique(s) hors des heures de bureau`,
          log_count: adminLogs.length,
          timestamp: adminLogs[0].created_at,
        });
      }
    });

    // Détecter les tentatives de suppression répétées
    const deletionAttempts = logs.filter(log => 
      log.action_type.includes('delete') || log.action_type.includes('revoke')
    );

    const deletionsByAdmin = deletionAttempts.reduce((acc, log) => {
      if (!acc[log.admin_id]) acc[log.admin_id] = [];
      acc[log.admin_id].push(log);
      return acc;
    }, {} as Record<string, AuditLog[]>);

    Object.entries(deletionsByAdmin).forEach(([adminId, adminLogs]) => {
      if (adminLogs.length > 5) {
        suspicious.push({
          admin_id: adminId,
          admin_name: adminLogs[0].admin?.full_name || 'Inconnu',
          activity_type: 'Suppressions répétées',
          details: `${adminLogs.length} tentative(s) de suppression/révocation`,
          log_count: adminLogs.length,
          timestamp: adminLogs[0].created_at,
        });
      }
    });

    return suspicious;
  };

  const sendSuspiciousActivityAlerts = async (activities: SuspiciousActivity[]) => {
    try {
      const { error } = await supabase.functions.invoke('alert-suspicious-activity', {
        body: { suspicious_activities: activities }
      });

      if (error) {
        logger.error('Error sending suspicious activity alerts', { error });
      }
    } catch (error) {
      logger.error('Failed to invoke alert function', { error });
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(
        log =>
          log.target_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.admin?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action_type === actionFilter);
    }

    if (targetFilter !== 'all') {
      filtered = filtered.filter(log => log.target_type === targetFilter);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Admin', 'Action', 'Type Cible', 'ID Cible', 'IP', 'Notes'];
    const csvData = filteredLogs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr }),
      log.admin?.full_name || log.admin_id,
      actionTypeLabels[log.action_type] || log.action_type,
      log.target_type,
      log.target_id,
      log.ip_address || '-',
      log.notes || '',
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const setDatePreset = (preset: 'today' | '7days' | '30days') => {
    const today = startOfToday();
    switch (preset) {
      case 'today':
        setDateRange({ from: startOfDay(today), to: endOfDay(today) });
        break;
      case '7days':
        setDateRange({ from: subDays(today, 7), to: endOfDay(today) });
        break;
      case '30days':
        setDateRange({ from: subDays(today, 30), to: endOfDay(today) });
        break;
    }
  };

  // Calculer les KPIs
  const kpis = {
    totalToday: logs.filter(log => 
      new Date(log.created_at) >= startOfDay(new Date())
    ).length,
    criticalActions: logs.filter(log => 
      ['role_assigned', 'role_revoked', 'lease_rejected'].includes(log.action_type)
    ).length,
    uniqueAdmins: new Set(logs.map(log => log.admin_id)).size,
    lastAction: logs.length > 0 ? logs[0].created_at : null,
  };

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const columns: Column<AuditLog>[] = [
    {
      header: '',
      accessor: (log) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleRowExpansion(log.id)}
        >
          {expandedRows.has(log.id) ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      ),
      className: 'w-12',
    },
    {
      header: 'Date',
      accessor: (log) => format(new Date(log.created_at), 'dd/MM HH:mm', { locale: fr }),
      className: 'font-medium',
    },
    {
      header: 'Admin',
      accessor: (log) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={log.admin?.avatar_url || ''} />
            <AvatarFallback>
              {log.admin?.full_name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{log.admin?.full_name || 'Inconnu'}</span>
        </div>
      ),
    },
    {
      header: 'Action',
      accessor: (log) => (
        <Badge variant={getActionBadgeVariant(log.action_type) as any}>
          {actionTypeLabels[log.action_type] || log.action_type}
        </Badge>
      ),
    },
    {
      header: 'Type',
      accessor: 'target_type',
    },
    {
      header: 'Notes',
      accessor: (log) => (
        <span className="text-sm text-muted-foreground truncate max-w-xs block">
          {log.notes || '-'}
        </span>
      ),
    },
  ];

  const uniqueActions = Array.from(new Set(logs.map(l => l.action_type)));
  const uniqueTargets = Array.from(new Set(logs.map(l => l.target_type)));

  return (
    <div className="space-y-4">
      {/* Alertes d'activités suspectes */}
      {suspiciousActivities.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ Activité suspecte détectée</AlertTitle>
          <AlertDescription>
            {suspiciousActivities.length} activité(s) suspecte(s) détectée(s) dans les logs récents.
            <ul className="mt-2 space-y-1">
              {suspiciousActivities.slice(0, 3).map((activity, idx) => (
                <li key={idx} className="text-sm">
                  <strong>{activity.admin_name}</strong>: {activity.activity_type} - {activity.details}
                </li>
              ))}
            </ul>
            {suspiciousActivities.length > 3 && (
              <p className="text-sm mt-1">... et {suspiciousActivities.length - 3} autre(s)</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Logs du jour</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Actions critiques</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.criticalActions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Admins actifs</CardTitle>
            <Avatar className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.uniqueAdmins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Dernière action</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {kpis.lastAction 
                ? format(new Date(kpis.lastAction), 'HH:mm', { locale: fr })
                : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal d'Audit {!isSuperAdmin && '(Vos actions uniquement)'}</CardTitle>
          <CardDescription>
            {isSuperAdmin 
              ? 'Historique de toutes les actions administratives (rétention: 1 an)'
              : 'Historique de vos actions administratives'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres temporels */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setDatePreset('today')}>
              Aujourd'hui
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDatePreset('7days')}>
              7 derniers jours
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDatePreset('30days')}>
              30 derniers jours
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, 'dd/MM/yy', { locale: fr })} - {format(dateRange.to, 'dd/MM/yy', { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => date && setDateRange({ ...dateRange, from: startOfDay(date) })}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtres */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, ID, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type d'action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {actionTypeLabels[action] || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type de cible" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les cibles</SelectItem>
                {uniqueTargets.map(target => (
                  <SelectItem key={target} value={target}>
                    {target}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={exportToCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>

          {/* Table */}
          <div className="space-y-2">
            <DataTable
              data={paginatedLogs}
              columns={columns}
              loading={loading}
              emptyMessage="Aucun log d'audit trouvé"
            />
            
            {paginatedLogs.map(log => (
              expandedRows.has(log.id) && (
                <Card key={`detail-${log.id}`} className="ml-12 bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-semibold">ID Cible</p>
                        <p className="font-mono text-xs">{log.target_id}</p>
                      </div>
                      <div>
                        <p className="font-semibold">ID Admin</p>
                        <p className="font-mono text-xs">{log.admin_id}</p>
                      </div>
                      {log.ip_address && (
                        <div>
                          <p className="font-semibold">Adresse IP</p>
                          <p className="font-mono text-xs">{log.ip_address}</p>
                        </div>
                      )}
                      {log.user_agent && (
                        <div className="col-span-2">
                          <p className="font-semibold">User Agent</p>
                          <p className="text-xs text-muted-foreground truncate">{log.user_agent}</p>
                        </div>
                      )}
                      {log.old_values && (
                        <div className="col-span-2">
                          <p className="font-semibold mb-2">Anciennes valeurs</p>
                          <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_values && (
                        <div className="col-span-2">
                          <p className="font-semibold mb-2">Nouvelles valeurs</p>
                          <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {totalPages > 5 && <PaginationEllipsis />}
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}

          <div className="text-sm text-muted-foreground">
            {filteredLogs.length} log(s) affiché(s) sur {logs.length} au total
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
