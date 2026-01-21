import React, { useState } from 'react';
import { Search, Calendar, Download, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';

const ModerationHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('7days');

  const mockHistory = [
    {
      id: 1,
      moderator: 'moderator_001',
      action: 'approved',
      contentType: 'property_listing',
      contentTitle: 'Villa 3 pièces - Abidjan',
      author: 'proprio_john',
      moderatedAt: '2025-12-12 14:30',
      duration: '2 min',
      notes: 'Annonce conforme aux règles',
    },
    {
      id: 2,
      moderator: 'moderator_002',
      action: 'rejected',
      contentType: 'user_profile',
      contentTitle: 'Profil utilisateur',
      author: 'user_suspect',
      moderatedAt: '2025-12-12 13:45',
      duration: '5 min',
      notes: 'Photos volées détectées',
    },
    {
      id: 3,
      moderator: 'moderator_001',
      action: 'escalated',
      contentType: 'dispute',
      contentTitle: 'Litige paiement',
      author: 'tenant_marie',
      moderatedAt: '2025-12-12 11:20',
      duration: '15 min',
      notes: 'Nécessite intervention admin',
    },
    {
      id: 4,
      moderator: 'moderator_003',
      action: 'approved',
      contentType: 'review',
      contentTitle: 'Avis propriété',
      author: 'verified_user',
      moderatedAt: '2025-12-12 10:15',
      duration: '1 min',
      notes: 'Avis authentique',
    },
  ];

  const filteredHistory = mockHistory.filter((item) => {
    const matchesSearch =
      item.contentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.moderator.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approuvé
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeté
          </span>
        );
      case 'escalated':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Clock className="w-3 h-3 mr-1" />
            Escaladé
          </span>
        );
      default:
        return null;
    }
  };

  const getContentTypeBadge = (type: string) => {
    const badges = {
      property_listing: { label: 'Annonce', color: 'bg-blue-100 text-blue-800' },
      user_profile: { label: 'Profil', color: 'bg-purple-100 text-purple-800' },
      dispute: { label: 'Litige', color: 'bg-red-100 text-red-800' },
      review: { label: 'Avis', color: 'bg-green-100 text-green-800' },
    };
    const badge = badges[type as keyof typeof badges] || {
      label: type,
      color: 'bg-gray-100 text-gray-800',
    };
    return <span className={`text-xs ${badge.color} px-2 py-1 rounded`}>{badge.label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Historique des modérations</h1>
              <p className="mt-2 text-gray-600">
                Consultez l'historique de toutes les actions de modération
              </p>
            </div>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Rechercher dans l'historique..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value)}
              >
                <option value="today">Aujourd'hui</option>
                <option value="7days">7 derniers jours</option>
                <option value="30days">30 derniers jours</option>
                <option value="custom">Période personnalisée</option>
              </select>
            </div>
            <div>
              <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <Filter className="w-4 h-4 mr-2" />
                Filtres avancés
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="min-w-full divide-y divide-gray-200">
            <div className="bg-gray-50 px-6 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Historique ({filteredHistory.length} actions)
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>Dernière mise à jour: {new Date().toLocaleString('fr-FR')}</span>
                </div>
              </div>
            </div>
            <div className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getContentTypeBadge(item.contentType)}
                        {getActionBadge(item.action)}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {item.contentTitle}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{item.notes}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Par: {item.author}</span>
                        <span>•</span>
                        <span>Modéré par: {item.moderator}</span>
                        <span>•</span>
                        <span>Durée: {item.duration}</span>
                        <span>•</span>
                        <span>{item.moderatedAt}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <button className="text-gray-400 hover:text-gray-600">→</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModerationHistoryPage;
