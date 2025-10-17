import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { celebrateLeaseSigned } from '@/utils/confetti';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface SignatureStatusProps {
  operationId: string;
  onComplete: () => void;
}

type SignatureStatus = 'initiated' | 'in_progress' | 'completed' | 'failed';

export const SignatureStatus = ({ operationId, onComplete }: SignatureStatusProps) => {
  const [status, setStatus] = useState<SignatureStatus>('initiated');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const { data } = await supabase
        .from('electronic_signature_logs')
        .select('status, error_message')
        .eq('operation_id', operationId)
        .single();

      if (data) {
        setStatus(data.status as SignatureStatus);
        if (data.error_message) {
          setErrorMessage(data.error_message);
        }

        if (data.status === 'completed') {
          setProgress(100);
          
          // 🎉 Célébration pour bail signé électroniquement
          celebrateLeaseSigned();
          
          onComplete();
        } else if (data.status === 'failed') {
          setProgress(0);
        } else {
          setProgress(prev => Math.min(prev + 10, 90));
        }
      }
    };

    // Initial check
    checkStatus();

    // Poll every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    // Cleanup
    return () => clearInterval(interval);
  }, [operationId, onComplete]);

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Signature complétée !';
      case 'failed':
        return 'Échec de la signature';
      case 'in_progress':
        return 'Traitement en cours...';
      default:
        return 'Initialisation...';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'completed':
        return 'Le document signé est disponible';
      case 'failed':
        return errorMessage || 'Veuillez réessayer ou utiliser la signature simple';
      case 'in_progress':
        return 'Cela peut prendre quelques minutes';
      default:
        return 'Préparation de la signature électronique';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {status === 'completed' ? (
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            ) : status === 'failed' ? (
              <XCircle className="h-6 w-6 text-destructive flex-shrink-0" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-primary flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{getStatusText()}</p>
              <p className="text-sm text-muted-foreground">{getStatusDescription()}</p>
            </div>
          </div>

          {status !== 'failed' && status !== 'completed' && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {progress}% complété
              </p>
            </div>
          )}

          {status === 'failed' && errorMessage && (
            <div className="p-3 bg-destructive/10 rounded-md">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
