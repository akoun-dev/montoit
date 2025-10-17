import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgencyMandates } from '@/hooks/useAgencyMandates';
import { useAgencyProperties } from '@/hooks/useAgencyProperties';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Building2, Users, Home, DollarSign, AlertTriangle, HelpCircle } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { InviteAgencyDialog } from '@/components/mandates/InviteAgencyDialog';
import { MandateCard } from '@/components/mandates/MandateCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MyMandates() {
  const { profile } = useAuth();
  const { asOwner, isLoading } = useAgencyMandates();
  const { stats: agencyStats } = useAgencyProperties();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Redirection si pas propriétaire
  if (profile && profile.user_type !== 'proprietaire' && profile.user_type !== 'agence') {
    return <Navigate to="/dashboard" replace />;
  }

  const activeMandates = asOwner.filter(m => m.status === 'active');
  const pendingMandates = asOwner.filter(m => m.status === 'pending');
  const terminatedMandates = asOwner.filter(m => 
    m.status === 'terminated' || m.status === 'expired'
  );

  // Mandats expirant dans moins de 30 jours
  const expiringSoon = activeMandates.filter(m => {
    if (!m.end_date) return false;
    const daysUntilExpiry = (new Date(m.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  });

  // Calculate statistics
  const totalCommissionRevenue = activeMandates.reduce((acc, m) => {
    if (m.commission_rate && agencyStats.totalProperties) {
      // Estimation simplifiée: supposons un loyer moyen de 150000 FCFA
      return acc + (150000 * (m.commission_rate / 100));
    }
    return acc + (m.fixed_fee || 0);
  }, 0);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes mandats de gestion</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les agences qui ont accès à vos biens
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/mandates/help" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Aide
            </Link>
          </Button>
          <Button onClick={() => setInviteDialogOpen(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Inviter une agence
          </Button>
        </div>
      </div>

      {/* Alertes */}
      {expiringSoon.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ {expiringSoon.length} mandat{expiringSoon.length > 1 ? 's' : ''} expire
            {expiringSoon.length > 1 ? 'nt' : ''} dans les 30 prochains jours.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mandats actifs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMandates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {asOwner.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Biens sous mandat</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agencyStats.totalProperties || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {agencyStats.totalOwners || 0} propriétaires
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenus estimés</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(totalCommissionRevenue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              FCFA / mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMandates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Invitations envoyées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Liste des mandats */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Actifs ({activeMandates.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            En attente ({pendingMandates.length})
          </TabsTrigger>
          <TabsTrigger value="terminated">
            Terminés ({terminatedMandates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeMandates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucun mandat actif</h3>
                  <p className="text-muted-foreground mb-4">
                    Invitez une agence pour commencer à déléguer la gestion de vos biens
                  </p>
                  <Button onClick={() => setInviteDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Inviter une agence
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeMandates.map(mandate => (
                <MandateCard key={mandate.id} mandate={mandate} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingMandates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  Aucune invitation en attente
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingMandates.map(mandate => (
                <MandateCard key={mandate.id} mandate={mandate} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="terminated" className="space-y-4">
          {terminatedMandates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12 text-muted-foreground">
                  Aucun mandat terminé
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {terminatedMandates.map(mandate => (
                <MandateCard key={mandate.id} mandate={mandate} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <InviteAgencyDialog 
        open={inviteDialogOpen} 
        onOpenChange={setInviteDialogOpen}
      />
    </div>
  );
}
