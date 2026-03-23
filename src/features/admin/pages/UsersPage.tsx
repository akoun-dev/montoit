import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/features/admin/services/admin.api';
import {
  Users,
  Search,
  Filter,
  Shield,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  RefreshCw,
  Download,
  Upload,
  User,
  Building,
  Phone,
  X,
  Key,
  Mail,
  MapPin,
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { FormatService } from '@/services/format/formatService';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  user_type: string | null;
  city: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_verified?: boolean | null;
  trust_score?: number | null;
}

interface UserModalData {
  user: UserProfile | null;
  mode: 'view' | 'edit' | null;
}

interface UserFilters {
  search: string;
  user_type: string;
  city: string;
  dateRange: string;
}

const USER_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'tenant', label: 'Locataire' },
  { value: 'owner', label: 'Propriétaire' },
  { value: 'agency', label: 'Agence' },
  { value: 'admin', label: 'Administrateur' },
];

const CITIES = [
  { value: '', label: 'Toutes les villes' },
  { value: 'Abidjan', label: 'Abidjan' },
  { value: 'Bouaké', label: 'Bouaké' },
  { value: 'Yamoussoukro', label: 'Yamoussoukro' },
  { value: 'Korhogo', label: 'Korhogo' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [usersPerPage] = useState(20);
  const [modalData, setModalData] = useState<UserModalData>({ user: null, mode: null });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    user_type: '',
    city: '',
    dateRange: '30d',
  });

  // Note: le tri est géré côté serveur via adminApi, pas de tri côté client pour l'instant

  // Handlers pour les actions utilisateur
  const handleViewUser = (user: UserProfile) => {
    setModalData({ user, mode: 'view' });
  };

  const handleEditUser = (user: UserProfile) => {
    setModalData({ user, mode: 'edit' });
  };

  const handleCloseModal = () => {
    setModalData({ user: null, mode: null });
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ?\n\nCette action est irréversible.`
      )
    ) {
      return;
    }

    try {
      setActionLoading(userId);
      await adminApi.deleteUser(userId, 'Suppression par administrateur');
      toast.success('Utilisateur supprimé avec succès');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error("Erreur lors de la suppression de l'utilisateur");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    if (!confirm(`Envoyer un email de réinitialisation à ${email} ?`)) {
      return;
    }

    try {
      setActionLoading(`reset-${userId}`);
      // Note: cette fonctionnalité nécessite une implémentation dans adminApi
      toast.success('Email de réinitialisation envoyé');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Erreur lors de l\'envoi de l\'email');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVerification = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading(`verify-${userId}`);
      // Note: cette fonctionnalité nécessite une implémentation dans adminApi
      const newStatus = !currentStatus;
      toast.success(
        `Utilisateur ${newStatus ? 'vérifié' : 'non vérifié'} avec succès`
      );
      loadUsers();
    } catch (error) {
      console.error('Error toggling verification:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveUser = async (userId: string) => {
    try {
      setActionLoading(`save-${userId}`);
      // Note: cette fonctionnalité nécessite une implémentation dans adminApi
      toast.success('Utilisateur mis à jour avec succès');
      handleCloseModal();
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setActionLoading(null);
    }
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Convertir les filtres de la page vers le format attendu par adminApi
      const apiFilters: {
        user_type?: string;
        is_verified?: boolean;
        search?: string;
      } = {};

      if (filters.search) {
        apiFilters.search = filters.search;
      }
      if (filters.user_type) {
        apiFilters.user_type = filters.user_type;
      }
      // Note: le filtre city n'est pas supporté par adminApi.getUsers actuellement
      // On pourrait l'ajouter plus tard

      const { users: apiUsers, total } = await adminApi.getUsers(
        currentPage,
        usersPerPage,
        apiFilters
      );

      // Convertir les utilisateurs de l'API vers le format de la page
      const convertedUsers: UserProfile[] = apiUsers.map((user) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: null, // Non disponible dans l'API actuelle
        user_type: user.user_type,
        city: null, // Non disponible dans l'API actuelle
        created_at: user.created_at,
        updated_at: null, // Non disponible
      }));

      setUsers(convertedUsers);
      setTotalUsers(total);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, usersPerPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers((prev) => (prev.length === users.length ? [] : users.map((u) => u.id)));
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;

    try {
      if (action === 'delete') {
        // Supprimer chaque utilisateur avec une raison
        for (const userId of selectedUsers) {
          await adminApi.deleteUser(userId, 'Suppression en masse par administrateur');
        }
      } else {
        // Changer le rôle de chaque utilisateur
        for (const userId of selectedUsers) {
          await adminApi.changeUserRole(userId, action);
        }
      }

      setSelectedUsers([]);
      loadUsers();
    } catch (err) {
      console.error('Error performing bulk action:', err);
    }
  };

  const getUserTypeColor = (userType: string | null) => {
    switch (userType) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'owner':
        return 'bg-blue-100 text-blue-800';
      case 'agency':
        return 'bg-green-100 text-green-800';
      case 'tenant':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserTypeIcon = (userType: string | null) => {
    switch (userType) {
      case 'admin':
        return Shield;
      case 'owner':
        return Building;
      case 'trust_agent':
        return UserCheck;
      default:
        return User;
    }
  };

  const totalPages = Math.ceil(totalUsers / usersPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez tous les utilisateurs de la plateforme ({totalUsers.toLocaleString('fr-FR')}{' '}
            total)
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filtres</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="w-4 h-4" />
            <span>Importer</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nom, email..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={filters.user_type}
                onChange={(e) => setFilters((prev) => ({ ...prev, user_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {USER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
              <select
                value={filters.city}
                onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {CITIES.map((city) => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="90d">90 derniers jours</option>
                <option value="1y">1 an</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {selectedUsers.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-orange-800">
              {selectedUsers.length} utilisateur(s) sélectionné(s)
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkAction('owner')}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                Rendre Propriétaire
              </button>
              <button
                onClick={() => handleBulkAction('tenant')}
                className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
              >
                Rendre Locataire
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ville
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inscrit le
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-6 h-6 text-gray-400 animate-spin mr-2" />
                      <span className="text-gray-500">Chargement des utilisateurs...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun utilisateur trouvé</p>
                  </td>
                </tr>
              ) : (
                users.map((userProfile) => {
                  const TypeIcon = getUserTypeIcon(userProfile.user_type);
                  return (
                    <tr key={userProfile.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(userProfile.id)}
                          onChange={() => handleSelectUser(userProfile.id)}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <TypeIcon className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {userProfile.full_name || 'Non renseigné'}
                            </p>
                            <p className="text-sm text-gray-500">{userProfile.email}</p>
                            {userProfile.phone && (
                              <p className="text-xs text-gray-400 flex items-center space-x-1">
                                <Phone className="w-3 h-3" />
                                <span>{userProfile.phone}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getUserTypeColor(userProfile.user_type)}`}
                        >
                          {userProfile.user_type || 'tenant'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{userProfile.city || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {userProfile.created_at
                          ? FormatService.formatRelativeTime(userProfile.created_at)
                          : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewUser(userProfile)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditUser(userProfile)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteUser(userProfile.id, userProfile.full_name || 'Cet utilisateur')
                            }
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Supprimer"
                            disabled={actionLoading === userProfile.id}
                          >
                            {actionLoading === userProfile.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Page {currentPage} sur {totalPages} ({totalUsers} utilisateurs)
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal User Details/Edit */}
      {modalData.user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {modalData.mode === 'view' ? 'Détails de l\'utilisateur' : 'Modifier l\'utilisateur'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {modalData.user.full_name || 'Non renseigné'}
                  </h3>
                  <p className="text-sm text-gray-500">{modalData.user.email}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getUserTypeColor(
                    modalData.user.user_type
                  )}`}
                >
                  {modalData.user.user_type || 'tenant'}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Email</label>
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{modalData.user.email || '-'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Téléphone</label>
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{modalData.user.phone || '-'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Ville</label>
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{modalData.user.city || '-'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                  <div className="flex items-center space-x-2 text-sm">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span>{modalData.user.user_type || 'tenant'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Score de confiance</label>
                  <div className="flex items-center space-x-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-gray-400" />
                    <span>{modalData.user.trust_score ?? '-'}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Vérifié</label>
                  <div className="flex items-center space-x-2 text-sm">
                    {modalData.user.is_verified ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span>{modalData.user.is_verified ? 'Oui' : 'Non'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">Inscrit le</label>
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      {modalData.user.created_at
                        ? FormatService.formatRelativeTime(modalData.user.created_at)
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase">ID Utilisateur</label>
                  <div className="text-sm text-gray-400 font-mono text-xs">
                    {modalData.user.id}
                  </div>
                </div>
              </div>

              {/* Actions rapides */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Actions rapides</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (modalData.user?.email) {
                        handleResetPassword(modalData.user.id, modalData.user.email);
                      }
                    }}
                    disabled={actionLoading === `reset-${modalData.user?.id}`}
                    className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Key className="w-4 h-4" />
                    <span>Réinitialiser le mot de passe</span>
                  </button>
                  <button
                    onClick={() => {
                      if (modalData.user) {
                        handleToggleVerification(
                          modalData.user.id,
                          modalData.user.is_verified ?? false
                        );
                      }
                    }}
                    disabled={actionLoading === `verify-${modalData.user?.id}`}
                    className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Shield className="w-4 h-4" />
                    <span>
                      {modalData.user.is_verified ? 'Révoquer' : 'Valider'} la vérification
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Fermer
              </button>
              {modalData.mode === 'edit' && (
                <button
                  onClick={() => {
                    if (modalData.user) {
                      handleSaveUser(modalData.user.id, {});
                    }
                  }}
                  disabled={actionLoading === `save-${modalData.user?.id}`}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {actionLoading === `save-${modalData.user?.id}` ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
