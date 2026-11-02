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
} from 'lucide-react';
import { FormatService } from '@/services/format/formatService';

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  user_type: string | null;
  city: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface UserFilters {
  search: string;
  user_type: string;
  city: string;
  dateRange: string;
}

const USER_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'locataire', label: 'Locataire' },
  { value: 'proprietaire', label: 'Propriétaire' },
  { value: 'agence', label: 'Agence' },
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

  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    user_type: '',
    city: '',
    dateRange: '30d',
  });

  // Note: le tri est géré côté serveur via adminApi, pas de tri côté client pour l'instant

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
      case 'proprietaire':
        return 'bg-blue-100 text-blue-800';
      case 'agence':
        return 'bg-green-100 text-green-800';
      case 'locataire':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserTypeIcon = (userType: string | null) => {
    switch (userType) {
      case 'admin':
        return Shield;
      case 'proprietaire':
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
                onClick={() => handleBulkAction('proprietaire')}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                Rendre Propriétaire
              </button>
              <button
                onClick={() => handleBulkAction('locataire')}
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
                          {userProfile.user_type || 'locataire'}
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
                          <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
}
