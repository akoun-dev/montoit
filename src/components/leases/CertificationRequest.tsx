import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { logger } from '@/services/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Shield, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CertificationRequestProps {
  leaseId: string;
  certificationStatus: string;
  onRequestSubmitted?: () => void;
}

const CertificationRequest = ({ leaseId, certificationStatus, onRequestSubmitted }: CertificationRequestProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const canRequestCertification = certificationStatus === 'not_requested' || certificationStatus === 'rejected';

  const handleSubmit = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('leases')
        .update({
          certification_status: 'pending',
          certification_requested_at: new Date().toISOString(),
          certification_notes: notes.trim() || null,
        })
        .eq('id', leaseId);

      if (error) throw error;

      toast({
        title: '✅ Demande envoyée avec succès',
        description: 'Un agent ANSUT examinera votre dossier sous 2-5 jours ouvrables',
      });

      setOpen(false);
      setNotes('');
      onRequestSubmitted?.();
    } catch (error: any) {
      logger.logError(error, { context: 'CertificationRequest', action: 'submit' });
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de soumettre la demande',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!canRequestCertification) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Shield className="h-4 w-4" />
          Demander la certification ANSUT
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-secondary" />
            Demande de Certification ANSUT
          </DialogTitle>
          <DialogDescription>
            La certification ANSUT garantit la conformité de votre bail avec les normes ivoiriennes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Avant de soumettre :</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Assurez-vous que le bail est signé par les deux parties</li>
                <li>Vérifiez que toutes les informations sont correctes</li>
                <li>La certification peut prendre 2-5 jours ouvrables</li>
                <li>Un agent ANSUT examinera votre dossier complet</li>
              </ul>
              <p className="text-sm mt-2">
                <Link to="/certification-faq" className="text-primary underline hover:text-primary/80">
                  Consulter la FAQ complète
                </Link>
              </p>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes additionnelles (optionnel)
            </Label>
            <Textarea
              id="notes"
              placeholder="Ajoutez des informations complémentaires pour faciliter la certification..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Vous pouvez ajouter des précisions sur le bail ou des documents complémentaires
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Envoi en cours...' : 'Soumettre la demande'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificationRequest;
