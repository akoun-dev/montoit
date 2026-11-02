/**
 * Carte d'affichage d'un mandat
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Calendar,
  Percent,
  MoreVertical,
  Check,
  X,
  Pause,
  Play,
  Trash2,
  Settings,
  Eye,
  Home,
  FileSignature,
  PenTool,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MandateStatusBadge from './MandateStatusBadge';
import type { AgencyMandate } from '@/hooks/useAgencyMandates';

interface MandateCardProps {
  mandate: AgencyMandate;
  viewAs: 'owner' | 'agency';
  onAccept?: (id: string) => void;
  onRefuse?: (id: string) => void;
  onTerminate?: (id: string) => void;
  onSuspend?: (id: string) => void;
  onReactivate?: (id: string) => void;
  onManagePermissions?: (mandate: AgencyMandate) => void;
  onSign?: (mandate: AgencyMandate) => void;
}

export default function MandateCard({
  mandate,
  viewAs,
  onAccept,
  onRefuse,
  onTerminate,
  onSuspend,
  onReactivate,
  onManagePermissions,
  onSign,
}: MandateCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non définie';
    return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:border-primary transition-colors">
      {/* Property Image */}
      <div className="relative h-40 bg-neutral-100">
        {mandate.property?.main_image ? (
          <img
            src={mandate.property.main_image}
            alt={mandate.property?.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-12 w-12 text-neutral-400" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <MandateStatusBadge status={mandate.status} size="sm" />
        </div>

        {/* Menu Button */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg hover:bg-white transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-neutral-600" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 min-w-[160px]">
                <Link
                  to={`/propriete/${mandate.property_id}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                  onClick={() => setShowMenu(false)}
                >
                  <Eye className="h-4 w-4" />
                  Voir le bien
                </Link>

                {viewAs === 'owner' && mandate.status === 'active' && onManagePermissions && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onManagePermissions(mandate);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 w-full"
                  >
                    <Settings className="h-4 w-4" />
                    Permissions
                  </button>
                )}

                {/* Signature option */}
                {mandate.status === 'active' && !mandate.signed_mandate_url && onSign && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSign(mandate);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-primary hover:bg-primary/5 w-full"
                  >
                    <PenTool className="h-4 w-4" />
                    Signer électroniquement
                  </button>
                )}

                {viewAs === 'agency' && mandate.status === 'active' && onSuspend && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onSuspend(mandate.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 w-full"
                  >
                    <Pause className="h-4 w-4" />
                    Suspendre
                  </button>
                )}

                {viewAs === 'agency' && mandate.status === 'suspended' && onReactivate && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onReactivate(mandate.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 w-full"
                  >
                    <Play className="h-4 w-4" />
                    Réactiver
                  </button>
                )}

                {(mandate.status === 'active' || mandate.status === 'suspended') && onTerminate && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onTerminate(mandate.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <Trash2 className="h-4 w-4" />
                    Résilier
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Property Info */}
        <Link
          to={`/mandat/${mandate.id}`}
          className="block font-semibold text-neutral-900 truncate mb-1 hover:text-primary transition-colors"
        >
          {mandate.property?.title || 'Propriété'}
        </Link>

        <div className="flex items-center gap-1 text-sm text-neutral-500 mb-3">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">
            {mandate.property?.city}
            {mandate.property?.neighborhood && ` • ${mandate.property.neighborhood}`}
          </span>
        </div>

        {/* Agency or Owner Info */}
        <div className="flex items-center gap-2 mb-3 p-2 bg-neutral-50 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500">
              {viewAs === 'owner' ? 'Agence' : 'Propriétaire'}
            </p>
            <p className="text-sm font-medium text-neutral-900 truncate">
              {viewAs === 'owner' ? mandate.agency?.agency_name : 'Propriétaire'}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-xs text-neutral-600">
            <Calendar className="h-3.5 w-3.5" />
            <span>Début: {formatDate(mandate.start_date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600">
            <Calendar className="h-3.5 w-3.5" />
            <span>Fin: {formatDate(mandate.end_date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600 col-span-2">
            <Percent className="h-3.5 w-3.5" />
            <span>Commission: {mandate.commission_rate}%</span>
            {mandate.property?.monthly_rent && (
              <span className="text-primary font-medium">
                (
                {Math.round(
                  (mandate.property.monthly_rent * mandate.commission_rate) / 100
                ).toLocaleString()}{' '}
                FCFA/mois)
              </span>
            )}
          </div>

          {/* Signature Status */}
          {mandate.cryptoneo_signature_status && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 col-span-2 mt-1">
              <FileSignature className="h-3.5 w-3.5" />
              <span>
                Signature:{' '}
                {mandate.cryptoneo_signature_status === 'completed'
                  ? '✓ Complète'
                  : mandate.cryptoneo_signature_status === 'owner_signed'
                    ? '⏳ En attente agence'
                    : mandate.cryptoneo_signature_status === 'agency_signed'
                      ? '⏳ En attente propriétaire'
                      : mandate.cryptoneo_signature_status === 'pending'
                        ? '⏳ En attente'
                        : 'Non signé'}
              </span>
            </div>
          )}
        </div>

        {/* Actions for Pending Mandates */}
        {mandate.status === 'pending' && viewAs === 'agency' && (
          <div className="flex gap-2">
            <button
              onClick={() => onAccept?.(mandate.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              <Check className="h-4 w-4" />
              Accepter
            </button>
            <button
              onClick={() => onRefuse?.(mandate.id)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            >
              <X className="h-4 w-4" />
              Refuser
            </button>
          </div>
        )}

        {mandate.status === 'pending' && viewAs === 'owner' && (
          <p className="text-center text-sm text-amber-600 bg-amber-50 py-2 rounded-lg">
            En attente de réponse de l'agence
          </p>
        )}

        {/* Sign button for active or pending mandates without signature */}
        {(mandate.status === 'active' || mandate.status === 'pending') && !mandate.signed_mandate_url && onSign && (
          <button
            onClick={() => onSign(mandate)}
            className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors mt-2"
          >
            <FileSignature className="h-4 w-4" />
            Signer le mandat
          </button>
        )}
      </div>
    </div>
  );
}
