import { useState } from 'react';
import {
  X,
  Calendar,
  FileText,
  AlertCircle,
  Info,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { terminateContract } from '@/services/contracts/contractService';
import { Button } from '@/shared/ui/Button';

interface TerminateLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  contractId: string;
  propertyTitle: string;
  contractNumber: string;
  startDate: string;
  endDate: string | null;
}

type TerminationReason = 'end_of_lease' | 'early_termination' | 'breach' | 'mutual_agreement' | 'other';

interface TerminationReasonOption {
  value: TerminationReason;
  label: string;
  description: string;
  noticePeriod: number; // in days
}

const terminationReasons: TerminationReasonOption[] = [
  {
    value: 'end_of_lease',
    label: 'Fin de contrat',
    description: 'Le bail arrive à son terme normal',
    noticePeriod: 0,
  },
  {
    value: 'early_termination',
    label: 'Résiliation anticipée',
    description: 'Vous souhaitez résilier avant la fin prévue (préavis de 3 mois)',
    noticePeriod: 90,
  },
  {
    value: 'mutual_agreement',
    label: 'Accord mutuel',
    description: 'D\'accord commun avec le propriétaire',
    noticePeriod: 0,
  },
  {
    value: 'breach',
    label: 'Non-respect des obligations',
    description: 'Le propriétaire n\'a pas respecté ses obligations',
    noticePeriod: 0,
  },
  {
    value: 'other',
    label: 'Autre raison',
    description: 'Une autre raison non listée ci-dessus',
    noticePeriod: 30,
  },
];

