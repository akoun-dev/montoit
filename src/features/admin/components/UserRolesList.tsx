import { useState } from 'react';
import { Trash2, Clock, Shield, UserCheck, Eye, User } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface UserRolesListProps {
  users: UserWithRole[];
  loading?: boolean;
  currentUserId?: string;
  onRevokeRole: (userRoleId: string, userId: string, role: string) => void;
  revoking?: string | null;
}

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          <Shield className="h-3.5 w-3.5" />
          Admin
        </span>
      );
    case 'trust_agent':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
          <UserCheck className="h-3.5 w-3.5" />
          Trust Agent
        </span>
      );
    case 'moderator':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
          <Eye className="h-3.5 w-3.5" />
          Modérateur
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
          <User className="h-3.5 w-3.5" />
          Utilisateur
        </span>
      );
  }
};

export function UserRolesList({
  users,
  loading,
  currentUserId,
  onRevokeRole,
  revoking,
}: UserRolesListProps) {
  const [_confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-48 bg-gray-200 rounded" />
              </div>
              <div className="h-6 w-24 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Aucun utilisateur avec des rôles système</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900">
          Utilisateurs avec Rôles Système ({users.length})
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {users.map((userRole) => {
          const isCurrentUser = userRole.user_id === currentUserId;
          const canRevoke = !isCurrentUser || userRole.role !== 'admin';

          return (
            <div
              key={userRole.id}
              className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {userRole.profile?.avatar_url ? (
                  <img
                    src={userRole.profile.avatar_url}
                    alt={userRole.profile.full_name || 'User'}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {userRole.profile?.full_name || 'Utilisateur'}
                  {isCurrentUser && <span className="ml-2 text-xs text-gray-500">(vous)</span>}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {userRole.profile?.email || 'Email non renseigné'}
                </p>
              </div>

              {/* Role Badge */}
              <div className="flex-shrink-0">{getRoleBadge(userRole.role)}</div>

              {/* Granted At */}
              <div className="hidden md:flex items-center gap-1.5 text-sm text-gray-500 flex-shrink-0">
                <Clock className="h-4 w-4" />
                <span>
                  {userRole.granted_at
                    ? format(new Date(userRole.granted_at), 'dd MMM yyyy', { locale: fr })
                    : 'N/A'}
                </span>
              </div>

              {/* Revoke Button */}
              <div className="flex-shrink-0">
                {canRevoke ? (
                  <button
                    onClick={() => {
                      setConfirmRevoke(userRole.id);
                      onRevokeRole(userRole.id, userRole.user_id, userRole.role);
                    }}
                    disabled={revoking === userRole.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Révoquer ce rôle"
                  >
                    {revoking === userRole.id ? (
                      <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <div
                    className="p-2 text-gray-300"
                    title="Impossible de révoquer votre propre rôle admin"
                  >
                    <Trash2 className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default UserRolesList;
