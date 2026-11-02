import { ReactNode } from 'react';
import { useFeatureFlag } from '@/hooks/shared/useFeatureFlag';
import { Lock, Clock } from 'lucide-react';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  showMessage?: boolean;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

/**
 * Composant wrapper pour afficher du contenu conditionnel selon un feature flag
 * Version améliorée avec message "Bientôt disponible" stylisé
 */
export function FeatureGate({
  feature,
  children,
  showMessage = false,
  fallback = null,
  loadingFallback = null,
}: FeatureGateProps) {
  const { isEnabled, isLoading } = useFeatureFlag(feature);

  if (isLoading) {
    return loadingFallback ? (
      <>{loadingFallback}</>
    ) : (
      <div className="animate-pulse bg-muted rounded-lg h-32" />
    );
  }

  if (isEnabled) {
    return <>{children}</>;
  }

  if (showMessage) {
    return <FeatureComingSoon featureName={feature} />;
  }

  return <>{fallback}</>;
}

/**
 * Composant "Bientôt disponible" avec style Premium Ivorian
 */
function FeatureComingSoon({ featureName }: { featureName: string }) {
  const featureLabels: Record<string, string> = {
    oneci_verification: 'Vérification ONECI (CNI)',
    cnam_verification: 'Vérification CNAM',
    mapbox_maps: 'Cartes Mapbox',
    azure_maps: 'Cartes Azure',
    facial_verification: 'Vérification biométrique',
    cryptoneo_signature: 'Signature électronique',
    ai_chatbot: 'Assistant IA',
    mobile_money_payments: 'Paiements Mobile Money',
    sms_notifications: 'Notifications SMS',
  };

  const label = featureLabels[featureName] || featureName;

  return (
    <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{label}</h3>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            <span>Cette fonctionnalité sera bientôt disponible</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Nous travaillons activement sur cette fonctionnalité. Elle sera disponible prochainement
        pour améliorer votre expérience.
      </p>
    </div>
  );
}

export default FeatureGate;
