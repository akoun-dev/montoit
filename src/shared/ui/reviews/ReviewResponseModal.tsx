import { useState } from 'react';
import { MessageSquare, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/ui/Button';

interface ReviewResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  reviewId: string;
  existingResponse?: string | null;
}

export default function ReviewResponseModal({
  isOpen,
  onClose,
  onSubmit,
  reviewId,
  existingResponse,
}: ReviewResponseModalProps) {
  const [response, setResponse] = useState(existingResponse || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim()) {
      alert('Veuillez saisir une réponse');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('reviews')
        .update({
          response: response.trim(),
          response_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (error) throw error;

      onSubmit();
      onClose();
      setResponse('');
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Erreur lors de l\'envoi de la réponse');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#EFEBE9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F16522] flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2C1810]">
                {existingResponse ? 'Modifier votre réponse' : 'Répondre à l\'avis'}
              </h2>
              <p className="text-sm text-[#6B5A4E]">
                {existingResponse ? 'Mettez à jour votre réponse' : 'Votre réponse sera publique'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#FAF7F4] rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-[#6B5A4E]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="response" className="block text-sm font-semibold text-[#2C1810] mb-2">
              Votre réponse
            </label>
            <textarea
              id="response"
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Répondez à cet avis de manière professionnelle et constructive..."
              rows={5}
              maxLength={1000}
              className="w-full px-4 py-3 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522] focus:border-transparent resize-none"
            />
            <p className="text-xs text-[#6B5A4E] mt-1 text-right">
              {response.length} / 1000 caractères
            </p>
          </div>

          <div className="bg-[#FAF7F4] rounded-xl p-4 border border-[#EFEBE9]">
            <p className="text-xs font-semibold text-[#2C1810] mb-2">Conseils pour une bonne réponse :</p>
            <ul className="text-xs text-[#6B5A4E] space-y-1">
              <li>• Restez professionnel et courtois</li>
              <li>• Reconnaissez les points soulevés dans l'avis</li>
              <li>• Expliquez si nécessaire, sans vous justifier excessivement</li>
              <li>• Proposez des solutions si des problèmes sont mentionnés</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#EFEBE9] flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !response.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 mr-2" />
                {existingResponse ? 'Mettre à jour' : 'Envoyer la réponse'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook pour utiliser le modal de réponse aux avis
 */
export function useReviewResponseModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string>('');
  const [existingResponse, setExistingResponse] = useState<string | null>(null);

  const openModal = (reviewId: string, response?: string | null) => {
    setSelectedReviewId(reviewId);
    setExistingResponse(response || null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedReviewId('');
    setExistingResponse(null);
  };

  return {
    isOpen,
    selectedReviewId,
    existingResponse,
    openModal,
    closeModal,
  };
}
