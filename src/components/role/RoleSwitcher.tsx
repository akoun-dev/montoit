/**
 * RoleSwitcher - Composant UI pour le changement de rôle
 *
 * Affiche les rôles disponibles de l'utilisateur et permet de basculer entre eux.
 * Utilisé dans les pages de profil et le dashboard.
 *
 * Features :
 * - Affichage des rôles avec icônes distinctives
 * - Mise en évidence du rôle actif
 * - Désactivation si un seul rôle disponible
 * - Animation de transition
 */

import { useState } from 'react';
import {
  Home,
  Key,
  Building,
  ChevronDown,
  Check,
  Loader,
  User,
} from 'lucide-react';
import { useRole, type BusinessRole } from '@/contexts/RoleContext';
import '@/styles/role-switcher.css';

// Configuration des icônes par rôle
const ROLE_ICONS: Record<BusinessRole, React.ElementType> = {
  tenant: Key,
  owner: Home,
  agency: Building,
};

// Configuration des couleurs par rôle
const ROLE_COLORS: Record<BusinessRole, { bg: string; text: string; border: string }> = {
  tenant: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  owner: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  agency: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
};

interface RoleSwitcherProps {
  /**
   * Mode d'affichage :
   * - 'compact': Bouton avec menu déroulant
   * - 'expanded': Liste des rôles en cartes
   * - 'inline': Rôles en ligne (pour header)
   */
  variant?: 'compact' | 'expanded' | 'inline';
  /**
   * Taille du composant
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Désactiver le switcher
   */
  disabled?: boolean;
  /**
   * Classe CSS supplémentaire
   */
  className?: string;
}

