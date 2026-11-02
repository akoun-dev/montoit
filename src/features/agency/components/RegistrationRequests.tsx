import { useState } from 'react';
import {
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Calendar,
  Award,
  Star,
  Briefcase,
  Eye,
  Search,
} from 'lucide-react';

interface RegistrationRequest {
  id: string;
  agent_name: string;
  agent_email: string;
  agent_phone: string;
  requested_role: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  experience_years?: number;
  certifications?: string[];
  previous_agency?: string;
  education_level?: string;
  specializations?: string[];
  motivation?: string;
  portfolio_properties?: number;
  expected_salary?: number;
  availability?: string;
  languages?: string[];
}

interface RegistrationRequestsProps {
  requests: RegistrationRequest[];
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string, reason?: string) => void;
  onViewDetails?: (requestId: string) => void;
  onContact?: (requestId: string, method: 'email' | 'phone') => void;
  onFilterChange?: (filters: FilterOptions) => void;
}

interface FilterOptions {
  status: 'all' | 'pending' | 'approved' | 'rejected';
  role: 'all' | 'agent' | 'manager' | 'admin';
  experience: 'all' | '0-2' | '3-5' | '5+';
}

const roleLabels = {
  agent: 'Agent',
  manager: 'Manager',
  admin: 'Administrateur',
  assistant: 'Assistant',
};

const statusConfig = {
  pending: {
    label: 'En attente',
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    iconColor: 'text-yellow-600',
  },
  approved: {
    label: 'Approuvé',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600',
  },
  rejected: {
    label: 'Rejeté',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
    iconColor: 'text-red-600',
  },
};

