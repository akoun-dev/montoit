import { useState } from 'react';
import { Search, User, Shield, UserCheck, Eye, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FoundUser {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  user_type: string | null;
  avatar_url: string | null;
}

type SystemRole = 'admin' | 'trust_agent' | 'moderator';

interface AssignRoleFormProps {
  onRoleAssigned: () => void;
  onShowConfirmAdmin: (user: FoundUser, role: SystemRole) => void;
  currentUserId?: string;
}

const userTypeLabels: Record<string, { label: string; color: string }> = {
  tenant: { label: 'Locataire', color: 'cyan' },
  owner: { label: 'Propriétaire', color: 'orange' },
  agent: { label: 'Agent', color: 'green' },
};

const systemRoles: {
  value: SystemRole;
  label: string;
  icon: typeof Shield;
  color: string;
  description: string;
}[] = [
  {
    value: 'admin',
    label: 'Administrateur',
    icon: Shield,
    color: 'red',
    description: 'Accès complet à toutes les fonctionnalités',
  },
  {
    value: 'trust_agent',
    label: 'Trust Agent',
    icon: UserCheck,
    color: 'purple',
    description: 'Validation et certification des utilisateurs',
  },
  {
    value: 'moderator',
    label: 'Modérateur',
    icon: Eye,
    color: 'blue',
    description: 'Modération du contenu et des avis',
  },
];

export function AssignRoleForm({
  onRoleAssigned,
  onShowConfirmAdmin,
  currentUserId,
}: AssignRoleFormProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<SystemRole | null>(null);
  const [assigning, setAssigning] = useState(false);

  const searchUser = async () => {
    if (!searchQuery.trim()) {
      toast.error('Veuillez entrer un email, nom ou téléphone');
      return;
    }

    setSearching(true);
    setFoundUser(null);

    try {
      const query = searchQuery.trim().toLowerCase();

      // Search by email, name, or phone
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, user_type, avatar_url')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data || !data.user_id) {
        toast.error('Aucun utilisateur trouvé');
        return;
      }

      setFoundUser({
        id: data.id,
        user_id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        user_type: data.user_type,
        avatar_url: data.avatar_url,
      });
      toast.success('Utilisateur trouvé');
    } catch (err) {
      console.error('Search error:', err);
      toast.error('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const assignRole = async () => {
    if (!foundUser || !selectedRole) return;

    // For admin role, show confirmation modal
    if (selectedRole === 'admin') {
      onShowConfirmAdmin(foundUser, selectedRole);
      return;
    }

    await performAssignment(foundUser, selectedRole);
  };

  const performAssignment = async (user: FoundUser, role: SystemRole) => {
    setAssigning(true);

    try {
      // Check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('role', role)
        .maybeSingle();

      if (existingRole) {
        toast.error(`Cet utilisateur a déjà le rôle ${role}`);
        setAssigning(false);
        return;
      }

      // Insert new role
      const { error: insertError } = await supabase.from('user_roles').insert({
        user_id: user.user_id,
        role: role,
        granted_by: currentUserId,
      });

      if (insertError) throw insertError;

      // Log the action
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

      toast.success(`Rôle ${role} attribué à ${user.full_name || user.email}`);

      // Reset form
      setFoundUser(null);
      setSelectedRole(null);
      setSearchQuery('');
      onRoleAssigned();
    } catch (err) {
      console.error('Assignment error:', err);
      toast.error("Erreur lors de l'attribution du rôle");
    } finally {
      setAssigning(false);
    }
  };

  const getUserTypeBadge = (userType: string | null) => {
    const typeKey = userType || 'tenant';
    const defaultType = { label: 'Locataire', color: 'cyan' };
    const typeInfo = userTypeLabels[typeKey] ? userTypeLabels[typeKey] : defaultType;
    const colorClasses: Record<string, string> = {
      cyan: 'bg-cyan-100 text-cyan-700',
      orange: 'bg-orange-100 text-orange-700',
      green: 'bg-green-100 text-green-700',
    };
    const colorClass = colorClasses[typeInfo.color] ?? 'bg-cyan-100 text-cyan-700';
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {typeInfo.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary-500" />
        Attribuer un Rôle Système
      </h3>

      {/* Search */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par email, nom ou téléphone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUser()}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <button
          onClick={searchUser}
          disabled={searching}
          className="px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {searching ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Rechercher
        </button>
      </div>

      {/* Found User */}
      {foundUser && (
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
            {foundUser.avatar_url ? (
              <img
                src={foundUser.avatar_url}
                alt={foundUser.full_name || 'User'}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-6 w-6 text-primary-600" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                {foundUser.full_name || 'Nom non renseigné'}
              </p>
              <p className="text-sm text-gray-500">{foundUser.email}</p>
            </div>
            {getUserTypeBadge(foundUser.user_type)}
          </div>

          {/* Role Selection */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Sélectionner un rôle à attribuer
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {systemRoles.map(({ value, label, icon: Icon, color, description }) => (
                <button
                  key={value}
                  onClick={() => setSelectedRole(value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedRole === value
                      ? `border-${color}-500 bg-${color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 text-${color}-600`} />
                    <span className="font-medium text-gray-900">{label}</span>
                  </div>
                  <p className="text-xs text-gray-500">{description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Assign Button */}
          <div className="flex justify-end">
            <button
              onClick={assignRole}
              disabled={!selectedRole || assigning}
              className="px-6 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {assigning ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Attribuer le Rôle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export the performAssignment for use after confirmation
export type { FoundUser, SystemRole };
export default AssignRoleForm;
