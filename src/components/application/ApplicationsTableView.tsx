import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Home } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ApplicationDisplay {
  id: string;
  property_id: string;
  applicant_id: string;
  status: string;
  created_at: string;
  application_score: number | null;
  is_overdue?: boolean;
  properties: {
    title: string;
    monthly_rent: number;
    city: string;
  };
  profiles: {
    full_name: string;
    oneci_verified: boolean;
    cnam_verified: boolean;
  };
}

interface ApplicationsTableViewProps {
  applications: ApplicationDisplay[];
  onSelect: (application: ApplicationDisplay) => void;
  isOwner: boolean;
}

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'pending': 'secondary',
  'approved': 'default',
  'rejected': 'destructive',
  'withdrawn': 'outline',
};

const STATUS_LABELS: Record<string, string> = {
  'pending': 'En attente',
  'approved': 'Approuvée',
  'rejected': 'Rejetée',
  'withdrawn': 'Retirée',
};

export const ApplicationsTableView = ({
  applications,
  onSelect,
  isOwner,
}: ApplicationsTableViewProps) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bien</TableHead>
            <TableHead>{isOwner ? 'Candidat' : 'Ville'}</TableHead>
            <TableHead className="w-32">Loyer</TableHead>
            <TableHead className="text-center w-20">Score</TableHead>
            <TableHead className="w-32">Statut</TableHead>
            <TableHead className="w-28">Déposée le</TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <TableRow key={application.id} className="hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate max-w-[200px] font-medium">
                    {application.properties.title}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {isOwner ? (
                  <div className="flex items-center gap-2">
                    <span>{application.profiles.full_name}</span>
                    {application.profiles.oneci_verified && (
                      <Badge variant="outline" className="text-xs">ONECI</Badge>
                    )}
                  </div>
                ) : (
                  application.properties.city
                )}
              </TableCell>
              <TableCell className="font-medium">
                {application.properties.monthly_rent.toLocaleString()} FCFA
              </TableCell>
              <TableCell className="text-center">
                {application.application_score > 0 ? (
                  <Badge variant="default" className="text-xs">
                    {application.application_score}/100
                  </Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANTS[application.status] || 'outline'}>
                    {STATUS_LABELS[application.status] || application.status}
                  </Badge>
                  {application.is_overdue && (
                    <Badge variant="destructive" className="text-xs">
                      En retard
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(application.created_at).toLocaleDateString('fr-FR')}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelect(application)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};