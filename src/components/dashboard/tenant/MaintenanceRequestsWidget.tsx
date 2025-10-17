import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MaintenanceRequestsWidgetProps {
  data?: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
    recent: Array<{
      id: string;
      property_id: string;
      title: string;
      status: string;
      urgency: string;
      created_at: string;
    }>;
  };
}

export const MaintenanceRequestsWidget = ({ data }: MaintenanceRequestsWidgetProps) => {
  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      pending: { variant: 'secondary', label: 'En attente' },
      in_progress: { variant: 'default', label: 'En cours' },
      completed: { variant: 'outline', label: 'Complété' },
    };
    
    const { variant, label } = config[status] || { variant: 'outline', label: status };
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  };

  const getUrgencyIcon = (urgency: string) => {
    return urgency === 'urgent' 
      ? <AlertCircle className="h-3 w-3 text-red-600" />
      : null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Wrench className="h-5 w-5 text-primary" />
          Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-secondary/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-600">{data?.pending || 0}</div>
              <div className="text-xs text-muted-foreground">En attente</div>
            </div>
            <div className="bg-secondary/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{data?.in_progress || 0}</div>
              <div className="text-xs text-muted-foreground">En cours</div>
            </div>
            <div className="bg-secondary/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{data?.completed || 0}</div>
              <div className="text-xs text-muted-foreground">Complétés</div>
            </div>
          </div>

          {/* Recent requests */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Demandes récentes</h4>
            {data?.recent && data.recent.length > 0 ? (
              <div className="space-y-2">
                {data.recent.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center justify-between border rounded-lg p-2">
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {getUrgencyIcon(request.urgency)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{request.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune demande de maintenance
              </p>
            )}
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link to="/maintenance">
              Voir toutes <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
