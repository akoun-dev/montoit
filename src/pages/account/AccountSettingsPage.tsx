import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from 'sonner';
import {
  User,
  Shield,
  Lock,
  Download,
  Trash2,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  Key,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';
import accountDeletionService from '@/services/accountDeletion.service';
import { supabase } from '@/integrations/supabase/client';
import { formatUserContact, getContactLabel, isPhoneEmail } from '@/shared/utils/contactDisplay';

interface DeleteConfirmation {
  step: 'initial' | 'confirm' | 'final';
  reason?: string;
  feedback?: string;
}

interface EmailChangeState {
  step: 'idle' | 'confirm' | 'success';
  newEmail?: string;
  confirmationCode?: string;
}

interface PasswordChangeState {
  step: 'idle' | 'confirm' | 'success';
  currentPassword?: string;
  newPassword?: string;
}

export default function AccountSettingsPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteConfirmation>({ step: 'initial' });
  const [emailChange, setEmailChange] = useState<EmailChangeState>({ step: 'idle' });
  const [passwordChange, setPasswordChange] = useState<PasswordChangeState>({ step: 'idle' });

  const handleExportData = async () => {
    if (!user) return;

    setExporting(true);
    try {
      const data = await accountDeletionService.exportUserData(user.id);

      // Créer un blob et télécharger le fichier
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mes-donnees-montoit-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Données exportées avec succès');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Erreur lors de l\'export des données');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await accountDeletionService.requestAccountDeletion({
        reason: deleteStep.reason,
        feedback: deleteStep.feedback,
        confirmDelete: true,
      });

      toast.success('Compte supprimé avec succès');
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression du compte');
      setDeleteStep({ step: 'initial' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/connexion');
  };

  // ============================================
  // CHANGEMENT D'EMAIL (NOUVEAU - MON-020)
  // ============================================

  const handleEmailChange = async () => {
    if (!user || !emailChange.newEmail) return;

    setLoading(true);
    try {
      // 1. Envoyer un email de confirmation au nouvel email
      const { error: updateError } = await supabase.auth.updateUser({
        email: emailChange.newEmail,
      });

      if (updateError) {
        // Si l'email est déjà utilisé ou invalide
        toast.error('Cet email est déjà utilisé ou invalide');
        setLoading(false);
        return;
      }

      // 2. Demander à l'utilisateur de confirmer avec le code envoyé
      setEmailChange({ ...emailChange, step: 'confirm' });
      toast.success('Un code de confirmation a été envoyé à votre nouvel email');
    } catch (error: any) {
      console.error('Error initiating email change:', error);
      if (error.message?.includes('already registered')) {
        toast.error('Cet email est déjà associé à un compte');
      } else {
        toast.error('Erreur lors de la demande de changement d\'email');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (!emailChange.confirmationCode) {
      toast.error('Veuillez entrer le code de confirmation');
      return;
    }

    setLoading(true);
    try {
      // Vérifier le code de confirmation avec Supabase
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: emailChange.newEmail,
        token: emailChange.confirmationCode,
        type: 'email_update',
      });

      if (verifyError) {
        toast.error('Code de confirmation invalide ou expiré');
        setLoading(false);
        return;
      }

      // Mise à jour de l'email dans le profil
      if (data) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ email: emailChange.newEmail })
          .eq('id', user?.id)
          .select()
          .single();

        if (profileError) {
          // Annuler le changement d'email
          await supabase.auth.updateUser({ email: user?.email });
          toast.error('Erreur lors de la mise à jour du profil');
          setLoading(false);
          return;
        }

        setEmailChange({ step: 'success' });
        toast.success('Email mis à jour avec succès !');

        // Réinitialiser après 3 secondes
        setTimeout(() => {
          setEmailChange({ step: 'idle' });
          // Sign out pour forcer la reconnexion avec le nouvel email
          signOut();
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error confirming email change:', error);
      toast.error('Erreur lors de la confirmation du changement d\'email');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEmailChange = async () => {
    // Annuler et réinitialiser l'email dans Supabase Auth
    if (user && emailChange.newEmail) {
      await supabase.auth.updateUser({ email: user.email });
    }
    setEmailChange({ step: 'idle' });
  };

  // ============================================
  // CHANGEMENT DE MOT DE PASSE (NOUVEAU - MON-020)
  // ============================================

  const handlePasswordChange = async () => {
    if (!passwordChange.currentPassword || !passwordChange.newPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (passwordChange.newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordChange.newPassword,
      });

      if (error) {
        toast.error('Mot de passe actuel incorrect');
        setLoading(false);
        return;
      }

      setPasswordChange({ step: 'success' });
      toast.success('Mot de passe mis à jour avec succès !');

      setTimeout(() => {
        setPasswordChange({ step: 'idle' });
        setPasswordChange({
          step: 'idle',
          currentPassword: undefined,
          newPassword: undefined,
        });
      }, 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Paramètres du compte</h1>
        <p className="text-gray-600 mt-2">Gérez vos informations et préférences</p>
      </div>

      {/* Informations personnelles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold">Informations personnelles</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              {isPhoneEmail(user?.email) ? (
                <Phone className="w-5 h-5 text-gray-400" />
              ) : (
                <Mail className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className="text-sm text-gray-500">{getContactLabel(user?.email, profile?.phone)}</p>
                <p className="font-medium">{formatUserContact(user?.email, profile?.phone, (user?.user_metadata?.phone as string | undefined))}</p>
              </div>
            </div>
            {!isPhoneEmail(user?.email) && (
              <button
                onClick={() => setEmailChange({ step: 'confirm' })}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Modifier →
              </button>
            )}
          </div>

          {profile && (
            <>
              <div className="flex items-center gap-4">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <p className="font-medium">{profile.phone || 'Non renseigné'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <MapPin className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Ville</p>
                  <p className="font-medium">{profile.city || 'Non renseigné'}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => {
            const userType = profile?.user_type || 'tenant';
            const path =
              userType === 'tenant' ? '/locataire/profil'
              : userType === 'owner' ? '/proprietaire/profil'
              : '/agence/profil';
            navigate(path);
          }}
          className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          Modifier mon profil →
        </button>
      </div>

      {/* Changement d'email - NOUVEAU */}
      {emailChange.step !== 'idle' && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">Changement d'email</h2>
          </div>

          {emailChange.step === 'confirm' && (
            <>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  Pour votre sécurité, vous recevrez un code de confirmation à votre nouvel email.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouvel email *
                  </label>
                  <input
                    type="email"
                    value={emailChange.newEmail}
                    onChange={(e) => setEmailChange({ ...emailChange, newEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code de confirmation *
                  </label>
                  <input
                    type="text"
                    value={emailChange.confirmationCode}
                    onChange={(e) => setEmailChange({ ...emailChange, confirmationCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelEmailChange}
                    disabled={loading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmEmailChange}
                    disabled={loading || !emailChange.confirmationCode}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Vérification...
                      </>
                    ) : (
                      'Confirmer'
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {emailChange.step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Email mis à jour !
              </h3>
              <p className="text-sm text-gray-600">
                Vous allez être déconnecté pour vous reconnecter avec votre nouvel email.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sécurité - AMÉLIORÉ avec changement de mot de passe */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Lock className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold">Sécurité</h2>
        </div>

        <div className="space-y-3">
          {/* Changement de mot de passe - NOUVEAU */}
          {passwordChange.step === 'idle' ? (
            <button
              onClick={() => setPasswordChange({ step: 'confirm' })}
              className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-gray-400" />
                <span className="font-medium">Changer le mot de passe</span>
              </div>
              <span className="text-sm text-gray-500">→</span>
            </button>
          ) : (
            passwordChange.step === 'confirm' && (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe actuel *
                    </label>
                    <input
                      type="password"
                      value={passwordChange.currentPassword}
                      onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="•••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nouveau mot de passe *
                    </label>
                    <input
                      type="password"
                      value={passwordChange.newPassword}
                      onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Min 6 caractères"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setPasswordChange({ step: 'idle', currentPassword: undefined, newPassword: undefined })}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handlePasswordChange}
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                          Changement...
                        </>
                      ) : (
                        'Changer'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )
          )}

          {passwordChange.step === 'success' && (
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-green-900 font-medium">Mot de passe changé avec succès !</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <span className="font-medium">Se déconnecter</span>
            </div>
            <span className="text-sm text-gray-500">→</span>
          </button>
        </div>
      </div>

      {/* Données */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <Download className="w-5 h-5 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold">Mes données</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Conformément au RGPD, vous pouvez exporter toutes vos données personnelles à tout moment.
        </p>

        <button
          onClick={handleExportData}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {exporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Export en cours...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Exporter mes données
            </>
          )}
        </button>
      </div>

      {/* Zone de danger */}
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-red-900">Zone de danger</h2>
        </div>

        {deleteStep.step === 'initial' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              La suppression de votre compte est définitive. Toutes vos données personnelles seront supprimées
              conformément au RGPD.
            </p>
            <button
              onClick={() => setDeleteStep({ step: 'confirm' })}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer mon compte
            </button>
          </>
        )}

        {deleteStep.step === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-medium text-red-900 mb-2">⚠️ Attention</p>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>Cette action est irréversible</li>
                <li>Toutes vos données personnelles seront supprimées</li>
                <li>Vos contrats et transactions seront anonymisés</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pourquoi souhaitez-vous supprimer votre compte ?
              </label>
              <select
                value={deleteStep.reason}
                onChange={(e) => setDeleteStep({ ...deleteStep, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Sélectionnez une raison...</option>
                <option value="privacy">Préoccupations relatives à la confidentialité</option>
                <option value="not_using">N'utilise plus le service</option>
                <option value="found_alternative">Trouvé une alternative</option>
                <option value="too_expensive">Service trop coûteux</option>
                <option value="technical_issues">Problèmes techniques</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment pouvons-nous améliorer ? (optionnel)
              </label>
              <textarea
                value={deleteStep.feedback}
                onChange={(e) => setDeleteStep({ ...deleteStep, feedback: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={3}
                placeholder="Votre feedback nous aide à nous améliorer..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteStep({ step: 'initial' })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => setDeleteStep({ ...deleteStep, step: 'final' })}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirmer
              </button>
            </div>
          </div>
        )}

        {deleteStep.step === 'final' && (
          <div className="space-y-4">
            <div className="bg-red-100 border-2 border-red-500 rounded-lg p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <p className="font-bold text-red-900 text-lg mb-2">
                Dernière confirmation
              </p>
              <p className="text-red-800 text-sm">
                Êtes-vous absolument sûr de vouloir supprimer votre compte ?
                <br />
                Cette action ne peut pas être annulée.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteStep({ step: 'confirm' })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Non, annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Suppression...
                  </>
                ) : (
                  'Oui, supprimer définitivement'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog pour confirmation d'email */}
      {emailChange.step === 'idle' && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">Changer votre email</h2>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              value={emailChange.newEmail}
              onChange={(e) => setEmailChange({ ...emailChange, newEmail: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Nouvel email"
            />
            <div className="flex gap-3">
              <button
                onClick={handleEmailChange}
                disabled={loading || !emailChange.newEmail}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Envoi du code...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer le code
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
