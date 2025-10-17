import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Image, FileWarning } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';

interface UrgentAction {
  id: string;
  type: 'overdue_application' | 'expiring_lease' | 'incomplete_property';
  title: string;
  description: string;
  priority: 'critical' | 'important' | 'info';
  link: string;
  daysOverdue?: number;
}

const UrgentActionsCard = () => {
  const [actions, setActions] = useState<UrgentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUrgentActions();
  }, []);

  const fetchUrgentActions = async () => {
    try {
      // Récupérer les candidatures en retard
      const { data: overdueApps, error } = await supabase
        .from('rental_applications')
        .select(`
          id,
          property_id,
          processing_deadline,
          created_at,
          properties (title)
        `)
        .eq('status', 'pending')
        .eq('is_overdue', true)
        .order('processing_deadline', { ascending: true })
        .limit(10);

      if (error) throw error;

      const urgentActions: UrgentAction[] = (overdueApps || []).map(app => {
        const deadline = new Date(app.processing_deadline);
        const now = new Date();
        const diffMs = now.getTime() - deadline.getTime();
        const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        return {
          id: app.id,
          type: 'overdue_application',
          title: `Candidature en retard - ${(app.properties as any)?.title || 'Bien'}`,
          description: `Cette candidature dépasse le délai de traitement`,
          priority: daysOverdue > 5 ? 'critical' : daysOverdue > 2 ? 'important' : 'info',
          link: '/tiers-de-confiance',
          daysOverdue
        };
      });

      setActions(urgentActions);
    } catch (error) {
      logger.logError(error, { context: 'UrgentActionsCard', action: 'fetch' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  const getPriorityColor = (priority: UrgentAction['priority']) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'important': return 'default';
      case 'info': return 'secondary';
    }
  };

  const getIcon = (type: UrgentAction['type']) => {
    switch (type) {
      case 'overdue_application': return Clock;
      case 'expiring_lease': return AlertCircle;
      case 'incomplete_property': return Image;
      default: return FileWarning;
    }
  };

  if (actions.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-700 dark:text-green-400">✓ Tout est à jour</CardTitle>
          <CardDescription className="text-green-600 dark:text-green-500">
            Aucune action urgente requise pour le moment
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Actions Urgentes
        </CardTitle>
        <CardDescription>
          {actions.length} action{actions.length > 1 ? 's' : ''} nécessitant votre attention
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {actions.map((action) => {
            const Icon = getIcon(action.type);
            return (
              <div
                key={action.id}
                className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex gap-3 flex-1">
                  <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{action.title}</p>
                      <Badge variant={getPriorityColor(action.priority)} className="text-xs">
                        {action.priority === 'critical' ? 'Critique' : 
                         action.priority === 'important' ? 'Important' : 'Info'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                    {action.daysOverdue && (
                      <p className="text-xs text-destructive">
                        En retard de {action.daysOverdue} jour{action.daysOverdue > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to={action.link}>Gérer</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default UrgentActionsCard;
