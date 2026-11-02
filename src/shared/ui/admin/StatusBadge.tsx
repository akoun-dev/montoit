/**
 * StatusBadge - Badge de statut pour les tableaux admin
 */

import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

export type StatusType =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'suspended'
  | 'deleted'
  | 'verified'
  | 'rejected'
  | 'completed'
  | 'failed'
  | 'processing'
  | 'cancelled'
  | 'available'
  | 'rented'
  | 'unavailable'
  | 'operational'
  | 'degraded'
  | 'down'
  | 'in_progress'
  | 'assigned'
  | 'not_started'
  | 'in_review';

export interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; color: string; icon?: React.ComponentType<{ className?: string }> }> = {
  active: { label: 'Actif', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  inactive: { label: 'Inactif', color: 'bg-neutral-100 text-neutral-700 border-neutral-200', icon: XCircle },
  pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  suspended: { label: 'Suspendu', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  deleted: { label: 'Supprimé', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  verified: { label: 'Vérifié', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  processing: { label: 'En cours', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  cancelled: { label: 'Annulé', color: 'bg-neutral-100 text-neutral-700 border-neutral-200', icon: XCircle },
  available: { label: 'Disponible', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  rented: { label: 'Loué', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
  unavailable: { label: 'Indisponible', color: 'bg-neutral-100 text-neutral-700 border-neutral-200', icon: XCircle },
  operational: { label: 'Opérationnel', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  degraded: { label: 'Dégradé', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
  down: { label: 'Hors service', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  assigned: { label: 'Assigné', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle },
  not_started: { label: 'Non démarré', color: 'bg-neutral-100 text-neutral-700 border-neutral-200', icon: Clock },
  in_review: { label: 'En révision', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
};

export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase().replace(/ /g, '_') as StatusType;
  const config = statusConfig[normalizedStatus] || {
    label: status,
    color: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClasses[size]} ${config.color} ${className}`}
    >
      {showIcon && Icon && <Icon className="w-3 h-3" />}
      <span>{config.label}</span>
    </span>
  );
}

// Variante pour les types utilisateurs
export function UserTypeBadge({ userType, size = 'md', className = '' }: { userType: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const typeConfig: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    admin_ansut: { label: 'Admin ANSUT', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    moderator: { label: 'Modérateur', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    trust_agent: { label: 'Trust Agent', color: 'bg-teal-100 text-teal-700 border-teal-200' },
    locataire: { label: 'Locataire', color: 'bg-green-100 text-green-700 border-green-200' },
    proprietaire: { label: 'Propriétaire', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    agence: { label: 'Agence', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    user: { label: 'Utilisateur', color: 'bg-neutral-100 text-neutral-700 border-neutral-200' },
  };

  const config = typeConfig[userType] || {
    label: userType,
    color: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}
