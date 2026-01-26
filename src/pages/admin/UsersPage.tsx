/**
 * UsersPage - Page de gestion des utilisateurs admin
 */

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsersWithRoles } from '@/features/admin/services/adminExtended.api';
import { adminApi } from '@/features/admin/services/admin.api';
import {
  UserWithRoles,
  UserFilters,
  PaginationParams,
  AdminStatus,
  UserType,
  VerificationStatus,
} from '@/types/admin';
import {
  AdminTable,
  StatusBadge,
  UserTypeBadge,
  UserAvatar,
  AdminPageHeader,
} from '@/shared/ui/admin';
import { Modal } from '@/shared/ui';
import { FormatService } from '@/services/format/formatService';
import { Users, Search, Shield, Ban, CheckCircle, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminUsersPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Log at component mount to verify it's rendering
  console.log('[UsersPage] Component mounted!', { user: !!user, profile: !!profile });

  // États
  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: 25,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const [filters, setFilters] = useState<UserFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'suspend' | 'reactivate' | 'verify' | 'delete' | 'roles' | null;
    user: UserWithRoles | null;
    suspensionReason?: string;
    deletionReason?: string;
  }>({ isOpen: false, type: null, user: null });
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; user: UserWithRoles | null }>({
    isOpen: false,
    user: null,
  });
  const [exporting, setExporting] = useState(false);

  // Vérification accès admin
  const userType = profile?.user_type?.toLowerCase();
  const isAdmin = userType === 'admin_ansut' || userType === 'admin';

  // Redirection si pas admin
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // Test direct Supabase connection
  useEffect(() => {
    const testConnection = async () => {
      console.log('[UsersPage] Testing Supabase connection...');
      console.log('[UsersPage] Profile:', profile);

      // Test 1: Check current user's profile
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('[UsersPage] Auth user:', user);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single();

        console.log('[UsersPage] Current profile data:', profileData);
        console.log('[UsersPage] Profile error:', profileError);
      } catch (err) {
        console.error('[UsersPage] Auth/profile test error:', err);
      }

      // Test 2: Try to list all profiles (what the admin page does)
      try {
        const { data, error, count } = await supabase
          .from('profiles')
          .select('id, email, full_name, user_type', { count: 'exact' })
          .limit(5);

        console.log('[UsersPage] List profiles test result:', {
          data,
          error,
          count,
          dataLength: data?.length,
          errorMessage: error?.message,
          errorCode: error?.code,
        });
      } catch (err) {
        console.error('[UsersPage] List profiles test error:', err);
      }

      // Test 3: Check user_roles
      try {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');

        console.log('[UsersPage] User roles test result:', {
          rolesData,
          rolesError,
        });
      } catch (err) {
        console.error('[UsersPage] User roles test error:', err);
      }
    };

    testConnection();
  }, [profile]);

  // Récupération des utilisateurs avec React Query
  const {
    data: usersData,
    isLoading,
    isError,
    error,
    refetch,
    failureReason,
  } = useQuery({
    queryKey: ['admin', 'users', pagination, filters, searchQuery],
    queryFn: async () => {
      console.log('[UsersPage] Query function called!');
      try {
        const result = await getUsersWithRoles(pagination, {
          ...filters,
          search: searchQuery || undefined,
        });
        console.log('[UsersPage] Query result:', result);
        return result;
      } catch (err) {
        console.error('[UsersPage] Query error:', err);
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Toujours exécuter la requête - la permission est vérifiée dans l'API
    enabled: true,
    retry: 3,
  });

  // Debug: Afficher les données dans la console
  console.log('[UsersPage] State:', {
    isAdmin,
    loading: isLoading,
    isError,
    error: error?.message,
    failureReason,
    dataCount: usersData?.data?.length || 0,
    total: usersData?.total || 0,
    profileUserType: profile?.user_type,
  });

  // Mutations
  const suspendMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi.suspendUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionModal({ isOpen: false, type: null, user: null });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) => adminApi.reactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionModal({ isOpen: false, type: null, user: null });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (userId: string) => adminApi.verifyUser(userId, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionModal({ isOpen: false, type: null, user: null });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      adminApi.deleteUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionModal({ isOpen: false, type: null, user: null });
    },
  });

  // Colonnes du tableau
  const columns = useMemo(
    () => [
      {
        key: 'user',
        title: 'Utilisateur',
        render: (_: unknown, record: UserWithRoles) => (
          <div className="flex items-center gap-3">
            <UserAvatar
              src={record.avatar_url}
              name={record.full_name}
              email={record.email}
              size="md"
            />
            <div>
              <p className="font-medium text-[#2C1810]">{record.full_name || 'N/A'}</p>
              <p className="text-sm text-[#6B5A4E]">{record.email}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'user_type',
        title: 'Type',
        dataIndex: 'user_type',
        render: (userType: string) => <UserTypeBadge userType={userType} />,
        align: 'center' as const,
      },
      {
        key: 'roles',
        title: 'Rôles système',
        dataIndex: 'roles',
        width: '15%',
        render: (roles: any[]) => (
          <div className="flex flex-wrap gap-1">
            {roles && roles.length > 0 ? (
              roles.map((role) => {
                const roleConfig: Record<string, { label: string; color: string }> = {
                  admin: { label: 'Admin', color: 'bg-red-100 text-red-800' },
                  moderator: { label: 'Modérateur', color: 'bg-blue-100 text-blue-800' },
                  trust_agent: { label: 'Trust Agent', color: 'bg-purple-100 text-purple-800' },
                  user: { label: 'User', color: 'bg-gray-100 text-gray-800' },
                };
                const config = roleConfig[role.role] || { label: role.role, color: 'bg-gray-100 text-gray-800' };
                return (
                  <span key={role.id} className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-[#6B5A4E]">-</span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Statut',
        dataIndex: 'status',
        render: (status: AdminStatus) => <StatusBadge status={status} />,
        align: 'center' as const,
      },
      {
        key: 'is_verified',
        title: 'Vérifié',
        dataIndex: 'is_verified',
        render: (isVerified: boolean | null) => (
          <span
            className={`inline-flex items-center gap-1 text-sm ${isVerified ? 'text-green-600' : 'text-amber-600'}`}
          >
            {isVerified ? <CheckCircle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
            {isVerified ? 'Oui' : 'Non'}
          </span>
        ),
        align: 'center' as const,
      },
      {
        key: 'trust_score',
        title: 'Score',
        dataIndex: 'trust_score',
        render: (score: number | null | undefined) => (
          <span className="font-medium">{score != null ? score.toFixed(0) : 'N/A'}</span>
        ),
        align: 'right' as const,
      },
      {
        key: 'created_at',
        title: 'Inscription',
        dataIndex: 'created_at',
        render: (date: string | null) => (
          <span className="text-sm text-[#6B5A4E]">
            {date ? FormatService.formatDate(date) : 'N/A'}
          </span>
        ),
        align: 'right' as const,
      },
    ],
    []
  );

  // Actions sur les lignes
  const rowActions = useMemo(
    () => [
      {
        label: 'Voir détails',
        icon: Eye,
        onClick: (record: UserWithRoles) => setDetailModal({ isOpen: true, user: record }),
      },
      {
        label: 'Modifier rôles',
        icon: Shield,
        onClick: (record: UserWithRoles) =>
          setActionModal({ isOpen: true, type: 'roles', user: record }),
      },
      {
        label: 'Vérifier',
        icon: CheckCircle,
        onClick: (record: UserWithRoles) =>
          setActionModal({ isOpen: true, type: 'verify', user: record }),
        disabled: (record: UserWithRoles) => record.is_verified === true,
      },
      {
        label: 'Suspendre',
        icon: Ban,
        onClick: (record: UserWithRoles) =>
          setActionModal({ isOpen: true, type: 'suspend', user: record }),
        disabled: (record: UserWithRoles) =>
          record.is_active === false || record.status === 'deleted',
        danger: true,
      },
      {
        label: 'Réactiver',
        icon: CheckCircle,
        onClick: (record: UserWithRoles) =>
          setActionModal({ isOpen: true, type: 'reactivate', user: record }),
        disabled: (record: UserWithRoles) => record.is_active !== false,
      },
      {
        label: 'Supprimer',
        icon: Trash2,
        onClick: (record: UserWithRoles) =>
          setActionModal({ isOpen: true, type: 'delete', user: record }),
        danger: true,
      },
    ],
    []
  );

  // Gestionnaires d'événements
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination({ ...pagination, page: 1 });
  };

  const handleExport = async () => {
    if (!usersData?.data) return;

    setExporting(true);
    try {
      // Créer le contenu CSV
      const headers = [
        'ID',
        'Email',
        'Nom',
        'Type',
        'Statut',
        'Vérifié',
        'Score',
        "Date d'inscription",
      ];
      const rows = usersData.data.map((user) => [
        user.id,
        user.email,
        user.full_name || '',
        user.user_type,
        user.status,
        user.is_verified ? 'Oui' : 'Non',
        user.trust_score?.toString() || '',
        user.created_at ? FormatService.formatDate(user.created_at) : '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      // Créer un blob et télécharger
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erreur lors de l'export:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleActionConfirm = () => {
    if (!actionModal.user) return;

    switch (actionModal.type) {
      case 'suspend':
        if (actionModal.suspensionReason) {
          suspendMutation.mutate({
            userId: actionModal.user.id,
            reason: actionModal.suspensionReason,
          });
        }
        break;
      case 'reactivate':
        reactivateMutation.mutate(actionModal.user.id);
        break;
      case 'verify':
        verifyMutation.mutate(actionModal.user.id);
        break;
      case 'delete':
        if (actionModal.deletionReason) {
          deleteMutation.mutate({
            userId: actionModal.user.id,
            reason: actionModal.deletionReason,
          });
        }
        break;
    }
  };

  const userStats = useMemo(() => {
    if (!usersData?.data) return null;
    const total = usersData.data.length;
    const verified = usersData.data.filter((u) => u.is_verified).length;
    const suspended = usersData.data.filter((u) => u.is_active === false).length;
    const byType = usersData.data.reduce(
      (acc, u) => {
        acc[u.user_type] = (acc[u.user_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return { total, verified, suspended, byType };
  }, [usersData]);

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="w-full">
        <AdminPageHeader
          title="Gestion des Utilisateurs"
          description="Gérez les comptes, les rôles et les permissions de tous les utilisateurs"
          icon={Users}
          onRefresh={() => refetch()}
          showExport
          onExport={handleExport}
        />

        {/* Stats */}
        {userStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-[#EFEBE9] p-4">
              <p className="text-sm text-[#6B5A4E]">Total Utilisateurs</p>
              <p className="text-2xl font-bold text-[#2C1810]">{userStats.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#EFEBE9] p-4">
              <p className="text-sm text-[#6B5A4E]">Vérifiés</p>
              <p className="text-2xl font-bold text-green-600">{userStats.verified}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#EFEBE9] p-4">
              <p className="text-sm text-[#6B5A4E]">Suspendus</p>
              <p className="text-2xl font-bold text-red-600">{userStats.suspended}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#EFEBE9] p-4">
              <p className="text-sm text-[#6B5A4E]">Types</p>
              <p className="text-2xl font-bold text-[#2C1810]">
                {Object.keys(userStats.byType).length}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-[#EFEBE9] p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B5A4E]" />
            <input
              type="text"
              placeholder="Rechercher par email ou nom..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
            />
          </div>
          <select
            value={filters.user_type || ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                user_type: e.target.value ? (e.target.value as UserType) : undefined,
              })
            }
            className="px-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
          >
            <option value="">Tous les types</option>
            <option value="locataire">Locataire</option>
            <option value="proprietaire">Propriétaire</option>
            <option value="agence">Agence</option>
            <option value="trust_agent">Trust Agent</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={filters.verification_status || ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                verification_status: e.target.value
                  ? (e.target.value as VerificationStatus)
                  : undefined,
              })
            }
            className="px-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
          >
            <option value="">Tous les statuts</option>
            <option value="verified">Vérifié</option>
            <option value="not_started">Non vérifié</option>
            <option value="pending">En attente</option>
          </select>
          <select
            value={filters.status || ''}
            onChange={(e) =>
              setFilters({
                ...filters,
                status: e.target.value ? (e.target.value as AdminStatus) : undefined,
              })
            }
            className="px-4 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="suspended">Suspendu</option>
            <option value="deleted">Supprimé</option>
          </select>
        </div>

        {/* Table */}
        <AdminTable
          columns={columns}
          data={usersData?.data || []}
          loading={isLoading}
          emptyMessage={
            isError
              ? `Erreur: ${error?.message || 'Impossible de charger les utilisateurs'}`
              : isAdmin
                ? 'Aucun utilisateur trouvé'
                : 'Accès non autorisé (admin requis)'
          }
          rowKey="id"
          pagination={usersData}
          onPageChange={(page) => setPagination({ ...pagination, page })}
          onSort={(sort) =>
            setPagination({ ...pagination, sortBy: sort.key, sortOrder: sort.direction })
          }
          rowActions={rowActions}
          selectable
          selectedKeys={selectedUsers}
          onSelectionChange={setSelectedUsers}
          showHeaderActions
          searchPlaceholder="Rechercher un utilisateur..."
          onSearch={handleSearch}
        />

        {/* Debug info - à supprimer en prod */}
        {import.meta.env.DEV && (
          <div className="mt-4 p-4 bg-yellow-50 text-xs text-yellow-900 rounded-lg">
            <p><strong>Debug UsersPage:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>isAdmin: {isAdmin.toString()}</li>
              <li>loading: {isLoading.toString()}</li>
              <li>isError: {isError.toString()}</li>
              <li>profileUserType: {profile?.user_type || 'null'}</li>
              <li>Données: {usersData?.data?.length || 0} / {usersData?.total || 0}</li>
              {error && <li className="text-red-600">Erreur: {error.message}</li>}
            </ul>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#2C1810] text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-4">
            <span>{selectedUsers.length} utilisateur(s) sélectionné(s)</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Bulk verify
                  selectedUsers.forEach((id) => verifyMutation.mutate(id));
                  setSelectedUsers([]);
                }}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
              >
                Vérifier
              </button>
              <button
                onClick={() => setSelectedUsers([])}
                className="px-3 py-1 bg-neutral-600 hover:bg-neutral-700 rounded-lg text-sm"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, user: null })}
        title="Détails de l'utilisateur"
      >
        {detailModal.user && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-[#EFEBE9]">
              <UserAvatar
                src={detailModal.user.avatar_url}
                name={detailModal.user.full_name}
                email={detailModal.user.email}
                size="xl"
              />
              <div>
                <h3 className="text-lg font-bold text-[#2C1810]">
                  {detailModal.user.full_name || 'N/A'}
                </h3>
                <p className="text-sm text-[#6B5A4E]">{detailModal.user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <UserTypeBadge userType={detailModal.user.user_type} />
                  <StatusBadge status={detailModal.user.status} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#6B5A4E]">ID</p>
                <p className="font-medium text-[#2C1810]">{detailModal.user.id}</p>
              </div>
              <div>
                <p className="text-[#6B5A4E]">Téléphone</p>
                <p className="font-medium text-[#2C1810]">{detailModal.user.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[#6B5A4E]">Score de confiance</p>
                <p className="font-medium text-[#2C1810]">
                  {detailModal.user.trust_score ?? 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[#6B5A4E]">Date d'inscription</p>
                <p className="font-medium text-[#2C1810]">
                  {detailModal.user.created_at
                    ? FormatService.formatDate(detailModal.user.created_at)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[#6B5A4E]">Dernière connexion</p>
                <p className="font-medium text-[#2C1810]">
                  {detailModal.user.last_sign_in_at
                    ? FormatService.formatDate(detailModal.user.last_sign_in_at)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[#6B5A4E]">Rôles</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {detailModal.user.roles.map((role) => (
                    <span key={role.id} className="px-2 py-1 bg-[#FAF7F4] rounded-md text-xs">
                      {role.role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[#EFEBE9]">
              <button
                onClick={() => {
                  setDetailModal({ isOpen: false, user: null });
                  setActionModal({ isOpen: true, type: 'roles', user: detailModal.user });
                }}
                className="px-4 py-2 bg-[#F16522] text-white rounded-xl hover:bg-[#d9571d]"
              >
                Gérer les rôles
              </button>
              <button
                onClick={() => setDetailModal({ isOpen: false, user: null })}
                className="px-4 py-2 border border-[#EFEBE9] rounded-xl hover:bg-[#FAF7F4]"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Action Modal */}
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: null, user: null })}
        title={
          actionModal.type === 'suspend'
            ? "Suspendre l'utilisateur"
            : actionModal.type === 'reactivate'
              ? "Réactiver l'utilisateur"
              : actionModal.type === 'verify'
                ? "Vérifier l'utilisateur"
                : actionModal.type === 'delete'
                  ? "Supprimer l'utilisateur"
                  : "Confirmer l'action"
        }
      >
        {actionModal.user && (
          <div className="space-y-4">
            <p className="text-[#6B5A4E]">
              {actionModal.type === 'suspend' && (
                <>
                  Êtes-vous sûr de vouloir suspendre{' '}
                  {actionModal.user.full_name || actionModal.user.email}?
                </>
              )}
              {actionModal.type === 'reactivate' && (
                <>
                  Êtes-vous sûr de vouloir réactiver{' '}
                  {actionModal.user.full_name || actionModal.user.email}?
                </>
              )}
              {actionModal.type === 'verify' && (
                <>
                  Êtes-vous sûr de vouloir vérifier{' '}
                  {actionModal.user.full_name || actionModal.user.email}?
                </>
              )}
              {actionModal.type === 'delete' && (
                <>
                  Êtes-vous sûr de vouloir supprimer{' '}
                  {actionModal.user.full_name || actionModal.user.email} ? Cette action est
                  irréversible.
                </>
              )}
            </p>

            {(actionModal.type === 'suspend' || actionModal.type === 'delete') && (
              <div>
                <label className="block text-sm font-medium text-[#2C1810] mb-1">
                  Raison {actionModal.type === 'delete' && '(obligatoire)'}
                </label>
                <textarea
                  value={actionModal.suspensionReason || actionModal.deletionReason || ''}
                  onChange={(e) => {
                    if (actionModal.type === 'suspend') {
                      setActionModal({ ...actionModal, suspensionReason: e.target.value });
                    } else {
                      setActionModal({ ...actionModal, deletionReason: e.target.value });
                    }
                  }}
                  placeholder="Décrivez la raison de cette action..."
                  rows={3}
                  className="w-full px-3 py-2 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522]"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setActionModal({ isOpen: false, type: null, user: null })}
                className="px-4 py-2 border border-[#EFEBE9] rounded-xl hover:bg-[#FAF7F4]"
              >
                Annuler
              </button>
              <button
                onClick={handleActionConfirm}
                disabled={
                  (actionModal.type === 'delete' && !actionModal.deletionReason) ||
                  suspendMutation.isPending ||
                  reactivateMutation.isPending ||
                  verifyMutation.isPending ||
                  deleteMutation.isPending
                }
                className={`px-4 py-2 rounded-xl ${
                  actionModal.type === 'delete' || actionModal.type === 'suspend'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-[#F16522] text-white hover:bg-[#d9571d]'
                } disabled:opacity-50`}
              >
                Confirmer
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
