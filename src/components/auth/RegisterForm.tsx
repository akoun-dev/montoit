import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';

const RegisterForm = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!acceptTerms || !acceptPrivacy) {
      setError('Vous devez accepter les Conditions Générales d\'Utilisation et la Politique de Confidentialité pour continuer');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email, password, {
        full_name: fullName,
        terms_accepted_at: new Date().toISOString(),
        privacy_accepted_at: new Date().toISOString(),
      });
      if (result.error) {
        setError(result.error.message || 'Erreur lors de la création du compte');
      } else {
        // Créer un identifiant temporaire chiffré pour éviter d'exposer l'email
        const tempId = btoa(`${email}:${Date.now()}`);
        // Redirect to email verification page
        navigate(`/verifier-email?id=${encodeURIComponent(tempId)}`, {
          replace: true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nom complet"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Jean Kouassi"
        required
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="exemple@email.com"
        required
      />
      <Input
        label="Mot de passe"
        type="password"
        isPassword
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
        required
      />
      <Input
        label="Confirmer le mot de passe"
        type="password"
        isPassword
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="••••••••"
        autoComplete="new-password"
        required
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      {/* Consentement légal */}
      <div className="space-y-3 pt-2 border-t border-gray-200">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            required
          />
          <span className="text-sm text-gray-600">
            J'accepte les{' '}
            <a
              href="/conditions-generales"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 underline font-medium"
            >
              Conditions Générales d'Utilisation
            </a>
            {' '}*
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(e) => setAcceptPrivacy(e.target.checked)}
            className="mt-1 w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
            required
          />
          <span className="text-sm text-gray-600">
            J'ai lu et j'accepte la{' '}
            <a
              href="/politique-confidentialite"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:text-orange-700 underline font-medium"
            >
              Politique de Confidentialité
            </a>
            {' '}*
          </span>
        </label>

        <p className="text-xs text-gray-500 pl-7">
          * En cochant ces cases, vous reconnaissez avoir lu et accepté nos conditions générales et notre politique de confidentialité.
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Création…' : 'Créer mon compte'}
      </Button>
    </form>
  );
};

export default RegisterForm;