export default function TerminateLeaseModal({
  isOpen,
  onClose,
  onSubmit,
  contractId,
  propertyTitle,
  contractNumber,
  startDate,
  endDate,
}: TerminateLeaseModalProps) {
  const [selectedReason, setSelectedReason] = useState<TerminationReason | null>(null);
  const [departureDate, setDepartureDate] = useState<string>('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'reason' | 'date' | 'confirm'>('reason');

  // Calculate notice period end date
  const _getNoticePeriodEndDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // Get minimum date based on notice period
  const getMinDate = (): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleReasonSelect = (reason: TerminationReason) => {
    setSelectedReason(reason);
    // If no notice period, go directly to confirmation
    const reasonOption = terminationReasons.find((r) => r.value === reason);
    if (reasonOption?.noticePeriod === 0) {
      setDepartureDate(getMinDate());
      setStep('confirm');
    } else {
      setStep('date');
    }
  };

  const handleDateSubmit = () => {
    if (!departureDate) {
      alert('Veuillez sélectionner une date de départ');
      return;
    }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      alert('Veuillez sélectionner un motif de résiliation');
      return;
    }

    try {
      setLoading(true);

      const reasonOption = terminationReasons.find((r) => r.value === selectedReason);
      const reasonText = `${reasonOption?.label}${comments ? ': ' + comments : ''}`;

      await terminateContract(contractId, reasonText);

      onSubmit();
      handleClose();
    } catch (error) {
      console.error('Error terminating lease:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la résiliation du bail');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDepartureDate('');
    setComments('');
    setStep('reason');
    onClose();
  };

  const getNoticeInfo = () => {
    if (!selectedReason) return null;
    const reasonOption = terminationReasons.find((r) => r.value === selectedReason);
    if (!reasonOption || reasonOption.noticePeriod === 0) return null;

    const noticeEndDate = new Date();
    noticeEndDate.setDate(noticeEndDate.getDate() + reasonOption.noticePeriod);

    return {
      days: reasonOption.noticePeriod,
      endDate: noticeEndDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };
  };

  const noticeInfo = getNoticeInfo();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#EFEBE9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2C1810]">
                {step === 'confirm' ? 'Confirmer la résiliation' : 'Résilier le bail'}
              </h2>
              <p className="text-sm text-[#6B5A4E]">
                {propertyTitle} • {contractNumber}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-[#FAF7F4] rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-[#6B5A4E]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Select Reason */}
          {step === 'reason' && (
            <>
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Attention</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      La résiliation d'un bail est une action importante. Veuillez vérifier les conditions
                      de résiliation prévues dans votre contrat avant de continuer.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#2C1810] mb-3">
                  Quel est le motif de votre résiliation ?
                </p>
                <div className="space-y-3">
                  {terminationReasons.map((reason) => (
                    <button
                      key={reason.value}
                      onClick={() => handleReasonSelect(reason.value)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:border-[#F16522] hover:bg-[#FFF5F0] ${
                        selectedReason === reason.value
                          ? "border-[#F16522] bg-[#FFF5F0]"
                          : "border-[#EFEBE9] bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-[#2C1810]">{reason.label}</p>
                          <p className="text-sm text-[#6B5A4E] mt-1">{reason.description}</p>
                        </div>
                        {reason.noticePeriod > 0 && (
                          <div className="flex items-center gap-1 text-xs font-medium text-[#F16522] bg-[#FFF5F0] px-2 py-1 rounded-full">
                            <Calendar className="w-3 h-3" />
                            Préavis {reason.noticePeriod}j
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contract Info */}
              <div className="bg-[#FAF7F4] rounded-xl p-4 border border-[#EFEBE9]">
                <p className="text-xs font-semibold text-[#6B5A4E] mb-2">Informations du bail</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#6B5A4E]">Date de début</p>
                    <p className="font-semibold text-[#2C1810]">
                      {new Date(startDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6B5A4E]">Date de fin</p>
                    <p className="font-semibold text-[#2C1810]">
                      {endDate
                        ? new Date(endDate).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Indéterminée'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Select Date */}
          {step === 'date' && noticeInfo && (
            <>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Préavis de résiliation</p>
                    <p className="text-sm text-blue-800 mt-1">
                      Pour ce type de résiliation, un préavis de {noticeInfo.days} jours est requis.
                      La date de fin de bail sera au plus tôt le {noticeInfo.endDate}.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="departureDate" className="block text-sm font-semibold text-[#2C1810] mb-2">
                  Date de départ souhaitée
                </label>
                <input
                  type="date"
                  id="departureDate"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  min={getMinDate()}
                  className="w-full px-4 py-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent"
                />
                <p className="text-xs text-[#6B5A4E] mt-1">
                  Date minimum: {getMinDate()}
                </p>
              </div>

              <div>
                <label htmlFor="comments" className="block text-sm font-semibold text-[#2C1810] mb-2">
                  Commentaires (optionnel)
                </label>
                <textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Précisez les raisons de votre résiliation..."
                  rows={3}
                  className="w-full px-4 py-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('reason')}
                  disabled={loading}
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleDateSubmit}
                  disabled={loading || !departureDate}
                  className="flex-1"
                >
                  Continuer
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <>
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Résumé de la demande</p>
                    <p className="text-sm text-green-800 mt-1">
                      Veuillez vérifier les informations avant de confirmer la résiliation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-[#EFEBE9]">
                  <span className="text-sm text-[#6B5A4E]">Motif</span>
                  <span className="text-sm font-semibold text-[#2C1810]">
                    {terminationReasons.find((r) => r.value === selectedReason)?.label}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#EFEBE9]">
                  <span className="text-sm text-[#6B5A4E]">Date de départ</span>
                  <span className="text-sm font-semibold text-[#2C1810]">
                    {departureDate
                      ? new Date(departureDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : 'Immédiate'}
                  </span>
                </div>
                {noticeInfo && (
                  <div className="flex justify-between items-center py-2 border-b border-[#EFEBE9]">
                    <span className="text-sm text-[#6B5A4E]">Préavis</span>
                    <span className="text-sm font-semibold text-[#2C1810]">
                      {noticeInfo.days} jours
                    </span>
                  </div>
                )}
                {comments && (
                  <div className="py-2 border-b border-[#EFEBE9]">
                    <p className="text-sm text-[#6B5A4E] mb-1">Commentaires</p>
                    <p className="text-sm text-[#2C1810]">{comments}</p>
                  </div>
                )}
              </div>

              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-900">Action irréversible</p>
                    <p className="text-red-800 mt-1">
                      Une fois confirmée, la résiliation entraînera la fin du bail et vous libérera
                      de vos obligations locatives à la date spécifiée. Le propriétaire sera notifié.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep('date')}
                  disabled={loading}
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  variant="destructive"
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Confirmer la résiliation
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
