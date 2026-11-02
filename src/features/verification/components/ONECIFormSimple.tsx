/**
 * Formulaire de vérification ONECI avec diagnostic
 * Version simplifiée pour déboguer les problèmes d'affichage
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase/client';
import { CreditCard, User, Calendar, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';

interface ONECIFormSimpleProps {
  userId: string;
  onSuccess?: () => void;
}

type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ONECIFormSimple({ userId, onSuccess }: ONECIFormSimpleProps) {
  const [formData, setFormData] = useState({
    oneci_number: '',
    first_name: '',
    last_name: '',
    birth_date: '',
  });
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [configStatus, setConfigStatus] = useState({
    apiUrl: '',
    apiKey: '',
    isConfigured: false,
  });

  // Vérifier la configuration au montage
  useEffect(() => {
    const apiUrl = import.meta.env['VITE_ONECI_API_URL'] || '';
    const apiKey = import.meta.env['VITE_ONECI_API_KEY'] || '';

    setConfigStatus({
      apiUrl,
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : '',
      isConfigured: !!(apiUrl && apiKey),
    });

    console.log('ONECI Config:', {
      apiUrl,
      hasApiKey: !!apiKey,
      isConfigured: !!(apiUrl && apiKey),
    });
  }, []);

  const validateForm = () => {
    if (!formData.oneci_number.trim()) {
      toast.error('Veuillez entrer votre numéro CNI');
      return false;
    }
    if (formData.oneci_number.trim().length < 8) {
      toast.error('Le numéro CNI doit comporter au moins 8 caractères');
      return false;
    }
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('Veuillez entrer votre nom et prénom');
      return false;
    }
    if (!formData.birth_date) {
      toast.error('Veuillez entrer votre date de naissance');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      // Créer d'abord une entrée de vérification
      const { data: verificationData, error: insertError } = await supabase
        .from('identity_verifications')
        .insert({
          user_id: userId,
          verification_type: 'oneci',
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const verificationId = verificationData.id;

      // Appeler l'Edge Function avec les bons noms de champs
      const { data, error } = await supabase.functions.invoke('oneci-verification', {
        body: {
          verificationId,
          cniNumber: formData.oneci_number.trim(),
          firstName: formData.first_name.trim(),
          lastName: formData.last_name.trim(),
          dateOfBirth: formData.birth_date,
          userId,
        },
      });

      if (error) {
        console.error('ONECI Edge Function error:', error);
        throw error;
      }

      // Vérifier le résultat
      if (data && (data.verified || data.success)) {
        // Mettre à jour le profil utilisateur
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            oneci_verified: true,
            oneci_number: formData.oneci_number.trim(),
            oneci_verification_date: new Date().toISOString(),
          })
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating profile:', updateError);
        }

        setStatus('success');
        toast.success('Identité vérifiée avec succès !');
        onSuccess?.();
      } else {
        setStatus('error');
        const score = data?.verificationScore || data?.score || 0;
        setErrorMessage(
          data?.error ||
          `La vérification a échoué${score > 0 ? ` (score: ${Math.round(score)}%)` : ''}. Vérifiez vos informations.`
        );
      }
    } catch (err) {
      console.error('ONECI verification error:', err);
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Service temporairement indisponible. Réessayez plus tard.'
      );
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-green-700 mb-2">Identité vérifiée !</h3>
        <p className="text-green-600">Votre CNI a été vérifiée avec succès via ONECI.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Diagnostic Info - Only in development */}
      {import.meta.env.DEV && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p className="font-medium text-blue-700 mb-2">Diagnostic ONECI :</p>
          <p>API URL: {configStatus.apiUrl || 'Non configurée'}</p>
          <p>API Key: {configStatus.apiKey || 'Non configurée'}</p>
          <p>Configuré: <span className={configStatus.isConfigured ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>{configStatus.isConfigured ? 'OUI' : 'NON'}</span></p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Vérification ONECI</h3>
          <p className="text-sm text-muted-foreground">Vérifiez votre carte nationale d'identité</p>
        </div>
      </div>

      {status === 'error' && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Numéro CNI</label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={formData.oneci_number}
              onChange={(e) => setFormData({ ...formData, oneci_number: e.target.value.toUpperCase() })}
              className="pl-10 uppercase"
              placeholder="C0000000000"
              disabled={status === 'loading'}
              maxLength={15}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Prénom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="pl-10"
                placeholder="Votre prénom"
                disabled={status === 'loading'}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="pl-10"
                placeholder="Votre nom"
                disabled={status === 'loading'}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Date de naissance
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
              className="pl-10"
              disabled={status === 'loading'}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Vérification en cours...
            </>
          ) : (
            'Vérifier mon identité'
          )}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center">
        Vos données sont transmises de manière sécurisée à l'ONECI pour vérification.
      </p>
    </div>
  );
}
