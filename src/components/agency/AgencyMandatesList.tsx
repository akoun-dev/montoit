import { AgencyMandate } from '@/hooks/useAgencyMandates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Check, X, Pause, Eye, Edit, Trash, Users, Wrench, DollarSign, FileText, Home } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAgencyMandates } from '@/hooks/useAgencyMandates';
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
} from "@/components/ui/alert-dialog";

interface AgencyMandatesListProps {
  mandates: AgencyMandate[];
  isLoading: boolean;
}

export function AgencyMandatesList({ mandates, isLoading }: AgencyMandatesListProps) {
  const { acceptMandate, refuseMandate } = useAgencyMandates();

  const getStatusBadge = (status: AgencyMandate['status']) => {
    const variants = {
      pending: { variant: 'secondary' as const, label: 'En attente' },
      active: { variant: 'default' as const, label: 'Actif' },
      suspended: { variant: 'outline' as const, label: 'Suspendu' },
      terminated: { variant: 'destructive' as const, label: 'Résilié' },
      expired: { variant: 'outline' as const, label: 'Expiré' },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMandateTypeLabel = (type: AgencyMandate['mandate_type']) => {
    const labels = {
      location: 'Location',
      gestion_complete: 'Gestion complète',
      vente: 'Vente',
    };
    return labels[type];
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (mandates.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun mandat</h3>
            <p className="text-muted-foreground">
              Vous n'avez pas encore de mandat de gestion
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {mandates.map(mandate => (
        <Card key={mandate.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-lg">
                    {getMandateTypeLabel(mandate.mandate_type)}
                  </CardTitle>
                  {getStatusBadge(mandate.status)}
                </div>
                <CardDescription>
                  {mandate.property_id ? 'Mandat spécifique' : 'Mandat global'} 
                  {' • '}
                  Depuis le {format(new Date(mandate.start_date), 'dd MMMM yyyy', { locale: fr })}
                  {mandate.end_date ? ` jusqu'au ${format(new Date(mandate.end_date), 'dd MMMM yyyy', { locale: fr })}` : ' • Durée indéterminée'}
                </CardDescription>
              </div>
              
              {mandate.status === 'pending' && (
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => acceptMandate(mandate.id)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accepter
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <X className="h-4 w-4 mr-1" />
                        Refuser
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Refuser ce mandat ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir refuser ce mandat de gestion ?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => refuseMandate({ mandateId: mandate.id })}
                        >
                          Confirmer le refus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {mandate.commission_rate && (
                <div>
                  <p className="text-sm text-muted-foreground">Commission</p>
                  <p className="font-medium">{mandate.commission_rate}%</p>
                </div>
              )}
              {mandate.fixed_fee && (
                <div>
                  <p className="text-sm text-muted-foreground">Frais fixes</p>
                  <p className="font-medium">{mandate.fixed_fee} FCFA</p>
                </div>
              )}
              {mandate.billing_frequency && (
                <div>
                  <p className="text-sm text-muted-foreground">Facturation</p>
                  <p className="font-medium capitalize">{mandate.billing_frequency}</p>
                </div>
              )}
              {mandate.end_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Fin prévue</p>
                  <p className="font-medium">
                    {format(new Date(mandate.end_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              )}
            </div>

            {/* Permissions with icons */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium mb-3">Permissions accordées :</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Propriétés */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Home className="h-3 w-3" /> Propriétés
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {mandate.permissions.can_view_properties && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Eye className="h-3 w-3" /> Voir
                      </Badge>
                    )}
                    {mandate.permissions.can_edit_properties && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Edit className="h-3 w-3" /> Modifier
                      </Badge>
                    )}
                    {mandate.permissions.can_create_properties && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <FileText className="h-3 w-3" /> Créer
                      </Badge>
                    )}
                    {mandate.permissions.can_delete_properties && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Trash className="h-3 w-3" /> Supprimer
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Candidatures */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Candidatures
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {mandate.permissions.can_view_applications && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Eye className="h-3 w-3" /> Voir
                      </Badge>
                    )}
                    {mandate.permissions.can_manage_applications && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Edit className="h-3 w-3" /> Gérer
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Gestion */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Gestion
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {mandate.permissions.can_create_leases && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <FileText className="h-3 w-3" /> Baux
                      </Badge>
                    )}
                    {mandate.permissions.can_manage_maintenance && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Wrench className="h-3 w-3" /> Maintenance
                      </Badge>
                    )}
                    {mandate.permissions.can_manage_documents && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <FileText className="h-3 w-3" /> Documents
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Financier */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Financier
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {mandate.permissions.can_view_financials && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Eye className="h-3 w-3" /> Voir finances
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {mandate.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">{mandate.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
