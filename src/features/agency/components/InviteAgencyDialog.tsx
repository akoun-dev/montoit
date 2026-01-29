/**
 * Modal pour inviter une agence à gérer un bien
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Building2,
  Search,
  Calendar,
  Percent,
  Check,
  Download,
  CheckCircle2,
  FileSignature,
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import type { Agency, MandatePermissions, AgencyMandate } from '@/hooks/useAgencyMandates';

interface Property {
  id: string;
  title: string;
  city: string;
  price: number;
}

interface InviteAgencyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (params: {
    property_id?: string | null;
    agency_id: string;
    mandate_scope: 'single_property' | 'all_properties';
    start_date: string;
    end_date: string;
    commission_rate: number;
    permissions: Partial<MandatePermissions>;
  }) => Promise<AgencyMandate | null>;
  onDownloadMandate?: (mandateId: string) => Promise<boolean>;
  properties: Property[];
  agencies: Agency[];
  selectedPropertyId?: string;
}

const PERMISSION_LABELS: Record<keyof MandatePermissions, { label: string; description: string }> =
  {
    can_view_properties: {
      label: 'Voir les biens',
      description: 'Accéder aux détails du bien',
    },
    can_edit_properties: {
      label: 'Modifier les biens',
      description: 'Mettre à jour les informations',
    },
    can_create_properties: {
      label: 'Créer des biens',
      description: 'Ajouter de nouveaux biens',
    },
    can_delete_properties: {
      label: 'Supprimer des biens',
      description: 'Retirer des biens',
    },
    can_view_applications: {
      label: 'Voir les candidatures',
      description: 'Consulter les demandes',
    },
    can_manage_applications: {
      label: 'Gérer les candidatures',
      description: 'Accepter/refuser les demandes',
    },
    can_create_leases: {
      label: 'Créer des baux',
      description: 'Rédiger et signer des contrats',
    },
    can_view_financials: {
      label: 'Voir les finances',
      description: 'Accéder aux paiements',
    },
    can_manage_maintenance: {
      label: 'Gérer la maintenance',
      description: 'Traiter les demandes de travaux',
    },
    can_communicate_tenants: {
      label: 'Communiquer avec locataires',
      description: 'Envoyer des messages',
    },
    can_manage_documents: {
      label: 'Gérer les documents',
      description: 'Ajouter/supprimer des fichiers',
    },
  };

const DEFAULT_PERMISSIONS: MandatePermissions = {
  can_view_properties: true,
  can_edit_properties: false,
  can_create_properties: false,
  can_delete_properties: false,
  can_view_applications: true,
  can_manage_applications: false,
  can_create_leases: false,
  can_view_financials: false,
  can_manage_maintenance: false,
  can_communicate_tenants: true,
  can_manage_documents: false,
};

export default function InviteAgencyDialog({
  isOpen,
  onClose,
  onInvite,
  onDownloadMandate,
  properties,
  agencies,
  selectedPropertyId,
}: InviteAgencyDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'select' | 'configure' | 'success'>('select');
  const [createdMandateId, setCreatedMandateId] = useState<string | null>(null);
  const [mandateScope, setMandateScope] = useState<'single_property' | 'all_properties'>(
    'single_property'
  );
  const [selectedProperty, setSelectedProperty] = useState<string>(selectedPropertyId || '');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addMonths(new Date(), 12), 'yyyy-MM-dd'));
  const [commissionRate, setCommissionRate] = useState(8);
  const [permissions, setPermissions] = useState<MandatePermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('InviteAgencyDialog - properties:', properties.length, properties);
    console.log('InviteAgencyDialog - agencies:', agencies.length, agencies);
    if (selectedPropertyId) {
      setSelectedProperties([selectedPropertyId]);
      setMandateScope('single_property');
    }
    // Always set scope based on current properties count
    if (!selectedPropertyId) {
      setMandateScope(properties.length > 0 ? 'single_property' : 'all_properties');
      setSelectedProperties([]);
    }
  }, [selectedPropertyId, properties.length, agencies]);

  const filteredAgencies = agencies.filter((agency) => {
    const query = searchQuery.toLowerCase();
    const nameMatch = agency.agency_name.toLowerCase().includes(query);
    const cityMatch = agency.city && agency.city.toLowerCase().includes(query);
    return nameMatch || cityMatch;
  });

  const handleContinue = () => {
    // Pour all_properties, on n'a pas besoin de selectedProperty
    const canProceed =
      mandateScope === 'all_properties'
        ? selectedAgency !== ''
        : selectedProperties.length > 0 && selectedAgency !== '';

    if (canProceed) {
      setStep('configure');
    }
  };

  const handleInvite = async () => {
    setLoading(true);

    // Determine property_ids to create mandates for
    const propertyIds =
      mandateScope === 'all_properties'
        ? null // null means all properties
        : selectedProperties.length > 0
          ? selectedProperties // multiple selected properties
          : [selectedProperty]; // single property (fallback)

    // For multiple properties, create mandates for each
    if (propertyIds && propertyIds.length > 1) {
      // Create mandates for all selected properties
      const mandates = await Promise.all(
        propertyIds.map((propId) =>
          onInvite({
            property_id: propId,
            agency_id: selectedAgency,
            mandate_scope: 'single_property',
            start_date: new Date(startDate).toISOString(),
            end_date: new Date(endDate).toISOString(),
            commission_rate: commissionRate,
            permissions,
          })
        )
      );

      setLoading(false);

      if (mandates.every((m) => m !== null)) {
        setCreatedMandateId(mandates[0]?.id || null);
        setStep('success');
      }
    } else {
      // Single mandate (all_properties or one property)
      const mandate = await onInvite({
        property_id: mandateScope === 'all_properties' ? null : propertyIds?.[0] || null,
        agency_id: selectedAgency,
        mandate_scope: mandateScope,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        commission_rate: commissionRate,
        permissions,
      });
      setLoading(false);

      if (mandate) {
        setCreatedMandateId(mandate.id);
        setStep('success');
      }
    }
  };

  const handleDownloadPDF = async () => {
    if (createdMandateId && onDownloadMandate) {
      await onDownloadMandate(createdMandateId);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form after a small delay
    setTimeout(() => {
      setStep('select');
      setMandateScope('single_property');
      setSelectedProperty('');
      setSelectedProperties([]);
      setSelectedAgency('');
      setSearchQuery('');
      setPermissions(DEFAULT_PERMISSIONS);
      setCreatedMandateId(null);
    }, 200);
  };

  const togglePermission = (key: keyof MandatePermissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  const selectedAgencyData = agencies.find((a) => a.id === selectedAgency);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

        <div className="relative bg-white rounded-2xl shadow-xl max-w-7xl w-full max-h-[98vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">
                {step === 'select'
                  ? 'Inviter une agence'
                  : step === 'configure'
                    ? 'Configurer le mandat'
                    : 'Mandat créé'}
              </h2>
              <p className="text-sm text-neutral-500">
                {step === 'select'
                  ? 'Sélectionnez une agence pour gérer votre bien'
                  : step === 'configure'
                    ? 'Définissez les termes et permissions'
                    : "L'invitation a été envoyée avec succès"}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-neutral-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(98vh-180px)]">
            {step === 'success' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">Invitation envoyée</h3>
                <p className="text-neutral-600 mb-6">
                  L'agence {selectedAgencyData?.agency_name} a reçu votre invitation.
                  <br />
                  Vous serez notifié dès qu'elle acceptera le mandat.
                </p>
                {onDownloadMandate && (
                  <button
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Télécharger le document de mandat
                  </button>
                )}
                {createdMandateId && (
                  <button
                    onClick={() => {
                      handleClose();
                      navigate(`/mandat/signer/${createdMandateId}`);
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <FileSignature className="h-4 w-4" />
                    Signer le mandat maintenant
                  </button>
                )}
              </div>
            ) : step === 'select' ? (
              <>
                {/* Mandate Scope Selection */}
                {!selectedPropertyId && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-neutral-700 mb-3">
                      Portée du mandat
                    </label>
                    {properties.length > 0 ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMandateScope('single_property')}
                          className={`flex-1 py-3 px-4 rounded-xl border-2 text-center font-medium transition-all ${
                            mandateScope === 'single_property'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                          }`}
                        >
                          Un bien spécifique
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMandateScope('all_properties');
                            setSelectedProperty('');
                          }}
                          className={`flex-1 py-3 px-4 rounded-xl border-2 text-center font-medium transition-all ${
                            mandateScope === 'all_properties'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                          }`}
                        >
                          Tous mes biens ({properties.length})
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-sm text-blue-800 font-medium mb-1">
                          Tous mes biens (y compris les futurs)
                        </p>
                        <p className="text-xs text-blue-600">
                          Vous n'avez pas encore de propriétés. Ce mandat permettra à l'agence de
                          gérer tous vos biens actuels et futurs.
                        </p>
                      </div>
                    )}
                    {mandateScope === 'all_properties' && (
                      <p className="mt-2 text-sm text-neutral-500 bg-amber-50 p-3 rounded-lg border border-amber-100">
                        ⚠️ L'agence aura accès à toutes vos propriétés actuelles et futures.
                      </p>
                    )}
                  </div>
                )}

                {/* Property Selection - Multiple checkboxes for single_property */}
                {mandateScope === 'single_property' &&
                  !selectedPropertyId &&
                  properties.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-neutral-700">
                          Sélectionnez les biens à confier
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedProperties.length === properties.length) {
                              setSelectedProperties([]);
                            } else {
                              setSelectedProperties(properties.map((p) => p.id));
                            }
                          }}
                          className="text-xs text-primary hover:text-primary-700 font-medium"
                        >
                          {selectedProperties.length === properties.length
                            ? 'Tout désélectionner'
                            : `Tout sélectionner (${properties.length})`}
                        </button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {properties.map((property) => (
                          <label
                            key={property.id}
                            className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                              selectedProperties.includes(property.id)
                                ? 'bg-primary/5 border-primary'
                                : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedProperties.includes(property.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProperties([...selectedProperties, property.id]);
                                } else {
                                  setSelectedProperties(
                                    selectedProperties.filter((id) => id !== property.id)
                                  );
                                }
                              }}
                              className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900 truncate">
                                {property.title}
                              </p>
                              <p className="text-xs text-neutral-500">
                                {property.city} • {property.price.toLocaleString()} FCFA/mois
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                      {selectedProperties.length > 0 && (
                        <p className="mt-2 text-sm text-primary bg-primary/5 px-3 py-2 rounded-lg">
                          {selectedProperties.length} bien(s) sélectionné(s)
                        </p>
                      )}
                    </div>
                  )}

                {/* Search Agencies */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Rechercher une agence
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nom ou ville..."
                      className="w-full pl-10 pr-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                {/* Agencies List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredAgencies.length === 0 ? (
                    <p className="text-center py-8 text-neutral-500">Aucune agence trouvée</p>
                  ) : (
                    filteredAgencies.map((agency) => (
                      <button
                        key={agency.id}
                        onClick={() => setSelectedAgency(agency.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          selectedAgency === agency.id
                            ? 'border-primary bg-primary/5'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center flex-shrink-0">
                          {agency.logo_url ? (
                            <img
                              src={agency.logo_url}
                              alt={agency.agency_name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 text-neutral-400" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-neutral-900">{agency.agency_name}</p>
                          <p className="text-sm text-neutral-500">
                            {agency.city || "Côte d'Ivoire"}
                          </p>
                        </div>
                        {selectedAgency === agency.id && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Summary */}
                <div className="bg-neutral-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-medium">{selectedAgencyData?.agency_name}</span>
                  </div>
                  <p className="text-sm text-neutral-600">
                    {mandateScope === 'all_properties'
                      ? `Gestion de tous vos biens (${properties.length} propriété${properties.length > 1 ? 's' : ''})`
                      : selectedProperties.length > 1
                        ? `Gestion de ${selectedProperties.length} bien(s) sélectionné(s)`
                        : `Gestion de : ${properties.find((p) => p.id === selectedProperties[0])?.title || 'Bien sélectionné'}`}
                  </p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Date de fin
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                {/* Commission */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    <Percent className="h-4 w-4 inline mr-1" />
                    Taux de commission
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={commissionRate}
                      onChange={(e) => setCommissionRate(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-primary w-16 text-right">
                      {commissionRate}%
                    </span>
                  </div>
                  {mandateScope === 'single_property' && selectedProperties.length > 0 && (
                    <p className="text-sm text-neutral-500 mt-1">
                      {selectedProperties.length === 1
                        ? `Soit ${Math.round(((properties.find((p) => p.id === selectedProperties[0])?.price || 0) * commissionRate) / 100).toLocaleString()} FCFA/mois`
                        : `Total: ${Math.round((selectedProperties.reduce((sum, id) => sum + (properties.find((p) => p.id === id)?.price || 0), 0) * commissionRate) / 100).toLocaleString()} FCFA/mois pour ${selectedProperties.length} bien(s)`}
                    </p>
                  )}
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-3">
                    Permissions accordées
                  </label>
                  <div className="space-y-2">
                    {(Object.keys(PERMISSION_LABELS) as Array<keyof MandatePermissions>).map(
                      (key) => (
                        <label
                          key={key}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={permissions[key]}
                            onChange={() => togglePermission(key)}
                            className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                          />
                          <div>
                            <p className="text-sm font-medium text-neutral-900">
                              {PERMISSION_LABELS[key].label}
                            </p>
                            <p className="text-xs text-neutral-500">
                              {PERMISSION_LABELS[key].description}
                            </p>
                          </div>
                        </label>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-200 flex gap-3">
            {step === 'success' ? (
              <button
                onClick={handleClose}
                className="w-full px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
              >
                Fermer
              </button>
            ) : (
              <>
                {step === 'configure' && (
                  <button
                    onClick={() => setStep('select')}
                    className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                  >
                    Retour
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors ml-auto"
                >
                  Annuler
                </button>
                {step === 'select' ? (
                  <button
                    onClick={handleContinue}
                    disabled={
                      mandateScope === 'single_property'
                        ? selectedProperties.length === 0 || !selectedAgency
                        : !selectedAgency
                    }
                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Continuer
                  </button>
                ) : (
                  <button
                    onClick={handleInvite}
                    disabled={loading}
                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Envoi...' : "Envoyer l'invitation"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
