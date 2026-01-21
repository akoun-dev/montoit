import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, KeyRound, Shield } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { InputWithIcon } from '@/shared/ui';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    if (!validateEmail(email)) {
      setError('Adresse email invalide');
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { error: resetError } = await resetPassword(email);

      if (resetError) {
        if (resetError.message?.includes('Aucun compte')) {
          setError(
            'Aucun compte associé à cette adresse email. Veuillez vérifier votre email ou créer un compte.'
          );
        } else {
          setError("Erreur lors de l'envoi du lien de réinitialisation. Veuillez réessayer.");
        }
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError('Une erreur est survenue. Veuillez réessayer ou contacter le support.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen custom-cursor relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-300 to-indigo-300" />

      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-64 h-64 bg-cyan-300 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-20 w-80 h-80 bg-blue-300 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-200 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '0.5s' }}
        />
      </div>

      <div className="max-w-md w-full relative z-10">
        <button
          onClick={() => navigate('/connexion')}
          className="mb-6 flex items-center space-x-2 text-white hover:text-cyan-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-semibold">Retour à la connexion</span>
        </button>

        <div className="glass-card rounded-3xl p-8 md:p-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg animate-bounce-subtle">
              <KeyRound className="h-10 w-10 text-white" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Mot de passe oublié ?
            </h2>
            <p className="text-gray-600">
              Entrez votre email pour recevoir un lien de réinitialisation
            </p>
          </div>

          {!success ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-6">
                <InputWithIcon
                  icon={Mail}
                  label="Adresse email"
                  variant="cyan"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  error={error}
                  disabled={loading}
                  required
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Envoi en cours...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <KeyRound className="w-5 h-5" />
                      <span>Envoyer le lien</span>
                    </span>
                  )}
                </button>
              </form>

              <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-semibold mb-1">Sécurité :</p>
                    <p>
                      Si un compte existe avec cette adresse email, vous recevrez un lien de
                      réinitialisation valide pendant 30 minutes.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center space-y-6 animate-scale-in">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Email envoyé !</h3>
                <p className="text-gray-600">
                  Si un compte est associé à <strong>{email}</strong>, vous recevrez un email avec
                  les instructions pour réinitialiser votre mot de passe.
                </p>
              </div>

              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-left">
                <p className="text-sm text-amber-800 font-medium mb-2">
                  Vous n'avez pas reçu l'email ?
                </p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>Vérifiez votre dossier spam ou courrier indésirable</li>
                  <li>Assurez-vous d'avoir saisi la bonne adresse email</li>
                  <li>Patientez quelques minutes (délai de livraison possible)</li>
                </ul>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                    setError('');
                  }}
                  className="text-cyan-600 hover:text-cyan-700 font-semibold text-sm transition-colors"
                >
                  Réessayer avec une autre adresse
                </button>

                <button
                  onClick={() => navigate('/connexion')}
                  className="text-gray-600 hover:text-gray-700 font-medium text-sm transition-colors"
                >
                  Retour à la connexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
