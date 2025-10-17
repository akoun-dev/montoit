import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { logger } from '@/services/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ONECIForm from '@/components/verification/ONECIForm';
import { Shield, AlertTriangle, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VerificationGuardProps {
  propertyId: string;
  onVerified?: () => void;
  children: React.ReactNode;
}

type VerificationStatus = 'pending' | 'pending_review' | 'verified' | 'rejected';

interface UserVerification {
  oneci_status: VerificationStatus;
  oneci_verified_at: string | null;
}

type ComponentStatus = 'loading' | 'not_verified' | 'pending' | 'verified' | 'error';

export const VerificationGuard = ({ propertyId, onVerified, children }: VerificationGuardProps) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verification, setVerification] = useState<UserVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mémorise le statut de vérification
  const verificationStatus = useMemo((): ComponentStatus => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (profile?.oneci_verified || (profile as any)?.passport_verified || verification?.oneci_status === 'verified') return 'verified';
    if (verification?.oneci_status === 'pending' || verification?.oneci_status === 'pending_review') return 'pending';
    return 'not_verified';
  }, [loading, error, profile?.oneci_verified, (profile as any)?.passport_verified, verification?.oneci_status]);

  const isVerified = verificationStatus === 'verified';
  const isPending = verificationStatus === 'pending';

  // Vérifie le statut de vérification
  const checkVerificationStatus = useCallback(async () => {
    if (!user?.id) return;

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('user_verifications')
        .select('oneci_status, oneci_verified_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setVerification(data as UserVerification);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur de chargement';
      logger.logError(err, { context: 'VerificationGuard', action: 'checkVerificationStatus' });
      setError(errorMessage);
      toast({
        title: "Erreur",
        description: "Impossible de vérifier votre statut. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      checkVerificationStatus();
    } else {
      setLoading(false);
    }
  }, [user, checkVerificationStatus]);

  // Procède à l'étape suivante (application ou callback)
  const proceedToNextStep = useCallback(() => {
    if (onVerified) {
      onVerified();
    } else {
      navigate(`/application/${propertyId}`);
    }
  }, [onVerified, navigate, propertyId]);

  // Gère le clic sur l'élément enfant
  const handleClick = useCallback(() => {
    if (!user) {
      toast({
        title: "Connexion requise",
        description: "Veuillez vous connecter pour continuer",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    if (!isVerified && !isPending) {
      setDialogOpen(true);
    } else {
      proceedToNextStep();
    }
  }, [user, isVerified, isPending, navigate, proceedToNextStep]);

  // Gère la soumission du formulaire
  const handleFormSubmit = useCallback(() => {
    setFormSubmitted(true);
  }, []);

  // Gère le succès de la vérification
  const handleVerificationSuccess = useCallback(async () => {
    if (!formSubmitted) {
      toast({
        title: "Attention",
        description: "Veuillez d'abord compléter le formulaire de vérification",
        variant: "destructive"
      });
      return;
    }

    setVerifying(true);
    
    try {
      // Revérifie le statut
      await checkVerificationStatus();
      
      toast({
        title: "Vérification soumise !",
        description: "Votre demande de vérification a été envoyée. Vous pouvez maintenant continuer votre candidature.",
      });

      setDialogOpen(false);
      proceedToNextStep();
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de valider la vérification. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  }, [formSubmitted, checkVerificationStatus, proceedToNextStep]);

  // Gestion du clavier pour l'accessibilité
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <>
      <div 
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Shield className="h-6 w-6 text-primary" />
              Vérification d'identité requise
            </DialogTitle>
            <DialogDescription>
              Pour postuler à ce bien, vous devez d'abord vérifier votre identité via ONECI
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Why verification is needed */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Pourquoi cette vérification ?</AlertTitle>
              <AlertDescription>
                La vérification ONECI permet aux propriétaires de confirmer votre identité 
                et d'augmenter la confiance dans votre candidature. C'est une étape rapide 
                et sécurisée.
              </AlertDescription>
            </Alert>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                <Shield className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-semibold mb-1">Sécurisé</h4>
                <p className="text-xs text-muted-foreground">
                  Vos données sont protégées
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-8 w-8 text-green-600 mb-2" />
                <h4 className="font-semibold mb-1">Rapide</h4>
                <p className="text-xs text-muted-foreground">
                  Seulement quelques minutes
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                <FileText className="h-8 w-8 text-blue-600 mb-2" />
                <h4 className="font-semibold mb-1">Une seule fois</h4>
                <p className="text-xs text-muted-foreground">
                  Valable pour toutes vos candidatures
                </p>
              </div>
            </div>

            {/* Statut de vérification en attente */}
            {isPending && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Vérification en cours</AlertTitle>
                <AlertDescription>
                  Votre demande de vérification est en cours de traitement. 
                  Vous pouvez continuer votre candidature pendant ce temps.
                </AlertDescription>
              </Alert>
            )}

            {/* Message de rejet */}
            {verification?.oneci_status === 'rejected' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Vérification refusée</AlertTitle>
                <AlertDescription>
                  Votre vérification a été refusée. Veuillez soumettre à nouveau avec des informations correctes.
                </AlertDescription>
              </Alert>
            )}

            {/* ONECI Form */}
            {!isVerified && !isPending && (
              <div className="border rounded-lg p-6 bg-muted/20">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Vérification ONECI
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Complétez le formulaire ci-dessous pour vérifier votre identité. 
                  Une fois validé, vous pourrez continuer votre candidature.
                </p>
                <ONECIForm onSubmit={handleFormSubmit} />
                <div className="mt-4">
                  <Button 
                    onClick={handleVerificationSuccess} 
                    className="w-full"
                    disabled={verifying || !formSubmitted}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Traitement en cours...
                      </>
                    ) : (
                      'J\'ai soumis ma vérification'
                    )}
                  </Button>
                  {!formSubmitted && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Veuillez d'abord compléter le formulaire ci-dessus
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              {isPending && (
                <Button
                  onClick={() => {
                    setDialogOpen(false);
                    proceedToNextStep();
                  }}
                  className="flex-1"
                >
                  Continuer la candidature
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};