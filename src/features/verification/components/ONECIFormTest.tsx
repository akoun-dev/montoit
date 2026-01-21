/**
 * Formulaire de vérification ONECI - Version de test avec logs détaillés
 */

import { useState } from 'react';
import { CreditCard, User, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';

interface ONECIFormTestProps {
  userId: string;
  onSuccess?: () => void;
}

export default function ONECIFormTest({ userId, onSuccess }: ONECIFormTestProps) {
  const [formData, setFormData] = useState({
    oneci_number: '',
    first_name: '',
    last_name: '',
    birth_date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('User ID:', userId);
    console.log('Form Data:', formData);

    setIsSubmitting(true);
    setMessage('Soumission en cours...');

    try {
      // Import dynamique de Supabase
      const { supabase } = await import('@/services/supabase/client');
      console.log('Supabase imported:', !!supabase);

      // Test simple: créer une entrée de vérification
      console.log('Creating verification entry...');
      const { data: verificationData, error: insertError } = await supabase
        .from('identity_verifications')
        .insert({
          user_id: userId,
          verification_type: 'oneci',
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        setMessage(`Erreur: ${insertError.message}`);
        setIsSubmitting(false);
        return;
      }

      console.log('Verification created:', verificationData);
      const verificationId = verificationData.id;

      // Appeler l'Edge Function
      console.log('Calling Edge Function...');
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

      console.log('Edge Function response:', { data, error });

      if (error) {
        console.error('Edge Function error:', error);
        setMessage(`Erreur Edge Function: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      // Succès
      console.log('Verification successful!');
      setMessage(`Succès! Score: ${data?.verificationScore || data?.score || 'N/A'}`);

      // Mettre à jour le profil
      await supabase
        .from('profiles')
        .update({
          oneci_verified: true,
          oneci_number: formData.oneci_number.trim(),
          oneci_verification_date: new Date().toISOString(),
        })
        .eq('id', userId);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('General error:', err);
      setMessage(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setIsSubmitting(false);
    }

    console.log('=== FORM SUBMISSION ENDED ===');
  };

  const handleChange = (field: string, value: string) => {
    console.log(`Field ${field} changed to:`, value);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm font-medium text-yellow-800">Mode Test - Logs dans la console</p>
      </div>

      {message && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">{message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Numéro CNI</label>
          <Input
            value={formData.oneci_number}
            onChange={(e) => handleChange('oneci_number', e.target.value.toUpperCase())}
            placeholder="C0000000000"
            disabled={isSubmitting}
            maxLength={15}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Prénom</label>
            <Input
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              placeholder="Votre prénom"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Nom</label>
            <Input
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              placeholder="Votre nom"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Date de naissance</label>
          <Input
            type="date"
            value={formData.birth_date}
            onChange={(e) => handleChange('birth_date', e.target.value)}
            disabled={isSubmitting}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Vérification en cours...' : 'Vérifier mon identité (TEST)'}
        </Button>
      </form>

      <div className="p-4 bg-gray-100 rounded-lg text-xs font-mono">
        <p>User ID: {userId}</p>
        <p>Form Data: {JSON.stringify(formData)}</p>
      </div>
    </div>
  );
}
