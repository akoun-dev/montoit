/**
 * Panneau latéral pour les détails d'un mandat
 * Affiche toutes les informations et permet les actions rapides
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, MapPin, Calendar, User, Phone, Mail, FileSignature, PenTool, Download, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MandateStatusBadge from './MandateStatusBadge';
import { useAgencyMandates, type AgencyMandate } from '@/hooks/useAgencyMandates';

interface MandateDetailPanelProps {
  mandate: AgencyMandate;
  isOpen: boolean;
  onClose: () => void;
}

export default function MandateDetailPanel({ mandate, isOpen, onClose }: MandateDetailPanelProps) {
  const navigate = useNavigate();
  const { suspendMandate, reactivateMandate, terminateMandate } = useAgencyMandates();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non définie';
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CI', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const monthlyCommission = mandate.property?.price
    ? (mandate.property.price * mandate.commission_rate) / 100
    : 0;

  const handleAction = async (action: () => Promise<boolean>) => {
    setLoading(true);
    try {
      await action();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform">
        {/* Header */}
        <div className="sticky top-0 bg-[#2C1810] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Détails du mandat</h2>
            <p className="text-sm text-[#E8D4C5]">
              ID: {mandate.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Banner */}
          <div className="p-4 bg-neutral-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Statut du mandat</p>
                <MandateStatusBadge status={mandate.status} />
              </div>
              <div className="text-right">
                <p className="text-sm text-neutral-500 mb-1">Commission</p>
                <p className="text-2xl font-bold text-[#F16522]">
                  {mandate.commission_rate}%
                </p>
              </div>
            </div>
          </div>

          {/* Property Section */}
          <section>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#F16522]" />
              Bien concerné
            </h3>

            {mandate.property?.main_image && (
              <img
                src={mandate.property.main_image}
                alt={mandate.property.title}
                className="w-full h-48 object-cover rounded-xl mb-4"
              />
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase">Nom du bien</label>
                <p className="text-lg font-semibold text-neutral-900">
                  {mandate.property?.title || '-'}
                </p>
              </div>

              <div className="flex items-start gap-2 text-neutral-600">
                <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p>{mandate.property?.city || '-'}</p>
                  {mandate.property?.neighborhood && (
                    <p className="text-sm">{mandate.property.neighborhood}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase">Loyer mensuel</label>
                <p className="text-lg font-semibold text-neutral-900">
                  {formatCurrency(mandate.property?.price || 0)}
                </p>
                <p className="text-sm text-[#F16522]">
                  Revenu commission: {formatCurrency(monthlyCommission)}/mois
                </p>
              </div>
            </div>
          </section>

          {/* Dates Section */}
          <section className="p-4 bg-neutral-50 rounded-xl">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Période du mandat
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-neutral-500">Date de début</label>
                <p className="font-medium text-neutral-900">{formatDate(mandate.start_date)}</p>
              </div>
              <div>
                <label className="text-xs text-neutral-500">Date de fin</label>
                <p className="font-medium text-neutral-900">
                  {mandate.end_date ? formatDate(mandate.end_date) : 'Indéterminée'}
                </p>
              </div>
            </div>
          </section>

          {/* Owner Section */}
          <section>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-[#F16522]" />
              Propriétaire
            </h3>
            <div className="p-4 bg-neutral-50 rounded-xl space-y-3">
              <div>
                <label className="text-xs font-medium text-neutral-500 uppercase">Nom complet</label>
                <p className="font-medium text-neutral-900">
                  {mandate.owner?.full_name || '-'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-neutral-600">
                <Mail className="h-4 w-4" />
                <a
                  href={`mailto:${mandate.owner?.email}`}
                  className="hover:text-[#F16522]"
                >
                  {mandate.owner?.email || '-'}
                </a>
              </div>
              {mandate.owner?.phone && (
                <div className="flex items-center gap-2 text-neutral-600">
                  <Phone className="h-4 w-4" />
                  <a
                    href={`tel:${mandate.owner.phone}`}
                    className="hover:text-[#F16522]"
                  >
                    {mandate.owner.phone}
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Signature Section */}
          <section className="p-4 bg-blue-50 rounded-xl">
            <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              Statut de signature
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">État actuel</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  mandate.cryptoneo_signature_status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : mandate.cryptoneo_signature_status === 'owner_signed'
                      ? 'bg-amber-100 text-amber-700'
                      : mandate.cryptoneo_signature_status === 'agency_signed'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {mandate.cryptoneo_signature_status === 'completed'
                    ? 'Signé'
                    : mandate.cryptoneo_signature_status === 'owner_signed'
                      ? 'Signé par propriétaire'
                      : mandate.cryptoneo_signature_status === 'agency_signed'
                        ? 'Signé par agence'
                        : mandate.cryptoneo_signature_status === 'pending'
                          ? 'En attente'
                          : 'Non signé'}
                </span>
              </div>

              {mandate.signed_mandate_url && (
                <a
                  href={mandate.signed_mandate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-neutral-200 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Télécharger le mandat signé
                </a>
              )}
            </div>
          </section>

          {/* Permissions Section */}
          <section>
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#F16522]" />
              Permissions accordées
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {mandate.can_view_properties && (
                <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                  Voir les biens
                </span>
              )}
              {mandate.can_edit_properties && (
                <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                  Modifier les biens
                </span>
              )}
              {mandate.can_create_properties && (
                <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                  Créer des biens
                </span>
              )}
              {mandate.can_view_applications && (
                <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                  Voir les candidatures
                </span>
              )}
              {mandate.can_manage_applications && (
                <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                  Gérer les candidatures
                </span>
              )}
              {mandate.can_create_leases && (
                <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                  Créer des baux
                </span>
              )}
              {mandate.can_view_financials && (
                <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                  Voir les finances
                </span>
              )}
              {mandate.can_communicate_tenants && (
                <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                  Communiquer avec locataires
                </span>
              )}
              {mandate.can_manage_documents && (
                <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                  Gérer les documents
                </span>
              )}
              {mandate.can_manage_maintenance && (
                <span className="px-3 py-1 bg-[#F16522]/10 text-[#F16522] rounded-full text-sm font-medium">
                  Gérer la maintenance
                </span>
              )}
            </div>
          </section>

          {/* Actions Section */}
          <section className="border-t border-neutral-200 pt-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {mandate.status === 'active' && !mandate.signed_mandate_url && (
                <button
                  onClick={() => navigate(`/mandat/signer/${mandate.id}`)}
                  className="flex items-center justify-center gap-2 py-3 bg-[#F16522] hover:bg-[#d9571d] text-white rounded-xl font-medium transition-colors"
                  disabled={loading}
                >
                  <PenTool className="h-5 w-5" />
                  Signer le mandat
                </button>
              )}

              {mandate.status === 'active' && (
                <button
                  onClick={() => handleAction(() => suspendMandate(mandate.id))}
                  className="flex items-center justify-center gap-2 py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-xl font-medium transition-colors"
                  disabled={loading}
                >
                  Suspendre
                </button>
              )}

              {mandate.status === 'suspended' && (
                <button
                  onClick={() => handleAction(() => reactivateMandate(mandate.id))}
                  className="flex items-center justify-center gap-2 py-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl font-medium transition-colors"
                  disabled={loading}
                >
                  Réactiver
                </button>
              )}

              {(mandate.status === 'active' || mandate.status === 'suspended') && (
                <button
                  onClick={() => handleAction(() => terminateMandate(mandate.id))}
                  className="flex items-center justify-center gap-2 py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-medium transition-colors"
                  disabled={loading}
                >
                  Résilier
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
