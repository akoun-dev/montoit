/**
 * Page de réinitialisation du mot de passe
 * L'utilisateur arrive ici via le lien envoyé par email (méthode native Supabase)
 *
 * Le flux Supabase :
 * 1. L'utilisateur clique sur le lien dans l'email
 * 2. Supabase redirige vers cette page avec access_token dans l'URL
 * 3. La session de récupération est automatiquement établie
 * 4. L'utilisateur peut définir son nouveau mot de passe
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Eye, EyeOff, Check, X, KeyRound, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
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
  const type = searchParams.get('type');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Vérifier si on est en mode récupération
  useEffect(() => {
    const checkRecoveryMode = async () => {
      try {
        // Vérifier les paramètres URL
        if (type !== 'recovery') {
          setError('Lien de réinitialisation invalide. Veuillez demander un nouveau lien.');
          setIsCheckingSession(false);
          return;
        }

        // Supabase gère automatiquement la session de récupération
        // On vérifie juste qu'on a une session active
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Erreur session:', sessionError);
          setError('Session invalide. Veuillez demander un nouveau lien.');
          setIsCheckingSession(false);
          return;
        }

        if (!session) {
          setError('Aucune session active. Le lien a peut-être expiré. Veuillez demander un nouveau lien.');
          setIsCheckingSession(false);
          return;
        }

        // Nous sommes en mode récupération avec une session valide
        setIsRecoveryMode(true);
        setIsCheckingSession(false);
      } catch (err) {
        console.error('Erreur vérification session:', err);
        setError('Une erreur est survenue. Veuillez réessayer.');
        setIsCheckingSession(false);
      }
    };

    checkRecoveryMode();
  }, [type]);

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
  const canSubmit = isPasswordValid && passwordsMatch && !loading && isRecoveryMode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      // Mettre à jour le mot de passe de l'utilisateur connecté
      // Supabase utilise automatiquement la session de récupération
      const { error: updateError } = await supabase.auth.updateUser({
        password
      });

      if (updateError) {
        throw new Error(updateError.message || 'Erreur lors de la réinitialisation');
      }

      toast.success('Mot de passe mis à jour avec succès !');

      // Rediriger vers la page de connexion après un court délai
      setTimeout(() => {
        navigate('/connexion', {
          state: {
            message: 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.',
          },
        });
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
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

  // État de chargement
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-card p-8 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary-600 animate-spin" />
          <h1 className="text-xl font-semibold text-foreground mb-2">Vérification du lien...</h1>
          <p className="text-muted-foreground">Veuillez patienter pendant que nous vérifions votre lien de récupération.</p>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error || !isRecoveryMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">Lien invalide ou expiré</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'Le lien de réinitialisation est invalide ou a expiré.'}
          </p>
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

  // Formulaire de réinitialisation
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
              <p className="text-sm font-medium text-foreground mb-2">Le mot de passe doit contenir :</p>
              <CriteriaItem met={criteria.minLength} label="Au moins 8 caractères" />
              <CriteriaItem met={criteria.hasUppercase} label="Une lettre majuscule" />
              <CriteriaItem met={criteria.hasLowercase} label="Une lettre minuscule" />
              <CriteriaItem met={criteria.hasNumber} label="Un chiffre" />
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
