import { Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Eye,
  MessageSquare,
  XCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Home,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { type TenantApplicationWithDetails } from '@/services/applications/applicationService';

interface TenantApplicationCardProps {
  application: TenantApplicationWithDetails;
  onCancel: (id: string) => void;
  isCanceling: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Clock; bgColor: string }
> = {
  pending: {
    label: 'En attente',
    color: 'text-amber-700',
    icon: Clock,
    bgColor: 'bg-amber-100',
  },
  in_progress: {
    label: 'En cours',
    color: 'text-blue-700',
    icon: Clock,
    bgColor: 'bg-blue-100',
  },
  accepted: {
    label: 'Acceptée',
    color: 'text-green-700',
    icon: CheckCircle,
    bgColor: 'bg-green-100',
  },
  rejected: {
    label: 'Refusée',
    color: 'text-red-700',
    icon: XCircle,
    bgColor: 'bg-red-100',
  },
  cancelled: {
    label: 'Annulée',
    color: 'text-neutral-500',
    icon: AlertCircle,
    bgColor: 'bg-neutral-100',
  },
};

const DEFAULT_STATUS = STATUS_CONFIG.pending!;

export default function TenantApplicationCard({
  application,
  onCancel,
  isCanceling,
}: TenantApplicationCardProps) {
  const statusConfig = STATUS_CONFIG[application.status] ?? DEFAULT_STATUS;
  const StatusIcon = statusConfig.icon;

  const applicationDateSource =
    application.applied_at || application.created_at || application.updated_at || null;
  const formattedDate = applicationDateSource
    ? format(new Date(applicationDateSource), 'd MMMM yyyy', { locale: fr })
    : 'Date inconnue';

  const canCancel = application.status === 'pending';

  return (
    <div className="premium-card card-hover-premium overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Property Image */}
        <div className="sm:w-52 h-36 sm:h-44 flex-shrink-0 relative">
          {application.property?.main_image ? (
            <img
              src={application.property.main_image}
              alt={application.property.title || 'Propriété'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[var(--color-sable-light)] flex items-center justify-center">
              <Home className="h-12 w-12 text-[var(--color-gris-neutre)]" />
            </div>
          )}

          {/* Status Badge on Image */}
          <div
            className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${statusConfig.bgColor} ${statusConfig.color}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {statusConfig.label}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5">
          <div className="flex flex-col h-full">
            {/* Top Section */}
            <div className="flex-1">
              {/* Property Title */}
              <h3 className="text-base sm:text-lg font-bold text-[var(--color-chocolat)] line-clamp-1 mb-1">
                {application.property?.title || 'Propriété supprimée'}
              </h3>

              {/* Location */}
              <div className="flex items-center text-[var(--color-gris-texte)] text-xs sm:text-sm mb-2 sm:mb-3">
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-[var(--color-orange)] flex-shrink-0" />
                <span className="line-clamp-1">
                  {application.property?.city}
                  {application.property?.neighborhood && `, ${application.property.neighborhood}`}
                </span>
              </div>

              {/* Details Row */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm mb-2 sm:mb-3">
                {/* Rent - Premium Orange */}
                {application.property?.monthly_rent && (
                  <span className="font-bold text-[var(--color-orange)]">
                    {application.property.monthly_rent.toLocaleString()} FCFA/mois
                  </span>
                )}

                {/* Application Date */}
                <span className="flex items-center text-[var(--color-gris-texte)]">
                  <Calendar className="h-4 w-4 mr-1.5" />
                  {formattedDate}
                </span>
              </div>

              {/* Owner Info */}
              {application.owner && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[var(--color-gris-texte)]">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-sable-light)] overflow-hidden border border-[var(--color-border)]">
                    {application.owner.avatar_url ? (
                      <img
                        src={application.owner.avatar_url}
                        alt={application.owner.full_name || 'Propriétaire'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-[var(--color-gris-neutre)]" />
                      </div>
                    )}
                  </div>
                  <span className="font-medium">
                    {application.owner.full_name || 'Propriétaire'}
                    {application.owner.is_verified && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 inline ml-1" />
                    )}
                  </span>
                  {application.owner.trust_score !== null && (
                    <span className="badge-premium badge-premium-orange text-xs">
                      Score: {application.owner.trust_score}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-[var(--color-border)]">
              {/* View Property */}
              <Link
                to={`/propriete/${application.property_id}`}
                className="btn-premium-secondary text-sm py-2 px-3"
              >
                <Eye className="h-4 w-4" />
                Voir la propriété
              </Link>

              {/* Contact Owner */}
              {application.owner && application.property && (
                <Link
                  to={`/locataire/messages?to=${application.owner.user_id}&property=${application.property_id}&subject=Candidature: ${application.property.title}`}
                  className="btn-premium-primary text-sm py-2 px-3"
                >
                  <MessageSquare className="h-4 w-4" />
                  Contacter
                </Link>
              )}

              {/* Cancel Button */}
              {canCancel && (
                <button
                  onClick={() => onCancel(application.id)}
                  disabled={isCanceling}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isCanceling ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Annuler
                </button>
              )}

              {/* Status specific messages */}
              {application.status === 'accepted' && (
                <span className="text-sm text-green-600 font-medium ml-auto">
                  🎉 Félicitations ! Votre candidature a été acceptée
                </span>
              )}
              {application.status === 'rejected' && (
                <span className="text-sm text-red-500 ml-auto">
                  Candidature refusée par le propriétaire
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
