import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, Search, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProperties } from '@/hooks/useProperties';
import { toast } from '@/hooks/use-toast';

interface NewApplicationWidgetProps {
  onApplicationCreated?: () => void;
}

export const NewApplicationWidget = ({ onApplicationCreated }: NewApplicationWidgetProps) => {
  const { user, profile } = useAuth();
  const { data: properties = [] } = useProperties();
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter available properties (exclude already applied ones)
  const availableProperties = properties.filter(property =>
    property.status === 'disponible'
  );

  const handleSubmitApplication = async () => {
    if (!selectedProperty || !coverLetter.trim()) {
      toast({
        title: 'Champs obligatoires',
        description: 'Veuillez sélectionner un bien et rédiger une lettre de motivation',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Simuler la création de candidature
      // En réalité, cela appellerait une API pour créer la candidature
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: 'Candidature envoyée',
        description: 'Votre dossier a été soumis avec succès',
      });

      // Reset form
      setSelectedProperty('');
      setCoverLetter('');

      onApplicationCreated?.();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer votre candidature',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !profile || profile.user_type !== 'locataire') {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileText className="h-5 w-5 text-primary" />
          Je dépose mon dossier de candidature
        </CardTitle>
        <CardDescription>
          Postulez aux biens qui vous intéressent en quelques clics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-background rounded-lg">
            <div className="text-2xl font-bold text-primary">{availableProperties.length}</div>
            <div className="text-xs text-muted-foreground">Biens disponibles</div>
          </div>
          <div className="text-center p-3 bg-background rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {profile.oneci_verified && profile.cnam_verified ? '✓' : '⚠️'}
            </div>
            <div className="text-xs text-muted-foreground">Vérifications</div>
          </div>
        </div>

        {/* Property Selection */}
        <div className="space-y-2">
          <Label htmlFor="property">Sélectionner un bien</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              id="property"
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Choisir un bien...</option>
              {availableProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title} - {property.city} ({property.monthly_rent.toLocaleString()} FCFA/mois)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cover Letter */}
        <div className="space-y-2">
          <Label htmlFor="coverLetter">Lettre de motivation</Label>
          <Textarea
            id="coverLetter"
            placeholder="Présentez-vous et expliquez pourquoi vous êtes intéressé par ce bien..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        {/* Required Documents Checklist */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Documents requis</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {profile.oneci_verified ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>Pièce d'identité (ONECI)</span>
              {profile.oneci_verified ? (
                <Badge variant="secondary" className="text-xs">Vérifié</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">À vérifier</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {profile.cnam_verified ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
              <span>Justificatif d'emploi (CNAM)</span>
              {profile.cnam_verified ? (
                <Badge variant="secondary" className="text-xs">Vérifié</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">À vérifier</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-gray-400" />
              <span>Justificatif de revenus</span>
              <Badge variant="outline" className="text-xs">À fournir</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-gray-400" />
              <span>Quittance de loyer précédent</span>
              <Badge variant="outline" className="text-xs">À fournir</Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleSubmitApplication}
            disabled={!selectedProperty || !coverLetter.trim() || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Envoi en cours...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Déposer ma candidature
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/recherche">
              <Search className="h-4 w-4 mr-2" />
              Voir plus de biens
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground bg-background p-3 rounded-lg">
          <p className="mb-1">💡 <strong>Conseil :</strong> Une candidature complète avec tous les documents requis augmente vos chances d'être accepté.</p>
          <p>Le processus de vérification prend généralement 24-48h.</p>
        </div>
      </CardContent>
    </Card>
  );
};