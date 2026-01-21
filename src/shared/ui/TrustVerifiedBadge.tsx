import React from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import { Badge } from './badge';

interface TrustVerifiedBadgeProps {
  verified: boolean;
  className?: string;
}

const TrustVerifiedBadge: React.FC<TrustVerifiedBadgeProps> = ({ verified, className = '' }) => {
  if (!verified) {
    return null;
  }

  return (
    <Badge variant="success" className={`flex items-center gap-1 ${className}`}>
      <Shield className="h-3 w-3" />
      <CheckCircle className="h-3 w-3" />
      <span>Vérifié par Trust Agent</span>
    </Badge>
  );
};

export default TrustVerifiedBadge;
