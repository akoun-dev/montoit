import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, FileText, Download, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TenantScoreBadge } from '@/components/ui/tenant-score-badge';
import { TenantScoreBreakdown } from '@/components/application/TenantScoreBreakdown';
import { logger } from '@/services/logger';
import type { Application } from '@/types';
import { useUserPhone } from '@/hooks/useUserPhone';


interface ScoringData {
  score: number;
  recommendation: 'approved' | 'conditional' | 'rejected';
  factors: Record<string, unknown>;
  breakdown?: {
    identity_verification: number;
    face_verification: number;
    payment_history: number;
    documents: number;
    profile_completeness: number;
  };
}

interface ApplicationDetailProps {
  application: Application & {
    properties: {
      title: string;
      monthly_rent: number;
      owner_id: string;
      deposit_amount: number | null;
      charges_amount: number | null;
    };
    profiles: {
      full_name: string;
      phone: string | null;
      oneci_verified: boolean;
      cnam_verified: boolean;
    };
  };
  onClose: () => void;
  onStatusUpdate: (applicationId: string, status: string) => void;
  isOwner: boolean;
}

const ApplicationDetail = ({ application, onClose, onStatusUpdate, isOwner }: ApplicationDetailProps) => {
  const [scoring, setScoring] = useState<ScoringData | null>(null);
  const [loadingScore, setLoadingScore] = useState(false);
  const { phone } = useUserPhone(application.applicant_id);

  useEffect(() => {
    if (isOwner && application.status === 'pending') {
      calculateScore();
    }
  }, [application.id]);

  const calculateScore = async () => {
    setLoadingScore(true);
    try {
      const { data, error } = await supabase.functions.invoke('tenant-scoring', {
        body: {
          applicantId: application.applicant_id,
          propertyId: application.property_id,
          monthlyRent: application.properties.monthly_rent,
        },
      });

      if (error) throw error;
      setScoring(data);

      // Mettre à jour le score dans la DB
      await supabase
        .from('rental_applications')
        .update({ application_score: data.score })
        .eq('id', application.id);

    } catch (error) {
      logger.error('Error calculating tenant score', { error, applicationId: application.id });
      toast({
        title: 'Erreur',
        description: 'Impossible de calculer le score',
        variant: 'destructive',
      });
    } finally {
      setLoadingScore(false);
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'approved': 'default',
      'conditional': 'secondary',
      'rejected': 'destructive',
    };

    const labels: Record<string, string> = {
      'approved': 'Recommandé',
      'conditional': 'Conditionnel',
      'rejected': 'Non recommandé',
    };

    return <Badge variant={variants[recommendation]}>{labels[recommendation]}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <Button
          variant="ghost"
          onClick={onClose}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="grid gap-6">
          {/* En-tête */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {application.properties.title}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    Candidature de {application.profiles.full_name}
                  </CardDescription>
                </div>
                <Badge variant={application.status === 'approved' ? 'default' : 'secondary'}>
                  {application.status === 'pending' ? 'En attente' : 
                   application.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                  <p className="font-medium">{application.properties.monthly_rent.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date de candidature</p>
                  <p className="font-medium">
                    {new Date(application.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{phone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vérifications */}
          <Card>
            <CardHeader>
              <CardTitle>Vérifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {application.profiles.oneci_verified ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span>Identité ONECI</span>
                </div>
                <Badge variant={application.profiles.oneci_verified ? 'default' : 'secondary'}>
                  {application.profiles.oneci_verified ? 'Vérifiée' : 'Non vérifiée'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {application.profiles.cnam_verified ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span>Employeur CNAM</span>
                </div>
                <Badge variant={application.profiles.cnam_verified ? 'default' : 'secondary'}>
                  {application.profiles.cnam_verified ? 'Vérifiée' : 'Non vérifiée'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Score et recommandation */}
          {isOwner && (scoring || application.application_score > 0) && (
            <TenantScoreBreakdown 
              score={scoring?.score || application.application_score}
              breakdown={scoring?.breakdown}
              recommendation={scoring?.recommendation}
            />
          )}

          {/* Lettre de motivation */}
          {application.cover_letter && (
            <Card>
              <CardHeader>
                <CardTitle>Lettre de motivation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{application.cover_letter}</p>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {application.documents && application.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Documents justificatifs ({application.documents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {application.documents.map((doc: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.type}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {isOwner && application.status === 'pending' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Button
                    variant="destructive"
                    onClick={() => onStatusUpdate(application.id, 'rejected')}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeter
                  </Button>
                  <Button
                    onClick={() => onStatusUpdate(application.id, 'approved')}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approuver
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isOwner && application.status === 'approved' && (
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={async () => {
                    try {
                      const startDate = new Date();
                      const endDate = new Date();
                      endDate.setFullYear(endDate.getFullYear() + 1);

                      const { error } = await supabase.from("leases").insert({
                        property_id: application.property_id,
                        landlord_id: application.properties.owner_id,
                        tenant_id: application.applicant_id,
                        monthly_rent: application.properties.monthly_rent,
                        deposit_amount: application.properties.deposit_amount,
                        charges_amount: application.properties.charges_amount,
                        lease_type: "location_meublee",
                        start_date: startDate.toISOString().split("T")[0],
                        end_date: endDate.toISOString().split("T")[0],
                        status: "draft",
                      });

                      if (error) throw error;

                      toast({
                        title: "Bail créé",
                        description: "Le bail a été créé avec succès. Rendez-vous dans 'Baux' pour le signer.",
                      });
                    } catch (error: any) {
                      toast({
                        title: "Erreur",
                        description: error.message,
                        variant: "destructive",
                      });
                    }
                  }}
                  className="w-full"
                >
                  Créer le bail
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ApplicationDetail;
