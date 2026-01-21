/**
 * FaceCapture - Composant de capture faciale
 *
 * Permet de capturer une photo du visage via la caméra du dispositif
 * Supporte la caméra natif (Capacitor) et l'API Camera du navigateur
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, RotateCw, AlertCircle, CheckCircle } from 'lucide-react';

interface FaceCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel?: () => void;
  onReady?: () => void; // Callback quand le composant est prêt
  width?: number;
  height?: number;
}

type CameraStatus = 'idle' | 'requesting' | 'active' | 'error' | 'captured';

export function FaceCapture({
  onCapture,
  onCancel,
  onReady,
  width = 400,
  height = 400,
}: FaceCaptureProps) {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startCameraRef = useRef<(() => void) | null>(null); // Ref vers la fonction startCamera
  const isStartingRef = useRef(false);

  // Démarrer la caméra
  const startCamera = useCallback(async () => {
    if (isStartingRef.current) {
      console.log('[FaceCapture] Camera already starting, skipping');
      return;
    }
    isStartingRef.current = true;

    console.log('[FaceCapture] Starting camera...');
    setStatus('requesting');
    setErrorMessage('');

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
      };

      console.log('[FaceCapture] Requesting media with constraints:', constraints);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[FaceCapture] Got media stream:', mediaStream);
      console.log('[FaceCapture] Video tracks:', mediaStream.getVideoTracks());

      setStream(mediaStream);
      // Note: L'attachement au vidéo se fera via useEffect
    } catch (error) {
      console.error('[FaceCapture] Camera access error:', error);
      setStatus('error');
      isStartingRef.current = false;

      if (error instanceof Error) {
        console.error('[FaceCapture] Error name:', error.name);
        console.error('[FaceCapture] Error message:', error.message);

        if (error.name === 'NotAllowedError') {
          setErrorMessage('Accès à la caméra refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.');
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('Aucune caméra détectée sur ce dispositif.');
        } else {
          setErrorMessage(`Impossible d'accéder à la caméra: ${error.message}`);
        }
      }
    }
  }, [facingMode, width, height]);

  // Attacher le stream au vidéo quand il devient disponible
  useEffect(() => {
    if (stream && videoRef.current && status === 'requesting') {
      console.log('[FaceCapture] Attaching stream to video element');
      const video = videoRef.current;

      video.srcObject = stream;

      video.onloadedmetadata = () => {
        console.log('[FaceCapture] Video metadata loaded, setting status to active');
        console.log('[FaceCapture] Video dimensions:', {
          width: video.videoWidth,
          height: video.videoHeight,
        });
        setStatus('active');
        isStartingRef.current = false;
        // Informer le parent que la caméra est prête
        onReady?.();
      };

      video.onerror = (e) => {
        console.error('[FaceCapture] Video element error:', e);
        setErrorMessage('Erreur lors du chargement du flux vidéo');
        setStatus('error');
      };

      video.play().catch((e) => {
        console.error('[FaceCapture] Play error:', e);
      });
    }
  }, [stream, status]);

  // Arrêter la caméra
  const stopCamera = useCallback(() => {
    console.log('[FaceCapture] Stopping camera');
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setStatus('idle');
    isStartingRef.current = false;
  }, [stream]);

  // Capturer la photo
  const capturePhoto = useCallback(() => {
    console.log('[FaceCapture] capturePhoto called, videoRef:', !!videoRef.current, 'canvasRef:', !!canvasRef.current);
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Définir les dimensions du canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log('[FaceCapture] Canvas dimensions:', canvas.width, 'x', canvas.height);

    // Dessiner la frame actuelle sur le canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir en base64 PNG
    const imageData = canvas.toDataURL('image/png');
    console.log('[FaceCapture] Image captured, length:', imageData.length);
    setCapturedImage(imageData);
    setStatus('captured');
    stopCamera();

    console.log('[FaceCapture] Calling onCapture callback...');
    // Appeler immédiatement onCapture - la confirmation se fera dans le parent
    onCapture(imageData);

    return imageData;
  }, [stopCamera, onCapture]);

  // Recapturer
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  // Confirmer la capture
  const confirmCapture = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  // Changer de caméra (front/back)
  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    // Redémarrer avec la nouvelle caméra
    setTimeout(() => {
      startCamera();
    }, 100);
  }, [stopCamera, startCamera]);

  // Nettoyer le stream quand le composant est démonté
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Démarrer la caméra automatiquement quand l'élément vidéo est monté
  useEffect(() => {
    console.log('[FaceCapture] Component mounted, videoRef:', !!videoRef.current);
    if (videoRef.current) {
      console.log('[FaceCapture] Video element exists, starting camera');
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // État: Image capturée
  if (status === 'captured' && capturedImage) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
          <img
            src={capturedImage}
            alt="Visage capturé"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Capturé
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={retakePhoto}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            <RotateCw className="w-5 h-5" />
            <span>Recapturer</span>
          </button>
          <button
            type="button"
            onClick={confirmCapture}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <CheckCircle className="w-5 h-5" />
            <span>Confirmer</span>
          </button>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Annuler
          </button>
        )}
      </div>
    );
  }

  // État: Erreur
  if (status === 'error') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{errorMessage}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={startCamera}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
          >
            <RotateCw className="w-5 h-5" />
            <span>Réessayer</span>
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full text-muted-foreground hover:text-foreground transition-colors py-2 rounded-md"
            >
              Annuler
            </button>
          )}
        </div>
      </div>
    );
  }

  // État: Chargement / Demande d'accès
  if (status === 'requesting') {
    return (
      <div className="space-y-4">
        {/* Video element caché mais présent pour permettre l'attachement du stream */}
        <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />

          {/* Overlay avec spinner */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              <p className="text-white font-medium">Accès à la caméra en cours...</p>
            </div>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Annuler
          </button>
        )}
      </div>
    );
  }

  // État: Caméra active
  console.log('[FaceCapture] Rendering with status:', status);
  return (
    <div className="space-y-4">
      <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          onCanPlay={() => console.log('[FaceCapture] Video can play')}
          onPlay={() => console.log('[FaceCapture] Video is playing')}
        />

        {/* Guide de cadrage */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-8 border-2 border-white/50 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-white/80 rounded-full" />
          </div>
        </div>

        {/* Bouton de switch caméra */}
        <button
          type="button"
          onClick={switchCamera}
          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          title="Changer de caméra"
        >
          <RotateCw className="w-5 h-5" />
        </button>

        {/* Indicateur d'enregistrement */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-full text-white text-xs">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            En direct
          </div>
        </div>
      </div>

      <p className="text-sm text-center text-muted-foreground">
        Placez votre visage dans le cercle et assurez-vous d'avoir un bon éclairage
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={stopCamera}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
        >
          <CameraOff className="w-5 h-5" />
          <span>Fermer</span>
        </button>
        <button
          type="button"
          onClick={capturePhoto}
          className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Camera className="w-5 h-5" />
          <span>Capturer</span>
        </button>
      </div>

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          Annuler
        </button>
      )}

      {/* Canvas caché pour la capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export default FaceCapture;
