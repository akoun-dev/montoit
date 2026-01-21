import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from './Button';
import LivenessDetector from './LivenessDetector';

interface SelfieCaptureProps {
  onCapture: (imageBase64: string) => void;
  onCancel: () => void;
  isProcessing?: boolean;
  requireLiveness?: boolean;
}

const SelfieCapture: React.FC<SelfieCaptureProps> = ({
  onCapture,
  onCancel,
  isProcessing = false,
  requireLiveness = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<'liveness' | 'capture' | 'preview'>('liveness');
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode] = useState<'user' | 'environment'>('user');

  // Skip liveness if not required
  useEffect(() => {
    if (!requireLiveness) {
      setMode('capture');
    }
  }, [requireLiveness]);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStarting(false);
    } catch (err) {
      console.error('[SelfieCapture] Camera error:', err);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(
            "Accès à la caméra refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur."
          );
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('Aucune caméra détectée sur cet appareil.');
        } else if (err.name === 'NotReadableError') {
          setError('La caméra est déjà utilisée par une autre application.');
        } else {
          setError(`Erreur caméra: ${err.message}`);
        }
      } else {
        setError("Erreur lors de l'accès à la caméra.");
      }

      setIsStarting(false);
    }
  }, [facingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Start camera when entering capture mode
  useEffect(() => {
    if (mode === 'capture') {
      startCamera();
    }
  }, [mode, startCamera]);

  const handleLivenessComplete = useCallback(
    (videoRefFromLiveness: React.RefObject<HTMLVideoElement | null>) => {
      // Capture from the liveness video directly
      if (videoRefFromLiveness.current && canvasRef.current) {
        const video = videoRefFromLiveness.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (context && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Mirror for selfie
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = canvas.toDataURL('image/jpeg', 0.9);
          setCapturedImage(imageData);
          setMode('preview');
        }
      }
    },
    []
  );

  const handleLivenessError = useCallback((errorMsg: string) => {
    setError(errorMsg);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    setMode('preview');
  }, [facingMode]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    if (requireLiveness) {
      setMode('liveness');
    } else {
      setMode('capture');
      startCamera();
    }
  }, [requireLiveness, startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      const parts = capturedImage.split(',');
      const base64Data = parts[1] ?? '';
      onCapture(base64Data);
    }
  }, [capturedImage, onCapture]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-800 font-medium mb-2">Erreur de caméra</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <div className="flex gap-2 justify-center">
          <Button
            onClick={() => {
              setError(null);
              setMode('liveness');
            }}
            variant="outline"
            className="border-red-300 text-red-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
          <Button onClick={onCancel} variant="outline">
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  // Liveness detection phase
  if (mode === 'liveness' && requireLiveness) {
    return (
      <div className="space-y-4">
        <canvas ref={canvasRef} className="hidden" />

        {/* Liveness header */}
        <div className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-4 text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-[#F16522]" />
            <span className="font-medium text-[#2C1810]">Vérification de vivacité</span>
          </div>
          <p className="text-sm text-[#5D4037]">
            Suivez les instructions pour prouver que vous êtes une personne réelle
          </p>
        </div>

        <LivenessDetector onComplete={handleLivenessComplete} onError={handleLivenessError} />

        <Button
          onClick={onCancel}
          variant="outline"
          className="w-full border-[#2C1810]/30 text-[#2C1810]"
        >
          <X className="mr-2 h-4 w-4" />
          Annuler
        </Button>
      </div>
    );
  }

  // Preview phase
  if (mode === 'preview' && capturedImage) {
    return (
      <div className="space-y-4">
        <canvas ref={canvasRef} className="hidden" />

        <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
          <img src={capturedImage} alt="Selfie capturé" className="w-full h-full object-cover" />

          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-20">
              <div className="text-center text-white">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3" />
                <p className="text-sm">Vérification en cours...</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={retakePhoto}
            variant="outline"
            className="flex-1 border-[#2C1810] text-[#2C1810]"
            disabled={isProcessing}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Reprendre
          </Button>
          <Button
            onClick={confirmPhoto}
            className="flex-1 bg-[#F16522] hover:bg-[#D95318] text-white"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Valider
              </>
            )}
          </Button>
        </div>

        <div className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-4 text-center">
          <p className="text-sm text-[#5D4037]">
            Vérifiez que votre visage est clairement visible avant de valider.
          </p>
        </div>
      </div>
    );
  }

  // Manual capture phase (when liveness is disabled)
  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2C1810]/90 z-10">
            <div className="text-center text-white">
              <Loader2 className="h-10 w-10 animate-spin mx-auto mb-3" />
              <p className="text-sm">Initialisation de la caméra...</p>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />

        {!isStarting && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-60 border-2 border-white/50 rounded-full" />
            </div>
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white text-sm bg-black/50 inline-block px-3 py-1 rounded-full">
                Placez votre visage dans le cadre
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center">
        <Button
          onClick={onCancel}
          variant="outline"
          className="border-[#2C1810]/30 text-[#2C1810]"
          disabled={isStarting}
        >
          <X className="mr-2 h-4 w-4" />
          Annuler
        </Button>
        <Button
          onClick={capturePhoto}
          className="flex-1 bg-[#F16522] hover:bg-[#D95318] text-white"
          disabled={isStarting}
        >
          <Camera className="mr-2 h-4 w-4" />
          Capturer
        </Button>
      </div>

      <div className="bg-[#FAF7F4] border border-[#EFEBE9] rounded-xl p-4 text-center">
        <p className="text-sm text-[#5D4037]">
          Gardez votre visage bien éclairé et regardez directement la caméra.
        </p>
      </div>
    </div>
  );
};

export default SelfieCapture;
