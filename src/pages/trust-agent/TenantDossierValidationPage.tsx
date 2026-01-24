import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  FileCheck,
  DollarSign,
  Home,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  FileText,
  Briefcase,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  Badge,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { Textarea } from '@/shared/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from '@/hooks/shared/useSafeToast';

// Interfaces
interface TenantDossier {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  national_id: string | null;
  occupation: string | null;
  monthly_income: number | null;
  employment_status: string | null;
  employer_name: string | null;
  employer_contact: string | null;
  current_address: string | null;
  has_pets: boolean | null;
  pets_description: string | null;
  family_size: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  // Documents
  id_document_url: string | null;
  id_document_verified: boolean | null;
  income_proof_url: string | null;
  income_proof_verified: boolean | null;
  employment_proof_url: string | null;
  employment_proof_verified: boolean | null;
  bank_statement_url: string | null;
  bank_statement_verified: boolean | null;
  rental_history_url: string | null;
  rental_history_verified: boolean | null;
  references: Reference[];
  // Status
  verification_status: 'pending' | 'in_review' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
}

interface Reference {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  contact_verified: boolean;
  notes: string | null;
}

interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  status: 'pending' | 'submitted' | 'approved' | 'rejected';
  url: string | null;
  verified: boolean;
  verification_date: string | null;
  notes: string | null;
}

// Configuration
const VERIFICATION_STEPS = [
  { id: 'identity', label: 'Identité', icon: User },
  { id: 'income', label: 'Revenus', icon: DollarSign },
  { id: 'employment', label: 'Emploi', icon: Briefcase },
  { id: 'bank', label: 'Relevé bancaire', icon: CreditCard },
  { id: 'history', label: 'Historique de location', icon: Home },
  { id: 'references', label: 'Références', icon: Users },
];

