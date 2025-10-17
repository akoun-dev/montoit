import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/services/logger';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Simple progress bar component to replace @radix-ui/react-progress
const SimpleProgress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className}`}>
    <div 
      className="h-full bg-primary transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

interface FaceVerificationProps {
  onSuccess?: () => void;
  onSkip?: () => void;
}

const FaceVerification = ({ onSuccess, onSkip }: FaceVerificationProps) => {
  const [cniImage, setCniImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    similarityScore: string;
    message: string;
    canRetry: boolean;
  } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      logger.info('Starting camera...');
      
      // Vérifier si mediaDevices est disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('L\'API MediaDevices n\'est pas supportée par ce navigateur');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      logger.info('Camera stream obtained successfully');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
        logger.info('Camera activated successfully');
      }
    } catch (error) {
      logger.error('Error accessing camera', { error });
      
      let errorMessage = 'Impossible d\'accéder à la caméra';
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Autorisation caméra refusée. Vérifiez les paramètres de votre navigateur.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Aucune caméra trouvée sur cet appareil';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'La caméra est déjà utilisée par une autre application';
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const captureSelfie = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setSelfieImage(imageData);
        stopCamera();
        toast.success('Selfie capturé !');
      }
    }
  };

  const handleCniUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCniImage(reader.result as string);
        toast.success('Photo de CNI chargée !');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerify = async () => {
    if (!cniImage || !selfieImage) {
      toast.error('Veuillez fournir les deux images');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('smile-id-verification', {
        body: {
          cniImageBase64: cniImage,
          selfieBase64: selfieImage,
        },
      });

      if (error) throw error;

      setVerificationResult(data);

      if (data.verified) {
        toast.success('Vérification Smile ID réussie !', {
          description: `Score : ${data.similarityScore}% | Liveness : ${data.livenessCheck ? '✓' : '✗'} | Match : ${data.selfieToIdMatch ? '✓' : '✗'}`
        });
        onSuccess?.();
      } else {
        toast.error('Vérification échouée', {
          description: data.message || data.resultText
        });
      }
    } catch (error) {
      logger.error('Smile ID verification error', { error });
      toast.error('Erreur lors de la vérification', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const reset = () => {
    setCniImage(null);
    setSelfieImage(null);
    setVerificationResult(null);
    stopCamera();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Vérification Faciale (Optionnel)
        </CardTitle>
            <CardDescription>
              Vérification biométrique sécurisée propulsée par Smile ID
            </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Instructions importantes :</strong>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              <li>Assurez-vous d'avoir un bon éclairage</li>
              <li>Regardez directement la caméra</li>
              <li>Retirez lunettes, masque ou chapeau</li>
              <li>Gardez une expression neutre</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-4">
          {/* CNI Image Upload */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Photo de votre CNI</label>
            {cniImage ? (
              <div className="relative">
                <img 
                  src={cniImage} 
                  alt="CNI" 
                  className="w-full h-48 object-cover rounded-lg border-2 border-primary"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => setCniImage(null)}
                >
                  Retirer
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Cliquez pour charger</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCniUpload}
                />
              </label>
            )}
          </div>

          {/* Selfie Capture */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Votre selfie</label>
            {selfieImage ? (
              <div className="relative">
                <img 
                  src={selfieImage} 
                  alt="Selfie" 
                  className="w-full h-48 object-cover rounded-lg border-2 border-primary"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => setSelfieImage(null)}
                >
                  Retirer
                </Button>
              </div>
            ) : isCapturing ? (
              <div className="space-y-2">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-48 object-cover rounded-lg border-2 border-primary"
                />
                <div className="flex gap-2">
                  <Button onClick={captureSelfie} className="flex-1">
                    Capturer
                  </Button>
                  <Button onClick={stopCamera} variant="outline">
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={startCamera}
                className="w-full h-48 flex flex-col gap-2"
                variant="outline"
              >
                <Camera className="h-8 w-8" />
                Ouvrir la caméra
              </Button>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {verificationResult && (
          <Alert variant={verificationResult.verified ? "default" : "destructive"}>
            {verificationResult.verified ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">{verificationResult.message}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Score de similarité :</span>
                  <SimpleProgress value={parseFloat(verificationResult.similarityScore)} className="flex-1" />
                  <span className="text-sm font-bold">{verificationResult.similarityScore}%</span>
                </div>
                {!verificationResult.verified && verificationResult.canRetry && (
                  <p className="text-sm">
                    Vous pouvez réessayer avec de meilleures conditions.
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleVerify}
            disabled={!cniImage || !selfieImage || isVerifying}
            className="flex-1"
          >
            {isVerifying ? 'Vérification en cours...' : 'Vérifier mon visage'}
          </Button>
          
          {onSkip && (
            <Button onClick={onSkip} variant="outline">
              Passer cette étape
            </Button>
          )}
          
          {(cniImage || selfieImage || verificationResult) && (
            <Button onClick={reset} variant="outline">
              Recommencer
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          🔒 Vos images ne sont pas stockées. Seul le score de vérification est conservé.
        </p>
      </CardContent>
    </Card>
  );
};

export default FaceVerification;
