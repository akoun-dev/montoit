import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { logger } from '@/services/logger';
import { supabase } from '@/lib/supabase';
import { celebrateCertification } from '@/utils/confetti';
import { Camera, Upload, CheckCircle, XCircle, AlertCircle, Shield, RefreshCw } from 'lucide-react';

// Configuration
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const IMAGE_QUALITY = 0.85;
const MAX_IMAGE_DIMENSION = 1920;

// Simple progress bar component
const SimpleProgress = ({ value, className }: { value: number; className?: string }) => (
  <div className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className}`}>
    <div 
      className="h-full bg-primary transition-all duration-300 ease-in-out"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  </div>
);

// Fonction utilitaire pour compresser une image
const compressImage = async (
  base64: string,
  maxWidth: number = MAX_IMAGE_DIMENSION,
  quality: number = IMAGE_QUALITY
): Promise<string> => {
  logger.debug('Compression image démarrée');
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      logger.debug('Dimensions originales image', { width, height });

      // Calculer les nouvelles dimensions en gardant le ratio
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = (height / width) * maxWidth;
          width = maxWidth;
        } else {
          width = (width / height) * maxWidth;
          height = maxWidth;
        }
        logger.debug('Nouvelles dimensions', { width, height });
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Impossible de créer le contexte canvas'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      
      const compressed = canvas.toDataURL('image/jpeg', quality);
      const originalSize = (base64.length * 3) / 4 / 1024 / 1024;
      const compressedSize = (compressed.length * 3) / 4 / 1024 / 1024;
      const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      
      logger.debug('Compression terminée', {
        original: `${originalSize.toFixed(2)}MB`,
        compressed: `${compressedSize.toFixed(2)}MB`,
        reduction: `${reduction}%`
      });
      
      resolve(compressed);
    };
    img.onerror = () => {
      logger.error('Erreur chargement image pour compression');
      reject(new Error('Erreur de chargement de l\'image'));
    };
    img.src = base64;
  });
};

// Fonction de validation d'image
const validateImage = (file: File): { valid: boolean; error?: string } => {
  logger.debug('Validation fichier', {
    name: file.name,
    type: file.type,
    size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
  });
  
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Format non supporté. Utilisez JPG ou PNG.' };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: `Taille maximale: ${MAX_IMAGE_SIZE / 1024 / 1024}MB` };
  }
  return { valid: true };
};

interface ONECIFormProps {
  onSubmit?: () => void;
}

const ONECIForm = ({ onSubmit }: ONECIFormProps = {}) => {
  const { user } = useAuth();
  const [cniImage, setCniImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    similarityScore: string;
    message: string;
    canRetry: boolean;
    resultText?: string;
  } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      logger.debug('Nettoyage composant ONECIForm');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          logger.debug('Track arrêté', { label: track.label });
        });
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      logger.info('Démarrage de la caméra');
      setIsVideoLoading(true);
      
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
      
      logger.debug('Stream vidéo obtenu', { settings: stream.getVideoTracks()[0].getSettings() });
      
      if (!videoRef.current) {
        throw new Error('Référence vidéo non disponible');
      }

      const video = videoRef.current;
      streamRef.current = stream;
      
      // IMPORTANT: Définir srcObject APRÈS avoir configuré les événements
      const playPromise = new Promise<void>((resolve, reject) => {
        const onCanPlay = () => {
          logger.debug('Vidéo prête (canplay)', {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState
          });
          
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setIsCapturing(true);
            setIsVideoLoading(false);
            logger.info('Caméra prête à capturer');
            toast.success('Caméra activée !', { 
              description: 'Positionnez votre visage au centre' 
            });
            resolve();
          }
        };

        const onError = (e: Event) => {
          logger.error('Erreur vidéo', { error: e });
          reject(new Error('Erreur de chargement de la vidéo'));
        };

        // Utiliser 'canplay' au lieu de 'loadedmetadata' (plus fiable)
        video.addEventListener('canplay', onCanPlay, { once: true });
        video.addEventListener('error', onError, { once: true });
        
        // Timeout de sécurité
        setTimeout(() => {
          video.removeEventListener('canplay', onCanPlay);
          video.removeEventListener('error', onError);
          
          // Vérifier manuellement si la vidéo est prête
          if (video.readyState >= 2 && video.videoWidth > 0) {
            logger.debug('Timeout mais vidéo prête', {
              readyState: video.readyState,
              width: video.videoWidth,
              height: video.videoHeight
            });
            setIsCapturing(true);
            setIsVideoLoading(false);
            toast.success('Caméra activée !');
            resolve();
          } else {
            logger.error('Timeout: vidéo non prête', {
              readyState: video.readyState,
              width: video.videoWidth,
              height: video.videoHeight
            });
            reject(new Error('La vidéo n\'a pas pu se charger'));
          }
        }, 5000);
      });

      // Assigner le stream à la vidéo
      video.srcObject = stream;
      
      // Forcer le play (nécessaire sur certains navigateurs)
      try {
        await video.play();
        logger.debug('video.play() appelé avec succès');
      } catch (playError) {
        logger.warn('video.play() a échoué (peut-être déjà en lecture)', { error: playError });
      }

      await playPromise;
    } catch (error) {
      logger.error('Error accessing camera', { error });
      setIsVideoLoading(false);
      setIsCapturing(false);
      
      let errorMessage = 'Impossible d\'accéder à la caméra';
      let errorDescription = 'Vérifiez vos permissions et réessayez';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Autorisation caméra refusée';
          errorDescription = 'Autorisez l\'accès à la caméra dans les paramètres de votre navigateur';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Aucune caméra trouvée';
          errorDescription = 'Vérifiez qu\'une caméra est connectée à votre appareil';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'La caméra est déjà utilisée';
          errorDescription = 'Fermez les autres applications utilisant la caméra';
        } else if (error.message.includes('Timeout') || error.message.includes('charger')) {
          errorMessage = 'La caméra n\'a pas pu se charger';
          errorDescription = 'Réessayez ou rechargez la page';
        }
      }
      
      toast.error(errorMessage, { description: errorDescription });
      
      // Nettoyer le stream en cas d'erreur
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          logger.debug('Track arrêté (erreur)', { label: track.label });
        });
        streamRef.current = null;
      }
    }
  };

  const stopCamera = useCallback(() => {
    logger.debug('Arrêt de la caméra');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setIsVideoLoading(false);
  }, []);

  const captureSelfie = () => {
    logger.debug('Tentative de capture du selfie');
    
    if (!videoRef.current || !canvasRef.current) {
      toast.error('Erreur de capture', { description: 'Références vidéo manquantes' });
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Vérifier que la vidéo a des dimensions valides
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      logger.error('Dimensions vidéo invalides', {
        width: video.videoWidth,
        height: video.videoHeight
      });
      toast.error('Vidéo non prête', { 
        description: 'Attendez que la caméra charge complètement' 
      });
      return;
    }

    // Vérifier que le stream est actif
    if (!streamRef.current || streamRef.current.getTracks().length === 0) {
      logger.error('Aucun stream actif');
      toast.error('Caméra inactive', { 
        description: 'Relancez la caméra et réessayez' 
      });
      return;
    }

    logger.debug('Capture du selfie', {
      width: video.videoWidth,
      height: video.videoHeight
    });

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setSelfieImage(imageData);
      stopCamera();
      logger.info('Selfie capturé avec succès');
      toast.success('Selfie capturé !');
    } else {
      logger.error('Impossible d\'obtenir le contexte canvas');
      toast.error('Erreur de capture', { description: 'Impossible de traiter l\'image' });
    }
  };

  const handleCniUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      logger.debug('Aucun fichier sélectionné');
      return;
    }

    logger.debug('Fichier sélectionné', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    });

    // Validation
    const validation = validateImage(file);
    if (!validation.valid) {
      logger.error('Validation échouée', { error: validation.error });
      toast.error('Fichier invalide', { description: validation.error });
      event.target.value = ''; // Reset input
      return;
    }

    logger.debug('Validation réussie, début de la lecture');
    setUploadProgress(0);
    
    try {
      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          setUploadProgress(progress);
          logger.debug(`Progression upload: ${progress.toFixed(1)}%`);
        }
      };

      reader.onloadend = async () => {
        try {
          logger.debug('Fichier chargé, début de la compression');
          let imageData = reader.result as string;
          
          const originalSize = (imageData.length * 3) / 4 / 1024 / 1024;
          logger.debug(`Taille originale: ${originalSize.toFixed(2)}MB`);
          
          // Compresser l'image
          imageData = await compressImage(imageData);
          
          const compressedSize = (imageData.length * 3) / 4 / 1024 / 1024;
          logger.debug(`Taille compressée: ${compressedSize.toFixed(2)}MB`);
          
          logger.debug('setCniImage appelé avec image compressée');
          setCniImage(imageData);
          setUploadProgress(100);
          
          toast.success('Photo de CNI chargée !', {
            description: `Taille: ${compressedSize.toFixed(2)}MB`
          });
          
          // Reset progress après 1 seconde
          setTimeout(() => {
            setUploadProgress(0);
            logger.debug('Progress bar réinitialisée');
          }, 1000);
        } catch (error) {
          logger.error('Erreur de compression', { error });
          toast.error('Erreur de traitement', {
            description: 'Impossible de traiter l\'image'
          });
          setUploadProgress(0);
        }
      };

      reader.onerror = (error) => {
        logger.error('Erreur de lecture du fichier', { error });
        toast.error('Erreur de lecture', {
          description: 'Impossible de lire le fichier'
        });
        setUploadProgress(0);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      logger.error('Erreur lors du chargement', { error });
      toast.error('Erreur', {
        description: 'Impossible de charger le fichier'
      });
      setUploadProgress(0);
    }
    
    // Reset input pour permettre le re-upload du même fichier
    event.target.value = '';
  }, []);

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
        // Update profile
        await supabase
          .from('profiles')
          .update({ oneci_verified: true })
          .eq('id', user?.id);

        // 🎉 Célébration avec confetti
        celebrateCertification();

        toast.success('🎉 Certification ANSUT réussie !', {
          description: `Score de similarité : ${data.similarityScore}% • Vous êtes maintenant certifié ANSUT`,
          duration: 5000,
        });
        onSubmit?.();
      } else {
        toast.error('Vérification échouée', {
          description: data.message || data.resultText
        });
      }
    } catch (error) {
      logger.error('ONECI Smile ID verification error', { error });
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
          <Shield className="h-6 w-6 text-primary" />
          Vérification d'Identité ONECI
        </CardTitle>
        <CardDescription>
          Vérification sécurisée via Smile ID pour ressortissants ivoiriens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Instructions importantes :</strong>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              <li>Téléchargez une photo <strong>claire et nette</strong> de votre CNI ivoirienne</li>
              <li>Assurez-vous que <strong>toutes les informations</strong> sur la CNI sont lisibles</li>
              <li>Prenez un selfie avec un <strong>bon éclairage</strong> (lumière naturelle de préférence)</li>
              <li>Regardez <strong>directement la caméra</strong>, expression neutre</li>
              <li>Retirez <strong>lunettes, masque, chapeau</strong> ou tout accessoire</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 gap-6">
          {/* CNI Upload */}
          <div className="space-y-3">
            <Label htmlFor="cni-upload" className="text-base font-semibold">
              1. Photo de votre Carte Nationale d'Identité
            </Label>
            <p className="text-sm text-muted-foreground">
              Téléchargez une photo claire du recto de votre CNI
            </p>
            {cniImage ? (
              <div className="relative group">
                <img 
                  src={cniImage} 
                  alt="Carte Nationale d'Identité" 
                  className="w-full h-48 object-cover rounded-lg border-2 border-primary shadow-sm"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setCniImage(null);
                      setVerificationResult(null);
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Retirer
                  </Button>
                </div>
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Chargée
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label 
                  htmlFor="cni-upload"
                  className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-all bg-muted/30"
                >
                  <Upload className="h-10 w-10 mb-3 text-primary" />
                  <span className="text-sm font-medium">Cliquez pour télécharger</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG (max 5MB)</span>
                  <input
                    id="cni-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={handleCniUpload}
                    aria-label="Télécharger photo de CNI"
                  />
                </label>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <SimpleProgress value={uploadProgress} />
                )}
              </div>
            )}
          </div>

          {/* Selfie Capture */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              2. Selfie de vérification
            </Label>
            <p className="text-sm text-muted-foreground">
              Prenez une photo de votre visage pour vérification biométrique
            </p>
            {selfieImage ? (
              <div className="relative group">
                <img 
                  src={selfieImage} 
                  alt="Selfie de vérification" 
                  className="w-full h-48 object-cover rounded-lg border-2 border-primary shadow-sm"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelfieImage(null);
                      setVerificationResult(null);
                      stopCamera();
                    }}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Retirer
                  </Button>
                </div>
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Capturé
                </div>
              </div>
            ) : (isCapturing || isVideoLoading) ? (
              <div className="space-y-2">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-48 object-cover rounded-lg border-2 border-primary"
                  />
                  {isVideoLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
                      <div className="text-center text-white">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-3" />
                        <p className="text-sm font-medium">Chargement de la caméra...</p>
                        <p className="text-xs text-white/70 mt-1">Patientez quelques secondes</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={captureSelfie} 
                    className="flex-1"
                    disabled={isVideoLoading}
                  >
                    {isVideoLoading ? 'Chargement...' : (
                      <>
                        <Camera className="mr-2 h-4 w-4" />
                        Capturer
                      </>
                    )}
                  </Button>
                  <Button onClick={stopCamera} variant="outline">
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={startCamera}
                className="w-full h-48 flex flex-col gap-3 bg-muted/30"
                variant="outline"
              >
                <Camera className="h-10 w-10 text-primary" />
                <span className="font-medium">Ouvrir la caméra</span>
                <span className="text-xs text-muted-foreground">Selfie en direct</span>
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

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleVerify}
            disabled={!cniImage || !selfieImage || isVerifying || uploadProgress > 0}
            size="lg"
            className="w-full"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                Vérification en cours...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-5 w-5" />
                Vérifier mon identité ONECI
              </>
            )}
          </Button>
          
          {(cniImage || selfieImage || verificationResult) && (
            <Button 
              onClick={reset} 
              variant="outline" 
              size="lg" 
              className="w-full"
              disabled={isVerifying}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recommencer la vérification
            </Button>
          )}
        </div>

        <Alert className="bg-muted">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Sécurité et confidentialité :</strong> Vos images sont transmises de manière sécurisée à Smile ID 
            pour vérification biométrique. Elles ne sont <strong>jamais stockées</strong> sur nos serveurs. 
            Seul le résultat de vérification (score de correspondance) est conservé dans votre profil.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default ONECIForm;
