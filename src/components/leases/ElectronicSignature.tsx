import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Shield, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { celebrateLeaseSigned } from '@/utils/confetti';
import { DigitalCertificate } from './DigitalCertificate';
import { SignatureStatus } from './SignatureStatus';
import { canSignElectronically } from '@/lib/signature-validation';
import { handleCryptoNeoError } from '@/lib/cryptoneo-error-handler';

interface Lease {
  id: string;
  landlord_id: string;
  tenant_id: string;
  landlord_signed_at: string | null;
  tenant_signed_at: string | null;
  landlord_cryptoneo_signature_at: string | null;
  tenant_cryptoneo_signature_at: string | null;
  is_electronically_signed: boolean;
}

interface ElectronicSignatureProps {
  lease: Lease;
  userType: 'proprietaire' | 'locataire';
  onSignatureComplete: () => void;
}

export const ElectronicSignature = ({ lease, userType, onSignatureComplete }: ElectronicSignatureProps) => {
  const { user } = useAuth();
  const [signatureType, setSignatureType] = useState<'simple' | 'electronic'>('simple');
  const [signing, setSigning] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [canSign, setCanSign] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>('');

  const isLandlord = userType === 'proprietaire';
  const hasSignedSimple = isLandlord ? lease.landlord_signed_at : lease.tenant_signed_at;
  const hasSignedElectronic = isLandlord 
    ? lease.landlord_cryptoneo_signature_at 
    : lease.tenant_cryptoneo_signature_at;

  useEffect(() => {
    if (user && signatureType === 'electronic') {
      validateSignature();
    }
  }, [user, signatureType, lease.id]);

  const validateSignature = async () => {
    if (!user) return;

    const result = await canSignElectronically(user.id, lease.id);
    setCanSign(result.canSign);
    if (result.reason) {
      setValidationMessage(result.reason);
    }
  };

  const handleSimpleSign = async () => {
    setSigning(true);
    try {
      const { error } = await supabase
        .from('leases')
        .update({
          [isLandlord ? 'landlord_signed_at' : 'tenant_signed_at']: new Date().toISOString()
        })
        .eq('id', lease.id);

      if (error) throw error;

      toast({
        title: 'Signature enregistrée',
        description: 'Votre signature simple a été enregistrée'
      });
      onSignatureComplete();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSigning(false);
    }
  };

  const handleElectronicSign = async () => {
    if (!canSign) {
      toast({
        title: 'Prérequis non remplis',
        description: validationMessage,
        variant: 'destructive'
      });
      return;
    }

    setSigning(true);

    try {
      const { data, error } = await supabase.functions.invoke('cryptoneo-sign-document', {
        body: {
          leaseId: lease.id,
          userType: isLandlord ? 'landlord' : 'tenant'
        }
      });

      if (error) {
        const errorHandling = handleCryptoNeoError(error);
        toast({
          title: 'Erreur',
          description: errorHandling.userMessage,
          variant: 'destructive'
        });
        
        if (errorHandling.action === 'fallback_simple_signature') {
          setSignatureType('simple');
        }
      } else {
        setOperationId(data.operationId);
        toast({
          title: 'Signature en cours',
          description: 'Votre signature électronique est en cours de traitement...'
        });
      }
    } catch (error: any) {
      const errorHandling = handleCryptoNeoError(error);
      toast({
        title: 'Erreur',
        description: errorHandling.userMessage,
        variant: 'destructive'
      });
    } finally {
      setSigning(false);
    }
  };

  if (lease.is_electronically_signed) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Bail signé électroniquement
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                Les deux parties ont signé électroniquement via CryptoNeo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signer le bail</CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={signatureType} onValueChange={(v) => setSignatureType(v as 'simple' | 'electronic')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">
              <FileText className="h-4 w-4 mr-2" />
              Signature Simple
            </TabsTrigger>
            <TabsTrigger value="electronic">
              <Shield className="h-4 w-4 mr-2" />
              Signature Électronique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4 mt-4">
            {hasSignedSimple ? (
              <p className="text-sm text-muted-foreground">
                Vous avez signé le {new Date(hasSignedSimple).toLocaleDateString('fr-FR')}
              </p>
            ) : (
              <Button 
                onClick={handleSimpleSign} 
                disabled={signing}
                className="w-full"
              >
                {signing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signature en cours...
                  </>
                ) : (
                  'Signer simplement'
                )}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="electronic" className="space-y-4 mt-4">
            <DigitalCertificate />

            {hasSignedElectronic ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Vous avez signé électroniquement le {new Date(hasSignedElectronic).toLocaleDateString('fr-FR')}
              </p>
            ) : (
              <>
                <Button 
                  onClick={handleElectronicSign} 
                  disabled={signing || !canSign}
                  className="w-full"
                >
                  {signing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signature en cours...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Signer avec CryptoNeo
                    </>
                  )}
                </Button>

                {!canSign && validationMessage && (
                  <p className="text-sm text-muted-foreground">{validationMessage}</p>
                )}
              </>
            )}

            {operationId && (
              <SignatureStatus 
                operationId={operationId} 
                onComplete={onSignatureComplete}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
