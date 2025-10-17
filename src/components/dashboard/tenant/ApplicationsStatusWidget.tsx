import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ApplicationsStatusWidgetProps {
  data?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    recent: Array<{
      id: string;
      property_id: string;
      property_title: string;
      status: string;
      created_at: string;
      application_score: number;
    }>;
  };
}

export const ApplicationsStatusWidget = ({ data }: ApplicationsStatusWidgetProps) => {
  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      pending: { variant: 'secondary', label: '🟡 En attente' },
      approved: { variant: 'default', label: '🟢 Approuvée' },
      rejected: { variant: 'destructive', label: '🔴 Rejetée' },
    };
    
    const { variant, label } = config[status] || { variant: 'outline', label: status };
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-5 w-5 text-primary" />
          Mes candidatures
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
              <div className="text-2xl font-bold text-green-600">{data?.approved || 0}</div>
              <div className="text-xs text-muted-foreground">Approuvées</div>
            </div>
            <div className="bg-secondary/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">{data?.rejected || 0}</div>
              <div className="text-xs text-muted-foreground">Rejetées</div>
            </div>
          </div>

          {/* Recent applications */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Récentes</h4>
            {data?.recent && data.recent.length > 0 ? (
              <div className="space-y-2">
                {data.recent.slice(0, 3).map((app) => (
                  <div key={app.id} className="flex items-center justify-between border rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{app.property_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    {getStatusBadge(app.status)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune candidature
              </p>
            )}
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link to="/applications">
              Voir toutes <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
