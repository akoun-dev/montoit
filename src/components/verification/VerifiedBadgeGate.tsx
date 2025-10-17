import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LockedFeatureAlert } from './LockedFeatureAlert';

interface VerifiedBadgeGateProps {
  children: ReactNode;
  requiredVerification: 'oneci' | 'face' | 'cnam' | 'complete';
  feature?: string;
  fallback?: ReactNode;
  className?: string;
}

export const VerifiedBadgeGate = ({ 
  children, 
  requiredVerification, 
  feature,
  fallback,
  className = ''
}: VerifiedBadgeGateProps) => {
  const { profile } = useAuth();

  if (!profile) {
    return fallback || (
      <LockedFeatureAlert 
        requiredVerification={requiredVerification} 
        feature={feature}
        className={className}
      />
    );
  }

  // Vérifier selon le type de vérification requis
  const isVerified = (() => {
    switch (requiredVerification) {
      case 'oneci':
        return profile.oneci_verified;
      case 'face':
        return profile.face_verified;
      case 'cnam':
        return profile.cnam_verified;
      case 'complete':
        return profile.oneci_verified && profile.face_verified;
      default:
        return false;
    }
  })();

  if (!isVerified) {
    return fallback || (
      <LockedFeatureAlert 
        requiredVerification={requiredVerification} 
        feature={feature}
        className={className}
      />
    );
  }

  return <>{children}</>;
};
