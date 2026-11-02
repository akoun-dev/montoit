import { useState } from 'react';
import {
  User,
  Calendar,
  Check,
  X,
  MessageSquare,
  Eye,
  FileText,
  RotateCcw,
  Shield,
  BadgeCheck,
  MapPin,
  Home,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApplicationWithDetails } from '@/services/applications/applicationService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ROUTES } from '@/shared/config/routes.config';

interface ApplicationCardProps {
  application: ApplicationWithDetails;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onScheduleVisit: (id: string) => void;
  onViewDetails: (application: ApplicationWithDetails) => void;
  loading?: boolean;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;

  const getScoreColor = () => {
    if (score >= 70) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getScoreLabel = () => {
    if (score >= 70) return 'Excellent';
    if (score >= 50) return 'Modéré';
    return 'À vérifier';
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getScoreColor()}`}
    >
      <Shield className="h-3 w-3" />
      <span>{score}/100</span>
      <span className="hidden sm:inline">• {getScoreLabel()}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusStyle = () => {
    switch (status) {
      case 'en_attente':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'en_cours':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'acceptee':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'refusee':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'en_attente':
        return 'En attente';
      case 'en_cours':
        return 'En cours';
      case 'acceptee':
        return 'Acceptée';
      case 'refusee':
        return 'Refusée';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusStyle()}`}>
      {getStatusLabel()}
    </span>
  );
}

export default function ApplicationCard({
  application,
  onAccept,
  onReject,
  onScheduleVisit,
  onViewDetails,
  loading,
}: ApplicationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const applicant = application.applicant;
  const property = application.property;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all duration-200 overflow-hidden">
      {/* Property Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
          {property?.main_image ? (
            <img
              src={property.main_image}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="h-5 w-5 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {property?.title || 'Propriété'}
          </h3>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {property?.city} {property?.neighborhood && `• ${property.neighborhood}`}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-orange-600">
            {property?.monthly_rent?.toLocaleString()} FCFA
          </p>
          <p className="text-xs text-gray-500">/mois</p>
        </div>
      </div>

      {/* Applicant Info */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
              {applicant?.avatar_url ? (
                <img
                  src={applicant.avatar_url}
                  alt={applicant.full_name || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-7 w-7 text-orange-500" />
              )}
            </div>
            {applicant?.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <BadgeCheck className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-gray-900">
                {applicant?.full_name || 'Candidat'}
              </h4>
              <StatusBadge status={application.status} />
            </div>

            <p className="text-sm text-gray-500 mt-1">
              {applicant?.email || 'Email non disponible'}
            </p>

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <ScoreBadge score={applicant?.trust_score ?? application.application_score} />

              {/* Verification badges */}
              <div className="flex items-center gap-1.5">
                {applicant?.oneci_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium border border-blue-200">
                    <BadgeCheck className="h-3 w-3" /> ONECI
                  </span>
                )}
                {applicant?.cnam_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs font-medium border border-green-200">
                    <BadgeCheck className="h-3 w-3" /> CNAM
                  </span>
                )}
              </div>
            </div>

            {application.created_at && (
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Candidature du{' '}
                {format(new Date(application.created_at), 'dd MMMM yyyy', { locale: fr })}
              </p>
            )}
          </div>
        </div>

        {/* Cover Letter Preview */}
        {application.cover_letter && (
          <div className="mt-4">
            <p
              className={`text-sm text-gray-600 bg-gray-50 rounded-xl p-3 ${!isExpanded ? 'line-clamp-2' : ''}`}
            >
              "{application.cover_letter}"
            </p>
            {application.cover_letter.length > 100 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-orange-600 hover:text-orange-700 hover:underline mt-1"
              >
                {isExpanded ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
          {application.status === 'en_attente' && (
            <>
              <button
                onClick={() => onAccept(application.id)}
                disabled={loading}
                className="flex-1 min-w-[100px] bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Accepter
              </button>
              <button
                onClick={() => onReject(application.id)}
                disabled={loading}
                className="flex-1 min-w-[100px] bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Refuser
              </button>
              <button
                onClick={() => onScheduleVisit(application.id)}
                disabled={loading}
                className="flex-1 min-w-[100px] bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Calendar className="h-4 w-4" />
                Visite
              </button>
            </>
          )}

          {application.status === 'en_cours' && (
            <>
              <button
                onClick={() => onAccept(application.id)}
                disabled={loading}
                className="flex-1 min-w-[100px] bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Accepter
              </button>
              <button
                onClick={() => onReject(application.id)}
                disabled={loading}
                className="flex-1 min-w-[100px] bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Refuser
              </button>
            </>
          )}

          {application.status === 'acceptee' && (
            <Link
              to={`${ROUTES.CONTRACTS.CREATE.replace(':propertyId', application.property_id)}?tenantId=${application.applicant_id || application.tenant_id}`}
              className="flex-1 min-w-[100px] bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <FileText className="h-4 w-4" />
              Créer contrat
            </Link>
          )}

          {application.status === 'refusee' && (
            <button
              onClick={() => onAccept(application.id)}
              disabled={loading}
              className="flex-1 min-w-[100px] border border-gray-200 hover:border-orange-300 text-gray-700 font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Rouvrir
            </button>
          )}

          {/* Common actions */}
          <Link
            to={`/locataire/messages?to=${application.applicant_id || application.tenant_id}`}
            className="border border-gray-200 hover:border-orange-300 text-gray-700 font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
          </Link>
          <button
            onClick={() => onViewDetails(application)}
            className="border border-gray-200 hover:border-orange-300 text-gray-700 font-medium py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
