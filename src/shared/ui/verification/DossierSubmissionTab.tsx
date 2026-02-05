/**
 * Onglet de soumission de dossier de verification
 *
 * Composant partagé pour les 3 types d'utilisateurs (locataire, propriétaire, agence)
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  Building2,
  Home,
  FileText,
  Upload,
  Send,
  CheckCircle2,
  Info,
  Loader2,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/Button';
import {
  DocumentUploadCard,
  VerificationProgressCard,
  DossierStatusBadge,
} from '@/shared/ui/verification';
import verificationApplicationsService, {
  type DossierType,
  type VerificationApplication,
  type DossierStatus,
} from '@/features/verification/services/verificationApplications.service';

// Configuration des documents par type de dossier
const DOCUMENTS_CONFIG: Record<
  DossierType,
  Array<{ type: string; label: string; description: string; required: boolean; icon?: React.ReactNode }>
> = {
  tenant: [
    {
      type: 'id_card',
      label: 'Carte d\'identité',
      description: 'CNI, passeport ou titre de séjour recto-verso',
      required: true,
      icon: <User className="w-5 h-5" />,
    },
    {
      type: 'proof_of_income',
      label: 'Justificatif de revenus',
      description: 'Bulletin de salaire, avis d\'imposition ou justificatif CAF',
      required: true,
      icon: <FileText className="w-5 h-5" />,
    },
    {
      type: 'proof_of_residence',
      label: 'Justificatif de domicile',
      description: 'Facture de moins de 3 mois (électricité, eau, internet)',
      required: true,
      icon: <Home className="w-5 h-5" />,
    },
    {
      type: 'bank_statement',
      label: 'Relevé bancaire',
      description: 'Relevé bancaire récent avec IBAN visible',
      required: false,
      icon: <FileText className="w-5 h-5" />,
    },
  ],
  owner: [
    {
      type: 'id_card',
      label: 'Carte d\'identité ou Passeport',
      description: 'CNI ou passeport recto-verso',
      required: true,
      icon: <User className="w-5 h-5" />,
    },
    {
      type: 'property_proof',
      label: 'Titre de propriété',
      description: 'Acte de propriété ou titre foncier',
      required: true,
      icon: <Home className="w-5 h-5" />,
    },
    {
      type: 'cie_sodeci_bill',
      label: 'Facture CIE ou SODECI',
      description: 'Dernière facture d\'électricité (CIE) ou d\'eau (SODECI)',
      required: true,
      icon: <FileText className="w-5 h-5" />,
    },
    {
      type: 'rib',
      label: 'Relevé d\'identité bancaire (RIB)',
      description: 'RIB avec coordonnées bancaires complètes',
      required: true,
      icon: <FileText className="w-5 h-5" />,
    },
  ],
  agency: [
    {
      type: 'id_card',
      label: 'Carte d\'identité du représentant',
      description: 'CNI, passeport ou titre de séjour recto-verso',
      required: true,
      icon: <User className="w-5 h-5" />,
    },
    {
      type: 'kbis',
      label: 'Extrait Kbis',
      description: 'Extrait Kbis de moins de 3 mois',
      required: true,
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      type: 'professional_card',
      label: 'Carte professionnelle',
      description: 'Carte T ou carte professionnelle d\'agent immobilier',
      required: true,
      icon: <FileText className="w-5 h-5" />,
    },
    {
      type: 'insurance',
      label: 'Assurance RC Pro',
      description: 'Attestation d\'assurance Responsabilité Civile Professionnelle',
      required: true,
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
    {
      type: 'tax_clearance',
      label: 'Accusé de rémission fiscale',
      description: 'Document fiscal attestant de la régularité de l\'entreprise',
      required: false,
      icon: <FileText className="w-5 h-5" />,
    },
  ],
};

interface DossierSubmissionTabProps {
  dossierType: DossierType;
}

function DossierSubmissionTab({ dossierType }: DossierSubmissionTabProps) {
  const { user } = useAuth();
  const [application, setApplication] = useState<VerificationApplication | null>(null);
  const [documents, setDocuments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const documentsConfig = DOCUMENTS_CONFIG[dossierType];
  const requiredDocs = documentsConfig.filter((doc) => doc.required);
  const uploadedDocs = Object.keys(documents).length;
  const completionPercentage = Math.round((uploadedDocs / documentsConfig.length) * 100);

  // Charger la demande existante
  useEffect(() => {
    loadApplication();
  }, [user, dossierType]);

  const loadApplication = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const applications = await verificationApplicationsService.getUserApplications(
        user.id,
        dossierType
      );

      // Prendre la demande la plus récente (pending ou in_review)
      const activeApp = applications.find(
        (app) => app.status === 'pending' || app.status === 'in_review' || app.status === 'more_info_requested'
      ) || applications[0] || null;

      if (activeApp) {
        setApplication(activeApp);
        // Charger les documents
        const appDocuments = await verificationApplicationsService.getDocuments(activeApp.id);
        const docsMap: Record<string, string> = {};
        appDocuments.forEach((doc) => {
          docsMap[doc.document_type] = doc.document_url;
        });
        setDocuments(docsMap);
      }
    } catch (error) {
      console.error('Error loading application:', error);
      // Silent fallback if table doesn't exist
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (docType: string, file: File) => {
    if (!user) return;

    try {
      setUploading((prev) => ({ ...prev, [docType]: true }));

      // Créer une demande si elle n'existe pas
      let currentApp = application;
      if (!currentApp) {
        currentApp = await verificationApplicationsService.create(user.id, {
          dossier_type: dossierType,
        });
        setApplication(currentApp);
      }

      // Uploader le fichier
      const fileUrl = await verificationApplicationsService.uploadFile(
        user.id,
        dossierType,
        file,
        docType
      );

      // Ajouter le document à la demande
      await verificationApplicationsService.addDocument(currentApp.id, {
        document_type: docType,
        document_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      });

      // Mettre à jour l'état local
      setDocuments((prev) => {
        const updatedDocs = { ...prev, [docType]: fileUrl };
        // Calculer le pourcentage basé sur les documents requis uploadés
        const uploadedRequiredDocs = requiredDocs.filter((doc) => updatedDocs[doc.type]).length;
        const newCompletion = Math.round((uploadedRequiredDocs / requiredDocs.length) * 100);
        // Mettre à jour la base de données
        verificationApplicationsService.update(currentApp.id, {
          completion_percentage: Math.min(newCompletion, 100),
        }).catch(console.error);
        return updatedDocs;
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erreur lors de l\'upload du document');
      throw error;
    } finally {
      setUploading((prev) => ({ ...prev, [docType]: false }));
    }
  };

  const handleDelete = async (docType: string) => {
    if (!application) return;

    try {
      // Trouver et supprimer le document
      const appDocuments = await verificationApplicationsService.getDocuments(application.id);
      const docToDelete = appDocuments.find((doc) => doc.document_type === docType);

      if (docToDelete) {
        // Supprimer de la base de données
        await verificationApplicationsService.deleteDocument(docToDelete.id);

        // Supprimer le fichier
        await verificationApplicationsService.deleteFile(dossierType, documents[docType]);
      }

      // Mettre à jour l'état local
      setDocuments((prev) => {
        const newDocs = { ...prev };
        delete newDocs[docType];
        return newDocs;
      });

      // Mettre à jour le pourcentage
      const newCompletion = Math.round(
        ((Object.keys(documents).length - 1) / documentsConfig.length) * 100
      );
      await verificationApplicationsService.update(application.id, {
        completion_percentage: newCompletion,
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erreur lors de la suppression du document');
      throw error;
    }
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called', { application, documents, requiredDocs, dossierType });

    // Vérifier si tous les documents requis sont présents
    const missingRequired = requiredDocs.filter((doc) => !documents[doc.type]);
    console.log('Missing required docs:', missingRequired);

    // Nouvelle approche : ne plus bloquer, mais avertir
    if (missingRequired.length > 0) {
      const confirmed = window.confirm(
        `Certains documents requis sont manquants :\n\n${missingRequired.map((d) => `• ${d.label}`).join('\n')}\n\n` +
        `Voulez-vous tout de même soumettre votre dossier ?\n\n` +
        `⚠️ Note : Un dossier complet sera traité plus rapidement.`
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      setSubmitting(true);

      // Créer l'application si elle n'existe pas
      let currentApp = application;
      if (!currentApp) {
        console.log('No application exists, creating one...');
        currentApp = await verificationApplicationsService.create(user.id, {
          dossier_type: dossierType,
        });
        setApplication(currentApp);
        console.log('Application created:', currentApp);
      }

      console.log('Submitting application:', currentApp.id);
      console.log('Calling submitVerificationService...');
      const result = await verificationApplicationsService.submit(currentApp.id);
      console.log('Submit result:', result);
      toast.success('Dossier soumis avec succès !');
      console.log('Reloading application...');
      await loadApplication(); // Reload to get updated status
      console.log('Application reloaded');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(`Erreur lors de la soumission: ${error?.message || 'Erreur inconnue'}`);
    } finally {
      console.log('Setting submitting to false');
      setSubmitting(false);
    }
  };

  const allRequiredDocsPresent = requiredDocs.every((doc) => documents[doc.type]);
  // On peut soumettre si: tous les docs requis sont presents ET (pas d'application OU brouillon OU infos demandees)
  const canSubmit =
    allRequiredDocsPresent &&
    (!application || application.status === 'draft' || application.status === 'more_info_requested');

  const missingRequiredDocs = requiredDocs.filter((doc) => !documents[doc.type]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec Statut Visible */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Dossier de verification</h3>
            <p className="text-sm text-gray-600 mt-1">
              Complétez votre dossier pour obtenir la certification ANSUT
            </p>
          </div>
          {application && <DossierStatusBadge status={application.status} />}
        </div>

        {/* Statut du dossier - Section visible et prominente */}
        <div className="mb-6">
          {!application ? (
            /* Aucun dossier commence */
            <div className="p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 rounded-xl flex-shrink-0">
                  <Upload className="w-6 h-6 text-slate-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">Dossier non commence</h4>
                  <p className="text-sm text-slate-600 mt-1">
                    Commencez votre verification en uploadant vos documents ci-dessous
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                  <Clock className="w-3.5 h-3.5" />
                  <span>À commencer</span>
                </span>
              </div>
            </div>
          ) : application.status === 'draft' ? (
            <div className="p-5 bg-gray-50 border-2 border-gray-200 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-xl flex-shrink-0">
                  <FileText className="w-6 h-6 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">Dossier en cours de preparation</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Uploadez vos documents et soumettez votre dossier pour verification
                  </p>
                </div>
                <DossierStatusBadge status={application.status} size="lg" />
              </div>
            </div>
          ) : application.status === 'pending' ? (
            <div className="p-5 bg-amber-50 border-2 border-amber-200 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 rounded-xl flex-shrink-0">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-900">Dossier soumis - En attente de verification</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Votre dossier a ete recu et sera examine par notre equipe sous peu
                  </p>
                </div>
                <DossierStatusBadge status={application.status} size="lg" />
              </div>
            </div>
          ) : application.status === 'in_review' ? (
            <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900">Dossier en cours d'examen</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Notre equipe est en train de verifier vos documents
                  </p>
                </div>
                <DossierStatusBadge status={application.status} size="lg" />
              </div>
            </div>
          ) : application.status === 'more_info_requested' ? (
            <div className="p-5 bg-purple-50 border-2 border-purple-200 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-900">Informations supplementaires demandees</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Veuillez completer votre dossier avec les documents demandes
                  </p>
                </div>
                <DossierStatusBadge status={application.status} size="lg" />
              </div>
            </div>
          ) : application.status === 'approved' ? (
            <div className="p-5 bg-green-50 border-2 border-green-200 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900">Dossier valide !</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Felicitations ! Votre dossier a ete approuve et vous etes desormais certifie ANSUT
                  </p>
                </div>
                <DossierStatusBadge status={application.status} size="lg" />
              </div>
            </div>
          ) : application.status === 'rejected' ? (
            <div className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-xl flex-shrink-0">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900">Dossier refuse</h4>
                  <p className="text-sm text-red-700 mt-1">
                    {application.rejection_reason || 'Votre dossier n\'a pas pu etre valide. Veuillez reessayer.'}
                  </p>
                </div>
                <DossierStatusBadge status={application.status} size="lg" />
              </div>
            </div>
          ) : null}
        </div>

        {/* Progress Bar */}
        {(!application || application.status !== 'approved' && application.status !== 'rejected') && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progression des documents</span>
              <span className="text-sm font-semibold text-primary-600">
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Info Box */}
        {application?.status !== 'approved' && application?.status !== 'rejected' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Documents acceptes</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• PDF - Maximum 10Mo par fichier</li>
                  <li>• Images (JPG, PNG) - Maximum 5Mo par fichier</li>
                  <li>• Documents lisibles et en couleurs</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Documents Upload Grid */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-4">Documents requis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documentsConfig.map((docConfig) => (
            <DocumentUploadCard
              key={docConfig.type}
              documentType={docConfig.type}
              documentLabel={docConfig.label}
              documentDescription={docConfig.description}
              required={docConfig.required}
              existingUrl={documents[docConfig.type]}
              status={
                application?.status === 'approved'
                  ? 'verified'
                  : application?.status === 'rejected'
                    ? 'rejected'
                    : 'pending'
              }
              onUpload={(file) => handleUpload(docConfig.type, file)}
              onDelete={() => handleDelete(docConfig.type)}
              accept="application/pdf,image/*"
              maxSize={10 * 1024 * 1024}
              uploading={uploading[docConfig.type]}
              icon={docConfig.icon}
            />
          ))}
        </div>
      </div>

      {/* Submit Button Section */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        {!application ? (
          /* Aucune application - afficher le bouton de soumission */
          <>
            {!canSubmit && missingRequiredDocs.length > 0 && (
              <p className="text-sm text-amber-600 mr-4 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Documents manquants: {missingRequiredDocs.map((d) => d.label).join(', ')}
              </p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Soumission...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Soumettre le dossier
                </>
              )}
            </Button>
          </>
        ) : application.status === 'draft' || application.status === 'more_info_requested' ? (
          /* Brouillon ou infos demandees - afficher le bouton */
          <>
            {!canSubmit && missingRequiredDocs.length > 0 && (
              <p className="text-sm text-amber-600 mr-4 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2" />
                Documents manquants: {missingRequiredDocs.map((d) => d.label).join(', ')}
              </p>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Soumission...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {application.status === 'more_info_requested' ? 'Ressoumettre le dossier' : 'Soumettre le dossier'}
                </>
              )}
            </Button>
          </>
        ) : application.status === 'pending' || application.status === 'in_review' ? (
          /* En attente ou en cours - afficher message */
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>Dossier en cours de verification</span>
          </div>
        ) : application.status === 'approved' ? (
          /* Approuve */
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="w-4 h-4" />
            <span>Dossier valide</span>
          </div>
        ) : application.status === 'rejected' ? (
          /* Refuse */
          <div className="flex items-center gap-2 text-sm text-red-600">
            <XCircle className="w-4 h-4" />
            <span>Dossier refuse - Veuillez reessayer</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DossierSubmissionTab;
export { DossierSubmissionTab };
