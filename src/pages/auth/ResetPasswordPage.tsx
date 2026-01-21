/**
 * Page de réinitialisation du mot de passe
 * L'utilisateur arrive ici via le lien envoyé par email
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Eye, EyeOff, Check, X, KeyRound, ArrowLeft, Loader2 } from 'lucide-react';
import Button from '@/shared/ui/Button';
import { toast } from 'sonner';

interface PasswordCriteria {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Vérifier la présence du token
  useEffect(() => {
    if (!token) {
      setTokenError('Lien de réinitialisation invalide. Veuillez demander un nouveau lien.');
    }
  }, [token]);

  // Validation des critères du mot de passe
  const criteria: PasswordCriteria = useMemo(
    () => ({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }),
    [password]
  );

  const isPasswordValid =
    criteria.minLength && criteria.hasUppercase && criteria.hasLowercase && criteria.hasNumber;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isPasswordValid && passwordsMatch && !loading && token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit || !token) return;

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-reset-token', {
        body: { token, newPassword: password },
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la réinitialisation');
      }

      if (data?.error) {
        // Erreurs spécifiques du backend
        if (data.tokenExpired) {
          setTokenError('Ce lien a expiré. Veuillez demander un nouveau lien de réinitialisation.');
        } else if (data.tokenUsed) {
          setTokenError('Ce lien a déjà été utilisé. Veuillez demander un nouveau lien.');
        } else if (data.tokenInvalid) {
          setTokenError('Lien de réinitialisation invalide. Veuillez demander un nouveau lien.');
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast.success('Mot de passe mis à jour avec succès !');
      navigate('/connexion', {
        state: {
          message: 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.',
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const CriteriaItem = ({ met, label }: { met: boolean; label: string }) => (
    <div
      className={`flex items-center gap-2 text-sm transition-colors ${met ? 'text-green-600' : 'text-muted-foreground'}`}
    >
      {met ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <X className="w-4 h-4 text-muted-foreground" />
      )}
      <span>{label}</span>
    </div>
  );

  // Affichage erreur token
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Lien invalide</h1>
          <p className="text-muted-foreground mb-6">{tokenError}</p>
          <Link to="/mot-de-passe-oublie">
            <Button className="w-full">Demander un nouveau lien</Button>
          </Link>
          <Link
            to="/connexion"
            className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-card p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Réinitialiser le mot de passe</h1>
          <p className="text-muted-foreground mt-2">Choisissez un nouveau mot de passe sécurisé</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nouveau mot de passe */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  password.length === 0
                    ? 'border-neutral-200 focus:ring-primary-500/20 focus:border-primary-500'
                    : isPasswordValid
                      ? 'border-green-500 focus:ring-green-500/20 focus:border-green-500'
                      : 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Critères de validation */}
          {password.length > 0 && (
            <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
              <CriteriaItem met={criteria.minLength} label="Au moins 8 caractères" />
              <CriteriaItem met={criteria.hasUppercase} label="Une lettre majuscule" />
              <CriteriaItem met={criteria.hasLowercase} label="Une lettre minuscule" />
              <CriteriaItem met={criteria.hasNumber} label="Un chiffre" />
              <CriteriaItem met={criteria.hasSpecial} label="Un caractère spécial (optionnel)" />
            </div>
          )}

          {/* Confirmer mot de passe */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  confirmPassword.length === 0
                    ? 'border-neutral-200 focus:ring-primary-500/20 focus:border-primary-500'
                    : passwordsMatch
                      ? 'border-green-500 focus:ring-green-500/20 focus:border-green-500'
                      : 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-sm text-red-600 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          {/* Submit button */}
          <Button type="submit" disabled={!canSubmit} className="w-full py-3 text-base font-medium">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Mise à jour...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <KeyRound className="w-5 h-5" />
                Mettre à jour mon mot de passe
              </span>
            )}
          </Button>
        </form>

        {/* Retour connexion */}
        <div className="mt-6 text-center">
          <Link
            to="/connexion"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
