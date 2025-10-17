import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/services/logger';

interface MfaMetrics {
  total_admins: number;
  admins_with_2fa: number;
  unused_backup_codes: number;
  used_backup_codes: number;
  percentage_with_2fa: number;
}

interface AdminMfaStatus {
  user_id: string;
  full_name: string;
  role: string;
  has_2fa: boolean;
  unused_codes: number;
  last_login_attempt?: string;
}

export const MfaSecurityMonitor = () => {
  const { hasRole } = useAuth();
  const [metrics, setMetrics] = useState<MfaMetrics | null>(null);
  const [adminStatuses, setAdminStatuses] = useState<AdminMfaStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasRole('admin')) return;

    const fetchData = async () => {
      try {
        // Fetch metrics
        const { data: metricsData, error: metricsError } = await supabase
          .rpc('get_mfa_metrics');

        if (metricsError) throw metricsError;

        if (metricsData && metricsData.length > 0) {
          setMetrics(metricsData[0]);
        }

        // Fetch admin statuses
        const { data: admins, error: adminsError } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            role,
            profiles!inner(full_name)
          `)
          .in('role', ['admin', 'super_admin']);

        if (adminsError) throw adminsError;

        if (admins) {
          const statusPromises = admins.map(async (admin) => {
            const { data: codes } = await supabase
              .from('mfa_backup_codes')
              .select('used_at')
              .eq('user_id', admin.user_id);

            const { data: lastAttempt } = await supabase
              .from('mfa_login_attempts')
              .select('created_at')
              .eq('user_id', admin.user_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              user_id: admin.user_id,
              full_name: (admin.profiles as any).full_name,
              role: admin.role,
              has_2fa: (codes?.length || 0) > 0,
              unused_codes: codes?.filter(c => !c.used_at).length || 0,
              last_login_attempt: lastAttempt?.created_at,
            };
          });

          const statuses = await Promise.all(statusPromises);
          setAdminStatuses(statuses);
        }
      } catch (error) {
        logger.error('Error fetching MFA security data', { error });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hasRole]);

  if (!hasRole('admin')) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Accès refusé</AlertTitle>
        <AlertDescription>
          Vous devez être administrateur pour accéder à ce tableau de bord.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const adminsWithoutMfa = adminStatuses.filter(a => !a.has_2fa);

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_admins || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avec 2FA</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.admins_with_2fa || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.percentage_with_2fa?.toFixed(1)}% des admins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Codes inutilisés</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.unused_backup_codes || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Codes utilisés</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.used_backup_codes || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {adminsWithoutMfa.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alerte Sécurité</AlertTitle>
          <AlertDescription>
            {adminsWithoutMfa.length} administrateur(s) n'ont pas activé la 2FA.
            La sécurité du compte est compromise.
          </AlertDescription>
        </Alert>
      )}

      {/* Admin Statuses */}
      <Card>
        <CardHeader>
          <CardTitle>Statut 2FA des Administrateurs</CardTitle>
          <CardDescription>
            Vue d'ensemble de la sécurité 2FA pour tous les comptes administrateurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {adminStatuses.map((admin) => (
              <div
                key={admin.user_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {admin.has_2fa ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">{admin.full_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'}>
                        {admin.role}
                      </Badge>
                      {admin.has_2fa && (
                        <span className="text-sm text-muted-foreground">
                          {admin.unused_codes} codes restants
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {admin.has_2fa ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      2FA Activée
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      2FA Désactivée
                    </Badge>
                  )}
                  {admin.last_login_attempt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Dernier essai : {new Date(admin.last_login_attempt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
