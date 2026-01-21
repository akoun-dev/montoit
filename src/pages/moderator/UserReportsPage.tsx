import React, { useState } from 'react';
import { Search, Filter, Flag, User, Clock, CheckCircle, XCircle } from 'lucide-react';

const UserReportsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const mockReports = [
    {
      id: 1,
      reportedUser: 'john_doe',
      reporter: 'marie_k',
      reason: 'Comportement frauduleux',
      description: 'Cet utilisateur demande des paiements directs en dehors de la plateforme',
      status: 'pending',
      createdAt: '2025-12-12 14:30',
      priority: 'high',
      evidence: ['messages', 'transactions'],
    },
    {
      id: 2,
      reportedUser: 'fake_agent123',
      reporter: 'system_auto',
      reason: 'Profil suspect',
      description: "Photos volées d'une autre agence",
      status: 'under_review',
      createdAt: '2025-12-12 12:15',
      priority: 'medium',
      evidence: ['profile_images'],
    },
    {
      id: 3,
      reportedUser: 'spam_user',
      reporter: 'multiple_users',
      reason: 'Spam et harcèlement',
      description: 'Envoie de messages spam à plusieurs utilisateurs',
      status: 'resolved',
      createdAt: '2025-12-11 18:45',
      priority: 'low',
      evidence: ['messages'],
    },
  ];

  const filteredReports = mockReports.filter((report) => {
    const matchesSearch =
      report.reportedUser.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
    return matchesSearch && matchesStatus;
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
      case 'under_review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            En cours
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Résolu
          </span>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-medium">
            Haute
          </span>
        );
      case 'medium':
        return (
          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
            Moyenne
          </span>
        );
      case 'low':
        return (
          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded font-medium">
            Basse
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Signalements d'utilisateurs</h1>
          <p className="mt-2 text-gray-600">Gérez les signalements concernant les utilisateurs</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Rechercher un signalement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="under_review">En cours</option>
                <option value="resolved">Résolu</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="min-w-full divide-y divide-gray-200">
            <div className="bg-gray-50 px-6 py-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Signalements ({filteredReports.length})
              </h3>
            </div>
            <div className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <div key={report.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Flag className="h-5 w-5 text-red-500" />
                        {getStatusBadge(report.status)}
                        {getPriorityBadge(report.priority)}
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        Signalement contre @{report.reportedUser}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">{report.reason}</p>
                      <p className="text-gray-700 mb-3">{report.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Signalé par: {report.reporter}</span>
                        <span>•</span>
                        <span>{report.createdAt}</span>
                        <span>•</span>
                        <span>Preuves: {report.evidence.join(', ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700">
                        Valider
                      </button>
                      <button className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700">
                        Rejeter
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

export default UserReportsPage;
