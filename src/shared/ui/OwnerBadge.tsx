import { CheckCircle, Shield, MessageSquare, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { ScoreBadge } from './ScoreBadge';
import { Button } from './Button';
import { useAuthStore } from '@/store/authStore';

export interface OwnerBadgeProps {
  name?: string | null;
  avatarUrl?: string | null;
  trustScore?: number | null;
  isVerified?: boolean;
  oneciVerified?: boolean;
  showVerificationBadges?: boolean;
  variant?: 'inline' | 'card';
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  showName?: boolean;
  className?: string;
  ownerId?: string | null;
  propertyId?: string | null;
  propertyTitle?: string | null;
  onContact?: () => void;
  showContactButton?: boolean;
  city?: string | null;
  // Gestion anonyme
  isAnonymous?: boolean;
  managedByAgencyName?: string | null;
}

const sizeConfig = {
  sm: {
    avatar: 'w-6 h-6',
    verifiedBadge: 'w-3 h-3 -bottom-0.5 -right-0.5',
    verifiedIcon: 'h-2 w-2',
    name: 'text-xs',
    gap: 'gap-1.5',
  },
  md: {
    avatar: 'w-10 h-10',
    verifiedBadge: 'w-4 h-4 -bottom-0.5 -right-0.5',
    verifiedIcon: 'h-2.5 w-2.5',
    name: 'text-sm',
    gap: 'gap-2',
  },
  lg: {
    avatar: 'w-14 h-14',
    verifiedBadge: 'w-5 h-5 -bottom-1 -right-1',
    verifiedIcon: 'h-3 w-3',
    name: 'text-base',
    gap: 'gap-3',
  },
};

const getDefaultAvatar = (name?: string | null) => {
  const letter = (name?.trim()?.[0] || 'P').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
    <rect width='100%' height='100%' rx='64' fill='%23FF6C2F'/>
    <text x='50%' y='55%' text-anchor='middle' dominant-baseline='middle' font-family='Inter, Arial, sans-serif' font-size='56' fill='white'>${letter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export function OwnerBadge({
  name,
  avatarUrl,
  trustScore,
  isVerified = false,
  oneciVerified = false,
  showVerificationBadges = false,
  variant = 'inline',
  size = 'md',
  showScore = true,
  showName = true,
  className,
  ownerId,
  propertyId,
  propertyTitle,
  onContact,
  showContactButton = true,
  city,
  isAnonymous = false,
  managedByAgencyName,
}: OwnerBadgeProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const sizes = sizeConfig[size];

  const isOwnProfile = user?.id === ownerId;

  const handleContact = () => {
    if (onContact) {
      onContact();
      return;
    }

    const params = new URLSearchParams();
    if (ownerId) params.set('to', ownerId);
    if (propertyId) params.set('property', propertyId);
    if (propertyTitle) params.set('subject', `Demande concernant: ${propertyTitle}`);

    navigate(`/locataire/messages?${params.toString()}`);
  };

  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'inline-flex items-center bg-white/95 backdrop-blur-sm rounded-full px-2 py-1 shadow-md border border-neutral-100',
          sizes.gap,
          className
        )}
      >
        {/* Avatar avec badge vérifié */}
        <div className="relative flex-shrink-0">
          <img
            src={avatarUrl || getDefaultAvatar(name)}
            alt={name || 'Propriétaire'}
            className={cn(sizes.avatar, 'rounded-full object-cover border border-white')}
          />
          {isVerified && (
            <div
              className={cn(
                'absolute bg-green-500 rounded-full flex items-center justify-center border-2 border-white',
                sizes.verifiedBadge
              )}
            >
              <CheckCircle className={cn(sizes.verifiedIcon, 'text-white')} />
            </div>
          )}
        </div>

        {/* Nom (optionnel) */}
        {showName && name && (
          <span className={cn(sizes.name, 'font-medium text-neutral-800 truncate max-w-24')}>
            {name.split(' ')[0]}
          </span>
        )}

        {/* ScoreBadge (optionnel) */}
        {showScore && trustScore != null && (
          <ScoreBadge score={trustScore} variant="minimal" size={size === 'lg' ? 'md' : 'sm'} />
        )}
      </div>
    );
  }

  // Variante card (pour sidebar, détails)
  // Si gestion anonyme, afficher l'agence au lieu du propriétaire
  if (isAnonymous && managedByAgencyName) {
    return (
      <div
        className={cn('bg-white rounded-2xl shadow-lg p-6 border border-neutral-100', className)}
      >
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Gestionnaire</h3>

        <div className={cn('flex items-center', sizes.gap)}>
          {/* Agency Icon */}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                sizes.avatar,
                'rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20'
              )}
            >
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div
              className={cn(
                'absolute bg-primary rounded-full flex items-center justify-center border-2 border-white',
                sizes.verifiedBadge
              )}
            >
              <CheckCircle className={cn(sizes.verifiedIcon, 'text-white')} />
            </div>
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className={cn(sizes.name, 'font-semibold text-neutral-900 truncate')}>
              Géré par {managedByAgencyName}
            </div>
            <div className="mt-1 text-sm text-neutral-500">Agence immobilière vérifiée</div>
          </div>
        </div>

        {/* Bouton Contacter l'agence */}
        {showContactButton && (
          <div className="mt-4 pt-4 border-t border-neutral-100">
            <Button onClick={handleContact} variant="primary" fullWidth className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Contacter l'agence
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-2xl shadow-lg p-6 border border-neutral-100', className)}>
      <h3 className="text-lg font-semibold text-neutral-900 mb-4">Propriétaire</h3>

      <div className={cn('flex items-center', sizes.gap)}>
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={avatarUrl || getDefaultAvatar(name)}
            alt={name || 'Propriétaire'}
            className={cn(sizes.avatar, 'rounded-full object-cover border-2 border-neutral-100')}
          />
          {isVerified && (
            <div
              className={cn(
                'absolute bg-green-500 rounded-full flex items-center justify-center border-2 border-white',
                sizes.verifiedBadge
              )}
            >
              <CheckCircle className={cn(sizes.verifiedIcon, 'text-white')} />
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          {showName && (
            <div className={cn(sizes.name, 'font-semibold text-neutral-900 truncate')}>
              {name || 'Propriétaire'}
            </div>
          )}
          {city && (
            <div className="text-sm text-neutral-500 truncate">{city}</div>
          )}

          {showScore && trustScore != null && (
            <div className="mt-1">
              <ScoreBadge
                score={trustScore}
                variant="detailed"
                size={size === 'sm' ? 'sm' : 'md'}
                showVerified={isVerified}
              />
            </div>
          )}
        </div>
      </div>

      {/* Badges de vérification */}
      {showVerificationBadges && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <div className="text-sm text-neutral-500 mb-2">Vérifications</div>
          <div className="flex flex-wrap gap-2">
            {isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                <CheckCircle className="h-3 w-3" /> Identité vérifiée
              </span>
            )}
            {oneciVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                <Shield className="h-3 w-3" /> ONECI
              </span>
            )}
            {!isVerified && !oneciVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                <Shield className="h-3 w-3" /> Vérification en cours
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bouton Contacter */}
      {showContactButton && ownerId && !isOwnProfile && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <Button
            onClick={handleContact}
            variant="primary"
            fullWidth
            className="gap-2 items-center"
          >
            Contacter le propriétaire
          </Button>
        </div>
      )}
    </div>
  );
}

export default OwnerBadge;