export default function RegistrationRequests({
  requests,
  onApprove,
  onReject,
  onViewDetails,
  onContact,
  onFilterChange,
}: RegistrationRequestsProps) {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'pending',
    role: 'all',
    experience: 'all',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrer les demandes
  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.agent_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filters.status === 'all' || request.status === filters.status;
    const matchesRole = filters.role === 'all' || request.requested_role === filters.role;

    let matchesExperience = true;
    if (filters.experience !== 'all' && request.experience_years) {
      const years = request.experience_years;
      matchesExperience =
        (filters.experience === '0-2' && years <= 2) ||
        (filters.experience === '3-5' && years >= 3 && years <= 5) ||
        (filters.experience === '5+' && years > 5);
    }

    return matchesSearch && matchesStatus && matchesRole && matchesExperience;
  });

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  };

  const handleReject = (requestId: string) => {
    onReject?.(requestId, rejectReason);
    setShowRejectModal(false);
    setRejectReason('');
  };

  const getExperienceLevel = (years?: number) => {
    if (!years) return 'Non renseigné';
    if (years <= 2) return 'Débutant';
    if (years <= 5) return 'Intermédiaire';
    return 'Expert';
  };

  const getRatingStars = (years?: number) => {
    if (!years) return 0;
    return Math.min(Math.ceil(years / 2), 5);
  };

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">En attente</p>
              <p className="text-2xl font-bold text-yellow-900">
                {requests.filter((r) => r.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Approuvées</p>
              <p className="text-2xl font-bold text-green-900">
                {requests.filter((r) => r.status === 'approved').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Rejetées</p>
              <p className="text-2xl font-bold text-red-900">
                {requests.filter((r) => r.status === 'rejected').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-900">{requests.length}</p>
            </div>
            <UserPlus className="w-8 h-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="card-scrapbook p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({ status: e.target.value as any })}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvées</option>
              <option value="rejected">Rejetées</option>
            </select>

            <select
              value={filters.role}
              onChange={(e) => handleFilterChange({ role: e.target.value as any })}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Tous les rôles</option>
              <option value="agent">Agents</option>
              <option value="manager">Managers</option>
              <option value="admin">Administrateurs</option>
            </select>

            <select
              value={filters.experience}
              onChange={(e) => handleFilterChange({ experience: e.target.value as any })}
              className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Toute expérience</option>
              <option value="0-2">0-2 ans</option>
              <option value="3-5">3-5 ans</option>
              <option value="5+">5+ ans</option>
            </select>
          </div>
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="space-y-4">
        {filteredRequests.map((request) => {
          const statusInfo = statusConfig[request.status];
          const StatusIcon = statusInfo.icon;
          const rating = getRatingStars(request.experience_years);

          return (
            <div
              key={request.id}
              className="card-scrapbook p-6 hover:shadow-card-hover transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                {/* Informations principales */}
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    {/* Avatar avec initiale */}
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 font-bold text-xl">
                        {request.agent_name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-neutral-900">{request.agent_name}</h3>
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${statusInfo.className}`}
                        >
                          <StatusIcon className={`w-3 h-3 mr-1 ${statusInfo.iconColor}`} />
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Informations de contact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center space-x-2 text-sm text-neutral-600">
                          <Mail className="w-4 h-4" />
                          <span>{request.agent_email}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-neutral-600">
                          <Phone className="w-4 h-4" />
                          <span>{request.agent_phone}</span>
                        </div>
                      </div>

                      {/* Détails professionnels */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Briefcase className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm text-neutral-700">
                            {roleLabels[request.requested_role as keyof typeof roleLabels]}
                          </span>
                        </div>

                        {request.experience_years && (
                          <div className="flex items-center space-x-2">
                            <Award className="w-4 h-4 text-neutral-500" />
                            <span className="text-sm text-neutral-700">
                              {request.experience_years} ans (
                              {getExperienceLevel(request.experience_years)})
                            </span>
                            <div className="flex items-center space-x-1 ml-2">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < rating ? 'text-yellow-400 fill-current' : 'text-neutral-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm text-neutral-700">
                            Candidature:{' '}
                            {new Date(request.submitted_at).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>

                      {/* Spécialisations */}
                      {request.specializations && request.specializations.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-neutral-700 mb-2">
                            Spécialisations:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {request.specializations.map((spec, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Certifications */}
                      {request.certifications && request.certifications.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-neutral-700 mb-2">
                            Certifications:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {request.certifications.map((cert, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full"
                              >
                                ✓ {cert}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Motivation */}
                      {request.motivation && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-neutral-700 mb-1">Motivation:</p>
                          <p className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg italic">
                            "{request.motivation}"
                          </p>
                        </div>
                      )}

                      {/* Informations supplémentaires */}
                      {(request.previous_agency ||
                        request.education_level ||
                        request.portfolio_properties) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-neutral-600">
                          {request.previous_agency && (
                            <div>
                              <span className="font-medium">Agence précédente:</span>
                              <p>{request.previous_agency}</p>
                            </div>
                          )}
                          {request.education_level && (
                            <div>
                              <span className="font-medium">Formation:</span>
                              <p>{request.education_level}</p>
                            </div>
                          )}
                          {request.portfolio_properties && (
                            <div>
                              <span className="font-medium">Propriétés dans le portefeuille:</span>
                              <p>{request.portfolio_properties}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2 ml-6">
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => onApprove?.(request.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approuver</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedRequest(request.id);
                          setShowRejectModal(true);
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Rejeter</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => onViewDetails?.(request.id)}
                    className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Voir</span>
                  </button>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => onContact?.(request.id, 'email')}
                      className="p-2 text-neutral-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Contacter par email"
                    >
                      <Mail className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onContact?.(request.id, 'phone')}
                      className="p-2 text-neutral-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Appeler"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="text-center py-16">
            <UserPlus className="w-20 h-20 text-neutral-300 mx-auto mb-4" />
            <p className="text-xl text-neutral-600 mb-2">
              {searchTerm ||
              filters.status !== 'all' ||
              filters.role !== 'all' ||
              filters.experience !== 'all'
                ? 'Aucune demande trouvée'
                : "Aucune demande d'inscription"}
            </p>
            <p className="text-neutral-500">
              {searchTerm ||
              filters.status !== 'all' ||
              filters.role !== 'all' ||
              filters.experience !== 'all'
                ? 'Essayez de modifier vos critères de recherche'
                : 'Les nouvelles demandes apparaîtront ici'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de rejet */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Rejeter la demande</h3>
            </div>

            <p className="text-neutral-600 mb-4">
              Êtes-vous sûr de vouloir rejeter cette demande d'inscription ? Cette action est
              irréversible.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Raison du rejet (optionnel)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Précisez la raison du rejet..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRequest(null);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 font-medium rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleReject(selectedRequest)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
