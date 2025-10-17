import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DigitalCertificate {
  id: string;
  certificate_id: string;
  certificate_status: 'active' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
}

export const DigitalCertificate = () => {
  const { user } = useAuth();
  const [certificate, setCertificate] = useState<DigitalCertificate | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCertificate();
    }
  }, [user]);

  const fetchCertificate = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('digital_certificates')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setCertificate(data as DigitalCertificate);
    }
    setLoading(false);
  };

  const handleGenerateCertificate = async () => {
    setGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('cryptoneo-generate-certificate');

      if (error) {
        toast({
          title: 'Erreur',
          description: error.message || 'Échec de la génération du certificat',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Certificat généré',
          description: 'Votre certificat numérique a été généré avec succès'
        });
        fetchCertificate();
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-secondary" />
          Certificat Numérique CryptoNeo
        </CardTitle>
        <CardDescription>
          Requis pour la signature électronique certifiée par ANSUT
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !certificate ? (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Votre certificat sera généré automatiquement à partir de vos données ONECI vérifiées.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleGenerateCertificate} 
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Générer mon certificat
                </>
              )}
            </Button>
          </div>
        ) : certificate.certificate_status === 'active' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Certificat actif</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Expire le {new Date(certificate.expires_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ID: {certificate.certificate_id}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {certificate.certificate_status === 'expired' 
                  ? 'Votre certificat a expiré. Générez-en un nouveau pour signer électroniquement.'
                  : 'Votre certificat a été révoqué. Veuillez contacter le support.'}
              </AlertDescription>
            </Alert>
            {certificate.certificate_status === 'expired' && (
              <Button 
                onClick={handleGenerateCertificate} 
                disabled={generating}
                variant="destructive"
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Régénération...
                  </>
                ) : (
                  'Régénérer le certificat'
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
