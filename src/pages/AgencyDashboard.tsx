import { useAuth } from '@/hooks/useAuth';
import { useAgencyMandates } from '@/hooks/useAgencyMandates';
import { useAgencyProperties } from '@/hooks/useAgencyProperties';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, TrendingUp, FileCheck, AlertCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AgencyMandatesList } from '@/components/agency/AgencyMandatesList';
import { AgencyPropertiesView } from '@/components/agency/AgencyPropertiesView';
import { AgencyFinancialStats } from '@/components/agency/AgencyFinancialStats';

export default function AgencyDashboard() {
  const { profile } = useAuth();
  const { pendingMandates, activeMandates, asAgency, isLoading } = useAgencyMandates();
  const { stats, managedProperties } = useAgencyProperties();

  // Mandats expirant dans moins de 30 jours
  const expiringSoon = activeMandates.filter(m => {
    if (!m.end_date) return false;
    const daysUntilExpiry = (new Date(m.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  });

  // Redirection si pas une agence
  if (profile && profile.user_type !== 'agence') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord Agence</h1>
          <p className="text-muted-foreground mt-2">
            Gérez vos mandats et propriétés confiées
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/mandates/help" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Aide
            </Link>
          </Button>
          {pendingMandates.length > 0 && (
            <Badge variant="default" className="text-lg px-4 py-2">
              {pendingMandates.length} invitation{pendingMandates.length > 1 ? 's' : ''} en attente
            </Badge>
          )}
        </div>
      </div>

      {/* Alertes */}
      <div className="space-y-4">
        {pendingMandates.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vous avez {pendingMandates.length} nouvelle{pendingMandates.length > 1 ? 's' : ''} invitation
              {pendingMandates.length > 1 ? 's' : ''} de mandat à traiter.
            </AlertDescription>
          </Alert>
        )}

        {expiringSoon.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              ⚠️ {expiringSoon.length} mandat{expiringSoon.length > 1 ? 's' : ''} expire
              {expiringSoon.length > 1 ? 'nt' : ''} dans les 30 prochains jours. 
              Contactez vos clients pour renouveler.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Mandats actifs</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMandates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {asAgency.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Biens gérés</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.availableProperties} disponibles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Propriétaires</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOwners}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clients actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux occupation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalProperties > 0 
                ? Math.round((stats.rentedProperties / stats.totalProperties) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.rentedProperties} biens loués
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="mandates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mandates">
            Mes mandats ({asAgency.length})
          </TabsTrigger>
          <TabsTrigger value="properties">
            Biens gérés ({stats.totalProperties})
          </TabsTrigger>
          <TabsTrigger value="financials">
            Financier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mandates" className="space-y-4">
          <AgencyMandatesList 
            mandates={asAgency} 
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <AgencyPropertiesView 
            properties={managedProperties}
            mandates={activeMandates}
          />
        </TabsContent>

        <TabsContent value="financials" className="space-y-4">
          <AgencyFinancialStats 
            mandates={activeMandates}
            properties={managedProperties}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
