import { ReactNode } from 'react';
import { FeatureGate } from '@/shared/ui/FeatureGate';
import { Smartphone } from 'lucide-react';

interface MobileMoneyGatedProps {
  children: ReactNode;
}

/**
 * Fallback pour Mobile Money
 */
function MobileMoneyFallback() {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-xl border-2 border-dashed border-muted-foreground/20">
      <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mb-3">
        <Smartphone className="w-7 h-7 text-orange-600" />
      </div>
      <p className="text-muted-foreground font-medium">Paiement Mobile Money</p>
      <p className="text-sm text-muted-foreground/70 mt-1 text-center max-w-xs">
        Orange Money, MTN Money et Wave seront bientôt disponibles
      </p>
    </div>
  );
}

/**
 * Wrapper pour les paiements Mobile Money
 */
export default function MobileMoneyGated({ children }: MobileMoneyGatedProps) {
  return (
    <FeatureGate feature="MOBILE_MONEY_PAYMENTS" fallback={<MobileMoneyFallback />}>
      {children}
    </FeatureGate>
  );
}
