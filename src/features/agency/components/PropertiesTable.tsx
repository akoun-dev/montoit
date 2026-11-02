import { useState } from 'react';
import {
  Home,
  Eye,
  Settings,
  Search,
  MoreHorizontal,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
} from 'lucide-react';

interface PropertyAssignment {
  id: string;
  property_id: string;
  agent_id: string;
  assigned_at: string;
  status: string;
  properties: {
    title: string;
    price: number;
    status: string;
    type: string;
    address?: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
  };
  profiles: {
    full_name: string;
    email?: string;
  };
}

interface PropertiesTableProps {
  assignments: PropertyAssignment[];
  onViewProperty?: (propertyId: string) => void;
  onEditAssignment?: (assignmentId: string) => void;
  onAssignAgent?: (propertyId: string) => void;
}

const statusConfig = {
  active: {
    label: 'Actif',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  pending: {
    label: 'En attente',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  sold: {
    label: 'Vendu',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  rented: {
    label: 'Loué',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

const propertyTypes = {
  apartment: 'Appartement',
  house: 'Maison',
  villa: 'Villa',
  studio: 'Studio',
  office: 'Bureau',
  commercial: 'Commercial',
  land: 'Terrain',
};

export default function PropertiesTable({
  assignments,
  onViewProperty,
  onEditAssignment,
  onAssignAgent,
}: PropertiesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'title' | 'price' | 'assigned_at'>('assigned_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtrer et trier les données
  const filteredAssignments = assignments
    .filter((assignment) => {
      const matchesSearch =
        assignment.properties.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || assignment.properties.status === statusFilter;

      const matchesType = typeFilter === 'all' || assignment.properties.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title':
          aValue = a.properties.title;
          bValue = b.properties.title;
          break;
        case 'price':
          aValue = a.properties.price;
          bValue = b.properties.price;
          break;
        case 'assigned_at':
          aValue = new Date(a.assigned_at);
          bValue = new Date(b.assigned_at);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (column: 'title' | 'price' | 'assigned_at') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="card-scrapbook p-6">
      {/* Header avec filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-neutral-900">Propriétés et attributions</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Gestion des propriétés et attribution aux agents
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full sm:w-64"
            />
          </div>

          {/* Filtres */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="pending">En attente</option>
            <option value="sold">Vendu</option>
            <option value="rented">Loué</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">Tous les types</option>
            {Object.entries(propertyTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-900">{assignments.length}</p>
            </div>
            <Home className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Actives</p>
              <p className="text-2xl font-bold text-green-900">
                {assignments.filter((a) => a.properties.status === 'active').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">En attente</p>
              <p className="text-2xl font-bold text-yellow-900">
                {assignments.filter((a) => a.properties.status === 'pending').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">⏳</span>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Vendues</p>
              <p className="text-2xl font-bold text-purple-900">
                {assignments.filter((a) => a.properties.status === 'sold').length}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-neutral-200">
              <th
                className="text-left py-4 px-4 font-semibold text-neutral-700 cursor-pointer hover:text-primary-600 transition-colors"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center space-x-2">
                  <span>Propriété</span>
                  {sortBy === 'title' && (
                    <span className="text-primary-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="text-left py-4 px-4 font-semibold text-neutral-700">Agent assigné</th>
              <th
                className="text-left py-4 px-4 font-semibold text-neutral-700 cursor-pointer hover:text-primary-600 transition-colors"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center space-x-2">
                  <span>Prix</span>
                  {sortBy === 'price' && (
                    <span className="text-primary-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="text-left py-4 px-4 font-semibold text-neutral-700">Type</th>
              <th className="text-left py-4 px-4 font-semibold text-neutral-700">Statut</th>
              <th
                className="text-left py-4 px-4 font-semibold text-neutral-700 cursor-pointer hover:text-primary-600 transition-colors"
                onClick={() => handleSort('assigned_at')}
              >
                <div className="flex items-center space-x-2">
                  <span>Attribuée le</span>
                  {sortBy === 'assigned_at' && (
                    <span className="text-primary-500">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="text-left py-4 px-4 font-semibold text-neutral-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssignments.map((assignment) => {
              const statusInfo =
                statusConfig[assignment.properties.status as keyof typeof statusConfig] ||
                statusConfig.pending;

              return (
                <tr
                  key={assignment.id}
                  className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                >
                  {/* Propriété */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                        <Home className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 truncate">
                          {assignment.properties.title}
                        </p>
                        <div className="flex items-center space-x-2 mt-1 text-xs text-neutral-500">
                          <span>ID: {assignment.property_id.slice(-8)}</span>
                          {assignment.properties.address && (
                            <>
                              <span>•</span>
                              <span className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate max-w-[100px]">
                                  {typeof assignment.properties.address === 'string'
                                    ? assignment.properties.address
                                    : `${assignment.properties.address?.street || ''}, ${assignment.properties.address?.city || ''}`}
                                </span>
                              </span>
                            </>
                          )}
                        </div>
                        {(assignment.properties.bedrooms ||
                          assignment.properties.bathrooms ||
                          assignment.properties.area) && (
                          <div className="flex items-center space-x-3 mt-1 text-xs text-neutral-500">
                            {assignment.properties.bedrooms && (
                              <span>{assignment.properties.bedrooms} chambres</span>
                            )}
                            {assignment.properties.bathrooms && (
                              <span>{assignment.properties.bathrooms} sdb</span>
                            )}
                            {assignment.properties.area && (
                              <span>{assignment.properties.area} m²</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Agent */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
                        <span className="text-green-700 font-semibold text-sm">
                          {assignment.profiles.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {assignment.profiles.full_name}
                        </p>
                        {assignment.profiles.email && (
                          <p className="text-xs text-neutral-500">{assignment.profiles.email}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Prix */}
                  <td className="py-4 px-4">
                    <div className="font-semibold text-neutral-900">
                      {(assignment.properties.price / 1000000).toFixed(1)}M FCFA
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-800 text-xs font-medium rounded-full">
                      <Tag className="w-3 h-3 mr-1" />
                      {propertyTypes[assignment.properties.type as keyof typeof propertyTypes] ||
                        assignment.properties.type}
                    </span>
                  </td>

                  {/* Statut */}
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}
                    >
                      {statusInfo.label}
                    </span>
                  </td>

                  {/* Date d'attribution */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2 text-sm text-neutral-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(assignment.assigned_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onViewProperty?.(assignment.property_id)}
                        className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditAssignment?.(assignment.id)}
                        className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        title="Modifier attribution"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-all">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* État vide */}
        {filteredAssignments.length === 0 && (
          <div className="text-center py-16">
            <Home className="w-20 h-20 text-neutral-300 mx-auto mb-4" />
            <p className="text-xl text-neutral-600 mb-2">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Aucune propriété trouvée'
                : 'Aucune propriété attribuée'}
            </p>
            <p className="text-neutral-500 mb-6">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Commencez par attribuer des propriétés à vos agents'}
            </p>
            {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
              <button onClick={() => onAssignAgent?.('new')} className="btn-primary">
                Attribuer une propriété
              </button>
            )}
          </div>
        )}
      </div>

      {/* Informations de pagination */}
      {filteredAssignments.length > 0 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-200">
          <p className="text-sm text-neutral-600">
            Affichage de {filteredAssignments.length} sur {assignments.length} propriétés
          </p>
          <div className="text-sm text-neutral-500">
            Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')} à{' '}
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}
    </div>
  );
}
