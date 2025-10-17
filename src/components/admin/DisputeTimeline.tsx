import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, User } from 'lucide-react';

interface AuditLog {
  id: string;
  action_type: string;
  created_at: string;
  old_values: any;
  new_values: any;
  notes: string | null;
  admin: { full_name: string } | null;
}

interface DisputeTimelineProps {
  disputeId: string;
}

export const DisputeTimeline = ({ disputeId }: DisputeTimelineProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [disputeId]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select(`
          *,
          admin:admin_id(full_name)
        `)
        .eq('target_type', 'dispute')
        .eq('target_id', disputeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLogs((data || []) as unknown as AuditLog[]);
    } catch (error) {
      logger.error('Error fetching dispute timeline', { error, disputeId });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (actionType: string) => {
    if (actionType.includes('resolved')) return <Badge variant="default">Résolu</Badge>;
    if (actionType.includes('closed')) return <Badge variant="outline">Fermé</Badge>;
    if (actionType.includes('in_review')) return <Badge variant="secondary">En révision</Badge>;
    return <Badge>{actionType}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique des actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune action enregistrée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Historique des actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {log.admin?.full_name || 'Système'}
                </p>
                {getActionBadge(log.action_type)}
              </div>
              {log.notes && (
                <p className="text-sm text-muted-foreground">{log.notes}</p>
              )}
              {log.old_values && log.new_values && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {log.old_values.status && log.new_values.status && (
                    <p>Statut: {log.old_values.status} → {log.new_values.status}</p>
                  )}
                  {log.old_values.priority && log.new_values.priority && (
                    <p>Priorité: {log.old_values.priority} → {log.new_values.priority}</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(log.created_at), 'PPP à HH:mm', { locale: fr })}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
