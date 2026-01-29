/**
 * Page de vérification ONECI
 *
 * Cette page permet à l'utilisateur de vérifier son identité
 * en utilisant le service ONECI (Carte Nationale d'Identité)
 *
 * Deux méthodes sont disponibles :
 * 1. Vérification par attributs (nom, prénom, date de naissance, numéro CNI)
 * 2. Authentification faciale (reconnaissance biométrique)
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { OneCiVerificationForm } from '@/features/verification';

export default function ONECIVerificationPage() {
  const { user, profile: authProfile, refetchProfile } = useAuth();
  const navigate = useNavigate();
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà vérifié
    const checkVerificationStatus = async () => {
      if (!user) return;

      try {
        const { supabase } = await import('@/services/supabase/client');
        const { data } = await supabase
          .from('profiles')
          .select('oneci_verified')
          .eq('id', user.id)
          .single();

        if (data?.oneci_verified) {
          setIsVerified(true);
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkVerificationStatus();
  }, [user]);

  const handleSuccess = async () => {
    setIsVerified(true);
    // Recharger le profil pour mettre à jour le statut
    if (refetchProfile) {
      await refetchProfile();
    }
    // Rediriger vers le profil après un court délai
    setTimeout(() => {
      navigate('/locataire/profil?tab=verification');
    }, 2000);
  };

  const handleBack = () => {
    navigate('/locataire/profil?tab=verification');
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 mb-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour au profil</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Vérification d'identité ONECI</h1>
              <p className="text-muted-foreground text-base mt-1">
                Vérifiez votre identité avec votre Carte Nationale d'Identité
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {isVerified ? (
          <div className="bg-card rounded-2xl shadow-card p-12 text-center max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-14 h-14 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-700 mb-3">
              Identité vérifiée avec succès !
            </h2>
            <p className="text-green-600 mb-8 text-lg">
              Votre CNI a été vérifiée via ONECI. Vous allez être redirigé vers votre profil...
            </p>
            <Button onClick={handleBack} size="lg">
              Retourner à mon profil
            </Button>
          </div>
        ) : (
          /* Verification Form - Choix entre attributs et auth faciale */
          <div className="bg-card rounded-2xl shadow-card p-8 md:p-12">
            {user && (
              <OneCiVerificationForm
                userId={user.id}
                onSuccess={handleSuccess}
                onCancel={handleBack}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
