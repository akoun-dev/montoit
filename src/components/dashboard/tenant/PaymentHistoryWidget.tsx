import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, ArrowRight, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import { logger } from '@/services/logger';

interface PaymentHistoryWidgetProps {
  data?: {
    total_paid: number;
    pending: number;
    count: number;
    recent: Array<{
      id: string;
      amount: number;
      payment_type: string;
      status: string;
      created_at: string;
      completed_at: string | null;
    }>;
  };
}

export const PaymentHistoryWidget = ({ data }: PaymentHistoryWidgetProps) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadReceipt = async (paymentId: string) => {
    setDownloadingId(paymentId);
    try {
      const { data: pdfData, error } = await supabase.functions.invoke('generate-receipt', {
        body: { payment_id: paymentId }
      });

      if (error) throw error;

      // Créer un blob et télécharger
      const blob = new Blob([Buffer.from(pdfData.pdf, 'base64')], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recu-${paymentId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Reçu téléchargé',
        description: 'Le reçu a été téléchargé avec succès',
      });
    } catch (error) {
      logger.error('Failed to download receipt', { paymentId });
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le reçu',
        variant: 'destructive',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'completed' 
      ? <Badge variant="default" className="bg-green-600 text-xs">Payé</Badge>
      : <Badge variant="secondary" className="text-xs">En attente</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Wallet className="h-5 w-5 text-primary" />
          Mes paiements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
              <div className="text-xl font-bold text-green-600">
                {(data?.total_paid || 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Total payé (FCFA)</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3">
              <div className="text-xl font-bold text-yellow-600">
                {(data?.pending || 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">En attente (FCFA)</div>
            </div>
          </div>

          {/* Recent payments */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Paiements récents</h4>
            {data?.recent && data.recent.length > 0 ? (
              <div className="space-y-2">
                {data.recent.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between border rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{payment.amount.toLocaleString()} FCFA</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {payment.payment_type.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(payment.status)}
                      {payment.status === 'completed' && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDownloadReceipt(payment.id)}
                          disabled={downloadingId === payment.id}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun paiement
              </p>
            )}
          </div>

          <Button asChild variant="outline" className="w-full">
            <Link to="/payments">
              Voir tous <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
