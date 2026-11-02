import { AlertTriangle, Shield, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

interface ConfirmRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    full_name: string | null;
    email: string | null;
    avatar_url?: string | null;
  } | null;
  role: string;
  onConfirm: () => void;
  confirming?: boolean;
}

export function ConfirmRoleModal({
  open,
  onOpenChange,
  user,
  role,
  onConfirm,
  confirming,
}: ConfirmRoleModalProps) {
  if (!user) return null;

  const getRoleInfo = () => {
    switch (role) {
      case 'admin':
        return {
          title: 'Attribution Admin',
          color: 'red',
          icon: Shield,
          warning:
            'Cette action donne un accès COMPLET à toutes les données et configurations de la plateforme.',
          consequences: [
            'Accès à toutes les données utilisateurs',
            'Modification des configurations système',
            'Gestion des rôles et permissions',
            'Accès aux logs et audit',
          ],
        };
      case 'trust_agent':
        return {
          title: 'Attribution Trust Agent',
          color: 'purple',
          icon: Shield,
          warning:
            "Cette action permet à l'utilisateur de certifier et valider d'autres utilisateurs.",
          consequences: [
            'Validation des identités',
            'Certification des propriétés',
            'Accès aux documents de vérification',
          ],
        };
      default:
        return {
          title: 'Attribution de Rôle',
          color: 'blue',
          icon: Shield,
          warning: 'Cette action attribue des permissions spéciales à cet utilisateur.',
          consequences: ['Permissions étendues selon le rôle'],
        };
    }
  };

  const roleInfo = getRoleInfo();
  const Icon = roleInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 text-${roleInfo.color}-600`}>
            <AlertTriangle className="h-5 w-5" />
            {roleInfo.title}
          </DialogTitle>
          <DialogDescription>Confirmation requise pour cette action sensible</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || 'User'}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-5 w-5 text-primary-600" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-900">{user.full_name || 'Utilisateur'}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Warning */}
          <div
            className={`p-4 bg-${roleInfo.color}-50 border border-${roleInfo.color}-200 rounded-lg`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`h-5 w-5 text-${roleInfo.color}-600 mt-0.5`} />
              <div>
                <p className={`text-sm font-medium text-${roleInfo.color}-800`}>
                  {roleInfo.warning}
                </p>
                <ul className="mt-2 space-y-1">
                  {roleInfo.consequences.map((consequence, i) => (
                    <li
                      key={i}
                      className={`text-xs text-${roleInfo.color}-700 flex items-center gap-1.5`}
                    >
                      <span className="w-1 h-1 rounded-full bg-current" />
                      {consequence}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Confirmation Text */}
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir attribuer le rôle{' '}
            <strong className="text-gray-900">{role}</strong> à cet utilisateur ? Cette action sera
            enregistrée dans les logs d'audit.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            onClick={() => onOpenChange(false)}
            disabled={confirming}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className={`px-4 py-2 bg-${roleInfo.color}-600 text-white rounded-lg hover:bg-${roleInfo.color}-700 transition-colors disabled:opacity-50 flex items-center gap-2`}
          >
            {confirming ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Confirmer l'attribution
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmRoleModal;
