import { useState, useEffect } from 'react';
import {
  History,
  UserCheck,
  Home,
  Calendar,
  Filter,
  Download,
  Search,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import TrustAgentHeader from '../../features/trust-agent/components/TrustAgentHeader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: {
    certified_by?: string;
    identity_verified?: boolean;
    oneci_verified?: boolean;
    cnam_verified?: boolean;
    checklist_passed?: Array<{ id: string; label: string; passed: boolean }>;
    notes?: string;
  };
  created_at: string;
  user_email: string;
}

export default function CertificationHistoryPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadCertificationHistory();
  }, [user]);

  const loadCertificationHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .in('action', ['USER_CERTIFIED', 'PROPERTY_CERTIFIED_ANSUT'])
        .eq('user_email', user.email ?? '')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    // Tab filter
    if (activeTab === 'users' && log.action !== 'USER_CERTIFIED') return false;
    if (activeTab === 'properties' && log.action !== 'PROPERTY_CERTIFIED_ANSUT') return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.entity_id.toLowerCase().includes(query) ||
        log.details?.notes?.toLowerCase().includes(query) ||
        log.user_email?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const stats = {
    total: logs.length,
    users: logs.filter((l) => l.action === 'USER_CERTIFIED').length,
    properties: logs.filter((l) => l.action === 'PROPERTY_CERTIFIED_ANSUT').length,
    thisMonth: logs.filter((l) => {
      const logDate = new Date(l.created_at);
      const now = new Date();
      return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
    }).length,
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Type', 'ID Entité', 'Détails'].join(','),
      ...filteredLogs.map((log) =>
        [
          format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
          log.action === 'USER_CERTIFIED' ? 'Utilisateur' : 'Propriété',
          log.entity_id,
          log.details?.notes || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certifications-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Export téléchargé');
  };

  return (
    <div className="min-h-screen bg-background">
      <TrustAgentHeader title="Historique des Certifications" />

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.users}</p>
                  <p className="text-sm text-muted-foreground">Utilisateurs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Home className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.properties}</p>
                  <p className="text-sm text-muted-foreground">Propriétés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Calendar className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.thisMonth}</p>
                  <p className="text-sm text-muted-foreground">Ce mois</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par ID, notes..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all" className="flex items-center justify-center gap-2">
              <Filter className="h-4 w-4" />
              Toutes ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center justify-center gap-2">
              <UserCheck className="h-4 w-4" />
              Utilisateurs ({stats.users})
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center justify-center gap-2">
              <Home className="h-4 w-4" />
              Propriétés ({stats.properties})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-20" />
                  </Card>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune certification trouvée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredLogs.map((log) => {
                  const isUserCert = log.action === 'USER_CERTIFIED';
                  const Icon = isUserCert ? UserCheck : Home;

                  return (
                    <Card key={log.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-3 rounded-lg ${isUserCert ? 'bg-blue-100' : 'bg-green-100'}`}
                          >
                            <Icon
                              className={`h-6 w-6 ${isUserCert ? 'text-blue-600' : 'text-green-600'}`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">
                                  {isUserCert
                                    ? 'Certification Utilisateur'
                                    : 'Certification Propriété ANSUT'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  ID: {log.entity_id.slice(0, 8)}...
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant={isUserCert ? 'default' : 'secondary'}>
                                  {isUserCert ? 'Utilisateur' : 'Propriété'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(log.created_at), 'dd MMM yyyy à HH:mm', {
                                    locale: fr,
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Details */}
                            <div className="mt-3 space-y-2">
                              {isUserCert && log.details && (
                                <div className="flex flex-wrap gap-2">
                                  <Badge
                                    variant={log.details.identity_verified ? 'default' : 'outline'}
                                    className="text-xs"
                                  >
                                    Identité {log.details.identity_verified ? '✓' : '✗'}
                                  </Badge>
                                  <Badge
                                    variant={log.details.oneci_verified ? 'default' : 'outline'}
                                    className="text-xs"
                                  >
                                    ONECI {log.details.oneci_verified ? '✓' : '✗'}
                                  </Badge>
                                  <Badge
                                    variant={log.details.cnam_verified ? 'default' : 'outline'}
                                    className="text-xs"
                                  >
                                    CNAM {log.details.cnam_verified ? '✓' : '✗'}
                                  </Badge>
                                </div>
                              )}

                              {!isUserCert && log.details?.checklist_passed && (
                                <div className="flex flex-wrap gap-2">
                                  {log.details.checklist_passed.map((item) => (
                                    <Badge
                                      key={item.id}
                                      variant={item.passed ? 'default' : 'outline'}
                                      className="text-xs"
                                    >
                                      {item.label.slice(0, 20)}... {item.passed ? '✓' : '✗'}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {log.details?.notes && (
                                <p className="text-sm text-muted-foreground flex items-start gap-2">
                                  <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                  {log.details.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
