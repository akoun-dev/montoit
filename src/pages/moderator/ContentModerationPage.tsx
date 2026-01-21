import React, { useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal,
} from 'lucide-react';

const ContentModerationPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const mockContent = [
    {
      id: 1,
      type: 'property',
      title: 'Appartement F3 - Cocody',
      author: 'Jean Dupont',
      status: 'pending',
      reportedBy: 'Système automatique',
      reason: 'Informations suspectes',
      createdAt: '2025-12-12 10:30',
      content: 'Superbe appartement 3 pièces...',
      flags: 2,
    },
    {
      id: 2,
      type: 'review',
      title: 'Commentaire sur propriété',
      author: 'Marie Koné',
      status: 'pending',
      reportedBy: 'Utilisateur anonyme',
      reason: 'Langage inapproprié',
      createdAt: '2025-12-12 09:45',
      content: 'Ce logement est terrible...',
      flags: 5,
    },
    {
      id: 3,
      type: 'profile',
      title: 'Profil utilisateur',
      author: 'Paul Touré',
      status: 'approved',
      reportedBy: 'Vérification automatique',
      reason: 'Profil vérifié',
      createdAt: '2025-12-12 08:20',
      content: 'Propriétaire vérifié',
      flags: 0,
    },
    {
      id: 4,
      type: 'message',
      title: 'Message conversation',
      author: 'Sophie Bamba',
      status: 'rejected',
      reportedBy: 'Signalement utilisateur',
      reason: 'Harcèlement',
      createdAt: '2025-12-11 18:30',
      content: 'Message supprimé pour harcèlement',
      flags: 8,
    },
  ];

  const filteredContent = mockContent.filter((content) => {
    const matchesSearch =
      content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || content.status === selectedStatus;
    const matchesType = selectedType === 'all' || content.type === selectedType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </span>
        );
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
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'property':
        return (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Propriété</span>
        );
      case 'review':
        return (
          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Avis</span>
        );
      case 'profile':
        return (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Profil</span>
        );
      case 'message':
        return (
          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Message</span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Modération de contenu</h1>
          <p className="mt-2 text-gray-600">Examinez et modérez le contenu signalé</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Rechercher du contenu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvé</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="all">Tous les types</option>
                <option value="property">Propriétés</option>
                <option value="review">Avis</option>
                <option value="profile">Profils</option>
                <option value="message">Messages</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="min-w-full divide-y divide-gray-200">
            <div className="bg-gray-50 px-6 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Contenu à modérer ({filteredContent.length})
                </h3>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Filter className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white divide-y divide-gray-200">
              {filteredContent.map((content) => (
                <div key={content.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        {getTypeBadge(content.type)}
                        {getStatusBadge(content.status)}
                        {content.flags > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {content.flags} signalement{content.flags > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">{content.title}</h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{content.content}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Par: {content.author}</span>
                        <span>•</span>
                        <span>Raison: {content.reason}</span>
                        <span>•</span>
                        <span>{content.createdAt}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <Eye className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-green-600 hover:text-green-800">
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-red-600 hover:text-red-800">
                        <XCircle className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
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

export default ContentModerationPage;
