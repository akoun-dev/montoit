import { ReactNode } from 'react';
import { FeatureGate } from '@/shared/ui/FeatureGate';
import { PenLine } from 'lucide-react';

interface ElectronicSignatureGatedProps {
  children: ReactNode;
  fallbackMessage?: string;
}

/**
 * Fallback pour la signature électronique
 */
function SignatureFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/20">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <PenLine className="w-8 h-8 text-primary" />
      </div>
      <p className="text-muted-foreground font-medium">Signature électronique</p>
      <p className="text-sm text-muted-foreground/70 mt-1 text-center max-w-xs">
        La signature électronique CryptoNeo sera bientôt disponible pour sécuriser vos contrats
      </p>
    </div>
  );
}

/**
 * Wrapper pour les fonctionnalités de signature électronique
 */
export default function ElectronicSignatureGated({ children }: ElectronicSignatureGatedProps) {
  return (
    <FeatureGate feature="CRYPTONEO_SIGNATURE" fallback={<SignatureFallback />}>
      {children}
    </FeatureGate>
  );
}
