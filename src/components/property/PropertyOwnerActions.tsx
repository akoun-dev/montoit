import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Edit, Eye, Heart, FileText } from 'lucide-react';
import { Property, PropertyStats } from '@/types';

interface PropertyOwnerActionsProps {
  property: Property;
  stats: PropertyStats | null;
  onStatusChange: (status: string) => void;
}

export const PropertyOwnerActions = ({ property, stats, onStatusChange }: PropertyOwnerActionsProps) => {
  const navigate = useNavigate();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(property.status);

  const handleStatusUpdate = () => {
    onStatusChange(selectedStatus);
    setStatusDialogOpen(false);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Actions du propriétaire</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <Eye className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats?.views || 0}</p>
            <p className="text-sm text-muted-foreground">Vues</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <Heart className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats?.favorites || 0}</p>
            <p className="text-sm text-muted-foreground">Favoris</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats?.applications || 0}</p>
            <p className="text-sm text-muted-foreground">Candidatures</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Taux conversion</p>
            <p className="text-2xl font-bold text-primary">
              {stats?.conversionRate || 0}%
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={() => navigate(`/edit-property/${property.id}`)}
            className="flex-1"
          >
            <Edit className="h-4 w-4 mr-2" />
            Modifier le bien
          </Button>

          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1">
                Changer le statut
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Changer le statut du bien</DialogTitle>
                <DialogDescription>
                  Sélectionnez le nouveau statut pour ce bien
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="loué">Loué</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="retiré">Retiré</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleStatusUpdate} className="w-full">
                  Mettre à jour
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};
