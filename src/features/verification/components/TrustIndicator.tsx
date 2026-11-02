import { Shield, CheckCircle, AlertCircle, Eye, Star } from 'lucide-react';

interface TrustIndicatorProps {
  userId?: string;
  userType?: 'locataire' | 'proprietaire' | 'agence';
  verificationStatus?: {
    oneci_verified: boolean;
    cnam_verified: boolean;
    identity_verified: boolean;
  };
  rating?: number;
  reviewCount?: number;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function TrustIndicator({
  verificationStatus,
  rating,
  reviewCount = 0,
  showDetails = false,
  size = 'md',
  userType,
}: TrustIndicatorProps) {
  const getTrustScore = () => {
    let score = 0;
    const maxScore = 5;

    if (verificationStatus) {
      if (verificationStatus.oneci_verified) score += 2;
      if (verificationStatus.cnam_verified) score += 1;
      if (verificationStatus.identity_verified) score += 2;
    }

    return { score, maxScore };
  };

  const { score, maxScore } = getTrustScore();
  const percentage = (score / maxScore) * 100;

  const getTrustLevel = () => {
    if (percentage >= 80)
      return {
        label: 'Excellent',
        color: 'green',
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        iconColor: 'text-green-600',
      };
    if (percentage >= 60)
      return {
        label: 'Bon',
        color: 'cyan',
        bgColor: 'bg-cyan-50',
        textColor: 'text-cyan-800',
        iconColor: 'text-cyan-600',
      };
    if (percentage >= 40)
      return {
        label: 'Moyen',
        color: 'amber',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-800',
        iconColor: 'text-amber-600',
      };
    return {
      label: 'Faible',
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-800',
      iconColor: 'text-orange-600',
    };
  };

  const trustLevel = getTrustLevel();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-2',
          icon: 'h-4 w-4',
          text: 'text-xs',
          badge: 'text-xs px-2 py-1',
        };
      case 'lg':
        return {
          container: 'p-6',
          icon: 'h-8 w-8',
          text: 'text-lg',
          badge: 'text-base px-4 py-2',
        };
      case 'md':
      default:
        return {
          container: 'p-4',
          icon: 'h-6 w-6',
          text: 'text-sm',
          badge: 'text-sm px-3 py-1.5',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (!showDetails) {
    return (
      <div
        className={`inline-flex items-center space-x-2 ${trustLevel.bgColor} ${sizeClasses.badge} rounded-full font-semibold ${trustLevel.textColor}`}
      >
        <Shield className={`${sizeClasses.icon} ${trustLevel.iconColor}`} />
        <span>Confiance: {trustLevel.label}</span>
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-100 ${sizeClasses.container}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className={`${sizeClasses.icon} text-terracotta-600`} />
          <h3 className="font-bold text-gray-900">Indicateur de confiance</h3>
        </div>
        <div
          className={`${trustLevel.bgColor} ${trustLevel.textColor} px-3 py-1 rounded-full ${sizeClasses.text} font-bold`}
        >
          {trustLevel.label}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-gray-600">Score global</span>
          <span className="font-bold text-gray-900">
            {score}/{maxScore}
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r from-${trustLevel.color}-400 to-${trustLevel.color}-600 transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {verificationStatus && (
        <div className="space-y-2 mb-4">
          <div className={`flex items-center justify-between ${sizeClasses.text}`}>
            <div className="flex items-center space-x-2">
              {verificationStatus.oneci_verified ? (
                <CheckCircle className={`${sizeClasses.icon} text-green-600`} />
              ) : (
                <AlertCircle className={`${sizeClasses.icon} text-gray-400`} />
              )}
              <span
                className={
                  verificationStatus.oneci_verified ? 'text-gray-900 font-medium' : 'text-gray-500'
                }
              >
                Identité ONECI
              </span>
            </div>
            {verificationStatus.oneci_verified && (
              <span className="text-green-600 font-semibold">Vérifié</span>
            )}
          </div>

          <div className={`flex items-center justify-between ${sizeClasses.text}`}>
            <div className="flex items-center space-x-2">
              {verificationStatus.cnam_verified ? (
                <CheckCircle className={`${sizeClasses.icon} text-green-600`} />
              ) : (
                <AlertCircle className={`${sizeClasses.icon} text-gray-400`} />
              )}
              <span
                className={
                  verificationStatus.cnam_verified ? 'text-gray-900 font-medium' : 'text-gray-500'
                }
              >
                Affiliation CNAM
              </span>
            </div>
            {verificationStatus.cnam_verified && (
              <span className="text-green-600 font-semibold">Vérifié</span>
            )}
          </div>

          <div className={`flex items-center justify-between ${sizeClasses.text}`}>
            <div className="flex items-center space-x-2">
              {verificationStatus.identity_verified ? (
                <CheckCircle className={`${sizeClasses.icon} text-green-600`} />
              ) : (
                <AlertCircle className={`${sizeClasses.icon} text-gray-400`} />
              )}
              <span
                className={
                  verificationStatus.identity_verified
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500'
                }
              >
                Profil vérifié
              </span>
            </div>
            {verificationStatus.identity_verified && (
              <span className="text-green-600 font-semibold">Vérifié</span>
            )}
          </div>
        </div>
      )}

      {rating !== undefined && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className={`${sizeClasses.icon} text-amber-500`} />
              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-lg font-bold text-gray-900">{rating.toFixed(1)}</span>
                  <span className="text-sm text-gray-500">/5</span>
                </div>
                <div className={`${sizeClasses.text} text-gray-600`}>{reviewCount} avis</div>
              </div>
            </div>
            {userType && (
              <div className="text-right">
                <div className={`${sizeClasses.text} text-gray-600 capitalize`}>{userType}</div>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Eye className="h-3 w-3" />
                  <span>Public</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
