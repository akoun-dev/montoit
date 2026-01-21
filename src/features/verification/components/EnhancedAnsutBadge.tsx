import { Shield, CheckCircle, Info } from 'lucide-react';
import { useState } from 'react';

interface EnhancedAnsutBadgeProps {
  verified: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  userName?: string;
  verifiedAt?: string;
}

export default function EnhancedAnsutBadge({
  verified,
  size = 'md',
  showTooltip = true,
  userName,
  verifiedAt,
}: EnhancedAnsutBadgeProps) {
  const [showInfo, setShowInfo] = useState(false);

  const sizeClasses = {
    sm: {
      badge: 'px-2 py-1 text-xs',
      icon: 'h-3 w-3',
      text: 'text-xs',
    },
    md: {
      badge: 'px-3 py-1.5 text-sm',
      icon: 'h-4 w-4',
      text: 'text-sm',
    },
    lg: {
      badge: 'px-4 py-2 text-base',
      icon: 'h-5 w-5',
      text: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  if (!verified) {
    return (
      <div
        className={`inline-flex items-center ${classes.badge} bg-gray-100 text-gray-600 rounded-full font-medium border-2 border-gray-200`}
      >
        <Shield className={`${classes.icon} mr-1.5`} />
        <span>Non vérifié</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => showTooltip && setShowInfo(!showInfo)}
        onMouseEnter={() => showTooltip && setShowInfo(true)}
        onMouseLeave={() => showTooltip && setShowInfo(false)}
        className={`inline-flex items-center ${classes.badge} bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-2 border-blue-500 cursor-pointer animate-glow`}
      >
        <Shield className={`${classes.icon} mr-1.5`} />
        <span>Vérifié ANSUT</span>
        <CheckCircle className={`${classes.icon} ml-1.5 text-green-300`} />
      </button>

      {/* Tooltip/Info */}
      {showInfo && showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-white rounded-xl shadow-2xl border-2 border-blue-100 p-4 z-50 animate-scale-in">
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-2 border-8 border-transparent border-t-white"></div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-900">Vérification ANSUT</h4>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              {userName ? `${userName} a été vérifié` : 'Cette personne a été vérifiée'} par
              l'Agence Nationale de Soutien au Développement de l'Habitat Social (ANSUT) avec
              validation ONECI.
            </p>

            <div className="space-y-2">
              <div className="flex items-start text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Identité vérifiée</span>
              </div>
              <div className="flex items-start text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Documents validés</span>
              </div>
              <div className="flex items-start text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">Protection anti-arnaque</span>
              </div>
            </div>

            {verifiedAt && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Vérifié le {new Date(verifiedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}

            <div className="pt-2">
              <a
                href="/verification"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                <Info className="h-4 w-4 mr-1" />
                En savoir plus sur la vérification
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Version compacte pour les listes
export function CompactAnsutBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;

  return (
    <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-semibold">
      <Shield className="h-3 w-3 mr-1" />
      <span>ANSUT</span>
    </div>
  );
}
