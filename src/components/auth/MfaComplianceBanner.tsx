import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, XCircle } from 'lucide-react';
import { useMfaStatus } from '@/hooks/useMfaStatus';
import { useAuth } from '@/hooks/useAuth';

export const MfaComplianceBanner = () => {
  const { hasRole } = useAuth();
  const { mfaEnabled, mfaRequired, gracePeriodDays, complianceStatus } = useMfaStatus();

  // Ne pas afficher si l'utilisateur n'est pas admin ou si la MFA n'est pas requise
  if (!hasRole('admin') && !hasRole('super_admin')) return null;
  if (!mfaRequired) return null;
  if (mfaEnabled) return null;

  const { daysRemaining, isExpired } = complianceStatus;

  // Grace period expiré
  if (isExpired) {
    return (
      <Alert variant="destructive" className="border-destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle className="font-semibold">🚨 Accès Restreint</AlertTitle>
        <AlertDescription className="mt-2">
          Votre accès aux fonctions sensibles est désactivé. Activez la 2FA pour restaurer vos permissions.
          <Button asChild variant="destructive" size="sm" className="mt-2">
            <Link to="/settings/security">Activer maintenant</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Grace period < 3 jours - URGENT
  if (daysRemaining <= 3) {
    return (
      <Alert variant="default" className="border-amber-500 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="font-semibold text-amber-900">⚠️ Action Requise - Urgent</AlertTitle>
        <AlertDescription className="text-amber-800 mt-2">
          Votre accès admin sera limité dans {daysRemaining} jour{daysRemaining > 1 ? 's' : ''}. 
          Activez la 2FA immédiatement pour éviter toute interruption.
          <Button asChild variant="default" size="sm" className="mt-2 bg-amber-600 hover:bg-amber-700">
            <Link to="/settings/security">Activer la 2FA</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Grace period > 3 jours - INFO
  return (
    <Alert variant="default" className="border-primary/50 bg-primary/5">
      <Shield className="h-4 w-4 text-primary" />
      <AlertTitle className="font-semibold">🔒 Sécurité Renforcée Requise</AlertTitle>
      <AlertDescription className="mt-2">
        Activez la 2FA dans les {daysRemaining} prochains jours pour maintenir votre accès admin complet.
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link to="/settings/security">Activer maintenant</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
};