export default function RoleSwitcher({
  variant = 'compact',
  size = 'md',
  disabled = false,
  className = '',
}: RoleSwitcherProps) {
  // Vérifier que le contexte est disponible
  let roleContext;
  try {
    roleContext = useRole();
  } catch (error) {
    console.error('[RoleSwitcher] Error getting role context:', error);
    return (
      <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl px-3 py-1.5 text-sm">
        <User className="w-4 h-4" />
        <span className="font-medium">Erreur de contexte</span>
      </div>
    );
  }

  const { activeRole, availableRoles, switchRole, loadingRoles, isRoleActive } = roleContext;
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState<BusinessRole | null>(null);

  // Debug logging
  console.log('[RoleSwitcher] Render:', {
    variant,
    loadingRoles,
    activeRole,
    availableRoles: availableRoles.map(r => r.id),
    disabled,
  });

  // Tailles pour le mode compact
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-5 py-2.5 text-lg',
  };

  /**
   * Gère le changement de rôle
   */
  const handleRoleSwitch = async (role: BusinessRole) => {
    if (switching || isRoleActive(role)) return;

    setSwitching(role);
    setIsOpen(false);

    try {
      await switchRole(role);
    } catch (error) {
      console.error('Erreur lors du changement de rôle:', error);
      // TODO: Afficher un toast d'erreur
    } finally {
      setSwitching(null);
    }
  };

  /**
   * Rendu du mode compact (bouton + menu déroulant)
   */
  if (variant === 'compact') {
    if (loadingRoles) {
      return (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
          <Loader className="w-4 h-4 animate-spin text-gray-400" />
          <span className="text-sm text-gray-500">Chargement...</span>
        </div>
      );
    }

    // Aucun rôle disponible ou un seul rôle : afficher simplement sans menu
    if (availableRoles.length <= 1 || disabled) {
      const role = availableRoles[0];

      // Si aucun rôle n'est détecté, afficher un message par défaut
      if (!role) {
        return (
          <div className={`flex items-center gap-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl ${sizeClasses[size]} ${className}`}>
            <User className="w-4 h-4" />
            <span className="font-medium">Non défini</span>
          </div>
        );
      }

      const Icon = ROLE_ICONS[role.id];
      const colors = ROLE_COLORS[role.id];

      return (
        <div
          className={`flex items-center gap-2 ${colors.bg} ${colors.text} ${colors.border} border rounded-xl ${sizeClasses[size]} ${className}`}
        >
          <Icon className="w-4 h-4" />
          <span className="font-medium">{role.label}</span>
        </div>
      );
    }

    const activeRoleConfig = availableRoles.find(r => r.id === activeRole);
    const ActiveIcon = activeRoleConfig ? ROLE_ICONS[activeRoleConfig.id] : Home;
    const activeColors = activeRoleConfig ? ROLE_COLORS[activeRoleConfig.id] : ROLE_COLORS.owner;

    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 ${activeColors.bg} ${activeColors.text} ${activeColors.border} border rounded-xl ${sizeClasses[size]} hover:opacity-80 transition-opacity`}
        >
          <ActiveIcon className="w-4 h-4" />
          <span className="font-medium">{activeRoleConfig?.label || 'Rôle'}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown menu */}
            <div className="absolute top-full left-0 mt-2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-2 min-w-[200px]">
              {availableRoles.map((role) => {
                const Icon = ROLE_ICONS[role.id];
                const colors = ROLE_COLORS[role.id];
                const isActive = isRoleActive(role.id);
                const isSwitching = switching === role.id;

                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSwitch(role.id)}
                    disabled={isActive || isSwitching}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      isActive
                        ? `${colors.bg} ${colors.text}`
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left font-medium">{role.label}</span>
                    {isActive && <Check className="w-4 h-4" />}
                    {isSwitching && <Loader className="w-4 h-4 animate-spin" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  /**
   * Rendu du mode expanded (cartes)
   */
  if (variant === 'expanded') {
    if (loadingRoles) {
      return (
        <div className="flex items-center justify-center p-8 bg-gray-50 rounded-2xl">
          <Loader className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Chargement des rôles...</span>
        </div>
      );
    }

    if (availableRoles.length <= 1 || disabled) {
      const role = availableRoles[0];
      if (!role) return null;

      const Icon = ROLE_ICONS[role.id];
      const colors = ROLE_COLORS[role.id];

      return (
        <div
          className={`${colors.bg} ${colors.border} border rounded-2xl p-6 ${className}`}
        >
          <div className="flex items-center gap-4">
            <div className={`${colors.text} p-3 rounded-xl bg-white`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Rôle actif</p>
              <p className={`text-lg font-bold ${colors.text}`}>{role.label}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`space-y-3 ${className}`}>
        <p className="text-sm font-medium text-gray-500">Vos rôles disponibles</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {availableRoles.map((role) => {
            const Icon = ROLE_ICONS[role.id];
            const colors = ROLE_COLORS[role.id];
            const isActive = isRoleActive(role.id);
            const isSwitching = switching === role.id;

            return (
              <button
                key={role.id}
                onClick={() => handleRoleSwitch(role.id)}
                disabled={isSwitching}
                className={`relative p-4 rounded-2xl border-2 transition-all ${
                  isActive
                    ? `${colors.bg} ${colors.border} ${colors.text}`
                    : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className={`p-3 rounded-xl ${
                      isActive ? 'bg-white' : 'bg-gray-100'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{role.label}</p>
                    {isActive && (
                      <p className="text-sm opacity-75">Actif</p>
                    )}
                  </div>
                  {isSwitching && (
                    <div className="absolute top-2 right-2">
                      <Loader className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /**
   * Rendu du mode inline (pour header)
   */
  if (variant === 'inline') {
    if (loadingRoles || availableRoles.length <= 1 || disabled) {
      return null;
    }

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {availableRoles.map((role) => {
          const Icon = ROLE_ICONS[role.id];
          const isActive = isRoleActive(role.id);
          const isSwitching = switching === role.id;
          const colors = ROLE_COLORS[role.id];

          return (
            <button
              key={role.id}
              onClick={() => handleRoleSwitch(role.id)}
              disabled={isSwitching}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? `${colors.bg} ${colors.text}`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={role.label}
            >
              <Icon className="w-4 h-4" />
              {isActive && !isSwitching && (
                <Check className="w-3 h-3" />
              )}
              {isSwitching && (
                <Loader className="w-3 h-3 animate-spin" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}

/**
 * RoleBadge - Badge simple pour afficher le rôle actuel
 */
export function RoleBadge({ className = '' }: { className?: string }) {
  const { activeRole, getRoleLabel, loadingRoles } = useRole();

  if (loadingRoles || !activeRole) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
        Chargement...
      </span>
    );
  }

  const colors = ROLE_COLORS[activeRole];
  const Icon = ROLE_ICONS[activeRole];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${className}`}
    >
      <Icon className="w-3 h-3" />
      {getRoleLabel(activeRole)}
    </span>
  );
}
