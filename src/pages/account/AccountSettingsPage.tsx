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
} from 'lucide-react';
import accountDeletionService from '@/services/accountDeletion.service';

interface DeleteConfirmation {
  step: 'initial' | 'confirm' | 'final';
  reason?: string;
  feedback?: string;
}

export default function AccountSettingsPage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<DeleteConfirmation>({ step: 'initial' });

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
          <div className="flex items-center gap-4">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{user?.email}</p>
            </div>
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
          onClick={() => navigate(`/locataire/profil`)}
          className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium"
        >
          Modifier mon profil →
        </button>
      </div>

      {/* Sécurité */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Lock className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-xl font-semibold">Sécurité</h2>
        </div>

        <div className="space-y-3">
          <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-gray-400" />
              <span className="font-medium">Changer le mot de passe</span>
            </div>
            <span className="text-sm text-gray-500">→</span>
          </button>

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
    </div>
  );
}
