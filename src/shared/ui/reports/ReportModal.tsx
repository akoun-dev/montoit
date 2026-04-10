/**
 * ReportModal Component
 *
 * Modal dialog for users to report content (properties, users, messages, reviews)
 */

import { useState } from 'react';
import {
  X,
  Flag,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
  Upload,
  XCircle,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import {
  createReport,
  type ReportType,
  type ReportReason,
  REPORT_REASON_LABELS,
  REPORT_REASON_DESCRIPTIONS,
  REPORT_REASONS_BY_TYPE,
} from '@/services/reports/reportService';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: ReportType;
  entityId: string;
  entityTitle?: string;
  onSuccess?: () => void;
}

export default function ReportModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityTitle,
  onSuccess,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>([]);
  const [step, setStep] = useState<'reason' | 'details' | 'confirm' | 'success'>('reason');

  const reportMutation = useMutation({
    mutationFn: () =>
      createReport({
        entityType,
        entityId,
        reason: selectedReason!,
        description: description.trim() || undefined,
        evidence: evidence.length > 0 ? evidence : undefined,
      }),
    onSuccess: () => {
      setStep('success');
      onSuccess?.();
      // Reset form after delay
      setTimeout(() => {
        handleClose();
      }, 3000);
    },
    onError: (error: Error) => {
      console.error('Report creation error:', error);
      alert(error.message || "Erreur lors de l'envoi du signalement");
    },
  });

  const handleClose = () => {
    setSelectedReason(null);
    setDescription('');
    setEvidence([]);
    setStep('reason');
    onClose();
  };

  const handleReasonSelect = (reason: ReportReason) => {
    setSelectedReason(reason);
    setStep('details');
  };

  const handleSubmit = () => {
    if (!selectedReason) {
      alert('Veuillez sélectionner un motif de signalement');
      return;
    }
    reportMutation.mutate();
  };

  const handleEvidenceUpload = () => {
    // This would integrate with storage service
    // For now, just a placeholder
    alert('Fonctionnalité de téléchargement de preuves à venir');
  };

  const removeEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  const reasons = REPORT_REASONS_BY_TYPE[entityType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full mx-auto max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                step === 'success'
                  ? 'bg-green-100'
                  : step === 'confirm'
                    ? 'bg-orange-100'
                    : 'bg-red-100'
              }`}
            >
              {step === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : step === 'confirm' ? (
                <Flag className="h-5 w-5 text-orange-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-neutral-900">
                {step === 'success'
                  ? 'Signalement envoyé'
                  : step === 'confirm'
                    ? 'Confirmer le signalement'
                    : step === 'details'
                      ? 'Détails du signalement'
                      : 'Signaler un contenu'}
              </h2>
              {entityTitle && step !== 'success' && (
                <p className="text-xs md:text-sm text-neutral-500 truncate max-w-xs">
                  {entityTitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={reportMutation.isPending}
            className="p-1.5 hover:bg-neutral-100 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Select Reason */}
          {step === 'reason' && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <p className="text-sm text-amber-900">
                  Votre signalement sera envoyé à notre équipe de modération qui l'examinera dans
                  les plus brefs délais.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-neutral-900 mb-3">
                  Quel est le motif de votre signalement ?
                </p>
                <div className="space-y-2">
                  {reasons.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => handleReasonSelect(reason)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:border-orange-500 hover:bg-orange-50/50 ${
                        selectedReason === reason
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-neutral-200 bg-white'
                      }`}
                    >
                      <p className="font-semibold text-neutral-900">
                        {REPORT_REASON_LABELS[reason]}
                      </p>
                      <p className="text-sm text-neutral-500 mt-1">
                        {REPORT_REASON_DESCRIPTIONS[reason]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 'details' && selectedReason && (
            <div className="space-y-4">
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <div className="flex gap-3">
                  <Flag className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-900">Motif sélectionné</p>
                    <p className="text-sm text-orange-800 mt-1">
                      {REPORT_REASON_LABELS[selectedReason]}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-neutral-900 mb-2"
                >
                  Description <span className="text-neutral-400">(optionnel)</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Précisez les raisons de votre signalement..."
                  rows={4}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-neutral-400 mt-1">{description.length}/500 caractères</p>
              </div>

              {/* Evidence Upload */}
              <div>
                <label className="block text-sm font-semibold text-neutral-900 mb-2">
                  Preuves <span className="text-neutral-400">(optionnel)</span>
                </label>
                <button
                  type="button"
                  onClick={handleEvidenceUpload}
                  className="w-full p-4 border-2 border-dashed border-neutral-300 rounded-xl hover:border-orange-500 hover:bg-orange-50/30 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-neutral-400" />
                    <p className="text-sm text-neutral-600">
                      Cliquez pour ajouter des captures d'écran ou documents
                    </p>
                    <p className="text-xs text-neutral-400">PNG, JPG, PDF jusqu'à 10 MB</p>
                  </div>
                </button>

                {/* Evidence List */}
                {evidence.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {evidence.map((url, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl"
                      >
                        <FileText className="w-5 h-5 text-neutral-400" />
                        <span className="flex-1 text-sm text-neutral-700 truncate">
                          {url.split('/').pop()}
                        </span>
                        <button
                          onClick={() => removeEvidence(index)}
                          className="p-1 hover:bg-neutral-200 rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4 text-neutral-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('reason')}
                  disabled={reportMutation.isPending}
                  className="flex-1 sm:flex-none px-4 py-3 border border-neutral-300 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  Retour
                </button>
                <button
                  type="button"
                  onClick={() => setStep('confirm')}
                  disabled={reportMutation.isPending}
                  className="flex-1 sm:flex-none px-4 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && selectedReason && (
            <div className="space-y-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Prêt à envoyer</p>
                    <p className="text-sm text-green-800 mt-1">
                      Vérifiez les informations avant d'envoyer votre signalement.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-neutral-200">
                  <span className="text-sm text-neutral-500">Type de contenu</span>
                  <span className="text-sm font-medium text-neutral-900 capitalize">
                    {entityType === 'property'
                      ? 'Propriété'
                      : entityType === 'user'
                        ? 'Utilisateur'
                        : entityType === 'message'
                          ? 'Message'
                          : entityType === 'review'
                            ? 'Avis'
                            : 'Contrat'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-neutral-200">
                  <span className="text-sm text-neutral-500">Motif</span>
                  <span className="text-sm font-medium text-neutral-900">
                    {REPORT_REASON_LABELS[selectedReason]}
                  </span>
                </div>

                {description && (
                  <div className="py-2 border-b border-neutral-200">
                    <p className="text-sm text-neutral-500 mb-1">Description</p>
                    <p className="text-sm text-neutral-900">{description}</p>
                  </div>
                )}

                {evidence.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 py-2 border-b border-neutral-200">
                    <span className="text-sm text-neutral-500">Pièces jointes</span>
                    <span className="text-sm font-medium text-neutral-900">
                      {evidence.length} fichier{evidence.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-900">Important</p>
                    <p className="text-red-800 mt-1">
                      Les signalements abusifs ou infondés peuvent entraîner des restrictions sur
                      votre compte.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  disabled={reportMutation.isPending}
                  className="flex-1 sm:flex-none px-4 py-3 border border-neutral-300 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={reportMutation.isPending}
                  className="flex-1 sm:flex-none px-4 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {reportMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Flag className="w-4 h-4" />
                      Envoyer le signalement
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                Signalement envoyé avec succès !
              </h3>
              <p className="text-neutral-500 mb-6">
                Merci de votre contribution. Notre équipe va examiner ce signalement dans les plus
                brefs délais.
              </p>
              <div className="bg-neutral-50 rounded-xl p-4 text-sm text-neutral-600">
                <p className="font-medium mb-1">Que se passe-t-il maintenant ?</p>
                <ul className="text-left space-y-1 text-neutral-500">
                  <li>• Un modérateur examinera votre signalement</li>
                  <li>• Vous serez notifié de la décision</li>
                  <li>• Les actions nécessaires seront prises</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
