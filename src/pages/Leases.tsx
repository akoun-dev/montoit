import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { logger } from "@/services/logger";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { DynamicBreadcrumb } from "@/components/navigation/DynamicBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FileText, Calendar, MapPin, DollarSign, CheckCircle, Clock, Shield } from "lucide-react";
import { ElectronicSignature } from "@/components/leases/ElectronicSignature";
import { useToast } from "@/hooks/use-toast";
import CertificationRequest from "@/components/leases/CertificationRequest";
import { PreCertificationChecklist } from "@/components/leases/PreCertificationChecklist";
import ANSUTCertifiedBadge from "@/components/ui/ansut-certified-badge";
import { Download, FileText as FileTextIcon, Loader2, Star, Folder } from "lucide-react";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Lease {
  id: string;
  property_id: string;
  monthly_rent: number;
  deposit_amount: number;
  charges_amount: number;
  status: string;
  lease_type: string;
  start_date: string;
  end_date: string;
  tenant_signed_at: string | null;
  landlord_signed_at: string | null;
  ansut_certified_at: string | null;
  certification_status: 'not_requested' | 'pending' | 'certified' | 'rejected';
  certification_requested_at: string | null;
  document_url: string | null;
  cryptoneo_operation_id: string | null;
  signed_document_url: string | null;
  is_electronically_signed: boolean;
  landlord_cryptoneo_signature_at: string | null;
  tenant_cryptoneo_signature_at: string | null;
  properties: {
    title: string;
    address: string;
    city: string;
    main_image: string;
  };
  tenant_id: string;
  landlord_id: string;
  tenant?: {
    full_name: string;
  } | null;
  landlord?: {
    full_name: string;
  } | null;
}

