/**
 * Page de sécurité pour les locataires
 *
 * Permet de gérer:
 * - Changement de mot de passe
 * - 2FA (à venir)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  Key,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface PasswordChangeState {
  step: 'idle' | 'confirm' | 'success';
  currentPassword?: string;
  newPassword?: string;
}

export default function TenantSecuritySettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passwordChange, setPasswordChange] = useState<PasswordChangeState>({ step: 'idle' });

  // Gestion du changement de mot de passe
  const handlePasswordChange = async () => {
    if (!passwordChange.newPassword) {
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
        toast.error('Erreur lors du changement de mot de passe');
        setLoading(false);
        return;
      }

      setPasswordChange({ step: 'success' });
      toast.success('Mot de passe mis à jour avec succès !');

      setTimeout(() => {
        setPasswordChange({ step: 'idle', currentPassword: undefined, newPassword: undefined });
      }, 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // Déconnexion
  const handleSignOut = async () => {
    await signOut();
    navigate('/connexion');
  };

  return (
    <div className="min-h-[75vh] bg-[#FAF7F4] px-2 sm:px-4 pb-4 pt-6 lg:pt-2">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-[#EFEBE9]"
          >
            <ChevronRight className="w-5 h-5 text-[#8B7466] rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#6B5A4E]">Sécurité</h1>
            <p className="text-[#8B7466] mt-1">Gérez la sécurité de votre compte locataire</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Changement de mot de passe */}
        <div className="bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm overflow-hidden">
          {/* En-tête */}
          <div className="bg-[#F16522]/10 px-6 py-4 border-b border-[#EFEBE9]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Lock className="w-5 h-5 text-[#F16522]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#6B5A4E]">Mot de passe</h2>
                <p className="text-sm text-[#8B7466] mt-0.5">Modifiez votre mot de passe de connexion</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {passwordChange.step === 'idle' && (
              <button
                onClick={() => setPasswordChange({ step: 'confirm' })}
                className="w-full flex items-center justify-between p-4 border border-[#EFEBE9] rounded-xl hover:bg-[#FAF7F4] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-[#8B7466]" />
                  <span className="font-medium text-[#6B5A4E]">Changer le mot de passe</span>
                </div>
                <span className="text-sm text-[#8B7466]">→</span>
              </button>
            )}

            {passwordChange.step === 'confirm' && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-900">
                      Choisissez un mot de passe fort avec au moins 8 caractères, incluant majuscules,
                      minuscules, chiffres et symboles.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B5A4E] mb-2">
                    Nouveau mot de passe *
                  </label>
                  <input
                    type="password"
                    value={passwordChange.newPassword}
                    onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                    className="w-full px-4 py-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
                    placeholder="Min 6 caractères"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setPasswordChange({ step: 'idle', currentPassword: undefined, newPassword: undefined })}
                    className="flex-1 px-4 py-3 border border-[#EFEBE9] rounded-xl hover:bg-[#FAF7F4] transition-colors text-[#6B5A4E]"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    disabled={loading || !passwordChange.newPassword}
                    className="flex-1 px-4 py-3 bg-[#F16522] text-white rounded-xl hover:bg-[#E55A1D] disabled:opacity-50 transition-colors"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Changement...
                      </>
                    ) : (
                      'Changer le mot de passe'
                    )}
                  </button>
                </div>
              </div>
            )}

            {passwordChange.step === 'success' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Mot de passe changé !
                </h3>
                <p className="text-sm text-[#8B7466]">
                  Votre mot de passe a été mis à jour avec succès.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2FA (à venir) */}
        <div className="bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm overflow-hidden opacity-60">
          {/* En-tête */}
          <div className="bg-[#F16522]/10 px-6 py-4 border-b border-[#EFEBE9]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <Smartphone className="w-5 h-5 text-[#F16522]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#6B5A4E]">Authentification à deux facteurs</h2>
                <p className="text-sm text-[#8B7466] mt-0.5">Sécurité supplémentaire pour votre compte</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between p-4 border border-[#EFEBE9] rounded-xl">
              <div>
                <p className="font-medium text-[#6B5A4E]">2FA par SMS</p>
                <p className="text-sm text-[#8B7466] mt-1">Bientôt disponible</p>
              </div>
              <span className="px-3 py-1 bg-[#FAF7F4] text-[#8B7466] text-sm font-medium rounded-lg">
                À venir
              </span>
            </div>
          </div>
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          className="w-full bg-white rounded-[24px] border border-[#EFEBE9] shadow-sm p-5 hover:bg-red-50 hover:border-red-200 transition-all group"
        >
          <div className="flex items-center justify-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl group-hover:bg-red-200 transition-colors">
              <LogOut className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-lg font-semibold text-red-600">
              Se déconnecter
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}
