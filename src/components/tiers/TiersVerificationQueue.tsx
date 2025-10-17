import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/services/logger';

interface VerificationForReview {
  user_id: string;
  full_name: string;
  user_type: string;
  city: string;
  oneci_status: string;
  cnam_status: string;
  oneci_verified_at: string | null;
  cnam_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const TiersVerificationQueue = () => {
  const [verifications, setVerifications] = useState<VerificationForReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_verifications_for_review');
      
      if (error) {
        logger.error('Error fetching verifications for review', { error });
        toast({
          title: "Erreur",
          description: "Impossible de charger les vérifications en attente",
          variant: "destructive",
        });
      } else {
        setVerifications(data || []);
      }
    } catch (error) {
      logger.error('Exception fetching verifications', { error });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Vérifié</Badge>;
      case 'pending_review':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En révision</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (verifications.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Aucune vérification en attente de révision
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {verifications.map((verification) => (
        <Card key={verification.user_id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{verification.full_name}</CardTitle>
                <CardDescription>
                  {verification.user_type} • {verification.city || 'Ville non renseignée'}
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  toast({
                    title: "Fonction à venir",
                    description: "La vue détaillée sera disponible prochainement",
                  });
                }}
              >
                Voir détails
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Vérification ONECI</p>
                {getStatusBadge(verification.oneci_status)}
                {verification.oneci_verified_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vérifié le {new Date(verification.oneci_verified_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Vérification CNAM</p>
                {getStatusBadge(verification.cnam_status)}
                {verification.cnam_verified_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vérifié le {new Date(verification.cnam_verified_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Dossier créé le {new Date(verification.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-900 dark:text-blue-100">
                <strong>🔒 Sécurité :</strong> Les numéros CNI et de sécurité sociale ne sont jamais affichés pour protéger la vie privée des utilisateurs.
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TiersVerificationQueue;
