import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, FileText, CheckCircle, AlertTriangle, Loader2, PlayCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DigitalCertificate } from '@/components/leases/DigitalCertificate';
import { ElectronicSignature } from '@/components/leases/ElectronicSignature';

interface TestLease {
  id: string;
  property_id: string;
  landlord_id: string;
  tenant_id: string;
  monthly_rent: number;
  landlord_signed_at: string | null;
  tenant_signed_at: string | null;
  landlord_cryptoneo_signature_at: string | null;
  tenant_cryptoneo_signature_at: string | null;
  is_electronically_signed: boolean;
  document_url: string | null;
  status: string;
}

export default function TestCryptoNeo() {
  const { user, profile } = useAuth();
  const [testLease, setTestLease] = useState<TestLease | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);

  useEffect(() => {
    loadTestData();
  }, [user]);

  const loadTestData = async () => {
    if (!user) return;

    setLoading(true);

    // Chercher un bail où l'utilisateur est impliqué
    const { data: leases } = await supabase
      .from('leases')
      .select('*')
      .or(`landlord_id.eq.${user.id},tenant_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (leases && leases.length > 0) {
      setTestLease(leases[0] as TestLease);
    }

    // Charger le certificat de l'utilisateur
    const { data: cert } = await supabase
      .from('digital_certificates')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    setCertificate(cert);
    setLoading(false);
  };

  const handleGeneratePdf = async () => {
    if (!testLease) return;

    setGeneratingPdf(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-lease-pdf', {
        body: { leaseId: testLease.id }
      });

      if (error) throw error;

      toast({
        title: 'PDF généré',
        description: 'Le PDF du bail a été généré avec succès'
      });

      // Recharger le bail pour voir le document_url
      loadTestData();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Échec de la génération du PDF',
        variant: 'destructive'
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!testLease) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Aucun bail trouvé pour votre compte. Créez d'abord un bail via la page "Baux" ou assurez-vous d'être propriétaire ou locataire d'un bail existant.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const userType = testLease.landlord_id === user?.id ? 'proprietaire' : 'locataire';

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <PlayCircle className="h-8 w-8 text-primary" />
            Test CryptoNeo
          </h1>
          <p className="text-muted-foreground mt-2">
            Page de test pour valider le flux de signature électronique
          </p>
        </div>
      </div>

      {/* État du bail */}
      <Card>
        <CardHeader>
          <CardTitle>Bail de test</CardTitle>
          <CardDescription>ID: {testLease.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Votre rôle</p>
              <p className="font-medium">{userType === 'proprietaire' ? 'Propriétaire' : 'Locataire'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Loyer mensuel</p>
              <p className="font-medium">{testLease.monthly_rent.toLocaleString()} FCFA</p>
            </div>
            <div>
              <p className="text-muted-foreground">Statut</p>
              <p className="font-medium">{testLease.status}</p>
            </div>
            <div>
              <p className="text-muted-foreground">PDF généré</p>
              <p className="font-medium">{testLease.document_url ? '✓ Oui' : '✗ Non'}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {testLease.landlord_signed_at ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
              )}
              <span className="text-sm">Signature simple propriétaire</span>
            </div>
            <div className="flex items-center gap-2">
              {testLease.tenant_signed_at ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
              )}
              <span className="text-sm">Signature simple locataire</span>
            </div>
            <div className="flex items-center gap-2">
              {testLease.landlord_cryptoneo_signature_at ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
              )}
              <span className="text-sm">Signature électronique propriétaire</span>
            </div>
            <div className="flex items-center gap-2">
              {testLease.tenant_cryptoneo_signature_at ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted" />
              )}
              <span className="text-sm">Signature électronique locataire</span>
            </div>
          </div>

          {!testLease.document_url && (
            <Button
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="w-full"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération du PDF...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Générer le PDF du bail
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* État du certificat */}
      <Card>
        <CardHeader>
          <CardTitle>Votre certificat numérique</CardTitle>
        </CardHeader>
        <CardContent>
          {certificate ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Certificat {certificate.certificate_status}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                ID: {certificate.certificate_id}
              </p>
              <p className="text-sm text-muted-foreground">
                Expire: {new Date(certificate.expires_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Aucun certificat numérique. Utilisez la section ci-dessous pour en générer un.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Composant de signature */}
      <ElectronicSignature
        lease={testLease}
        userType={userType}
        onSignatureComplete={loadTestData}
      />

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions de test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">Étapes pour tester CryptoNeo :</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Assurez-vous que votre identité ONECI est vérifiée</li>
            <li>Générez le PDF du bail si ce n'est pas déjà fait</li>
            <li>Signez avec "Signature Simple" (les deux parties)</li>
            <li>Passez à l'onglet "Signature Électronique"</li>
            <li>Générez votre certificat numérique CryptoNeo</li>
            <li>Signez électroniquement avec CryptoNeo</li>
            <li>Vérifiez les logs dans la base de données</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
