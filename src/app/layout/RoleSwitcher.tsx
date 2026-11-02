import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { User, Building2, Briefcase, RefreshCw, CheckCircle, Info } from 'lucide-react';
import { toast } from '@/hooks/shared/useToast';
import { getDashboardRoute } from '@/shared/utils/roleRoutes';

export default function RoleSwitcher() {
  const { profile, user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Simplified: only use user_type from profile
  const activeRole = profile?.user_type || 'locataire';

  // For now, only show the current role (no multi-role support without DB tables)
  const availableRoles = [activeRole];

  const switchRole = async (newRole: string) => {
    if (newRole === activeRole) return;

    setSwitching(true);
    try {
      await updateProfile({ user_type: newRole });

      // Redirect to appropriate dashboard using centralized logic
      navigate(getDashboardRoute(newRole));
    } catch (err) {
      console.error('Erreur changement de rôle:', err);
      toast.error('Erreur lors du changement de rôle');
    } finally {
      setSwitching(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'locataire':
        return User;
      case 'proprietaire':
        return Building2;
      case 'agence':
        return Briefcase;
      default:
        return User;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'locataire':
        return 'Locataire';
      case 'proprietaire':
        return 'Propriétaire';
      case 'agence':
        return 'Agence';
      case 'admin':
        return 'Administrateur';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'locataire':
        return 'from-cyan-500 to-blue-500';
      case 'proprietaire':
        return 'from-terracotta-500 to-coral-500';
      case 'agence':
        return 'from-olive-500 to-green-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (!profile || !user) return null;

  // Don't show if only one role
  if (availableRoles.length <= 1) return null;

  return (
    <div className="relative">
      <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-600 font-medium">Profil actif</div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Info className="h-3 w-3 text-gray-400" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {availableRoles.map((role) => {
            const Icon = getRoleIcon(role);
            const isActive = activeRole === role;

            return (
              <button
                key={role}
                onClick={() => !isActive && switchRole(role)}
                disabled={switching || isActive}
                className={`
                  flex items-center space-x-2 px-3 py-2 rounded-lg font-semibold text-sm transition-all
                  ${
                    isActive
                      ? `bg-gradient-to-r ${getRoleColor(role)} text-white shadow-lg scale-105`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105'
                  }
                  ${switching ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                  transform
                `}
              >
                {switching && isActive ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Icon className="h-4 w-4" />
                    {isActive && <CheckCircle className="h-3 w-3" />}
                  </>
                )}
                <span>{getRoleLabel(role)}</span>
              </button>
            );
          })}
        </div>

        {showInfo && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Vous avez plusieurs profils. Cliquez pour basculer entre vos rôles et accéder
                    aux fonctionnalités correspondantes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
