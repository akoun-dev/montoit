import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { logger } from "@/services/logger";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DynamicBreadcrumb } from "@/components/navigation/DynamicBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { Smartphone, CreditCard, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  transaction_id: string | null;
}

export default function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const leaseId = searchParams.get("lease");

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("loyer");
  const [paymentMethod, setPaymentMethod] = useState("orange_money");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("payer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      logger.error('Error fetching payments', { error, userId: user?.id });
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : 'Erreur lors de la récupération des paiements',
        variant: "destructive",
      });
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Créer le paiement
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          payer_id: user?.id,
          receiver_id: user?.id, // Simulé
          amount: parseFloat(amount),
          payment_type: paymentType,
          payment_method: paymentMethod,
          status: "pending",
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Appeler l'edge function pour le paiement mobile money
      const { data, error } = await supabase.functions.invoke("mobile-money-payment", {
        body: {
          amount: parseFloat(amount),
          phoneNumber,
          provider: paymentMethod,
          paymentId: payment.id,
          paymentType,
        },
      });

      if (error) throw error;

      if (data.success) {
        // Mettre à jour le paiement
        await supabase
          .from("payments")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            transaction_id: data.transactionRef,
          })
          .eq("id", payment.id);

        toast({
          title: "Paiement réussi",
          description: data.message,
        });

        setAmount("");
        setPhoneNumber("");
        fetchPayments();
      } else {
        await supabase
          .from("payments")
          .update({ status: "failed" })
          .eq("id", payment.id);

        toast({
          title: "Paiement échoué",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error('Error processing payment', { error, userId: user?.id, amount, paymentType });
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : 'Erreur lors du traitement du paiement',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complété
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Échoué
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProviderIcon = (method: string) => {
    switch (method) {
      case "orange_money":
      case "mtn_money":
      case "wave":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24">
        <DynamicBreadcrumb />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Paiements</h1>
          <p className="text-muted-foreground">
            Effectuez vos paiements de loyer et consultez l'historique
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Nouveau paiement</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <Label htmlFor="amount">Montant (FCFA)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="paymentType">Type de paiement</Label>
                  <Select value={paymentType} onValueChange={setPaymentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loyer">Loyer mensuel</SelectItem>
                      <SelectItem value="depot">Dépôt de garantie</SelectItem>
                      <SelectItem value="charges">Charges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Mode de paiement</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="orange_money">
                        🟠 Orange Money
                      </SelectItem>
                      <SelectItem value="mtn_money">
                        🟡 MTN Money
                      </SelectItem>
                      <SelectItem value="moov_money">
                        🔵 Moov Money
                      </SelectItem>
                      <SelectItem value="wave">
                        💙 Wave
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={
                      paymentMethod === "orange_money"
                        ? "07XXXXXXXX ou 227XXXXXXXX"
                        : paymentMethod === "mtn_money"
                        ? "05XXXXXXXX ou 054XXXXXXXX"
                        : paymentMethod === "moov_money"
                        ? "01XXXXXXXX"
                        : "XXXXXXXX"
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {paymentMethod === "orange_money" && "Format: 07 ou 227 + 8 chiffres"}
                    {paymentMethod === "mtn_money" && "Format: 05, 054, 055 ou 056 + 8 chiffres"}
                    {paymentMethod === "moov_money" && "Format: 01 + 8 chiffres"}
                    {paymentMethod === "wave" && "Format: 8 à 10 chiffres"}
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Traitement en cours..." : "Effectuer le paiement"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-2xl font-bold mb-4">Historique des paiements</h2>
            <div className="space-y-4">
              {payments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Aucun paiement trouvé</p>
                  </CardContent>
                </Card>
              ) : (
                payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getProviderIcon(payment.payment_method)}
                          <span className="font-semibold">
                            {payment.amount.toLocaleString()} FCFA
                          </span>
                        </div>
                        {getStatusBadge(payment.status)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="capitalize">{payment.payment_type}</div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(payment.created_at).toLocaleDateString()}
                        </div>
                        {payment.transaction_id && (
                          <div className="text-xs">Réf: {payment.transaction_id}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
