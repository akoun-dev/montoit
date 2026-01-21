import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';

export default function NeoFaceReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification en cours...');

  useEffect(() => {
    // Récupérer les paramètres de retour de NeoFace
    const documentId = searchParams.get('document_id');
    const success = searchParams.get('success');
    const score = searchParams.get('score');

    console.log('[NeoFace Return] Paramètres reçus:', {
      documentId,
      success,
      score,
    });

    // Stocker les infos pour la page principale
    if (documentId) {
      sessionStorage.setItem(
        'neoface_result',
        JSON.stringify({
          document_id: documentId,
          success: success === 'true',
          score: score ? parseFloat(score) : null,
          timestamp: Date.now(),
        })
      );
    }

    // Déterminer le statut
    if (success === 'true') {
      setStatus('success');
      setMessage(
        `Vérification réussie${score ? ` avec un score de ${(parseFloat(score) * 100).toFixed(1)}%` : ''} !`
      );
    } else if (success === 'false') {
      setStatus('error');
      setMessage('La vérification a échoué. Veuillez réessayer.');
    } else {
      // Aucun paramètre de succès, on redirige vers la page de vérification
      setTimeout(() => {
        navigate('/verification-biometrique', { replace: true });
      }, 2000);
    }
  }, [searchParams, navigate]);

  const handleReturn = () => {
    navigate('/verification-biometrique');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF6E3] via-white to-[#FDF6E3] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            {status === 'loading' && (
              <>
                <Loader2 className="h-16 w-16 text-[#F16522] animate-spin mx-auto" />
                <h2 className="text-2xl font-bold text-[#3C2A1E]">Traitement en cours...</h2>
                <p className="text-[#5D4037]">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
                <h2 className="text-2xl font-bold text-green-900">Vérification Réussie !</h2>
                <p className="text-green-700">{message}</p>
                <Button
                  onClick={handleReturn}
                  className="bg-[#F16522] hover:bg-[#D95318] text-white mt-4"
                >
                  Retour à la vérification
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 text-red-600 mx-auto" />
                <h2 className="text-2xl font-bold text-red-900">Vérification Échouée</h2>
                <p className="text-red-700">{message}</p>
                <Button
                  onClick={handleReturn}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 mt-4"
                >
                  Réessayer
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
