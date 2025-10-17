import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { logger } from '@/services/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const CNAMForm = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cniNumber: '',
    employerName: '',
    socialSecurityNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Call CNAM verification edge function
      const { data: verificationResult, error: functionError } = await supabase.functions.invoke(
        'cnam-verification',
        {
          body: {
            cniNumber: formData.cniNumber,
            employerName: formData.employerName,
            socialSecurityNumber: formData.socialSecurityNumber,
          },
        }
      );

      if (functionError) throw functionError;

      toast({
        title: verificationResult.verified ? 'Vérification envoyée' : 'Vérification échouée',
        description: verificationResult.message,
        variant: verificationResult.verified ? 'default' : 'destructive',
      });

      if (verificationResult.verified) {
        setFormData({ cniNumber: '', employerName: '', socialSecurityNumber: '' });
        window.location.reload();
      }
    } catch (error) {
      logger.error('CNAM verification error', { error, userId: user?.id });
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la vérification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cnam-cniNumber">Numéro CNI</Label>
        <Input
          id="cnam-cniNumber"
          placeholder="CI1234567890"
          value={formData.cniNumber}
          onChange={(e) => setFormData({ ...formData, cniNumber: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="employerName">Nom de l'employeur</Label>
        <Input
          id="employerName"
          placeholder="Orange Côte d'Ivoire"
          value={formData.employerName}
          onChange={(e) => setFormData({ ...formData, employerName: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="socialSecurityNumber">Numéro de sécurité sociale</Label>
        <Input
          id="socialSecurityNumber"
          placeholder="123456789"
          value={formData.socialSecurityNumber}
          onChange={(e) => setFormData({ ...formData, socialSecurityNumber: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">Optionnel</p>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Vérification en cours...
          </>
        ) : (
          'Vérifier ma situation CNAM'
        )}
      </Button>
    </form>
  );
};

export default CNAMForm;
