import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, Bell } from 'lucide-react';
import { useMfaCompliance } from '@/hooks/useMfaCompliance';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export const EnhancedMfaSecurityMonitor = () => {
  const { admins, loading, stats, refresh } = useMfaCompliance();
  const { toast } = useToast();
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);

  const handleSendReminder = async (userId: string, fullName: string) => {
    setSendingNotification(userId);
    try {
      // Simuler l'envoi de notification
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Rappel envoyé",
        description: `Notification envoyée à ${fullName}`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la notification",
        variant: "destructive",
      });
    } finally {
      setSendingNotification(null);
    }
  };

  const getStatusIcon = (status: 'compliant' | 'warning' | 'critical') => {
    switch (status) {
      case 'compliant':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getGracePeriodText = (admin: typeof admins[0]) => {
    if (admin.has_mfa) {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          Conforme
        </span>
      );
    }

    if (admin.status === 'critical') {
      return (
        <span className="flex items-center gap-1 text-destructive font-medium">
          <XCircle className="h-3 w-3" />
          Expiré depuis {-admin.days_remaining} jour{-admin.days_remaining > 1 ? 's' : ''}
        </span>
      );
    }

    if (admin.status === 'warning') {
      return (
        <span className="flex items-center gap-1 text-amber-600 font-medium">
          <Clock className="h-3 w-3" />
          Expire dans {admin.days_remaining} jour{admin.days_remaining > 1 ? 's' : ''}
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Clock className="h-3 w-3" />
        {admin.days_remaining} jours restants
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {stats.critical > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>🚨 Action Immédiate Requise</AlertTitle>
          <AlertDescription className="mt-2">
            {stats.critical} administrateur{stats.critical > 1 ? 's' : ''} doi{stats.critical > 1 ? 'vent' : 't'} activer la 2FA immédiatement.
            Leur accès aux fonctions sensibles est bloqué.
          </AlertDescription>
        </Alert>
      )}

      {stats.warning > 0 && stats.critical === 0 && (
        <Alert className="border-amber-500 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900">⚠️ Attention</AlertTitle>
          <AlertDescription className="text-amber-800">
            {stats.warning} administrateur{stats.warning > 1 ? 's' : ''} doi{stats.warning > 1 ? 'vent' : 't'} activer la 2FA avant expiration du délai de grâce.
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conformes</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.compliant}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0}% du total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Attente</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.warning}</div>
            <p className="text-xs text-muted-foreground">Grace period actif</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critiques</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Grace period expiré</p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>État MFA des Administrateurs</CardTitle>
              <CardDescription>Suivi de la conformité 2FA en temps réel</CardDescription>
            </div>
            <Button onClick={refresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statut</TableHead>
                <TableHead>Administrateur</TableHead>
                <TableHead>MFA</TableHead>
                <TableHead>Grace Period</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.user_id}>
                  <TableCell>{getStatusIcon(admin.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{admin.full_name}</span>
                      <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'} className="w-fit mt-1">
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {admin.has_mfa ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Activée
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        Désactivée
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{getGracePeriodText(admin)}</TableCell>
                  <TableCell className="text-right">
                    {!admin.has_mfa && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendReminder(admin.user_id, admin.full_name)}
                        disabled={sendingNotification === admin.user_id}
                      >
                        <Bell className="h-3 w-3 mr-2" />
                        {sendingNotification === admin.user_id ? 'Envoi...' : 'Rappel'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {admins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun administrateur trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
