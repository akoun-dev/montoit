import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileCheck, ArrowRight, Calendar, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ActiveLeaseWidgetProps {
  data?: {
    active: number;
    total: number;
    current: {
      id: string;
      property_id: string;
      property_title: string;
      monthly_rent: number;
      start_date: string;
      end_date: string;
      status: string;
    } | null;
  };
}

export const ActiveLeaseWidget = ({ data }: ActiveLeaseWidgetProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileCheck className="h-5 w-5 text-primary" />
          Mon bail actif
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data?.current ? (
          <div className="space-y-4">
            <div className="bg-primary/5 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">{data.current.property_title}</h4>
                </div>
                <Badge variant="default" className="bg-green-600">Actif</Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loyer mensuel:</span>
                  <span className="font-semibold">{data.current.monthly_rent.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Période:
                  </span>
                  <span className="text-xs">
                    {new Date(data.current.start_date).toLocaleDateString('fr-FR')} - {new Date(data.current.end_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to="/leases">
                Voir les détails <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 space-y-3">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">Aucun bail actif</p>
            <p className="text-xs text-muted-foreground">
              {data?.total && data.total > 0 
                ? `${data.total} bail(x) total` 
                : 'Déposez une candidature pour louer un bien'}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/recherche">
                Rechercher un bien
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
