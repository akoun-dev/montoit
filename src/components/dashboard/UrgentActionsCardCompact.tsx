import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Image, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';

interface UrgentAction {
  id: string;
  type: 'overdue_application' | 'expiring_lease' | 'incomplete_property';
  title: string;
  priority: 'critical' | 'important' | 'info';
  link: string;
  daysOverdue?: number;
}

export const UrgentActionsCardCompact = ({ className }: { className?: string }) => {
  const [actions, setActions] = useState<UrgentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchUrgentActions();
  }, []);

  const fetchUrgentActions = async () => {
    try {
      const { data: overdueApps, error } = await supabase
        .from('rental_applications')
        .select(`
          id,
          property_id,
          processing_deadline,
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
          title: `${(app.properties as any)?.title || 'Bien'}`,
          priority: daysOverdue > 5 ? 'critical' : daysOverdue > 2 ? 'important' : 'info',
          link: '/tiers-de-confiance',
          daysOverdue
        };
      });

      setActions(urgentActions);
    } catch (error) {
      logger.logError(error, { context: 'UrgentActionsCardCompact', action: 'fetch' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Chargement...
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

  if (actions.length === 0) {
    return (
      <Card className={`border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 ${className}`}>
        <CardHeader className="p-4">
          <CardTitle className="text-sm text-green-700 dark:text-green-400">
            ✓ Tout est à jour
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const displayedActions = showAll ? actions : actions.slice(0, 5);

  return (
    <Card className={`border-orange-200 dark:border-orange-800 ${className}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            Actions Urgentes
          </CardTitle>
          <Badge variant="destructive" className="text-xs">{actions.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-2">
          {displayedActions.map((action) => (
            <Link
              key={action.id}
              to={action.link}
              className="flex items-center gap-2 p-2 rounded-lg border hover:bg-accent/50 transition-colors group"
            >
              <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{action.title}</p>
                <p className="text-xs text-destructive">
                  {action.daysOverdue}j de retard
                </p>
              </div>
              <Badge variant={getPriorityColor(action.priority)} className="text-xs">
                {action.priority === 'critical' ? 'Urgent' : 'Important'}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </div>
        {actions.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Voir moins' : `Voir ${actions.length - 5} de plus`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};