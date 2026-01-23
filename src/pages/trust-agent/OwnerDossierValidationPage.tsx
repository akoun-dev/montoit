import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  FileCheck,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  MapPin,
  Phone,
  Mail,
  Home,
  FileText,
  Camera,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from '@/hooks/shared/useSafeToast';

// Interfaces for Owner Dossier
interface OwnerDossier {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  // Property ownership verification
  properties_count: number;
  properties_verified: boolean;
  // Identity verification
  id_document_url: string | null;
  id_document_verified: boolean;
  // Tax compliance
  tax_compliance_url: string | null;
  tax_compliance_verified: boolean;
  // Property documentation
  property_documents_verified: boolean;
  // Status
  verification_status: 'pending' | 'in_review' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700' },
  in_review: { label: 'En cours de vérification', variant: 'default' as const, color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approuvé', variant: 'secondary' as const, color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeté', variant: 'destructive' as const, color: 'bg-red-100 text-red-700' },
};

const VERIFICATION_STEPS = [
  { id: 'identity', label: 'Identité', icon: Shield },
  { id: 'ownership', label: 'Propriété', icon: Building },
  { id: 'tax', label: 'Fiscalité', icon: FileText },
  { id: 'documents', label: 'Documents', icon: FileCheck },
];

export default function OwnerDossierValidationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dossier, setDossier] = useState<OwnerDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (id) {
      loadDossier(id);
    }
  }, [id]);

  const loadDossier = async (dossierId: string) => {
    try {
      setLoading(true);

      // For demo purposes, we'll use a mock dossier
      // In a real implementation, this would fetch from the database
      const mockDossier: OwnerDossier = {
        id: dossierId,
        user_id: user?.id || '',
        full_name: 'Jean Dupont',
        email: 'jean.dupont@example.com',
        phone: '+225 01 02 03 04 05',
        properties_count: 3,
        properties_verified: false,
        id_document_url: null,
        id_document_verified: false,
        tax_compliance_url: null,
        tax_compliance_verified: false,
        property_documents_verified: false,
        verification_status: 'pending',
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        rejection_reason: null,
        notes: null,
      };

      setDossier(mockDossier);
    } catch (error) {
      console.error('Error loading dossier:', error);
      toast.error('Erreur lors du chargement du dossier');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!dossier) return;

    try {
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
              <Button variant="ghost" size="small" className="p-2 h-auto w-auto" onClick={() => navigate('/trust-agent/dossiers/owners')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Dossier introuvable</h1>
            </div>
          </div>
        </header>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[dossier.verification_status];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="small" className="p-2 h-auto w-auto" onClick={() => navigate('/trust-agent/dossiers')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold">Validation Dossier Propriétaire</h1>
                  <Badge variant={statusConfig.variant} className={statusConfig.color}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{dossier.full_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dossier.verification_status === 'pending' || dossier.verification_status === 'in_review' ? (
                <>
                  <Button variant="outline" onClick={() => setShowRejectDialog(true)} className="text-red-600 border-red-200 hover:bg-red-50">
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeter
                  </Button>
                  <Button onClick={() => setShowApprovalDialog(true)}>
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

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Owner Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Informations du propriétaire
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
                        <p className="font-medium">{dossier.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Propriétés</p>
                        <p className="font-medium">{dossier.properties_count} bien(s)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Éléments de vérification
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {VERIFICATION_STEPS.map((step) => {
                    const StepIcon = step.icon;
                    const isVerified =
                      step.id === 'identity' && dossier.id_document_verified ||
                      step.id === 'ownership' && dossier.properties_verified ||
                      step.id === 'tax' && dossier.tax_compliance_verified ||
                      step.id === 'documents' && dossier.property_documents_verified;

                    return (
                      <div key={step.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${isVerified ? 'bg-green-100' : 'bg-muted'}`}>
                            <StepIcon className={`h-5 w-5 ${isVerified ? 'text-green-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{step.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {isVerified ? 'Vérifié' : 'En attente de vérification'}
                            </p>
                          </div>
                        </div>
                        {isVerified ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Vérifié
                          </Badge>
                        ) : (
                          <Button size="small" variant="outline">
                            Vérifier
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Ajoutez vos notes..."
                  rows={6}
                />
                <Button className="mt-4" onClick={() => toast.success('Notes sauvegardées')}>
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary"></div>
                      <div className="w-0.5 flex-1 bg-muted"></div>
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium">Dossier soumis</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(dossier.submitted_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {dossier.reviewed_at && (
                    <div className="flex gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <p className="text-sm font-medium">Dossier examiné</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(dossier.reviewed_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
                  propriétaire de publier des annonces.
                </p>
              </div>
            </div>
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
    </div>
  );
}
