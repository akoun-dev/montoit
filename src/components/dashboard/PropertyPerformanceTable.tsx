import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface Property {
  property_id: string;
  property_title: string;
  property_image: string | null;
  monthly_rent: number;
  views_7d: number;
  views_30d: number;
  applications_count: number;
  conversion_rate: number;
  status: string;
}

interface PropertyPerformanceTableProps {
  properties: Property[];
  loading?: boolean;
}

export const PropertyPerformanceTable = ({ properties, loading }: PropertyPerformanceTableProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (properties.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Performance par Bien</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucune propriété à afficher pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Performance par Bien</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bien</TableHead>
                <TableHead>Loyer</TableHead>
                <TableHead className="text-center">Vues (7j)</TableHead>
                <TableHead className="text-center">Candidatures</TableHead>
                <TableHead className="text-center">Conversion</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow key={property.property_id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {property.property_image && (
                        <img 
                          src={property.property_image} 
                          alt={property.property_title}
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <span className="truncate max-w-xs">{property.property_title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{property.monthly_rent.toLocaleString()} FCFA</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      {property.views_7d}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{property.applications_count}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={property.conversion_rate > 5 ? 'default' : 'secondary'}>
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {property.conversion_rate}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={property.status === 'disponible' ? 'default' : 'secondary'}>
                      {property.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/property/${property.property_id}`)}
                      >
                        Voir
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/edit-property/${property.property_id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
