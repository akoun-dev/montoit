import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  MessageSquare,
  Flag,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Home,
} from 'lucide-react';

const ModeratorDashboard: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Signalements en attente',
      value: '24',
      icon: <Flag className="w-6 h-6 text-orange-600" />,
      color: 'bg-orange-100',
      change: '+12%',
      changeType: 'increase' as const,
    },
    {
      title: 'Contenu à modérer',
      value: '18',
      icon: <MessageSquare className="w-6 h-6 text-blue-600" />,
      color: 'bg-blue-100',
      change: '-5%',
      changeType: 'decrease' as const,
    },
    {
      title: "Modérations aujourd'hui",
      value: '42',
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      color: 'bg-green-100',
      change: '+8%',
      changeType: 'increase' as const,
    },
    {
      title: 'Utilisateurs signalés',
      value: '7',
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      color: 'bg-red-100',
      change: 'stable',
      changeType: 'neutral' as const,
    },
  ];

  const quickActions = [
    {
      title: "Voir la file d'attente",
      description: 'Contenu en attente de modération',
      icon: <Clock className="w-5 h-5" />,
      action: () => navigate('/moderator/queue'),
      color: 'bg-indigo-500 text-white',
    },
    {
      title: 'Modération de contenu',
      description: 'Rechercher et modérer le contenu',
      icon: <MessageSquare className="w-5 h-5" />,
      action: () => navigate('/moderator/content'),
      color: 'bg-purple-500 text-white',
    },
    {
      title: 'Signalements',
      description: 'Gérer les signalements utilisateurs',
      icon: <Flag className="w-5 h-5" />,
      action: () => navigate('/moderator/reports'),
      color: 'bg-orange-500 text-white',
    },
    {
      title: 'Historique',
      description: "Voir l'historique des modérations",
      icon: <BarChart3 className="w-5 h-5" />,
      action: () => navigate('/moderator/history'),
      color: 'bg-gray-500 text-white',
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'signalement',
      title: 'Signalement de contenu inapproprié',
      description: 'Profil utilisateur - Post contenant du spam',
      time: 'il y a 5 minutes',
      status: 'pending',
    },
    {
      id: 2,
      type: 'modération',
      title: 'Contenu approuvé',
      description: 'Annonce de logement - Appartement 3 pièces',
      time: 'il y a 15 minutes',
      status: 'approved',
    },
    {
      id: 3,
      type: 'modération',
      title: 'Contenu rejeté',
      description: 'Commentaire - Langage inapproprié',
      time: 'il y a 30 minutes',
      status: 'rejected',
    },
    {
      id: 4,
      type: 'signalement',
      title: "Signalement d'utilisateur",
      description: 'Compte suspect - Comportement frauduleux',
      time: 'il y a 1 heure',
      status: 'pending',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tableau de bord Modérateur</h1>
          <p className="mt-2 text-gray-600">Gérez la modération de contenu et les signalements</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    {stat.changeType === 'increase' ? (
                      <span className="text-green-600 text-sm font-medium">↑ {stat.change}</span>
                    ) : stat.changeType === 'decrease' ? (
                      <span className="text-red-600 text-sm font-medium">↓ {stat.change}</span>
                    ) : (
                      <span className="text-gray-500 text-sm font-medium">{stat.change}</span>
                    )}
                    <span className="text-gray-500 text-sm ml-1">vs hier</span>
                  </div>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`${action.color} rounded-lg p-6 text-left hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center justify-between mb-3">
                  {action.icon}
                  <span className="text-sm opacity-75">→</span>
                </div>
                <h3 className="font-semibold mb-1">{action.title}</h3>
                <p className="text-sm opacity-90">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Activité récente</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h3 className="text-sm font-medium text-gray-900">{activity.title}</h3>
                      <span
                        className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                          activity.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : activity.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {activity.status === 'pending'
                          ? 'En attente'
                          : activity.status === 'approved'
                            ? 'Approuvé'
                            : 'Rejeté'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{activity.description}</p>
                    <p className="mt-1 text-xs text-gray-500">{activity.time}</p>
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
  );
};

export default ModeratorDashboard;