export default function Leases() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchLeases();
    }
  }, [user]);

  const fetchLeases = async () => {
    try {
      // Fetch leases with profiles data
      const { data, error } = await supabase
        .from("leases")
        .select(`
          *,
          properties (title, address, city, main_image)
        `)
        .or(`landlord_id.eq.${user?.id},tenant_id.eq.${user?.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles for each lease
      const leasesWithProfiles = await Promise.all(
        (data || []).map(async (lease) => {
          const { data: tenantData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', lease.tenant_id)
            .single();
          
          const { data: landlordData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', lease.landlord_id)
            .single();
          
          return {
            ...lease,
            tenant: tenantData,
            landlord: landlordData,
          };
        })
      );

      setLeases(leasesWithProfiles as unknown as Lease[]);
    } catch (error) {
      logger.error('Error fetching leases', { error, userId: user?.id });
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors du chargement",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (leaseId: string, userType: "landlord" | "tenant") => {
    try {
      const updateField = userType === "landlord" ? "landlord_signed_at" : "tenant_signed_at";
      
      const { error } = await supabase
        .from("leases")
        .update({ [updateField]: new Date().toISOString() })
        .eq("id", leaseId);

      if (error) throw error;

      toast({
        title: "Signature enregistrée",
        description: "Votre signature électronique a été enregistrée avec succès",
      });

      fetchLeases();
    } catch (error) {
      logger.error("Error signing lease", { error, leaseId });
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la signature",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePdf = async (leaseId: string) => {
    try {
      setGeneratingPdf(leaseId);
      
      const { data, error } = await supabase.functions.invoke('generate-lease-pdf', {
        body: { leaseId }
      });

      if (error) throw error;

      // Ouvrir le PDF dans un nouvel onglet
      if (data?.documentUrl) {
        window.open(data.documentUrl, '_blank');
        toast({
          title: "Contrat généré",
          description: "Le contrat PDF a été généré avec succès",
        });
        fetchLeases(); // Rafraîchir pour obtenir l'URL mise à jour
      }
    } catch (error) {
      logger.error('Error generating PDF', { error, leaseId });
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de générer le PDF",
        variant: "destructive",
      });
    } finally {
      setGeneratingPdf(null);
    }
  };

  const getStatusBadge = (lease: Lease) => {
    // Use the new certification badge component
    return (
                      <ANSUTCertifiedBadge 
                        status={lease.certification_status}
                        certifiedAt={lease.ansut_certified_at}
                      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <p>Chargement...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 pt-24">
        <DynamicBreadcrumb />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mes Baux</h1>
          <p className="text-muted-foreground">
            Gérez vos contrats de location et effectuez les paiements
          </p>
        </div>

        <div className="grid gap-6">
          {leases.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Aucun bail trouvé</p>
              </CardContent>
            </Card>
          ) : (
            leases.map((lease) => (
              <Card key={lease.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{lease.properties.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-4 w-4" />
                        {lease.properties.address}, {lease.properties.city}
                      </div>
                      <div className="flex gap-2 mb-4">
                        {getStatusBadge(lease)}
                        <Badge variant="outline">{lease.lease_type}</Badge>
                      </div>
                    </div>
                    {lease.properties.main_image && (
                      <img
                        src={lease.properties.main_image}
                        alt={lease.properties.title}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                  </div>
                </CardHeader>
                
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 px-6">
                    <TabsTrigger value="details">Détails</TabsTrigger>
                    <TabsTrigger value="documents">
                      <Folder className="h-4 w-4 mr-2" />
                      Documents
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="details">
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {lease.monthly_rent.toLocaleString()} FCFA/mois
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Dépôt: {lease.deposit_amount?.toLocaleString() || 0} FCFA
                      </div>
                      {lease.charges_amount && (
                        <div className="text-sm text-muted-foreground">
                          Charges: {lease.charges_amount.toLocaleString()} FCFA
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Du {new Date(lease.start_date).toLocaleDateString()} au{" "}
                          {new Date(lease.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm">
                      {lease.landlord_signed_at ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <span>
                        Signature propriétaire:{" "}
                        {lease.landlord_signed_at
                          ? new Date(lease.landlord_signed_at).toLocaleDateString()
                          : "En attente"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {lease.tenant_signed_at ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <span>
                        Signature locataire:{" "}
                        {lease.tenant_signed_at
                          ? new Date(lease.tenant_signed_at).toLocaleDateString()
                          : "En attente"}
                      </span>
                    </div>
                    {lease.ansut_certified_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>
                          Certifié ANSUT le{" "}
                          {new Date(lease.ansut_certified_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {lease.is_electronically_signed && (
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          Signé électroniquement via CryptoNeo
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Electronic Signature Component */}
                  {((profile?.user_type === "proprietaire" && !lease.landlord_signed_at) ||
                    (profile?.user_type === "locataire" && !lease.tenant_signed_at)) && (
                    <div className="mb-4">
                      <ElectronicSignature
                        lease={lease}
                        userType={profile?.user_type === "proprietaire" ? "proprietaire" : "locataire"}
                        onSignatureComplete={fetchLeases}
                      />
                    </div>
                  )}
                    
                  <div className="flex flex-wrap gap-2">
                    {/* PDF Download buttons - shown after both parties signed */}
                    {lease.tenant_signed_at && lease.landlord_signed_at && (
                      <>
                        {/* Signed document (priority if available) */}
                        {lease.signed_document_url ? (
                          <Button
                            onClick={() => window.open(lease.signed_document_url!, '_blank')}
                            className="gap-2"
                          >
                            <Shield className="h-4 w-4" />
                            Contrat signé électroniquement
                          </Button>
                        ) : lease.document_url ? (
                          <Button
                            variant="outline"
                            onClick={() => window.open(lease.document_url!, '_blank')}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger le contrat
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleGeneratePdf(lease.id)}
                            disabled={generatingPdf === lease.id}
                          >
                            {generatingPdf === lease.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FileTextIcon className="h-4 w-4 mr-2" />
                            )}
                            {generatingPdf === lease.id ? 'Génération...' : 'Générer le contrat'}
                          </Button>
                        )}
                      </>
                    )}

                    {/* Pre-certification checklist */}
                    {lease.tenant_signed_at && lease.landlord_signed_at && lease.certification_status === 'not_requested' && (
                      <div className="w-full mt-4">
                        <PreCertificationChecklist leaseId={lease.id} />
                      </div>
                    )}

                    {/* Certification request button */}
                    {lease.tenant_signed_at && lease.landlord_signed_at && (
                      <CertificationRequest
                        leaseId={lease.id}
                        certificationStatus={lease.certification_status}
                        onRequestSubmitted={fetchLeases}
                      />
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/payments?lease=${lease.id}`)}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Paiements
                    </Button>

                    {/* Review button for completed leases */}
                    {lease.status === 'signed' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Star className="h-4 w-4 mr-2" />
                            Laisser un avis
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Laisser un avis</DialogTitle>
                            <DialogDescription>
                              Partagez votre expérience pour cette location
                            </DialogDescription>
                          </DialogHeader>
                          <ReviewForm
                            revieweeId={
                              profile?.user_type === 'locataire' 
                                ? lease.landlord_id 
                                : lease.tenant_id
                            }
                            revieweeName={
                              profile?.user_type === 'locataire'
                                ? lease.landlord?.full_name || 'Propriétaire'
                                : lease.tenant?.full_name || 'Locataire'
                            }
                            leaseId={lease.id}
                            reviewType={
                              profile?.user_type === 'locataire'
                                ? 'tenant_to_landlord'
                                : 'landlord_to_tenant'
                            }
                            onSuccess={fetchLeases}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="documents">
                <CardContent>
                  <DocumentManager
                    leaseId={lease.id}
                    landlordId={lease.landlord_id}
                    tenantId={lease.tenant_id}
                  />
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
            ))
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
