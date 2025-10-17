import { AgencyMandate, useAgencyMandates } from '@/hooks/useAgencyMandates';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ContextualTooltip } from '@/components/help/ContextualTooltip';
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
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

interface MandateCardProps {
  mandate: AgencyMandate;
}

export function MandateCard({ mandate }: MandateCardProps) {
  const { terminateMandate, acceptMandate, refuseMandate } = useAgencyMandates();
  const { user } = useAuth();
  const [terminationReason, setTerminationReason] = useState('');
  const [refusalReason, setRefusalReason] = useState('');

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-lg">
                    {getMandateTypeLabel(mandate.mandate_type)}
                  </CardTitle>
                  {getStatusBadge(mandate.status)}
                  <ContextualTooltip
                    id="mandate_status"
                    title="Statut du mandat"
                    content={
                      mandate.status === 'pending' ? 'En attente d\'acceptation par l\'agence' :
                      mandate.status === 'active' ? 'Mandat actif - L\'agence gère vos biens' :
                      mandate.status === 'suspended' ? 'Mandat suspendu temporairement' :
                      mandate.status === 'terminated' ? 'Mandat résilié - Plus aucune permission' :
                      'Mandat expiré à la date prévue'
                    }
                  />
                </div>
                <CardDescription>
                  {mandate.property_id ? 'Mandat spécifique' : 'Mandat global'} 
                  {' • '}
                  Depuis le {format(new Date(mandate.start_date), 'dd MMMM yyyy', { locale: fr })}
                  {mandate.end_date ? ` jusqu'au ${format(new Date(mandate.end_date), 'dd MMMM yyyy', { locale: fr })}` : ' • Durée indéterminée'}
                </CardDescription>
              </div>

          {/* Boutons pour l'agence (mandat en attente) */}
          {mandate.status === 'pending' && user?.id === mandate.agency_id && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="default"
                onClick={() => acceptMandate(mandate.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accepter
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <XCircle className="h-4 w-4 mr-1" />
                    Refuser
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Refuser ce mandat ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le propriétaire sera notifié de votre refus. Cette action est définitive.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <label className="text-sm font-medium">Motif de refus (obligatoire)</label>
                    <Textarea
                      value={refusalReason}
                      onChange={(e) => setRefusalReason(e.target.value)}
                      placeholder="Expliquez pourquoi vous refusez ce mandat..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setRefusalReason('')}>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (refusalReason.trim()) {
                          refuseMandate({ 
                            mandateId: mandate.id, 
                            reason: refusalReason 
                          });
                          setRefusalReason('');
                        }
                      }}
                      disabled={!refusalReason.trim()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmer le refus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Boutons pour le propriétaire (mandat actif) */}
          {mandate.status === 'active' && user?.id === mandate.owner_id && (
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Résilier
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Résilier ce mandat ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      L'agence perdra immédiatement l'accès à vos biens. Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <label className="text-sm font-medium">Motif de résiliation</label>
                    <Textarea
                      value={terminationReason}
                      onChange={(e) => setTerminationReason(e.target.value)}
                      placeholder="Expliquez pourquoi vous résiliez ce mandat..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        terminateMandate({ 
                          mandateId: mandate.id, 
                          reason: terminationReason || 'Résilié par le propriétaire' 
                        });
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmer la résiliation
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

        {/* Permissions */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium mb-2">Permissions accordées :</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(mandate.permissions)
              .filter(([_, value]) => value)
              .map(([key]) => (
                <Badge key={key} variant="secondary" className="text-xs">
                  {key.replace('can_', '').replace(/_/g, ' ')}
                </Badge>
              ))}
          </div>
        </div>

        {(mandate.notes || mandate.termination_reason) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {mandate.termination_reason || mandate.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
