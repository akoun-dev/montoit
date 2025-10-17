import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { logger } from '@/services/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Shield, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useMfaStatus } from '@/hooks/useMfaStatus';
import { BackupCodesDisplay } from './BackupCodesDisplay';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const TwoFactorSetup = () => {
  const { mfaEnabled, mfaRequired, unusedCodesCount, loading: statusLoading, refreshStatus } = useMfaStatus();
  const [step, setStep] = useState<'idle' | 'qr' | 'verify' | 'codes' | 'enabled'>('idle');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  useEffect(() => {
    if (mfaEnabled && step === 'idle') {
      setStep('enabled');
    }
  }, [mfaEnabled, step]);

  const enableTwoFactor = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      if (data) {
        // Limit QR code to just the URI without extra data
        const uri = data.totp.uri || '';
        if (uri.length > 500) {
          logger.warn('QR URI too long, truncating', { uriLength: uri.length });
        }
        setQrCode(uri.substring(0, 500));
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('qr');
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBackupCodes = () => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  const saveBackupCodes = async (codes: string[], userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const code of codes) {
      const encoder = new TextEncoder();
      const data = encoder.encode(code);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await supabase.from('mfa_backup_codes').insert({
        user_id: userId,
        code_hash: hashHex,
      });
    }

    // Log backup codes generation
    await supabase.from('admin_audit_logs').insert({
      admin_id: userId,
      action_type: 'mfa_backup_codes_generated',
      target_type: 'user',
      target_id: userId,
      action_metadata: {
        codes_count: codes.length,
        timestamp: new Date().toISOString(),
      },
    });
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || !factorId) return;

    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verificationCode,
      });

      if (verify.error) throw verify.error;

      // Generate and save backup codes
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const codes = generateBackupCodes();
        await saveBackupCodes(codes, user.id);
        setBackupCodes(codes);

        // Log 2FA enablement
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action_type: 'mfa_enabled',
          target_type: 'user',
          target_id: user.id,
          action_metadata: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      toast({
        title: '2FA activé',
        description: 'Authentification à deux facteurs activée avec succès',
      });
      setStep('codes');
      await refreshStatus();
    } catch (error: any) {
      toast({
        title: 'Code invalide',
        description: 'Veuillez vérifier le code et réessayer',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    setLoading(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (totpFactor) {
        await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
      }

      // Delete all backup codes
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('mfa_backup_codes').delete().eq('user_id', user.id);

        // Log 2FA disablement
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action_type: 'mfa_disabled',
          target_type: 'user',
          target_id: user.id,
          action_metadata: {
            timestamp: new Date().toISOString(),
          },
        });
      }

      toast({
        title: '2FA désactivé',
        description: 'Authentification à deux facteurs désactivée',
      });
      setStep('idle');
      setShowDisableDialog(false);
      await refreshStatus();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (step === 'codes') {
    return (
      <div className="space-y-4">
        <BackupCodesDisplay 
          codes={backupCodes} 
          onDownload={() => {
            setStep('enabled');
          }}
        />
      </div>
    );
  }

  if (step === 'enabled') {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              2FA Activé
            </CardTitle>
            <CardDescription>
              Votre compte est protégé par l'authentification à deux facteurs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Codes de récupération</p>
                <p className="text-sm text-muted-foreground">
                  {unusedCodesCount} codes restants
                </p>
              </div>
              {unusedCodesCount < 3 && (
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              )}
            </div>

            <Button 
              variant="destructive" 
              onClick={() => setShowDisableDialog(true)}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Désactiver 2FA
            </Button>
          </CardContent>
        </Card>

        <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Désactiver 2FA ?</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point de désactiver l'authentification à deux facteurs.
                Cela réduira la sécurité de votre compte.
                {mfaRequired && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Attention :</strong> La 2FA est obligatoire pour votre rôle.
                      Vous devrez la réactiver.
                    </AlertDescription>
                  </Alert>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={disableTwoFactor} className="bg-destructive text-destructive-foreground">
                Désactiver
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  if (step === 'qr') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scanner le QR Code</CardTitle>
          <CardDescription>
            Utilisez une application d'authentification (Google Authenticator, Authy, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center bg-white p-4 rounded-lg">
            <QRCodeSVG value={qrCode} size={200} />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Ou entrez ce code manuellement :</p>
            <code className="block bg-muted p-2 rounded text-sm break-all">
              {secret}
            </code>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Code de vérification</label>
            <Input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={verifyAndEnable} 
              disabled={loading || verificationCode.length !== 6}
              className="flex-1"
            >
              Vérifier et Activer
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setStep('idle')}
            >
              Annuler
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authentification à deux facteurs
        </CardTitle>
        <CardDescription>
          Renforcez la sécurité de votre compte administrateur
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mfaRequired && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Obligatoire :</strong> La 2FA est requise pour votre rôle.
              Vous devez l'activer pour garantir la sécurité.
            </AlertDescription>
          </Alert>
        )}
        <Button onClick={enableTwoFactor} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Activer 2FA
        </Button>
      </CardContent>
    </Card>
  );
};
