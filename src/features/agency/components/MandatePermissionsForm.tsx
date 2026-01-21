/**
 * Formulaire de gestion des permissions d'un mandat
 */

import { useState } from 'react';
import { X, Shield, Save } from 'lucide-react';
import type { AgencyMandate, MandatePermissions } from '@/hooks/useAgencyMandates';

interface MandatePermissionsFormProps {
  isOpen: boolean;
  onClose: () => void;
  mandate: AgencyMandate;
  onSave: (permissions: Partial<MandatePermissions>) => Promise<boolean>;
}

const PERMISSION_GROUPS = [
  {
    title: 'Gestion des biens',
    permissions: [
      {
        key: 'can_view_properties',
        label: 'Voir les biens',
        description: 'Consulter les détails des propriétés',
      },
      {
        key: 'can_edit_properties',
        label: 'Modifier les biens',
        description: 'Mettre à jour les informations',
      },
      {
        key: 'can_create_properties',
        label: 'Créer des biens',
        description: 'Ajouter de nouvelles propriétés',
      },
      {
        key: 'can_delete_properties',
        label: 'Supprimer des biens',
        description: 'Retirer des propriétés',
      },
    ],
  },
  {
    title: 'Candidatures & Baux',
    permissions: [
      {
        key: 'can_view_applications',
        label: 'Voir les candidatures',
        description: 'Consulter les demandes de location',
      },
      {
        key: 'can_manage_applications',
        label: 'Gérer les candidatures',
        description: 'Accepter ou refuser les demandes',
      },
      {
        key: 'can_create_leases',
        label: 'Créer des baux',
        description: 'Rédiger et signer des contrats',
      },
    ],
  },
  {
    title: 'Finances & Maintenance',
    permissions: [
      {
        key: 'can_view_financials',
        label: 'Voir les finances',
        description: 'Accéder aux paiements et relevés',
      },
      {
        key: 'can_manage_maintenance',
        label: 'Gérer la maintenance',
        description: 'Traiter les demandes de travaux',
      },
    ],
  },
  {
    title: 'Communication & Documents',
    permissions: [
      {
        key: 'can_communicate_tenants',
        label: 'Communiquer',
        description: 'Envoyer des messages aux locataires',
      },
      {
        key: 'can_manage_documents',
        label: 'Gérer les documents',
        description: 'Ajouter ou supprimer des fichiers',
      },
    ],
  },
];

export default function MandatePermissionsForm({
  isOpen,
  onClose,
  mandate,
  onSave,
}: MandatePermissionsFormProps) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    can_view_properties: mandate.can_view_properties,
    can_edit_properties: mandate.can_edit_properties,
    can_create_properties: mandate.can_create_properties,
    can_delete_properties: mandate.can_delete_properties,
    can_view_applications: mandate.can_view_applications,
    can_manage_applications: mandate.can_manage_applications,
    can_create_leases: mandate.can_create_leases,
    can_view_financials: mandate.can_view_financials,
    can_manage_maintenance: mandate.can_manage_maintenance,
    can_communicate_tenants: mandate.can_communicate_tenants,
    can_manage_documents: mandate.can_manage_documents,
  });
  const [loading, setLoading] = useState(false);

  const handleToggle = (key: string) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setLoading(true);
    const success = await onSave(permissions as Partial<MandatePermissions>);
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  const countEnabled = Object.values(permissions).filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Permissions</h2>
                <p className="text-sm text-neutral-500">{countEnabled}/11 actives</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-neutral-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-6">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3 className="text-sm font-semibold text-neutral-900 mb-3">{group.title}</h3>
                  <div className="space-y-2">
                    {group.permissions.map((perm) => (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                          permissions[perm.key]
                            ? 'bg-primary/5 border border-primary/20'
                            : 'bg-neutral-50 border border-transparent hover:bg-neutral-100'
                        }`}
                      >
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={permissions[perm.key]}
                            onChange={() => handleToggle(perm.key)}
                            className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                          />
                        </div>
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              permissions[perm.key] ? 'text-primary' : 'text-neutral-700'
                            }`}
                          >
                            {perm.label}
                          </p>
                          <p className="text-xs text-neutral-500">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-200 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
