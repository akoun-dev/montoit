import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Shield,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Users,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from '@/hooks/shared/useSafeToast';

// Interfaces for Agency Dossier
interface AgencyDossier {
  id: string;
  user_id: string;
  agency_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  license_number: string | null;
  license_verified: boolean;
  agents_count: number;
  agents_verified: boolean;
  portfolio_count: number;
  portfolio_verified: boolean;
  insurance_verified: boolean;
  verification_status: 'pending' | 'in_review' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700' },
  in_review: { label: 'En cours', variant: 'default' as const, color: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approuvé', variant: 'secondary' as const, color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeté', variant: 'destructive' as const, color: 'bg-red-100 text-red-700' },
};

const VERIFICATION_STEPS = [
  { id: 'license', label: 'License commerciale', icon: FileText },
  { id: 'agents', label: 'Agents certifiés', icon: Users },
  { id: 'portfolio', label: 'Portefeuille', icon: Building2 },
  { id: 'insurance', label: 'Assurance', icon: Shield },
];

export default function AgencyDossierValidationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dossier, setDossier] = useState<AgencyDossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  useEffect(() => {
    if (id) {
      loadDossier(id);
    }
  }, [id]);

  const loadDossier = async (dossierId: string) => {
    try {
      setLoading(true);

      // Mock dossier for demo
      const mockDossier: AgencyDossier = {
        id: dossierId,
        user_id: user?.id || '',
        agency_name: 'Agence Immobilière ABC',
        contact_person: 'Marie Kouassi',
        email: 'contact@agenceabc.ci',
        phone: '+225 01 02 03 04 05',
        address: '123 Rue du Commerce',
        city: 'Abidjan, Cocody',
        license_number: 'AG-2024-001234',
        license_verified: false,
        agents_count: 5,
        agents_verified: false,
        portfolio_count: 12,
        portfolio_verified: false,
        insurance_verified: false,
        verification_status: 'pending',
        submitted_at: new Date().toISOString(),
        reviewed_at: null,
        rejection_reason: null,
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
    toast.success('Dossier approuvé avec succès');
    setShowApprovalDialog(false);
  };

  const handleReject = async () => {
    if (!dossier || !rejectionReason.trim()) return;
    toast.success('Dossier rejeté');
    setShowRejectDialog(false);
    setRejectionReason('');
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
          <div className="w-full px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="small" className="p-2" onClick={() => navigate('/trust-agent/dossiers')}>
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
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="small" className="p-2 h-auto" onClick={() => navigate('/trust-agent/dossiers')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold">Validation Dossier Agence</h1>
                  <Badge variant={statusConfig.variant} className={statusConfig.color}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{dossier.agency_name}</p>
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
          <div className="lg:col-span-2 space-y-6">
            {/* Agency Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Informations de l'agence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Contact</p>
                        <p className="font-medium">{dossier.contact_person}</p>
                      </div>
                    </div>
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
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Adresse</p>
                        <p className="font-medium">{dossier.address}</p>
                        <p className="text-xs text-muted-foreground">{dossier.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">License</p>
                        <p className="font-medium">{dossier.license_number || 'Non renseigné'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Agents</p>
                    <p className="font-medium">{dossier.agents_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Portefeuille</p>
                    <p className="font-medium">{dossier.portfolio_count} biens</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">License</p>
                    <p className="font-medium">{dossier.license_verified ? 'Vérifiée' : 'En attente'}</p>
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
                      step.id === 'license' && dossier.license_verified ||
                      step.id === 'agents' && dossier.agents_verified ||
                      step.id === 'portfolio' && dossier.portfolio_verified ||
                      step.id === 'insurance' && dossier.insurance_verified;

                    return (
                      <div key={step.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${isVerified ? 'bg-green-100' : 'bg-muted'}`}>
                            <StepIcon className={`h-5 w-5 ${isVerified ? 'text-green-600' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{step.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {isVerified ? 'Vérifié' : 'En attente'}
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

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea placeholder="Ajoutez vos notes..." rows={6} />
                <Button className="mt-4">Sauvegarder</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver ce dossier</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Confirmer l'approbation du dossier de {dossier.agency_name} ?
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Annuler</Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approuver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter ce dossier</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motif du rejet..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Annuler</Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectionReason.trim()}>
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
