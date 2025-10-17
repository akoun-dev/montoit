import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Home, Users, FileText, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { handleError } from '@/lib/errorHandler';

const AdminStats = () => {
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingProperties: 0,
    totalUsers: 0,
    totalLeases: 0,
    certifiedLeases: 0,
  });
  const [securityStats, setSecurityStats] = useState({
    failedLogins: 0,
    massActions: 0,
    lastSuspiciousAction: null as string | null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [propertiesRes, usersRes, leasesRes, certifiedRes] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('leases').select('id', { count: 'exact', head: true }),
        supabase.from('leases').select('id', { count: 'exact', head: true }).not('ansut_certified_at', 'is', null),
      ]);

      const pendingProps = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'en_attente');

      setStats({
        totalProperties: propertiesRes.count || 0,
        pendingProperties: pendingProps.count || 0,
        totalUsers: usersRes.count || 0,
        totalLeases: leasesRes.count || 0,
        certifiedLeases: certifiedRes.count || 0,
      });

      // Fetch security stats (dernières 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { count: failedCount } = await supabase
        .from('login_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('success', false)
        .gte('created_at', oneDayAgo);

      const { data: massActionsData } = await supabase.rpc('detect_mass_actions');

      const { data: suspiciousActions } = await supabase
        .from('admin_audit_logs')
        .select('action_type, created_at')
        .in('action_type', ['role_assigned', 'role_revoked', 'dispute_resolved'])
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      setSecurityStats({
        failedLogins: failedCount || 0,
        massActions: massActionsData?.length || 0,
        lastSuspiciousAction: suspiciousActions?.[0]
          ? `${suspiciousActions[0].action_type} (${new Date(suspiciousActions[0].created_at).toLocaleTimeString('fr-FR')})`
          : null,
      });
    } catch (error) {
      handleError(error, 'Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="h-20 bg-muted/50" />
            <CardContent className="h-16 bg-muted/30" />
          </Card>
        ))}
      </div>
    </div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Biens immobiliers</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalProperties}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.pendingProperties} en attente de validation
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Utilisateurs</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Inscrits sur la plateforme
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Baux</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalLeases}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total des baux
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Baux certifiés</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.certifiedLeases}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalLeases > 0 ? Math.round((stats.certifiedLeases / stats.totalLeases) * 100) : 0}% du total
          </p>
        </CardContent>
      </Card>

      <Card className={securityStats.failedLogins >= 3 || securityStats.massActions > 0 ? 'border-destructive' : ''}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Sécurité (24h)</CardTitle>
          {securityStats.failedLogins >= 3 || securityStats.massActions > 0 ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Shield className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Échecs connexion</span>
              <span className={`text-sm font-medium ${securityStats.failedLogins >= 3 ? 'text-destructive' : ''}`}>
                {securityStats.failedLogins}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Actions massives</span>
              <span className={`text-sm font-medium ${securityStats.massActions > 0 ? 'text-destructive' : ''}`}>
                {securityStats.massActions}
              </span>
            </div>
            {securityStats.lastSuspiciousAction && (
              <p className="text-xs text-muted-foreground truncate">
                Dernière: {securityStats.lastSuspiciousAction}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStats;
