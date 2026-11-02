/**
 * Loading States Components
 * Mon Toit - Recommandation #4 de l'Audit UX/UI
 *
 * Objectif: Améliorer la performance perçue avec des états de chargement visuels
 * - Skeleton screens pour les listes
 * - Loading states pour les boutons
 * - Spinners et indicateurs de progression
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

/* ===== SKELETON SCREENS ===== */

/**
 * Skeleton pour une carte de propriété
 * Utilisé pendant le chargement de la liste des propriétés
 */
export const PropertyCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
    {/* Image skeleton */}
    <div className="h-48 md:h-64 bg-gray-200" />

    <div className="p-4 space-y-3">
      {/* Titre skeleton */}
      <div className="h-6 bg-gray-200 rounded w-3/4" />

      {/* Prix skeleton */}
      <div className="h-8 bg-gray-200 rounded w-1/2" />

      {/* Infos (chambres, surface) skeleton */}
      <div className="flex gap-4">
        <div className="h-4 bg-gray-200 rounded w-20" />
        <div className="h-4 bg-gray-200 rounded w-20" />
        <div className="h-4 bg-gray-200 rounded w-20" />
      </div>

      {/* Localisation skeleton */}
      <div className="h-4 bg-gray-200 rounded w-2/3" />

      {/* Boutons skeleton */}
      <div className="flex gap-2 mt-4">
        <div className="h-12 bg-gray-200 rounded-xl flex-1" />
        <div className="h-12 bg-gray-200 rounded-xl w-12" />
      </div>
    </div>
  </div>
);

/**
 * Grille de skeletons pour la liste de propriétés
 */
export const PropertyListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <PropertyCardSkeleton key={index} />
    ))}
  </div>
);

/**
 * Skeleton pour une carte de message
 */
export const MessageCardSkeleton: React.FC = () => (
  <div className="flex items-start gap-4 p-4 border-b border-gray-100 animate-pulse">
    {/* Avatar skeleton */}
    <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />

    <div className="flex-1 space-y-2">
      {/* Nom skeleton */}
      <div className="h-4 bg-gray-200 rounded w-32" />

      {/* Message skeleton */}
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />

      {/* Date skeleton */}
      <div className="h-3 bg-gray-200 rounded w-20" />
    </div>
  </div>
);

/**
 * Skeleton pour le détail d'une propriété
 */
export const PropertyDetailSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6">
    {/* Galerie skeleton */}
    <div className="h-96 bg-gray-200 rounded-2xl" />

    {/* Titre et prix skeleton */}
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 rounded w-3/4" />
      <div className="h-10 bg-gray-200 rounded w-1/3" />
    </div>

    {/* Caractéristiques skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-200 rounded-xl" />
      ))}
    </div>

    {/* Description skeleton */}
    <div className="space-y-2">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>

    {/* Carte skeleton */}
    <div className="h-64 bg-gray-200 rounded-2xl" />
  </div>
);

/**
 * Skeleton pour un profil utilisateur
 */
export const ProfileSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6">
    {/* Avatar et nom skeleton */}
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 rounded-full bg-gray-200" />
      <div className="space-y-2">
        <div className="h-6 bg-gray-200 rounded w-40" />
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
    </div>

    {/* Stats skeleton */}
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-xl" />
      ))}
    </div>

    {/* Infos skeleton */}
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full" />
      ))}
    </div>
  </div>
);

/* ===== LOADING BUTTONS ===== */

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

/**
 * Bouton avec état de chargement
 * Affiche un spinner et désactive le bouton pendant le chargement
 */
export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading = false,
  loadingText = 'Chargement...',
  children,
  disabled,
  className = '',
  ...props
}) => (
  <button
    disabled={isLoading || disabled}
    className={`relative ${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
    {...props}
  >
    {isLoading ? (
      <span className="flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{loadingText}</span>
      </span>
    ) : (
      children
    )}
  </button>
);

/* ===== SPINNERS ===== */

/**
 * Spinner simple centré
 */
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />;
};

/**
 * Spinner pleine page avec overlay
 */
export const FullPageSpinner: React.FC<{ message?: string }> = ({ message = 'Chargement...' }) => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="text-center space-y-4">
      <Spinner size="lg" className="text-blue-600 mx-auto" />
      <p className="text-gray-600 font-medium">{message}</p>
    </div>
  </div>
);

/**
 * Spinner inline pour sections
 */
export const InlineSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex items-center justify-center gap-3 py-8">
    <Spinner size="md" className="text-blue-600" />
    {message && <span className="text-gray-600">{message}</span>}
  </div>
);

/* ===== PROGRESS INDICATORS ===== */

interface ProgressBarProps {
  progress: number; // 0-100
  showLabel?: boolean;
  className?: string;
}

/**
 * Barre de progression
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = true,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`}>
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
    {showLabel && (
      <p className="text-sm text-gray-600 text-center font-medium">{Math.round(progress)}%</p>
    )}
  </div>
);

/**
 * Indicateur de progression circulaire
 */
export const CircularProgress: React.FC<{ progress: number; size?: number }> = ({
  progress,
  size = 64,
}) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="4"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3b82f6"
          strokeWidth="4"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <span className="absolute text-sm font-bold text-gray-700">{Math.round(progress)}%</span>
    </div>
  );
};

/* ===== PULSE INDICATORS ===== */

/**
 * Indicateur de pulsation (pour les notifications, statuts en direct)
 */
export const PulseIndicator: React.FC<{ color?: 'green' | 'blue' | 'red' | 'yellow' }> = ({
  color = 'green',
}) => {
  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <span className="relative flex h-3 w-3">
      <span
        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colorClasses[color]} opacity-75`}
      />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${colorClasses[color]}`} />
    </span>
  );
};

/* ===== LOADING OVERLAYS ===== */

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

/**
 * Overlay de chargement pour une section spécifique
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Chargement...',
  children,
}) => (
  <div className="relative">
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
        <div className="text-center space-y-3">
          <Spinner size="md" className="text-blue-600 mx-auto" />
          <p className="text-sm text-gray-600 font-medium">{message}</p>
        </div>
      </div>
    )}
  </div>
);

/* ===== SHIMMER EFFECT ===== */

/**
 * Effet shimmer pour les skeletons (alternative à pulse)
 */
export const ShimmerSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-gray-200 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

/* Animation shimmer à ajouter au CSS global */
const shimmerAnimation = `
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}
`;

/* ===== EMPTY STATES ===== */

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * État vide (quand aucune donnée n'est disponible)
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="text-center py-12 px-4">
    {icon && <div className="flex justify-center mb-4 text-gray-400">{icon}</div>}
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    {description && <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>}
    {action && (
      <button onClick={action.onClick} className="btn-primary">
        {action.label}
      </button>
    )}
  </div>
);

/* ===== EXPORT STYLE ===== */

/**
 * Injecter les styles d'animation shimmer
 */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = shimmerAnimation;
  document.head.appendChild(style);
}
