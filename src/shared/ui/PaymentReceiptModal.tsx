import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui';
import { Download, ExternalLink, Loader2, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: {
    id: string;
    amount: number;
    receipt_url?: string | null;
    receipt_number?: string | null;
    paid_date?: string | null;
    payment_method?: string | null;
  };
}

export function PaymentReceiptModal({ open, onOpenChange, payment }: PaymentReceiptModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState(payment.receipt_url);
  const [receiptNumber, setReceiptNumber] = useState(payment.receipt_number);

  const generateReceipt = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-payment-receipt', {
        body: { paymentId: payment.id },
      });

      if (error) throw error;

      if (data?.receiptUrl) {
        setReceiptUrl(data.receiptUrl);
        setReceiptNumber(data.receiptNumber);
        toast.success('Reçu généré avec succès');
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast.error('Erreur lors de la génération du reçu');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReceipt = () => {
    if (receiptUrl) {
      window.open(receiptUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#F16522]" />
            Reçu de Paiement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payment Summary */}
          <div className="p-4 rounded-xl bg-[#FAF7F4] border border-[#EFEBE9]">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Montant payé</p>
              <p className="text-3xl font-bold text-[#2C1810]">
                {payment.amount?.toLocaleString('fr-CI')} <span className="text-lg">FCFA</span>
              </p>
              {payment.paid_date && (
                <p className="text-sm text-muted-foreground mt-2">
                  {new Date(payment.paid_date).toLocaleDateString('fr-CI', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Receipt Info */}
          {receiptNumber && (
            <div className="flex items-center justify-between p-3 rounded-lg border border-[#EFEBE9]">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">N° Reçu:</span>
              </div>
              <span className="font-mono text-sm font-medium">{receiptNumber}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {receiptUrl ? (
              <>
                <Button
                  onClick={downloadReceipt}
                  className="w-full bg-[#F16522] hover:bg-[#F16522]/90"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger le reçu
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(receiptUrl, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir dans un nouvel onglet
                </Button>
              </>
            ) : (
              <Button
                onClick={generateReceipt}
                disabled={isGenerating}
                className="w-full bg-[#F16522] hover:bg-[#F16522]/90"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Générer le reçu
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Info */}
          <p className="text-xs text-center text-muted-foreground">
            Ce reçu est un document officiel généré par Mon Toit. Il peut être utilisé comme
            justificatif de paiement.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
