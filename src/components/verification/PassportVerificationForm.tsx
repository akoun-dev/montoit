import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Shield } from 'lucide-react';
import { logger } from '@/services/logger';

interface PassportVerificationFormProps {
  onSubmit?: () => void;
}

const NATIONALITIES = [
  'Française', 'Malienne', 'Burkinabè', 'Sénégalaise', 'Guinéenne',
  'Béninoise', 'Nigérienne', 'Togolaise', 'Ghanéenne', 'Nigériane',
  'Camerounaise', 'Congolaise', 'Autre'
];

export default function PassportVerificationForm({ onSubmit }: PassportVerificationFormProps = {}) {
  const [formData, setFormData] = useState({
    passportNumber: '',
    nationality: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    issueDate: '',
    expiryDate: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('passport-verification', {
        body: formData
      });

      if (error) throw error;

      if (data?.valid === false) {
        toast({
          title: 'Vérification échouée',
          description: data.error || 'Les informations fournies ne correspondent pas',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Vérification soumise avec succès',
        description: 'Votre passeport est en cours de validation par nos équipes.',
      });

      onSubmit?.();
    } catch (error: any) {
      logger.error('Erreur vérification passeport', { error });
      
      let errorMessage = 'Une erreur est survenue lors de la vérification';
      if (error.message?.includes('Session expirée')) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-4 text-muted-foreground">
        <Shield className="h-5 w-5" />
        <p className="text-sm">
          Cette vérification est réservée aux ressortissants étrangers non-ivoiriens
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="passportNumber">Numéro de passeport *</Label>
        <Input
          id="passportNumber"
          value={formData.passportNumber}
          onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value.toUpperCase() })}
          placeholder="Ex: FR1234567"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="nationality">Nationalité *</Label>
        <Select
          value={formData.nationality}
          onValueChange={(value) => setFormData({ ...formData, nationality: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionnez votre nationalité" />
          </SelectTrigger>
          <SelectContent>
            {NATIONALITIES.map((nat) => (
              <SelectItem key={nat} value={nat}>{nat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom *</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="NOM"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom(s) *</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Prénom(s)"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="birthDate">Date de naissance *</Label>
        <Input
          id="birthDate"
          type="date"
          value={formData.birthDate}
          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">Date d'émission *</Label>
          <Input
            id="issueDate"
            type="date"
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiryDate">Date d'expiration *</Label>
          <Input
            id="expiryDate"
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Vérification en cours...
          </>
        ) : (
          'Vérifier mon passeport'
        )}
      </Button>
    </form>
  );
}