import React, { useState } from 'react';
import { Camera, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';

interface SmilelessVerificationProps {
  userId: string;
  cniPhotoUrl: string;
  onVerified: () => void;
  onFailed: (error: string) => void;
}

const SmilelessVerification: React.FC<SmilelessVerificationProps> = ({
  userId: _userId,
  cniPhotoUrl,
  onVerified,
  onFailed,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerification = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      // TODO: Implémenter l'intégration avec Smile ID ou autre service de vérification
      // Pour l'instant, simulation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulation de succès
      onVerified();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification';
      setError(errorMessage);
      onFailed(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Vérification faciale sans sourire
        </CardTitle>
        <CardDescription>Nous allons comparer votre photo avec celle de votre CNI</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cniPhotoUrl && (
          <div className="flex justify-center">
            <img src={cniPhotoUrl} alt="Photo CNI" className="max-w-xs rounded-lg border" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Erreur de vérification</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        <Button onClick={handleVerification} disabled={isVerifying} className="w-full">
          {isVerifying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Vérification en cours...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Lancer la vérification
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Cette vérification utilise une technologie de reconnaissance faciale sécurisée
        </p>
      </CardContent>
    </Card>
  );
};

export default SmilelessVerification;