const STATUS_CONFIG = {
  pending: { label: 'En attente', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700' },
  in_review: { label: 'En cours de vérification', variant: 'default' as const, color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approuvé', variant: 'secondary' as const, color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeté', variant: 'destructive' as const, color: 'bg-red-100 text-red-700' },
};

export default function TenantDossierValidationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dossier, setDossier] = useState<TenantDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Verification state
  const [verifications, setVerifications] = useState<Record<string, boolean>>({});
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({});

  // Dialog states
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  // Document preview state
  const [previewDocument, setPreviewDocument] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (id) {
      loadDossier(id);
    }
  }, [id]);

  const loadDossier = async (dossierId: string) => {
    try {
      setLoading(true);
      // Fetch tenant dossier from tenant_applications table
      const { data, error } = await supabase
        .from('tenant_applications')
        .select('*')
        .eq('id', dossierId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          toast.error('Dossier introuvable');
          navigate('/trust-agent/dossiers/tenants');
          return;
        }
        throw error;
      }

      setDossier(data as TenantDossier);

      // Initialize verification state
      setVerifications({
        identity: !!data.id_document_verified,
        income: !!data.income_proof_verified,
        employment: !!data.employment_proof_verified,
        bank: !!data.bank_statement_verified,
        history: !!data.rental_history_verified,
      });
    } catch (error) {
      console.error('Error loading dossier:', error);
      toast.error('Erreur lors du chargement du dossier');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentRequirements = (): DocumentRequirement[] => {
    if (!dossier) return [];

    return [
      {
        id: 'identity',
        name: "Pièce d'identité",
        description: "Carte nationale d'identité ou passeport en cours de validité",
        required: true,
        status: dossier.id_document_url ? 'submitted' : 'pending',
        url: dossier.id_document_url,
        verified: dossier.id_document_verified || false,
        verification_date: null,
        notes: verificationNotes.identity,
      },
      {
        id: 'income',
        name: 'Justificatif de revenus',
        description: 'Bulletins de salaire ou déclaration d\'impôts des 3 derniers mois',
        required: true,
        status: dossier.income_proof_url ? 'submitted' : 'pending',
        url: dossier.income_proof_url,
        verified: dossier.income_proof_verified || false,
        verification_date: null,
        notes: verificationNotes.income,
      },
      {
        id: 'employment',
        name: 'Justificatif d\'emploi',
        description: 'Contrat de travail ou attestation d\'employeur',
        required: true,
        status: dossier.employment_proof_url ? 'submitted' : 'pending',
        url: dossier.employment_proof_url,
        verified: dossier.employment_proof_verified || false,
        verification_date: null,
        notes: verificationNotes.employment,
      },
      {
        id: 'bank',
        name: 'Relevés bancaires',
        description: 'Relevés des 3 derniers mois',
        required: true,
        status: dossier.bank_statement_url ? 'submitted' : 'pending',
        url: dossier.bank_statement_url,
        verified: dossier.bank_statement_verified || false,
        verification_date: null,
        notes: verificationNotes.bank,
      },
      {
        id: 'history',
        name: 'Historique de location',
        description: 'Attestation du propriétaire précédent ou quittance de loyer',
        required: false,
        status: dossier.rental_history_url ? 'submitted' : 'pending',
        url: dossier.rental_history_url,
        verified: dossier.rental_history_verified || false,
        verification_date: null,
        notes: verificationNotes.history,
      },
    ];
  };

  const handleDocumentVerification = async (docId: string, verified: boolean, notes?: string) => {
    if (!dossier) return;

    try {
      const updateData: Record<string, unknown> = {
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      };

      // Map doc IDs to database columns
      const docMapping: Record<string, { column: string; verifiedColumn: string }> = {
        identity: { column: 'id_document_url', verifiedColumn: 'id_document_verified' },
        income: { column: 'income_proof_url', verifiedColumn: 'income_proof_verified' },
        employment: { column: 'employment_proof_url', verifiedColumn: 'employment_proof_verified' },
        bank: { column: 'bank_statement_url', verifiedColumn: 'bank_statement_verified' },
        history: { column: 'rental_history_url', verifiedColumn: 'rental_history_verified' },
      };

      if (docMapping[docId]) {
        updateData[docMapping[docId].verifiedColumn] = verified;
      }

      const { error } = await supabase
        .from('tenant_applications')
        .update(updateData)
        .eq('id', dossier.id);

      if (error) throw error;

      setVerifications((prev) => ({ ...prev, [docId]: verified }));
      toast.success(verified ? 'Document vérifié' : 'Vérification annulée');
      loadDossier(dossier.id);
    } catch (error) {
      console.error('Error verifying document:', error);
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleApprove = async () => {
    if (!dossier) return;

    try {
      const { error } = await supabase
        .from('tenant_applications')
        .update({
          verification_status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', dossier.id);

      if (error) throw error;

      toast.success('Dossier approuvé avec succès');
      setShowApprovalDialog(false);
      loadDossier(dossier.id);
    } catch (error) {
      console.error('Error approving dossier:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleReject = async () => {
    if (!dossier || !rejectionReason.trim()) return;

    try {
      const { error } = await supabase
        .from('tenant_applications')
        .update({
          verification_status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', dossier.id);

      if (error) throw error;

      toast.success('Dossier rejeté');
      setShowRejectDialog(false);
      setRejectionReason('');
      loadDossier(dossier.id);
    } catch (error) {
      console.error('Error rejecting dossier:', error);
      toast.error('Erreur lors du rejet');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b sticky top-0 z-10">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="small" className="p-2 h-auto w-auto" onClick={() => navigate('/trust-agent/dossiers/tenants')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Dossier introuvable</h1>
            </div>
          </div>
        </header>
      </div>
    );
  }

  const documentRequirements = getDocumentRequirements();
  const statusConfig = STATUS_CONFIG[dossier.verification_status];
  const completedVerifications = Object.values(verifications).filter((v) => v).length;
  const totalVerifications = VERIFICATION_STEPS.length;
  const progress = Math.round((completedVerifications / totalVerifications) * 100);
  const canApprove = progress === 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="small" className="p-2 h-auto w-auto" onClick={() => navigate('/trust-agent/dossiers/tenants')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold">Validation Dossier Locataire</h1>
                  <Badge variant={statusConfig.variant} className={statusConfig.color}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {dossier.full_name} • {progress}% complété
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dossier.verification_status === 'pending' || dossier.verification_status === 'in_review' ? (
                <>
                  <Button variant="outline" onClick={() => setShowRejectDialog(true)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeter
                  </Button>
                  <Button onClick={() => canApprove ? setShowApprovalDialog(true) : null} disabled={!canApprove}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approuver
                  </Button>
                </>
              ) : dossier.verification_status === 'approved' ? (
                <Badge variant="default" className="bg-green-100 text-green-700">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approuvé
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-4 w-4 mr-1" />
                  Rejeté
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-muted h-1">
        <div className="bg-primary h-1 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
            <TabsTrigger value="overview">
              <FileText className="h-4 w-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileCheck className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="identity">
              <Badge className="h-4 w-4 mr-2" />
              Identité
            </TabsTrigger>
            <TabsTrigger value="financial">
              <DollarSign className="h-4 w-4 mr-2" />
              Financier
            </TabsTrigger>
            <TabsTrigger value="references">
              <Users className="h-4 w-4 mr-2" />
              Références
            </TabsTrigger>
            <TabsTrigger value="history">
              <Home className="h-4 w-4 mr-2" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="notes">
              <FileText className="h-4 w-4 mr-2" />
              Notes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Applicant Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations du demandeur
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{dossier.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Téléphone</p>
                        <p className="font-medium">{dossier.phone || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">CNI / Passeport</p>
                        <p className="font-medium">{dossier.national_id || 'Non renseigné'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Statut d'emploi</p>
                        <p className="font-medium">{dossier.employment_status || 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Revenu mensuel</p>
                        <p className="font-medium">{dossier.monthly_income ? `${dossier.monthly_income.toLocaleString()} FCFA` : 'Non renseigné'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Adresse actuelle</p>
                        <p className="font-medium">{dossier.current_address || 'Non renseigné'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-6 pt-6 border-t grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Taille du foyer</p>
                    <p className="font-medium">{dossier.family_size || 0} personne(s)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Animaux</p>
                    <p className="font-medium">
                      {dossier.has_pets ? (dossier.pets_description || 'Oui') : 'Non'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date de naissance</p>
                    <p className="font-medium">
                      {dossier.date_of_birth
                        ? new Date(dossier.date_of_birth).toLocaleDateString('fr-FR')
                        : 'Non renseignée'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Progression de la vérification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {VERIFICATION_STEPS.map((step) => {
                    const StepIcon = step.icon;
                    const isVerified = verifications[step.id];
                    const doc = documentRequirements.find((d) => d.id === step.id);

                    return (
                      <div
                        key={step.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isVerified ? 'bg-green-100' : 'bg-muted'}`}>
                            <StepIcon className={`h-4 w-4 ${isVerified ? 'text-green-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{step.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc?.status === 'submitted' ? 'Document soumis' : 'En attente'}
                            </p>
                          </div>
                        </div>

                        {isVerified ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Vérifié
                          </Badge>
                        ) : (
                          <Button
                            size="small"
                            variant={doc?.status === 'submitted' ? 'outline' : 'ghost'}
                            disabled={doc?.status !== 'submitted'}
                            onClick={() => setActiveTab(step.id)}
                          >
                            Vérifier
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {dossier.emergency_contact_name && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact en cas d'urgence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nom</p>
                      <p className="font-medium">{dossier.emergency_contact_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="font-medium">{dossier.emergency_contact_phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Relation</p>
                      <p className="font-medium">{dossier.emergency_contact_relationship}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            {documentRequirements.map((doc) => {
              const isVerified = verifications[doc.id];

              return (
                <Card key={doc.id} className={isVerified ? 'border-green-200' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${isVerified ? 'bg-green-100' : 'bg-muted'}`}>
                          <FileCheck className={`h-6 w-6 ${isVerified ? 'text-green-600' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{doc.name}</h3>
                            {doc.required && <Badge variant="outline" className="text-xs">Requis</Badge>}
                            {isVerified && (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Vérifié
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>

                          {doc.status === 'submitted' && (
                            <div className="flex items-center gap-2 mt-3">
                              {doc.url ? (
                                <>
                                  <Button
                                    size="small"
                                    variant="outline"
                                    onClick={() => setPreviewDocument({ url: doc.url!, title: doc.name })}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Voir
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outline"
                                    onClick={() => window.open(doc.url!, '_blank')}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Télécharger
                                  </Button>
                                </>
                              ) : (
                                <span className="text-sm text-muted-foreground">Document non disponible</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {doc.status === 'submitted' && !isVerified && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="small"
                            onClick={() => {
                              handleDocumentVerification(doc.id, true);
                              setVerifications((prev) => ({ ...prev, [doc.id]: true }));
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Valider
                          </Button>
                        </div>
                      )}

                      {isVerified && (
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => {
                            handleDocumentVerification(doc.id, false);
                            setVerifications((prev) => ({ ...prev, [doc.id]: false }));
                          }}
                        >
                          Annuler
                        </Button>
                      )}
                    </div>

                    {doc.notes && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Notes: {doc.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Other tabs would have similar content... */}
          <TabsContent value="identity">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Contenu de l'onglet Identité à implémenter</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Contenu de l'onglet Financier à implémenter</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="references">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Contenu de l'onglet Références à implémenter</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Contenu de l'onglet Historique à implémenter</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>Notes de vérification</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Ajoutez vos notes et observations sur ce dossier..."
                  rows={6}
                  defaultValue={dossier.notes || ''}
                />
                <Button className="mt-4" onClick={() => toast.success('Notes sauvegardées')}>
                  Sauvegarder les notes
                </Button>
              </CardContent>
            </Card>

            {dossier.rejection_reason && (
              <Card className="mt-4 border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-700">Motif de rejet</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-600">{dossier.rejection_reason}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver ce dossier</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Confirmer l'approbation</p>
                <p className="text-sm text-green-700 mt-1">
                  Vous êtes sur le point d'approuver le dossier de {dossier.full_name}. Cette action permettra au
                  demandeur de postuler aux locations.
                </p>
              </div>
            </div>

            {progress < 100 && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600 mb-2" />
                <p className="text-sm text-amber-700">
                  Attention: Tous les documents ne sont pas vérifiés. Progression: {progress}%
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approuver le dossier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter ce dossier</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Veuillez indiquer le motif du rejet du dossier de {dossier.full_name}
            </p>
            <Textarea
              placeholder="Motif du rejet..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeter le dossier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      {previewDocument && (
        <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewDocument.title}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <img src={previewDocument.url} alt={previewDocument.title} className="w-full rounded-lg" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewDocument(null)}>
                Fermer
              </Button>
              <Button onClick={() => window.open(previewDocument.url, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
