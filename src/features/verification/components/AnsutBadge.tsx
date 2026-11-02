import { Shield, CheckCircle, Info } from 'lucide-react';
import { useState } from 'react';

interface AnsutBadgeProps {
  certified: boolean;
  size?: 'small' | 'medium' | 'large';
  showTooltip?: boolean;
  className?: string;
}

export default function AnsutBadge({
  certified,
  size = 'medium',
  showTooltip = true,
  className = '',
}: AnsutBadgeProps) {
  const [showInfo, setShowInfo] = useState(false);

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-1.5 text-sm',
    large: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
  };

  if (!certified) {
    return null;
  }

  return (
    <div className={`relative inline-flex ${className}`}>
      <div
        className={`
          flex items-center space-x-1.5 rounded-full font-bold
          bg-gradient-to-r from-green-500 to-emerald-600 text-white
          shadow-lg hover:shadow-xl transition-all duration-200
          border-2 border-green-400
          ${sizeClasses[size]}
        `}
        onMouseEnter={() => showTooltip && setShowInfo(true)}
        onMouseLeave={() => showTooltip && setShowInfo(false)}
      >
        <Shield className={iconSizes[size]} />
        <span>Vérifié Mon Toit</span>
        <CheckCircle className={iconSizes[size]} />
      </div>

      {showTooltip && showInfo && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
            <div className="flex items-start space-x-2 mb-2">
              <Info className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-400 mb-1">Utilisateur vérifié</p>
                <p className="text-gray-300 leading-relaxed">
                  Identité confirmée via ONECI (CNI) et vérification biométrique. Badge de confiance
                  Mon Toit.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-700 mt-2 pt-2">
              <p className="text-gray-400 text-xs">
                ✓ CNI vérifiée (ONECI) • ✓ Vérification biométrique • ✓ Profil complet
              </p>
            </div>
          </div>
          <div className="w-3 h-3 bg-gray-900 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -mt-1.5"></div>
        </div>
      )}
    </div>
  );
}
