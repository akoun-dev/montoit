import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { usePermissions } from '@/shared/hooks/usePermissions';
import { toast } from 'sonner';

import { RoleStatsCard } from '../components/RoleStatsCard';
import { UserRolesList } from '../components/UserRolesList';
import { AssignRoleForm, type FoundUser, type SystemRole } from '../components/AssignRoleForm';
import { ConfirmRoleModal } from '../components/ConfirmRoleModal';
import { AuditLogsList } from '../components/AuditLogsList';

interface RoleStats {
  admin: number;
  trust_agent: number;
  moderator: number;
  total: number;
}

interface UserWithRole {
  id: string;
  role: 'admin' | 'trust_agent' | 'moderator' | 'user';
  granted_at: string | null;
  granted_by: string | null;
  user_id: string;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_email: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export default function UserRolesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: permissionsLoading } = usePermissions();

  const [stats, setStats] = useState<RoleStats>({
    admin: 0,
    trust_agent: 0,
    moderator: 0,
    total: 0,
  });
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<{
    user: FoundUser;
    role: SystemRole;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Check permissions
  useEffect(() => {
    if (!permissionsLoading && !isAdmin) {
      toast.error('Accès non autorisé');
      navigate('/dashboard');
    }
  }, [isAdmin, permissionsLoading, navigate]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);

    try {
      // Load role counts
      const { data: rolesData } = await supabase.from('user_roles').select('role');

      const roleCounts = (rolesData || []).reduce(
        (acc, { role }) => {
          if (role in acc) {
            acc[role as keyof Omit<RoleStats, 'total'>]++;
          }
          return acc;
        },
        { admin: 0, trust_agent: 0, moderator: 0 } as Omit<RoleStats, 'total'>
      );

      // Load total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      setStats({
        ...roleCounts,
        total: totalUsers || 0,
      });

      // Load users with roles (join with profiles)
      const { data: usersData, error: usersError } = await supabase
        .from('user_roles')
        .select(
          `
          id,
          role,
          granted_at,
          granted_by,
          user_id
        `
        )
        .order('granted_at', { ascending: false });

      if (usersError) throw usersError;

      // Fetch profiles for each user
      if (usersData && usersData.length > 0) {
        const userIds = [...new Set(usersData.map((u) => u.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('user_id', userIds);

        const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);

        const usersWithProfiles: UserWithRole[] = usersData.map((ur) => ({
          ...ur,
          profile: profilesMap.get(ur.user_id) || null,
        }));

        setUsersWithRoles(usersWithProfiles);
      } else {
        setUsersWithRoles([]);
      }

      // Load audit logs
      const { data: logsData } = await supabase
        .from('admin_audit_logs')
        .select('id, action, entity_type, entity_id, user_email, details, created_at')
        .eq('entity_type', 'user_roles')
        .order('created_at', { ascending: false })
        .limit(10);

      setAuditLogs((logsData || []) as AuditLog[]);
    } catch (err) {
      console.error('Error loading data:', err);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, loadData]);

  // Revoke role handler
  const handleRevokeRole = async (userRoleId: string, userId: string, role: string) => {
    // Prevent self-revocation of admin
    if (userId === user?.id && role === 'admin') {
      toast.error('Vous ne pouvez pas révoquer votre propre rôle admin');
      return;
    }

    setRevoking(userRoleId);

    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', userRoleId);

      if (error) throw error;

      // Log the action
      const revokedUser = usersWithRoles.find((u) => u.id === userRoleId);
      await supabase.rpc('log_admin_action', {
        p_action: 'ROLE_REVOKED',
        p_entity_type: 'user_roles',
        p_entity_id: userId,
        p_details: {
          role: role,
          user_email: revokedUser?.profile?.email,
          user_name: revokedUser?.profile?.full_name,
        },
      });

      toast.success('Rôle révoqué avec succès');
      loadData();
    } catch (err) {
      console.error('Revoke error:', err);
      toast.error('Erreur lors de la révocation');
    } finally {
      setRevoking(null);
    }
  };

  // Show confirm modal for admin assignment
  const handleShowConfirmAdmin = (foundUser: FoundUser, role: SystemRole) => {
    setPendingAssignment({ user: foundUser, role });
    setConfirmModalOpen(true);
  };

  // Confirm admin assignment
  const handleConfirmAssignment = async () => {
    if (!pendingAssignment) return;

    setConfirming(true);

    try {
      const { user: targetUser, role } = pendingAssignment;

      // Check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', targetUser.user_id)
        .eq('role', role)
        .maybeSingle();

      if (existingRole) {
        toast.error(`Cet utilisateur a déjà le rôle ${role}`);
        setConfirmModalOpen(false);
        setPendingAssignment(null);
        setConfirming(false);
        return;
      }

      // Insert new role
      const { error: insertError } = await supabase.from('user_roles').insert({
        user_id: targetUser.user_id,
        role: role,
        granted_by: user?.id,
      });

      if (insertError) throw insertError;

      // Log the action
      await supabase.rpc('log_admin_action', {
        p_action: 'ROLE_ASSIGNED',
        p_entity_type: 'user_roles',
        p_entity_id: targetUser.user_id,
        p_details: {
          role: role,
          user_email: targetUser.email,
          user_name: targetUser.full_name,
        },
      });

      toast.success(`Rôle ${role} attribué à ${targetUser.full_name || targetUser.email}`);
      setConfirmModalOpen(false);
      setPendingAssignment(null);
      loadData();
    } catch (err) {
      console.error('Assignment error:', err);
      toast.error("Erreur lors de l'attribution du rôle");
    } finally {
      setConfirming(false);
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary-500" />
            Gestion des Rôles Système
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Attribuez et gérez les rôles admin, trust_agent et moderator
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Stats */}
      <RoleStatsCard stats={stats} loading={loading} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Users List + Assign Form */}
        <div className="lg:col-span-2 space-y-6">
          <UserRolesList
            users={usersWithRoles}
            loading={loading}
            currentUserId={user?.id}
            onRevokeRole={handleRevokeRole}
            revoking={revoking}
          />
          <AssignRoleForm
            onRoleAssigned={loadData}
            onShowConfirmAdmin={handleShowConfirmAdmin}
            currentUserId={user?.id}
          />
        </div>

        {/* Right Column: Audit Logs */}
        <div>
          <AuditLogsList logs={auditLogs} loading={loading} />
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmRoleModal
        open={confirmModalOpen}
        onOpenChange={setConfirmModalOpen}
        user={pendingAssignment?.user || null}
        role={pendingAssignment?.role || ''}
        onConfirm={handleConfirmAssignment}
        confirming={confirming}
      />
    </div>
  );
}
