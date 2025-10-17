import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';

interface TwoFactorVerifyProps {
  onVerified: () => void;
  onCancel: () => void;
}

export const TwoFactorVerify = ({ onVerified, onCancel }: TwoFactorVerifyProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    const checkRateLimit = async () => {
      const { data, error } = await supabase.rpc('check_mfa_rate_limit');
      if (!error && data === false) {
        setIsRateLimited(true);
      }
    };
    checkRateLimit();
  }, [attemptCount]);

  const handleVerify = async () => {
    if (code.length < 6) return;

    if (isRateLimited) {
      toast({
        title: 'Trop de tentatives',
        description: 'Veuillez réessayer dans 15 minutes',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    let success = false;

    try {
      if (useBackupCode) {
        // Verify using backup code
        const { data, error } = await supabase.rpc('verify_backup_code', {
          _backup_code: code,
        });

        if (error) throw error;

        if (data) {
          success = true;
          await supabase.rpc('log_mfa_attempt', {
            _success: true,
            _attempt_type: 'backup_code',
          });

          toast({
            title: 'Code de récupération valide',
            description: 'Connexion en cours...',
          });
          onVerified();
        } else {
          throw new Error('Code de récupération invalide');
        }
      } else {
        // Verify using TOTP
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];

        if (!totpFactor) {
          throw new Error('Aucun facteur 2FA trouvé');
        }

        const challenge = await supabase.auth.mfa.challenge({ 
          factorId: totpFactor.id 
        });

        if (challenge.error) throw challenge.error;

        const verify = await supabase.auth.mfa.verify({
          factorId: totpFactor.id,
          challengeId: challenge.data.id,
          code,
        });

        if (verify.error) throw verify.error;

        success = true;
        await supabase.rpc('log_mfa_attempt', {
          _success: true,
          _attempt_type: 'totp',
        });

        toast({
          title: 'Vérification réussie',
          description: 'Connexion en cours...',
        });
        onVerified();
      }
    } catch (error: any) {
      await supabase.rpc('log_mfa_attempt', {
        _success: false,
        _attempt_type: useBackupCode ? 'backup_code' : 'totp',
      });

      setAttemptCount(prev => prev + 1);

      toast({
        title: useBackupCode ? 'Code de récupération invalide' : 'Code invalide',
        description: 'Veuillez vérifier le code et réessayer',
        variant: 'destructive',
      });
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Authentification à deux facteurs
        </CardTitle>
        <CardDescription>
          {useBackupCode 
            ? 'Entrez un code de récupération' 
            : "Entrez le code à 6 chiffres de votre application d'authentification"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRateLimited && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Trop de tentatives échouées. Veuillez réessayer dans 15 minutes.
            </AlertDescription>
          </Alert>
        )}

        <Input
          type="text"
          placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
          maxLength={useBackupCode ? 8 : 6}
          value={code}
          onChange={(e) => setCode(useBackupCode ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ''))}
          className="text-center text-2xl tracking-widest"
          autoFocus
          disabled={isRateLimited}
        />

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button 
              onClick={handleVerify} 
              disabled={loading || code.length < 6 || isRateLimited}
              className="flex-1"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vérifier
            </Button>
            <Button 
              variant="outline" 
              onClick={onCancel}
            >
              Annuler
            </Button>
          </div>

          <Button
            variant="link"
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode('');
            }}
            className="text-sm"
          >
            {useBackupCode 
              ? "Utiliser le code d'authentification" 
              : 'Utiliser un code de récupération'
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
