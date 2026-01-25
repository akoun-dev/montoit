import { useState } from 'react';
import { Users, Search, Filter, MoreVertical, Edit, Trash2, UserPlus } from 'lucide-react';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');

  const users = [
    {
      id: 1,
      name: 'Jean Dupont',
      email: 'jean@example.com',
      role: 'Locataire',
      status: 'Actif',
      joinDate: '2024-01-15',
    },
    {
      id: 2,
      name: 'Marie Lambert',
      email: 'marie@example.com',
      role: 'Propriétaire',
      status: 'Actif',
      joinDate: '2024-02-20',
    },
    {
      id: 3,
      name: 'Paul Martin',
      email: 'paul@example.com',
      role: 'Agence',
      status: 'En attente',
      joinDate: '2024-03-10',
    },
    {
      id: 4,
      name: 'Sophie Bernard',
      email: 'sophie@example.com',
      role: 'Administrateur',
      status: 'Actif',
      joinDate: '2024-01-05',
    },
    {
      id: 5,
      name: 'Lucie Petit',
      email: 'lucie@example.com',
      role: 'Trust Agent',
      status: 'Inactif',
      joinDate: '2024-02-28',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F4] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2C1810] flex items-center gap-3">
            <Users className="h-8 w-8 text-[#F16522]" />
            Gestion des utilisateurs
          </h1>
          <p className="text-[#6B5A4E] mt-2">
            Gérez les comptes, les rôles et les permissions de tous les utilisateurs de la
            plateforme.
          </p>
        </div>

        {/* Actions bar */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B5A4E]" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                className="pl-10 pr-4 py-2 border border-[#EFEBE9] rounded-xl w-full sm:w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-[#EFEBE9] rounded-xl text-[#6B5A4E] hover:border-[#F16522] hover:text-[#F16522]">
              <Filter className="h-4 w-4" />
              Filtrer
            </button>
          </div>
          <button className="bg-[#F16522] hover:bg-[#d9571d] text-white font-medium py-2 px-4 rounded-xl flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Ajouter un utilisateur
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#EFEBE9] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#FAF7F4] border-b border-[#EFEBE9]">
                <tr>
                  <th className="text-left p-4 font-semibold text-[#2C1810]">Nom</th>
                  <th className="text-left p-4 font-semibold text-[#2C1810]">Email</th>
                  <th className="text-left p-4 font-semibold text-[#2C1810]">Rôle</th>
                  <th className="text-left p-4 font-semibold text-[#2C1810]">Statut</th>
                  <th className="text-left p-4 font-semibold text-[#2C1810]">Date d'inscription</th>
                  <th className="text-left p-4 font-semibold text-[#2C1810]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[#EFEBE9] last:border-0 hover:bg-[#FAF7F4]"
                  >
                    <td className="p-4">
                      <div className="font-medium text-[#2C1810]">{user.name}</div>
                    </td>
                    <td className="p-4 text-[#6B5A4E]">{user.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'Administrateur'
                            ? 'bg-purple-100 text-purple-700'
                            : user.role === 'Propriétaire'
                              ? 'bg-blue-100 text-blue-700'
                              : user.role === 'Locataire'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.status === 'Actif'
                            ? 'bg-green-100 text-green-700'
                            : user.status === 'Inactif'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="p-4 text-[#6B5A4E]">{user.joinDate}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-[#6B5A4E] hover:text-[#F16522]">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-[#6B5A4E] hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="p-2 text-[#6B5A4E] hover:text-[#2C1810]">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Note */}
        <div className="mt-8 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#2C1810]">
                Page de gestion des utilisateurs
              </h3>
              <p className="text-[#6B5A4E] mt-1">
                Cette page est un placeholder. Les fonctionnalités complètes de gestion des
                utilisateurs seront bientôt disponibles.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
