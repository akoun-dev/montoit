/**
 * UserRolesPage - Page d'administration des rôles utilisateur
 * Gestion des rôles système (admin, trust_agent, moderator)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Shield, Users, Settings, RefreshCw } from 'lucide-react';
import { UserRolesList } from '@/features/admin/components/UserRolesList';
import { AssignRoleForm } from '@/features/admin/components/AssignRoleForm';
import { ConfirmRoleModal } from '@/features/admin/components/ConfirmRoleModal';
import { AdminPageHeader } from '@/shared/ui/admin';

interface UserRole {
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

type SystemRole = 'admin' | 'trust_agent' | 'moderator';

interface FoundUser {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  user_type: string | null;
  avatar_url: string | null;
}

export default function UserRolesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // États
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    user: FoundUser | null;
    role: SystemRole;
  }>({ isOpen: false, user: null, role: 'admin' });
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Vérification accès admin
  const userType = profile?.user_type?.toLowerCase();
  const isAdmin = userType === 'admin_ansut' || userType === 'admin';

  // Redirection si pas admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // Récupération des rôles utilisateur
  const {
    data: userRoles = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(
          `
          id,
          role,
          granted_at,
          granted_by,
          user_id,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `
        )
        .order('granted_at', { ascending: false });

      if (error) throw error;

      // Transformer les données
      return (data || []).map((role: unknown) => {
        const r = role as {
          id: string;
          role: 'admin' | 'trust_agent' | 'moderator' | 'user';
          granted_at: string | null;
          granted_by: string | null;
          user_id: string;
          profiles: {
            full_name: string | null;
            email: string | null;
            avatar_url: string | null;
          } | null;
        };
        return {
          id: r.id,
          role: r.role,
          granted_at: r.granted_at,
          granted_by: r.granted_by,
          user_id: r.user_id,
          profile: r.profiles
            ? {
                full_name: r.profiles.full_name,
                email: r.profiles.email,
                avatar_url: r.profiles.avatar_url,
              }
            : null,
        } as UserRole;
      });
    },
    enabled: isAdmin,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Mutation pour révoquer un rôle
  const revokeRoleMutation = useMutation({
    mutationFn: async ({
      userRoleId,
      userId,
      role,
    }: {
      userRoleId: string;
      userId: string;
      role: string;
    }) => {
      const { error } = await supabase.from('user_roles').delete().eq('id', userRoleId);

      if (error) throw error;

      // Log l'action
      await supabase.rpc('log_admin_action', {
        p_action: 'ROLE_REVOKED',
        p_entity_type: 'user_roles',
        p_entity_id: userId,
        p_details: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-roles'] });
      toast.success('Rôle révoqué avec succès');
      setRevokingId(null);
    },
    onError: (error) => {
      console.error('Erreur lors de la révocation:', error);
      toast.error('Erreur lors de la révocation du rôle');
      setRevokingId(null);
    },
  });

  // Mutation pour assigner un rôle (après confirmation)
  const assignRoleMutation = useMutation({
    mutationFn: async ({ user, role }: { user: FoundUser; role: SystemRole }) => {
      // Vérifier si le rôle existe déjà
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('role', role)
        .maybeSingle();

      if (existingRole) {
        throw new Error('Cet utilisateur a déjà ce rôle');
      }

      // Insérer le nouveau rôle
      const { error: insertError } = await supabase.from('user_roles').insert({
        user_id: user.user_id,
        role: role,
        granted_by: user?.id,
      });

      if (insertError) throw insertError;

      // Log l'action
      await supabase.rpc('log_admin_action', {
        p_action: 'ROLE_ASSIGNED',
        p_entity_type: 'user_roles',
        p_entity_id: user.user_id,
        p_details: {
          role: role,
          user_email: user.email,
          user_name: user.full_name,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-roles'] });
      toast.success('Rôle attribué avec succès');
      setConfirmModal({ isOpen: false, user: null, role: 'admin' });
    },
    onError: (error) => {
      console.error("Erreur lors de l'attribution:", error);
      toast.error(error.message || "Erreur lors de l'attribution du rôle");
      setConfirmModal({ isOpen: false, user: null, role: 'admin' });
    },
  });

  // Gestionnaires d'événements
  const handleRevokeRole = (userRoleId: string, userId: string, role: string) => {
    setRevokingId(userRoleId);
    revokeRoleMutation.mutate({ userRoleId, userId, role });
  };

  const handleShowConfirmAdmin = (user: FoundUser, role: SystemRole) => {
    setConfirmModal({ isOpen: true, user, role });
  };

  const handleConfirmAssign = () => {
    if (!confirmModal.user || !confirmModal.role) return;
    assignRoleMutation.mutate({ user: confirmModal.user, role: confirmModal.role });
  };

  const handleRoleAssigned = () => {
    refetch();
  };

  // Statistiques
  const roleStats = {
    total: userRoles.length,
    admins: userRoles.filter((r) => r.role === 'admin').length,
    trustAgents: userRoles.filter((r) => r.role === 'trust_agent').length,
    moderators: userRoles.filter((r) => r.role === 'moderator').length,
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="w-full">
        <AdminPageHeader
          title="Gestion des Rôles Système"
          description="Attribuez et gérez les rôles administrateur, trust agent et modérateur"
          icon={Shield}
          onRefresh={() => refetch()}
          showExport={false}
        />

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Total Rôles Attribués</p>
            <p className="text-2xl font-bold text-[#2C1810]">{roleStats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Administrateurs</p>
            <p className="text-2xl font-bold text-red-600">{roleStats.admins}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Trust Agents</p>
            <p className="text-2xl font-bold text-purple-600">{roleStats.trustAgents}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#EFEBE9] p-4">
            <p className="text-sm text-[#6B5A4E]">Modérateurs</p>
            <p className="text-2xl font-bold text-blue-600">{roleStats.moderators}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche: Liste des rôles */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-[#EFEBE9] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#2C1810] flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#F16522]" />
                  Rôles Attribués
                </h3>
                <button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="p-2 text-[#6B5A4E] hover:text-[#2C1810] hover:bg-[#FAF7F4] rounded-lg"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <UserRolesList
                users={userRoles}
                loading={isLoading}
                currentUserId={user?.id}
                onRevokeRole={handleRevokeRole}
                revoking={revokingId}
              />
            </div>
          </div>

          {/* Colonne droite: Attribution de rôle */}
          <div>
            <AssignRoleForm
              onRoleAssigned={handleRoleAssigned}
              onShowConfirmAdmin={handleShowConfirmAdmin}
              currentUserId={user?.id}
            />

            {/* Informations */}
            <div className="mt-6 bg-white rounded-xl border border-[#EFEBE9] p-6">
              <h4 className="font-bold text-[#2C1810] mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#6B5A4E]" />À propos des rôles
              </h4>
              <ul className="space-y-3 text-sm text-[#6B5A4E]">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  <span>
                    <strong>Administrateur:</strong> Accès complet à toutes les fonctionnalités
                    administratives.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                  <span>
                    <strong>Trust Agent:</strong> Validation et certification des utilisateurs et
                    propriétés.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span>
                    <strong>Modérateur:</strong> Modération du contenu, des avis et des
                    signalements.
                  </span>
                </li>
              </ul>
              <div className="mt-4 pt-4 border-t border-[#EFEBE9] text-xs text-[#6B5A4E]">
                <p>
                  ⚠️ <strong>Attention:</strong> L'attribution de rôles admin doit être faite avec
                  prudence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmation pour rôle admin */}
      <ConfirmRoleModal
        open={confirmModal.isOpen}
        onOpenChange={(open) => setConfirmModal({ ...confirmModal, isOpen: open })}
        user={confirmModal.user}
        role={confirmModal.role}
        onConfirm={handleConfirmAssign}
        confirming={assignRoleMutation.isPending}
      />
    </div>
  );
}
