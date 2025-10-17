import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Property {
  id: string;
  title: string;
  views: number;
  favorites: number;
  applications: number;
  conversionRate: number;
}

interface TopPropertiesTableProps {
  properties: Property[];
}

export const TopPropertiesTable = ({ properties }: TopPropertiesTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Biens les Plus Performants</CardTitle>
        <CardDescription>Top 5 par taux de conversion</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Bien</TableHead>
              <TableHead className="text-center">Vues</TableHead>
              <TableHead className="text-center">Favoris</TableHead>
              <TableHead className="text-center">Candidatures</TableHead>
              <TableHead className="text-right">Conversion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.map((property, index) => (
              <TableRow key={property.id} className="hover:bg-muted/50">
                <TableCell>
                  <Badge variant="outline" className="font-bold">
                    {index + 1}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link
                    to={`/property/${property.id}`}
                    className="font-medium hover:text-primary transition-colors line-clamp-1"
                  >
                    {property.title}
                  </Link>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{property.views}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{property.favorites}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{property.applications}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={property.conversionRate > 10 ? 'default' : 'secondary'}
                    className={property.conversionRate > 10 ? 'bg-green-600' : ''}
                  >
                    {property.conversionRate}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};