import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Wrench, Plus, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';

interface MaintenanceRequest {
  id: string;
  issue_type: string;
  priority: string | null;
  description: string | null;
  status: string | null;
  images: string[];
  scheduled_date: string | null;
  resolved_at: string | null;
  rejection_reason: string | null;
  created_at: string | null;
  property_title: string;
  property_address: string;
}

export default function TenantMaintenance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ouverte' | 'en_cours' | 'resolue'>('all');

  useEffect(() => {
    if (!user) {
      navigate('/connexion');
      return;
    }
    loadRequests();
  }, [user, filter, navigate]);

  const loadRequests = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('maintenance_requests')
        .select('*')
        .eq('tenant_id', user.id)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Format the data with default values for missing properties
      const formattedRequests: MaintenanceRequest[] = (data || []).map((req: any) => ({
        id: req.id,
        issue_type: req.issue_type,
        priority: req.priority,
        description: req.description,
        status: req.status,
        images: req.images || [],
        scheduled_date: req.scheduled_date,
        resolved_at: req.resolved_at,
        rejection_reason: req.rejection_reason || null,
        created_at: req.created_at,
        property_title: 'Propriété', // Default value since we don't have property join
        property_address: '',
      }));

      setRequests(formattedRequests);
    } catch (err) {
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const defaultConfig = {
      color: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
      label: 'En attente',
    };
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      ouverte: defaultConfig,
      acceptee: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Acceptée' },
      en_cours: { color: 'bg-purple-100 text-purple-800', icon: Wrench, label: 'En cours' },
      planifiee: { color: 'bg-cyan-100 text-cyan-800', icon: Calendar, label: 'Planifiée' },
      resolue: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Résolue' },
      refusee: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Refusée' },
    };

    const config = configs[status || 'ouverte'] ?? defaultConfig;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-bold ${config.color}`}
      >
        <Icon className="w-4 h-4" />
        <span>{config.label}</span>
      </span>
    );
  };

  const getPriorityColor = (priority: string | null) => {
    const colors: Record<string, string> = {
      basse: 'text-gray-600',
      normale: 'text-blue-600',
      haute: 'text-orange-600',
      urgente: 'text-red-600',
    };
    return colors[priority || 'normale'] || colors['normale'];
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      plumbing: 'Plomberie',
      electrical: 'Électricité',
      heating: 'Chauffage',
      appliance: 'Électroménager',
      structural: 'Structure',
      other: 'Autre',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="w-full">
        {/* Header Banner */}
        <div className="bg-[#2C1810] rounded-[20px] p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#F16522] flex items-center justify-center flex-shrink-0">
                <Wrench className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Maintenance</h1>
                <p className="text-[#E8D4C5] mt-1">Suivez vos demandes de maintenance</p>
              </div>
            </div>
            <Link
              to="/locataire/maintenance/nouvelle"
              className="bg-[#F16522] hover:bg-[#d9571d] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 self-start"
            >
              <Plus className="w-5 h-5" />
              <span>Nouvelle demande</span>
            </Link>
          </div>
        </div>

        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all' ? 'bg-terracotta-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilter('ouverte')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'ouverte' ? 'bg-yellow-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            En attente
          </button>
          <button
            onClick={() => setFilter('en_cours')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'en_cours' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            En cours
          </button>
          <button
            onClick={() => setFilter('resolue')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'resolue' ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
            }`}
          >
            Résolues
          </button>
        </div>

        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="card-scrapbook p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {getIssueTypeLabel(request.issue_type)}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-gray-600 mb-2">{request.property_title}</p>
                  <p className="text-sm text-gray-500">{request.property_address}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${getPriorityColor(request.priority)}`}>
                    {request.priority === 'urgente'
                      ? '🔴 URGENT'
                      : request.priority === 'haute'
                        ? '🟠 Prioritaire'
                        : request.priority === 'normale'
                          ? '🟡 Moyenne'
                          : '🟢 Faible'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {request.created_at
                      ? new Date(request.created_at).toLocaleDateString('fr-FR')
                      : ''}
                  </p>
                </div>
              </div>

              <p className="text-gray-700 mb-4">{request.description}</p>

              {request.images && request.images.length > 0 && (
                <div className="flex space-x-2 mb-4">
                  {request.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Photo ${idx + 1}`}
                      className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-75"
                      onClick={() => window.open(img, '_blank')}
                    />
                  ))}
                </div>
              )}

              {request.scheduled_date && (
                <div className="p-3 bg-blue-50 rounded-lg flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Intervention planifiée le{' '}
                    {new Date(request.scheduled_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}

              {request.resolved_at && (
                <div className="p-3 bg-green-50 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Résolu le {new Date(request.resolved_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}

              {request.rejection_reason && (
                <div className="p-3 bg-red-50 rounded-lg flex items-start space-x-2">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-red-800 mb-1">Raison du refus:</p>
                    <p className="text-sm text-red-700">{request.rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>
          ))}

          {requests.length === 0 && (
            <div className="text-center py-12">
              <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-600 mb-2">Aucune demande de maintenance</p>
              <p className="text-gray-500 mb-4">Commencez par créer votre première demande</p>
              <Link
                to="/maintenance/nouvelle"
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle demande</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
