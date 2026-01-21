import { Shield, CheckCircle, ExternalLink, Info } from 'lucide-react';

interface CEVBadgeProps {
  certified: boolean;
  cevNumber?: string;
  verificationUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export default function CEVBadge({
  certified,
  cevNumber,
  verificationUrl,
  size = 'md',
  showDetails = false,
}: CEVBadgeProps) {
  if (!certified) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (showDetails && cevNumber) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 rounded-full p-2">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-green-900">
                  Certificat Électronique de Vérification (CEV)
                </h3>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                  Optionnel
                </span>
              </div>
              <p className="text-sm text-green-800 mb-2">
                Ce bail possède un Certificat Électronique de Vérification (CEV) délivré par
                l'Office National de l'État Civil et de l'Identification (ONECI), renforçant sa
                validité légale devant les tribunaux ivoiriens.
              </p>
              <div className="flex items-start gap-2 mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Le CEV est un service optionnel fourni par l'ONECI qui ajoute une couche
                  supplémentaire de validation à votre contrat signé électroniquement.
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-green-700 font-medium">Numéro CEV:</span>
                  <span className="ml-2 font-mono font-bold text-green-900">{cevNumber}</span>
                </div>
                {verificationUrl && (
                  <a
                    href={verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-green-700 hover:text-green-900 font-medium"
                  >
                    Vérifier sur ONECI.ci
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 font-semibold rounded-full border border-green-300 ${sizeClasses[size]}`}
      title={`CEV ONECI (Optionnel)${cevNumber ? ` - ${cevNumber}` : ''}`}
    >
      <Shield className={iconSizes[size]} />
      <span>CEV ONECI</span>
      <CheckCircle className={iconSizes[size]} />
    </div>
  );
}
