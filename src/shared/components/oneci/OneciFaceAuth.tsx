/**
 * Composant d'authentification faciale ONECI
 *
 * Ce composant permet aux utilisateurs de capturer une photo de leur visage
 * pour l'authentification biométrique auprès de l'ONECI
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Loader2, Camera, AlertCircle, CheckCircle, X, RotateCcw, Shield } from 'lucide-react';
import { faceAuthentication, type OneciFaceAuthResponse } from '@/services/oneci';

export interface OneciFaceAuthProps {
  nni: string;
  onSuccess?: (result: OneciFaceAuthResponse) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function OneciFaceAuth({ nni, onSuccess, onError, className }: OneciFaceAuthProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<OneciFaceAuthResponse | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(true);

  // Démarrer la caméra
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(null);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Impossible d\'accéder à la caméra';
        setCameraError(errorMessage);
        setShowCamera(false);
      }
    };

    if (showCamera) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showCamera]);

  // Capturer l'image
  const captureImage = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    // Créer un canvas avec les dimensions de la vidéo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dessiner l'image de la vidéo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir en base64
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    setImageData(base64);
    setShowCamera(false);
  }, []);

  // Retirer l'image
  const clearImage = useCallback(() => {
    setImageData(null);
    setResult(null);
    setShowCamera(true);
  }, []);

  // Soumettre pour authentification
  const handleSubmit = async () => {
    if (!imageData) return;

    setLoading(true);
    setResult(null);

    try {
      // Convertir l'image data URL en base64 pur (sans le préfixe)
      const base64Data = imageData.split(',')[1];

      const authResult = await faceAuthentication(nni, base64Data);

      setResult(authResult);

      if (authResult.success && authResult.authenticated) {
        onSuccess?.(authResult);
      } else if (!authResult.success) {
        onError?.(authResult.error || authResult.message || 'Erreur lors de l\'authentification');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      onError?.(errorMessage);
      setResult({
        success: false,
        authenticated: false,
        nni,
        message: errorMessage,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authentification Faciale
        </CardTitle>
        <CardDescription>
          Capturez une photo de votre visage pour confirmer votre identité biométrique auprès de
          l'ONECI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zone de caméra / image capturée */}
        <div className="relative aspect-[4/3] bg-neutral-100 rounded-2xl overflow-hidden">
          {cameraError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
              <p className="text-sm text-red-700 font-medium">Erreur d'accès à la caméra</p>
              <p className="text-xs text-red-600 mt-1">{cameraError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCameraError(null);
                  setShowCamera(true);
                }}
                className="mt-4"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </div>
          ) : showCamera && !imageData ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              {/* Guide de visage */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border-2 border-white/50 border-dashed" />
              </div>
              <Button
                onClick={captureImage}
                size="lg"
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white text-[#2C1810] hover:bg-neutral-100 shadow-lg"
              >
                <Camera className="h-5 w-5 mr-2" />
                Capturer
              </Button>
            </>
          ) : imageData ? (
            <>
              <img
                src={imageData}
                alt="Visage capturé"
                className="w-full h-full object-cover"
              />
              <Button
                onClick={clearImage}
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          )}
        </div>

        {/* Instructions */}
        {!imageData && !cameraError && (
          <div className="space-y-2 text-sm text-neutral-600">
            <p className="font-medium text-[#2C1810]">Conseils pour une bonne capture:</p>
            <ul className="list-disc list-inside space-y-1 text-neutral-600">
              <li>Assurez-vous d'avoir un bon éclairage</li>
              <li>Regardez directement la caméra</li>
              <li>Évitez les lunettes ou les chapeaux si possible</li>
              <li>Le visage doit être entièrement visible</li>
            </ul>
          </div>
        )}

        {/* Bouton de soumission */}
        {imageData && !result && (
          <Button onClick={handleSubmit} className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authentification en cours...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Vérifier mon visage
              </>
            )}
          </Button>
        )}

        {/* Résultat de l'authentification */}
        {result && <FaceAuthResult result={result} />}
      </CardContent>
    </Card>
  );
}

/**
 * Composant d'affichage du résultat de l'authentification faciale
 */
interface FaceAuthResultProps {
  result: OneciFaceAuthResponse;
}

function FaceAuthResult({ result }: FaceAuthResultProps) {
  if (!result.success) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-red-800">Authentification échouée</p>
          <p className="text-sm text-red-600 mt-1">{result.message}</p>
        </div>
      </div>
    );
  }

  if (!result.authenticated) {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-800">Visage non reconnu</p>
          <p className="text-sm text-amber-600 mt-1">
            Le visage capturé ne correspond pas aux registres biométriques ONECI. Veuillez réessayer
            avec une meilleure qualité d'image.
          </p>
          {result.matchScore !== undefined && (
            <p className="text-xs text-amber-600 mt-2">
              Score de correspondance: {Math.round(result.matchScore * 100)}%
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-green-800">Authentification réussie</p>
        <p className="text-sm text-green-600 mt-1">
          Votre visage a été authentifié avec succès auprès de l'ONECI.
        </p>
        {result.confidence !== undefined && (
          <p className="text-xs text-green-600 mt-2">
            Niveau de confiance: {Math.round(result.confidence * 100)}%
          </p>
        )}
        {result.matchScore !== undefined && (
          <p className="text-xs text-green-600 mt-2">
            Score de correspondance: {Math.round(result.matchScore * 100)}%
          </p>
        )}
      </div>
    </div>
  );
}
