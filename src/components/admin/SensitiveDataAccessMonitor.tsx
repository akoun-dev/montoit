import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';

interface AccessLog {
  id: string;
  requester_id: string;
  target_user_id: string;
  data_type: string;
  access_granted: boolean;
  relationship_type: string;
  metadata: any;
  accessed_at: string;
}

export const SensitiveDataAccessMonitor = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDataType, setFilterDataType] = useState<string>('all');
  const [searchUserId, setSearchUserId] = useState('');

  useEffect(() => {
    fetchAccessLogs();
  }, [filterDataType]);

  const fetchAccessLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sensitive_data_access_log')
        .select('*')
        .order('accessed_at', { ascending: false })
        .limit(100);

      if (filterDataType !== 'all') {
        query = query.eq('data_type', filterDataType);
      }

      if (searchUserId.trim()) {
        query = query.or(`requester_id.eq.${searchUserId},target_user_id.eq.${searchUserId}`);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching access logs', { error });
        toast({
          title: "Erreur",
          description: "Impossible de charger les logs d'accès",
          variant: "destructive",
        });
      } else {
        setLogs(data || []);
      }
    } catch (error) {
      logger.error('Exception fetching logs', { error });
    } finally {
      setLoading(false);
    }
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType) {
      case 'phone':
        return '📱';
      case 'verification':
        return '🆔';
      case 'payment':
        return '💳';
      case 'dispute':
        return '⚖️';
      default:
        return '📄';
    }
  };

  const getAccessBadge = (granted: boolean) => {
    return granted ? (
      <Badge variant="default" className="bg-green-600">
        <CheckCircle className="w-3 h-3 mr-1" />
        Autorisé
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Refusé
      </Badge>
    );
  };

  const getRelationshipBadge = (relationship: string) => {
    const colors: Record<string, string> = {
      'self': 'bg-primary',
      'admin': 'bg-destructive',
      'landlord_to_applicant': 'bg-success',
      'applicant_to_landlord': 'bg-success',
      'lease_party': 'bg-warning',
      'unauthorized': 'bg-destructive',
    };

    return (
      <Badge variant="outline" className={colors[relationship] || ''}>
        {relationship}
      </Badge>
    );
  };

  // Detect suspicious patterns
  const suspiciousLogs = logs.filter(log => !log.access_granted);
  const recentUnauthorized = suspiciousLogs.filter(log => {
    const logTime = new Date(log.accessed_at).getTime();
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return logTime > oneHourAgo;
  });

  return (
    <div className="space-y-4">
      {/* Alert for suspicious activity */}
      {recentUnauthorized.length > 10 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
              <AlertTriangle className="h-5 w-5" />
              Activité suspecte détectée
            </CardTitle>
            <CardDescription className="text-red-800 dark:text-red-200">
              {recentUnauthorized.length} tentatives d'accès non autorisées dans la dernière heure
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total accès</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Autorisés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {logs.filter(l => l.access_granted).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Refusés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {suspiciousLogs.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dernière heure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentUnauthorized.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Logs d'accès aux données sensibles
          </CardTitle>
          <CardDescription>
            Surveillance des accès aux numéros de téléphone, vérifications, paiements, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={filterDataType} onValueChange={setFilterDataType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Type de données" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="phone">📱 Téléphone</SelectItem>
                <SelectItem value="verification">🆔 Vérification</SelectItem>
                <SelectItem value="payment">💳 Paiement</SelectItem>
                <SelectItem value="dispute">⚖️ Dispute</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Rechercher par User ID..."
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchAccessLogs();
                }
              }}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun log d'accès trouvé
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getDataTypeIcon(log.data_type)}</span>
                        <span className="font-medium">{log.data_type}</span>
                        {getAccessBadge(log.access_granted)}
                        {getRelationshipBadge(log.relationship_type)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-mono">{log.requester_id.substring(0, 8)}...</span>
                        {' → '}
                        <span className="font-mono">{log.target_user_id.substring(0, 8)}...</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {new Date(log.accessed_at).toLocaleString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SensitiveDataAccessMonitor;
