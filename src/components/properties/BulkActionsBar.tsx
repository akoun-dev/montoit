import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Eye, EyeOff, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onBulkStatusChange: (status: string) => void;
}

const BulkActionsBar = ({ 
  selectedCount, 
  onClearSelection, 
  onBulkDelete,
  onBulkStatusChange 
}: BulkActionsBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center gap-4">
        <Badge variant="secondary" className="px-3 py-1">
          {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
        </Badge>
        
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onBulkStatusChange('disponible')}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Rendre disponible
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onBulkStatusChange('en_maintenance')}
            className="gap-2"
          >
            <EyeOff className="h-4 w-4" />
            Maintenance
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer {selectedCount} bien{selectedCount > 1 ? 's' : ''} ?
                  Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={onBulkDelete}>
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BulkActionsBar;
