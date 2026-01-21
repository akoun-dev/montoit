import React from 'react';
import { Clock, AlertTriangle, CheckSquare, ArrowRight } from 'lucide-react';

const ReviewQueuePage: React.FC = () => {
  const queueItems = [
    {
      id: 1,
      type: 'property_listing',
      priority: 'high',
      title: 'Nouvelle annonce - Villa 4 pièces',
      submittedBy: 'agent_immo_abidjan',
      submittedAt: 'il y a 5 minutes',
      estimatedTime: '2 min',
    },
    {
      id: 2,
      type: 'user_verification',
      priority: 'medium',
      title: 'Vérification document - Propriétaire',
      submittedBy: 'system_auto',
      submittedAt: 'il y a 15 minutes',
      estimatedTime: '5 min',
    },
    {
      id: 3,
      type: 'dispute',
      priority: 'high',
      title: 'Litige location - Non paiement',
      submittedBy: 'tenant_123',
      submittedAt: 'il y a 30 minutes',
      estimatedTime: '10 min',
    },
    {
      id: 4,
      type: 'content_report',
      priority: 'low',
      title: 'Commentaire signalé - Spam',
      submittedBy: 'user_456',
      submittedAt: 'il y a 1 heure',
      estimatedTime: '1 min',
    },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'property_listing':
        return <span className="text-blue-600">🏠</span>;
      case 'user_verification':
        return <span className="text-purple-600">👤</span>;
      case 'dispute':
        return <span className="text-red-600">⚖️</span>;
      case 'content_report':
        return <span className="text-orange-600">📝</span>;
      default:
        return <span className="text-gray-600">📋</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">File d'attente</h1>
          <p className="mt-2 text-gray-600">
            Éléments en attente de modération - {queueItems.length} éléments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Queue */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">File d'attente active</h2>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Auto-rafraîchissement</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {queueItems.map((item, index) => (
                  <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">{getTypeIcon(item.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                              item.priority
                            )}`}
                          >
                            {item.priority === 'high'
                              ? 'Haute'
                              : item.priority === 'medium'
                                ? 'Moyenne'
                                : 'Basse'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">Soumis par {item.submittedBy}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {item.submittedAt}
                          </span>
                          <span>Temps estimé: {item.estimatedTime}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                          Examiner
                          <ArrowRight className="ml-2 w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">En attente</span>
                  <span className="text-sm font-medium text-gray-900">{queueItems.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Priorité haute</span>
                  <span className="text-sm font-medium text-red-600">2</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Temps moyen</span>
                  <span className="text-sm font-medium text-gray-900">4.5 min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Traité aujourd'hui</span>
                  <span className="text-sm font-medium text-green-600">24</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions rapides</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors">
                  <div className="flex items-center">
                    <CheckSquare className="w-5 h-5 mr-3" />
                    <div>
                      <p className="text-sm font-medium">Tout approuver</p>
                      <p className="text-xs opacity-75">Éléments à faible risque</p>
                    </div>
                  </div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-3" />
                    <div>
                      <p className="text-sm font-medium">Vérifier priorités</p>
                      <p className="text-xs opacity-75">Éléments à haute priorité</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewQueuePage;
