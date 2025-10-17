import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Property {
  id: string;
  title: string;
  property_type: string;
  city: string;
  monthly_rent: number;
  status: string;
  main_image?: string | null;
  view_count?: number;
  favorites_count?: number;
  applications_count?: number;
}

interface PropertyTableViewProps {
  properties: Property[];
  selectedProperties: string[];
  onToggleSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const PropertyTableView = ({
  properties,
  selectedProperties,
  onToggleSelect,
  onEdit,
  onDelete,
}: PropertyTableViewProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-20">Image</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-32">Prix/mois</TableHead>
            <TableHead className="text-center w-32">Stats</TableHead>
            <TableHead className="w-24">Statut</TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.map((property) => (
            <TableRow key={property.id} className="hover:bg-muted/50">
              <TableCell>
                <Checkbox
                  checked={selectedProperties.includes(property.id)}
                  onCheckedChange={() => onToggleSelect(property.id)}
                />
              </TableCell>
              <TableCell>
                <div className="h-10 w-14 rounded overflow-hidden bg-muted">
                  {property.main_image ? (
                    <img
                      src={property.main_image}
                      alt={property.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Link
                  to={`/bien/${property.id}`}
                  className="font-medium hover:text-primary transition-colors line-clamp-1"
                >
                  {property.title}
                </Link>
                <div className="text-xs text-muted-foreground">{property.city}</div>
              </TableCell>
              <TableCell className="text-sm">{property.property_type}</TableCell>
              <TableCell className="font-medium">
                {property.monthly_rent.toLocaleString()} FCFA
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    {property.view_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    ⭐ {property.favorites_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    ✉ {property.applications_count || 0}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={property.status} variant="compact" />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      •••
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/bien/${property.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        Voir
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(property.id)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(property.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};