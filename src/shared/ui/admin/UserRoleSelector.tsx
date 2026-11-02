/**
 * UserRoleSelector - Sélecteur de rôles utilisateur
 */

import { Check, Shield, Users, Home, Building, Eye } from 'lucide-react';
import { UserRole } from '@/types/admin';

export interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'system' | 'business' | 'moderation';
}

export interface UserRoleSelectorProps {
  value?: UserRole;
  onChange: (role: UserRole) => void;
  availableRoles?: UserRole[];
  disabled?: boolean;
  className?: string;
}

const roleOptions: RoleOption[] = [
  {
    value: 'admin',
    label: 'Administrateur',
    description: 'Accès complet à la plateforme',
    icon: Shield,
    category: 'system',
  },
  {
    value: 'admin_ansut',
    label: 'Admin ANSUT',
    description: 'Administrateur certifié ANSUT',
    icon: Shield,
    category: 'system',
  },
  {
    value: 'moderator',
    label: 'Modérateur',
    description: 'Gestion du contenu et des signalements',
    icon: Eye,
    category: 'moderation',
  },
  {
    value: 'trust_agent',
    label: 'Trust Agent',
    description: 'Agent de vérification certifié',
    icon: Shield,
    category: 'moderation',
  },
  {
    value: 'locataire',
    label: 'Locataire',
    description: 'Recherche de logement',
    icon: Users,
    category: 'business',
  },
  {
    value: 'proprietaire',
    label: 'Propriétaire',
    description: 'Mise en location de biens',
    icon: Home,
    category: 'business',
  },
  {
    value: 'agence',
    label: 'Agence Immobilière',
    description: 'Gestion de biens pour compte',
    icon: Building,
    category: 'business',
  },
];

const categoryLabels = {
  system: 'Rôles Système',
  business: 'Rôles Métier',
  moderation: 'Modération',
};

export function UserRoleSelector({
  value,
  onChange,
  availableRoles,
  disabled = false,
  className = '',
}: UserRoleSelectorProps) {
  const filteredRoles = availableRoles
    ? roleOptions.filter((role) => availableRoles.includes(role.value))
    : roleOptions;

  const groupedRoles = filteredRoles.reduce((acc, role) => {
    if (!acc[role.category]) {
      acc[role.category] = [];
    }
    acc[role.category].push(role);
    return acc;
  }, {} as Record<string, RoleOption[]>);

  return (
    <div className={`space-y-4 ${className}`}>
      {Object.entries(groupedRoles).map(([category, roles]) => (
        <div key={category}>
          <h4 className="text-xs font-semibold text-[#6B5A4E] uppercase tracking-wider mb-2">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h4>
          <div className="space-y-2">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = value === role.value;

              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => !disabled && onChange(role.value)}
                  disabled={disabled}
                  className={`
                    w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                    ${isSelected ? 'border-[#F16522] bg-[#FFF5F0]' : 'border-[#EFEBE9] hover:border-[#E8D4C5]'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#F16522] text-white' : 'bg-[#FAF7F4] text-[#6B5A4E]'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${isSelected ? 'text-[#2C1810]' : 'text-[#6B5A4E]'}`}>
                      {role.label}
                    </p>
                    <p className="text-xs text-[#6B5A4E]/70">{role.description}</p>
                  </div>
                  {isSelected && (
                    <div className="p-1 bg-[#F16522] rounded-full">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Variante compacte pour les tableaux
export interface UserRoleCompactSelectorProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  availableRoles?: UserRole[];
  disabled?: boolean;
}

export function UserRoleCompactSelector({
  value,
  onChange,
  availableRoles,
  disabled = false,
}: UserRoleCompactSelectorProps) {
  const filteredRoles = availableRoles
    ? roleOptions.filter((role) => availableRoles.includes(role.value))
    : roleOptions;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as UserRole)}
      disabled={disabled}
      className="px-3 py-1.5 text-sm border border-[#EFEBE9] rounded-lg focus:ring-2 focus:ring-[#F16522] focus:border-[#F16522] disabled:opacity-50"
    >
      {filteredRoles.map((role) => (
        <option key={role.value} value={role.value}>
          {role.label}
        </option>
      ))}
    </select>
  );
}
