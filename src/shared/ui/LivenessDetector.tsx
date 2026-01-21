import React, { useRef, useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { useFaceDetection } from '@/shared/hooks/useFaceDetection';

type LivenessChallenge = 'blink' | 'turn_left' | 'turn_right';

const LIVENESS_CHALLENGES: LivenessChallenge[] = ['blink', 'turn_left', 'turn_right'];

const getChallengeLabel = (challenge: LivenessChallenge): string => {
  switch (challenge) {
    case 'blink':
      return 'Clignez des yeux';
    case 'turn_left':
      return 'Tournez la tête à gauche';
    case 'turn_right':
      return 'Tournez la tête à droite';
    default:
      return '';
  }
};

interface LivenessDetectorProps {
  onComplete: (videoRef: React.RefObject<HTMLVideoElement | null>) => void;
  onError?: (error: string) => void;
  className?: string;
}

const cn = (...classes: (string | boolean | undefined)[]): string => {
  return classes.filter(Boolean).join(' ');
};

const ChallengeIcon: React.FC<{
  challenge: LivenessChallenge;
  isActive: boolean;
  isComplete: boolean;
}> = ({ challenge, isActive, isComplete }) => {
  const iconClass = cn(
    'w-6 h-6 transition-all duration-300',
    isComplete && 'text-green-500',
    isActive && !isComplete && 'text-[#F16522] animate-pulse',
    !isActive && !isComplete && 'text-[#5D4037]/50'
  );

  switch (challenge) {
    case 'blink':
      return <Eye className={iconClass} />;
    case 'turn_left':
      return <ArrowLeft className={iconClass} />;
    case 'turn_right':
      return <ArrowRight className={iconClass} />;
    default:
      return null;
  }
};

export const LivenessDetector: React.FC<LivenessDetectorProps> = ({
  onComplete,
  onError,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const hasCompletedRef = useRef(false);

  const {
    modelsLoaded,
    modelsLoading,
    modelsError,
    faceDetected,
    currentChallenge,
    completedChallenges,
    isLivenessComplete,
    progress,
    resetChallenges,
  } = useFaceDetection({
    videoRef,
    enabled: cameraReady && !hasCompletedRef.current,
  });

  // Initialize camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
          setCameraError(null);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur caméra inconnue';
        setCameraError(errorMessage);
        onError?.(errorMessage);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onError]);

  // Notify parent when liveness is complete
  useEffect(() => {
    if (isLivenessComplete && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete(videoRef);
    }
  }, [isLivenessComplete, onComplete]);

  const handleRetry = () => {
    hasCompletedRef.current = false;
    resetChallenges();
  };

  if (cameraError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 bg-red-50 rounded-2xl',
          className
        )}
      >
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-800 font-medium text-center mb-4">
          Impossible d'accéder à la caméra
        </p>
        <p className="text-sm text-red-600 text-center">{cameraError}</p>
      </div>
    );
  }

  if (modelsError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center p-8 bg-red-50 rounded-2xl',
          className
        )}
      >
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-800 font-medium text-center mb-4">
          Erreur de chargement des modèles
        </p>
        <p className="text-sm text-red-600 text-center mb-6">{modelsError}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={() => window.location.reload()}
            className="w-full bg-[#F16522] hover:bg-[#D55A1B] text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
          <Button
            variant="outline"
            onClick={() => onError?.('skip_liveness')}
            className="w-full border-[#2C1810]/30 text-[#2C1810]"
          >
            Continuer sans vérification de vivacité
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Video container */}
      <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden bg-black/90 mb-6">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Loading overlay */}
        {(modelsLoading || !cameraReady) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2C1810]/80 z-10">
            <Loader2 className="w-12 h-12 text-[#F16522] animate-spin mb-4" />
            <p className="text-white text-sm">
              {modelsLoading
                ? 'Chargement de la détection faciale...'
                : 'Démarrage de la caméra...'}
            </p>
          </div>
        )}

        {/* Face guide overlay */}
        {cameraReady && modelsLoaded && !isLivenessComplete && (
          <>
            {/* Face outline guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={cn(
                  'w-48 h-64 rounded-[50%] border-4 transition-all duration-300',
                  faceDetected ? 'border-green-400' : 'border-white/50'
                )}
              />
            </div>

            {/* Current challenge instruction */}
            {currentChallenge && faceDetected && (
              <div className="absolute bottom-6 left-4 right-4 bg-black/70 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-center gap-3">
                  <ChallengeIcon challenge={currentChallenge} isActive={true} isComplete={false} />
                  <span className="text-white font-medium text-lg animate-pulse">
                    {getChallengeLabel(currentChallenge)}
                  </span>
                </div>
              </div>
            )}

            {/* Face not detected warning */}
            {!faceDetected && (
              <div className="absolute bottom-6 left-4 right-4 bg-amber-500/90 rounded-xl p-4">
                <p className="text-white text-center font-medium">
                  Placez votre visage dans le cadre
                </p>
              </div>
            )}
          </>
        )}

        {/* Liveness complete overlay */}
        {isLivenessComplete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-500/20 z-10">
            <CheckCircle2 className="w-20 h-20 text-green-500 mb-4 animate-bounce" />
            <p className="text-white text-xl font-bold">Vérification réussie !</p>
          </div>
        )}
      </div>

      {/* Progress indicators */}
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="h-2 bg-[#EFEBE9] rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-[#F16522] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Challenge steps */}
        <div className="flex justify-between items-center mb-6">
          {LIVENESS_CHALLENGES.map((challenge: LivenessChallenge, index: number) => {
            const isComplete = completedChallenges.includes(challenge);
            const isActive = currentChallenge === challenge;

            return (
              <div
                key={challenge}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300',
                  isComplete && 'bg-green-100',
                  isActive && !isComplete && 'bg-[#F16522]/10'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                    isComplete && 'bg-green-500',
                    isActive && !isComplete && 'bg-[#F16522]',
                    !isActive && !isComplete && 'bg-[#EFEBE9]'
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  ) : (
                    <ChallengeIcon
                      challenge={challenge}
                      isActive={isActive}
                      isComplete={isComplete}
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium text-center',
                    isComplete && 'text-green-600',
                    isActive && !isComplete && 'text-[#F16522]',
                    !isActive && !isComplete && 'text-[#5D4037]/50'
                  )}
                >
                  {index + 1}.{' '}
                  {challenge === 'blink'
                    ? 'Cligner'
                    : challenge === 'turn_left'
                      ? 'Gauche'
                      : 'Droite'}
                </span>
              </div>
            );
          })}
        </div>

        {/* Retry button */}
        {!isLivenessComplete && completedChallenges.length > 0 && (
          <Button
            variant="outline"
            onClick={handleRetry}
            className="w-full border-[#2C1810]/30 text-[#2C1810]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Recommencer
          </Button>
        )}
      </div>
    </div>
  );
};

export default LivenessDetector;
