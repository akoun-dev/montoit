import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Heart, User, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { toast } from '@/hooks/shared/useSafeToast';

interface CNAMFormProps {
  userId: string;
  onSuccess?: () => void;
}

type VerificationStatus = 'idle' | 'loading' | 'success' | 'error';

export default function CNAMForm({ userId, onSuccess }: CNAMFormProps) {
  const [formData, setFormData] = useState({
    cnam_number: '',
    first_name: '',
    last_name: '',
  });
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    if (!formData.cnam_number.trim()) {
      toast.error('Veuillez entrer votre numéro CNAM');
      return false;
    }
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error('Veuillez entrer votre nom et prénom');
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
      const { data, error } = await supabase.functions.invoke('cnam-verification', {
        body: {
          user_id: userId,
          cnam_number: formData.cnam_number.trim(),
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
        },
      });

      if (error) throw error;

      if (data.verified) {
        setStatus('success');
        toast.success('Affiliation CNAM vérifiée avec succès !');
        onSuccess?.();
      } else {
        setStatus('error');
        setErrorMessage(data.message || 'La vérification a échoué. Vérifiez vos informations.');
      }
    } catch (err) {
      console.error('CNAM verification error:', err);
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
        <h3 className="text-xl font-bold text-green-700 mb-2">Affiliation vérifiée !</h3>
        <p className="text-green-600">Votre couverture CNAM a été vérifiée avec succès.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
          <Heart className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Vérification CNAM</h3>
          <p className="text-sm text-muted-foreground">Vérifiez votre couverture maladie</p>
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
          <label className="block text-sm font-medium text-foreground mb-1">Numéro CNAM</label>
          <div className="relative">
            <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={formData.cnam_number}
              onChange={(e) => setFormData({ ...formData, cnam_number: e.target.value })}
              className="pl-10"
              placeholder="Votre numéro CNAM"
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

        <Button type="submit" className="w-full" disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Vérification en cours...
            </>
          ) : (
            'Vérifier mon affiliation'
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
