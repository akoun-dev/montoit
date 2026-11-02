import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, User, Calendar, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';

interface ONECIFormProps {
  userId: string;
  onSuccess?: () => void;
}

type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ONECIForm({ userId, onSuccess }: ONECIFormProps) {
  const [formData, setFormData] = useState({
    oneci_number: '',
    first_name: '',
    last_name: '',
    birth_date: '',
  });
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    if (!formData.oneci_number.trim()) {
      toast.error('Veuillez entrer votre numéro CNI');
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
      const { data, error } = await supabase.functions.invoke('oneci-verification', {
        body: {
          user_id: userId,
          oneci_number: formData.oneci_number.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          birth_date: formData.birth_date,
        },
      });

      if (error) throw error;

      if (data.verified) {
        setStatus('success');
        toast.success('Identité vérifiée avec succès !');
        onSuccess?.();
      } else {
        setStatus('error');
        setErrorMessage(data.message || 'La vérification a échoué. Vérifiez vos informations.');
      }
    } catch (err) {
      console.error('ONECI verification error:', err);
      setStatus('error');
      setErrorMessage('Service temporairement indisponible. Réessayez plus tard.');
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
              onChange={(e) => setFormData({ ...formData, oneci_number: e.target.value })}
              className="pl-10"
              placeholder="C0000000000"
              disabled={status === 'loading'}
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
        Vos données sont traitées de manière sécurisée et ne sont utilisées que pour la
        vérification.
      </p>
    </div>
  );
}
