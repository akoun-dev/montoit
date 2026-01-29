import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle, XCircle, Loader2, AlertCircle, RefreshCw, Sparkles, Shield, Eye } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { supabase } from '@/integrations/supabase/client';

interface NeofaceVerificationProps {
  userId: string;
  cniPhotoUrl: string | null;
  onVerified: (verificationData: unknown) => void;
  onFailed: (error: string) => void;
}

interface VerificationResponse {
  success: boolean;
  document_id: string;
  selfie_url: string;
  verification_id: string;
  provider: string;
  message: string;
}

interface StatusResponse {
  status: 'waiting' | 'verified' | 'failed';
  message: string;
  document_id: string;
  matching_score?: number;
  verified_at?: string;
  provider: string;
}

const NeofaceVerification: React.FC<NeofaceVerificationProps> = ({
  userId,
  cniPhotoUrl,
  onVerified,
  onFailed,
}) => {
  const hasDocument = Boolean(cniPhotoUrl);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'uploading' | 'waiting' | 'polling' | 'success' | 'error' | 'cancelled'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [_documentId, setDocumentId] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [_verificationId, setVerificationId] = useState<string | null>(null);
  const [matchingScore, setMatchingScore] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [progress, setProgress] = useState('');
  const [windowClosed, setWindowClosed] = useState(false);
  const selfieWindowRef = useRef<Window | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const windowCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (windowCheckIntervalRef.current) {
        clearInterval(windowCheckIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (selfieWindowRef.current && !selfieWindowRef.current.closed) {
        selfieWindowRef.current.close();
      }
    };
  }, []);

  const uploadDocument = async (): Promise<VerificationResponse> => {
    if (!cniPhotoUrl) {
      throw new Error('La photo du document est requise avant la vérification');
    }

    let bucket: string;
    let path: string;
    const cleanUrl = cniPhotoUrl.split('?')[0];
    const signMatch = cleanUrl.match(/\/storage\/v1\/object\/sign\/([^\/]+)\/(.+)/);
    const publicMatch = cleanUrl.match(/\/storage\/v1\/object\/public\/([^\/]+)\/(.+)/);
    const authMatch = cleanUrl.match(/\/storage\/v1\/object\/authenticated\/([^\/]+)\/(.+)/);

    if (signMatch) {
      bucket = signMatch[1];
      path = signMatch[2];
    } else if (publicMatch) {
      bucket = publicMatch[1];
      path = publicMatch[2];
    } else if (authMatch) {
      bucket = authMatch[1];
      path = authMatch[2];
    } else {
      throw new Error("Format d'URL de stockage non reconnu");
    }

    const { data, error } = await supabase.functions.invoke('neoface-verify', {
      body: {
        action: 'upload_document',
        bucket: bucket,
        path: path,
        user_id: userId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Échec du téléchargement du document');
    }

    return data as VerificationResponse;
  };

  const checkVerificationStatus = async (
    docId: string,
    verifyId: string
  ): Promise<StatusResponse> => {
    try {
      const { data, error } = await supabase.functions.invoke('neoface-verify', {
        body: {
          action: 'check_status',
          document_id: docId,
          verification_id: verifyId,
        },
      });

      if (error) {
        throw new Error(error.message || 'Échec de la vérification du statut');
      }

      if (!data) {
        throw new Error('Aucune donnée reçue du serveur');
      }

      return data as StatusResponse;
    } catch (err) {
      if (err instanceof Error && (err.message.includes('403') || err.message.includes('timeout'))) {
        const maxRetries = 5;
        if (attempts >= maxRetries) {
          return {
            status: 'failed',
            message: 'Vérification échouée: problème de connexion avec NeoFace. Veuillez réessayer plus tard.',
            document_id: docId,
            provider: 'neoface',
          };
        }
        return {
          status: 'waiting',
          message: 'Vérification en cours de traitement...',
          document_id: docId,
          provider: 'neoface',
        };
      }
      throw err;
    }
  };

  const startWindowMonitor = () => {
    if (windowCheckIntervalRef.current) {
      clearInterval(windowCheckIntervalRef.current);
    }

    windowCheckIntervalRef.current = setInterval(() => {
      if (selfieWindowRef.current?.closed) {
        if (windowCheckIntervalRef.current) {
          clearInterval(windowCheckIntervalRef.current);
        }
        windowCheckIntervalRef.current = null;
        selfieWindowRef.current = null;
        setWindowClosed(true);
      }
    }, 1000);
  };

  const handleCancel = () => {
    setIsCancelling(true);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (windowCheckIntervalRef.current) {
      clearInterval(windowCheckIntervalRef.current);
      windowCheckIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (selfieWindowRef.current && !selfieWindowRef.current.closed) {
      selfieWindowRef.current.close();
      selfieWindowRef.current = null;
    }

    setStatus('cancelled');
    setError('Vérification annulée par l\'utilisateur');
    setIsCancelling(false);
    setIsVerifying(false);
  };

  const startPolling = (docId: string, verifyId: string) => {
    setStatus('polling');
    setProgress('Vérification en cours...');
    const hasWindow = Boolean(selfieWindowRef.current && !selfieWindowRef.current.closed);
    setWindowClosed(!hasWindow);
    let pollAttempts = 0;
    const maxAttempts = 40;

    timeoutRef.current = setTimeout(
      () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        setStatus('error');
        setError("Timeout: La vérification n'a pas été complétée dans les délais (2 minutes). Veuillez réessayer.");
        if (selfieWindowRef.current && !selfieWindowRef.current.closed) {
          selfieWindowRef.current.close();
        }
      },
      2 * 60 * 1000
    );

    if (hasWindow) {
      startWindowMonitor();
    }

    pollingIntervalRef.current = setInterval(async () => {
      pollAttempts++;
      setAttempts(pollAttempts);

      try {
        const statusData = await checkVerificationStatus(docId, verifyId);

        if (statusData.status === 'verified') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          if (windowCheckIntervalRef.current) clearInterval(windowCheckIntervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (selfieWindowRef.current && !selfieWindowRef.current.closed) {
            selfieWindowRef.current.close();
          }

          setStatus('success');
          setWindowClosed(false);
          setMatchingScore(statusData.matching_score || null);
          setProgress('Identité vérifiée avec succès !');

          onVerified({
            document_id: docId,
            matching_score: statusData.matching_score,
            verified_at: statusData.verified_at,
            provider: 'neoface',
          });
        } else if (statusData.status === 'failed') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          if (windowCheckIntervalRef.current) clearInterval(windowCheckIntervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          if (selfieWindowRef.current && !selfieWindowRef.current.closed) {
            selfieWindowRef.current.close();
          }

          setStatus('error');
          setWindowClosed(false);
          const errorMsg = statusData.message || 'La vérification a échoué';
          setError(errorMsg);
          onFailed(errorMsg);
        } else {
          setProgress(`En attente du selfie (tentative ${pollAttempts}/${maxAttempts})...`);
        }

        if (pollAttempts >= maxAttempts) {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          if (windowCheckIntervalRef.current) clearInterval(windowCheckIntervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setStatus('error');
          setWindowClosed(false);
          setError('Nombre maximum de tentatives atteint. Veuillez réessayer.');
        }
      } catch (err) {
        console.error('[NeoFace] Error checking status:', err);
        let message = 'Erreur lors du suivi de la vérification';

        if (err instanceof Error) {
          if (err.message.includes('429') || err.message.toLowerCase().includes('too many')) {
            message = 'Limite de débit NeoFace atteinte. Réessayez dans quelques instants.';
          } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
            message = 'Accès refusé par NeoFace. Veuillez réessayer ou contacter le support.';
          } else {
            message = err.message;
          }
        }

        setStatus('error');
        setError(message);
        onFailed(message);
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        if (windowCheckIntervalRef.current) clearInterval(windowCheckIntervalRef.current);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (selfieWindowRef.current && !selfieWindowRef.current.closed) {
          selfieWindowRef.current.close();
        }
      }
    }, 3000);
  };

  const handleVerification = async () => {
    if (!hasDocument) {
      setError("Ajoutez d'abord une photo de votre document d'identité pour continuer.");
      setStatus('error');
      return;
    }

    setWindowClosed(false);
    setIsVerifying(true);
    setStatus('uploading');
    setError(null);
    setProgress('Téléchargement du document en cours...');

    const popupFeatures = 'width=840,height=720,left=120,top=80';
    const popup = window.open('', 'NeofaceVerification', popupFeatures);
    if (popup) {
      selfieWindowRef.current = popup;
      popup.document.title = 'Vérification NeoFace';
      popup.document.body.innerHTML =
        '<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:linear-gradient(135deg,#F16522 0%,#d9571d 100%);color:white}</style><div style="text-align:center"><div style="width:60px;height:60px;border:4px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px"></div><p>Chargement de la vérification...</p></div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
      popup.focus();
    } else {
      setWindowClosed(true);
    }

    try {
      const uploadData = await uploadDocument();

      setDocumentId(uploadData.document_id);
      setSelfieUrl(uploadData.selfie_url);
      setVerificationId(uploadData.verification_id);
      setProgress('Document téléchargé avec succès !');

      setStatus('waiting');
      setProgress('Redirection vers la page de vérification NeoFace...');

      if (!uploadData.selfie_url || !uploadData.selfie_url.startsWith('http')) {
        throw new Error(`URL NeoFace invalide: ${uploadData.selfie_url}`);
      }

      sessionStorage.setItem(
        'neoface_verification',
        JSON.stringify({
          document_id: uploadData.document_id,
          verification_id: uploadData.verification_id,
          user_id: userId,
          timestamp: Date.now(),
        })
      );

      const openSelfieWindow = () => {
        if (selfieWindowRef.current && !selfieWindowRef.current.closed) {
          selfieWindowRef.current.location.href = uploadData.selfie_url;
          selfieWindowRef.current.focus();
          return true;
        }

        const newWindow = window.open(uploadData.selfie_url, 'NeofaceVerification', popupFeatures);
        if (newWindow) {
          selfieWindowRef.current = newWindow;
          newWindow.focus();
          return true;
        }
        return false;
      };

      const opened = openSelfieWindow();
      if (!opened) {
        setWindowClosed(true);
        setProgress(
          'Fenêtre bloquée. Autorisez les popups, puis cliquez sur "Rouvrir la fenêtre".'
        );
      }

      startPolling(uploadData.document_id, uploadData.verification_id);
      setIsVerifying(false);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Erreur lors de la vérification';

      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('too many')) {
        errorMessage =
          'Trop de requêtes NeoFace. Attendez quelques instants avant de relancer la vérification.';
      }
      if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('token')) {
        errorMessage =
          'Token NeoFace invalide ou expiré. Contactez le support pour régénérer le jeton.';
      }

      setStatus('error');
      setError(errorMessage);
      onFailed(errorMessage);
      setWindowClosed(false);
      setIsVerifying(false);
      if (selfieWindowRef.current && !selfieWindowRef.current.closed) {
        selfieWindowRef.current.close();
      }
    }
  };

  // Vérifier si on revient de NeoFace
  React.useEffect(() => {
    const verificationData = sessionStorage.getItem('neoface_verification');
    if (verificationData && status === 'idle') {
      try {
        const data = JSON.parse(verificationData);
        const timeDiff = Date.now() - data.timestamp;

        if (timeDiff < 30 * 60 * 1000 && data.document_id && data.verification_id) {
          sessionStorage.removeItem('neoface_verification');
          setStatus('polling');
          setProgress('Vérification du statut en cours...');
          setDocumentId(data.document_id);
          setVerificationId(data.verification_id);
          startPolling(data.document_id, data.verification_id);
        }
      } catch (e) {
        sessionStorage.removeItem('neoface_verification');
      }
    }
  }, []);

  const handleRetry = () => {
    setStatus('idle');
    setError(null);
    setDocumentId(null);
    setSelfieUrl(null);
    setVerificationId(null);
    setMatchingScore(null);
    setAttempts(0);
    setProgress('');
    setIsVerifying(false);
    setWindowClosed(false);
    setIsCancelling(false);

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (windowCheckIntervalRef.current) {
      clearInterval(windowCheckIntervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (selfieWindowRef.current && !selfieWindowRef.current.closed) {
      selfieWindowRef.current.close();
    }
  };

  const handleReopenWindow = () => {
    if (selfieUrl && (!selfieWindowRef.current || selfieWindowRef.current.closed)) {
      selfieWindowRef.current = window.open(
        selfieUrl,
        'NeofaceVerification',
        'width=800,height=600,left=100,top=100'
      );
      if (selfieWindowRef.current) {
        setWindowClosed(false);
        startWindowMonitor();
      } else {
        setWindowClosed(true);
      }
    }
  };

  return (
    <Card className="border-2 border-[#3C2A1E]/10 shadow-xl overflow-hidden bg-gradient-to-br from-white to-[#FDF6E3]/30">
      {/* Header avec couleurs originales */}
      <div className="bg-gradient-to-r from-[#3C2A1E] to-[#5D4037] p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#F16522]/20 backdrop-blur rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold">Vérification Faciale NeoFace</h3>
            <p className="text-white/80 text-sm">Technologie avec détection de vivacité</p>
          </div>
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Document preview */}
        {cniPhotoUrl && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F16522]/20 to-[#d9571d]/20 rounded-2xl transform rotate-1"></div>
            <div className="relative bg-white rounded-2xl p-4 flex justify-center shadow-md">
              <img
                src={cniPhotoUrl}
                alt="Photo CNI"
                className="max-w-xs rounded-xl border-2 border-[#3C2A1E]/20"
                onError={(e) => {
                  console.error("[NeoFace] Erreur de chargement de l'image:", e);
                  e.currentTarget.src = '';
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Error: No document */}
        {!hasDocument && status === 'idle' && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">Photo requise</p>
                <p className="text-amber-700 text-sm mt-1">
                  Ajoutez la photo de votre document d'identité avant de lancer la vérification.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {status !== 'idle' && status !== 'success' && status !== 'cancelled' && (
          <div className="bg-gradient-to-r from-[#F16522]/10 to-[#d9571d]/10 border-2 border-[#F16522]/30 rounded-2xl p-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#F16522] to-[#d9571d] rounded-xl flex items-center justify-center">
                  {isCancelling ? (
                    <XCircle className="h-6 w-6 text-white" />
                  ) : (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  )}
                </div>
                {!isCancelling && status !== 'error' && (
                  <div className="absolute inset-0 bg-[#F16522] rounded-xl animate-ping opacity-20"></div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#3C2A1E]">{progress}</p>
                {attempts > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#F16522] to-[#d9571d] transition-all duration-300"
                        style={{ width: `${Math.min((attempts / 10) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-[#F16522] font-medium whitespace-nowrap">
                      {attempts}/10
                    </span>
                  </div>
                )}
              </div>
              {(status === 'polling' || status === 'waiting' || status === 'uploading') && !isCancelling && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-sm font-medium transition-colors"
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Annulation...' : 'Annuler'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Window closed warning */}
        {selfieUrl && (status === 'waiting' || windowClosed) && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  {windowClosed ? 'Fenêtre fermée' : 'Fenêtre de capture ouverte'}
                </p>
                <p className="text-amber-700 text-sm mt-1">
                  {windowClosed
                    ? "La fenêtre de vérification a été fermée. Rouvrez-la pour terminer la capture."
                    : 'Suivez les instructions dans la fenêtre popup pour capturer votre selfie.'}
                </p>
                <button
                  onClick={handleReopenWindow}
                  className="mt-3 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Rouvrir la fenêtre
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success state */}
        {status === 'success' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="absolute inset-0 bg-green-500 rounded-xl animate-ping opacity-30"></div>
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-900 text-lg">Identité Vérifiée !</p>
                <p className="text-green-700 text-sm mt-1">
                  Votre identité a été vérifiée avec succès via NeoFace.
                </p>
                {matchingScore !== null && (
                  <div className="mt-3 inline-flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-md">
                    <span className="text-sm text-green-600">Score:</span>
                    <span className="text-lg font-bold text-green-700">
                      {(matchingScore * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-900">Erreur de vérification</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Cancelled state */}
        {status === 'cancelled' && error && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gray-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Vérification annulée</p>
                <p className="text-gray-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {status === 'idle' && (
          <button
            onClick={handleVerification}
            disabled={isVerifying || !hasDocument}
            className="group w-full py-4 bg-gradient-to-r from-[#F16522] to-[#d9571d] text-white rounded-2xl font-semibold hover:from-[#d9571d] hover:to-[#F16522] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-3"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Vérification en cours...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                {hasDocument ? 'Commencer la Vérification' : 'Ajoutez une photo pour commencer'}
              </>
            )}
          </button>
        )}

        {status === 'error' && (
          <button
            onClick={handleRetry}
            className="group w-full py-4 border-2 border-[#3C2A1E]/20 text-[#3C2A1E] rounded-2xl font-semibold hover:bg-[#3C2A1E]/5 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
            Réessayer
          </button>
        )}

        {status === 'cancelled' && (
          <button
            onClick={handleRetry}
            className="group w-full py-4 border-2 border-[#3C2A1E]/20 text-[#3C2A1E] rounded-2xl font-semibold hover:bg-[#3C2A1E]/5 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
            Recommencer
          </button>
        )}

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#3C2A1E]/10">
          {[
            { icon: Eye, text: 'Détection de vivacité' },
            { icon: Sparkles, text: 'IA de reconnaissance' },
            { icon: Shield, text: '100% Gratuit' },
            { icon: Shield, text: 'Sécurisé' },
          ].map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-[#5D4037]">
              <feature.icon className="h-4 w-4 text-[#F16522]" />
              <span>{feature.text}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default NeofaceVerification;
