import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Building,
  Briefcase,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from '@/hooks/shared/useSafeToast';
import verificationApplicationsService, {
  type VerificationApplication,
  type VerificationDocument,
} from '@/features/verification/services/verificationApplications.service';

const TYPE_CONFIG = {
  tenant: {
    label: 'Locataire',
    icon: User,
    color: 'bg-blue-100 text-blue-700',
    route: 'tenants',
  },
  owner: {
    label: 'Propriétaire',
    icon: Building,
    color: 'bg-orange-100 text-orange-700',
    route: 'owners',
  },
  agency: {
    label: 'Agence',
    icon: Briefcase,
    color: 'bg-purple-100 text-purple-700',
    route: 'agencies',
  },
};

const STATUS_CONFIG = {
  pending: { label: 'En attente', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700', icon: Clock },
  in_review: { label: 'En cours', variant: 'default' as const, color: 'bg-blue-100 text-blue-700', icon: Eye },
  approved: { label: 'Approuvé', variant: 'secondary' as const, color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rejeté', variant: 'destructive' as const, color: 'bg-red-100 text-red-700', icon: XCircle },
  more_info_requested: { label: 'Infos demandées', variant: 'default' as const, color: 'bg-purple-100 text-purple-700', icon: AlertCircle },
};

const DOCUMENT_LABELS: Record<string, string> = {
  id_card: 'Carte d\'identité',
  proof_of_income: 'Justificatif de revenus',
  proof_of_residence: 'Justificatif de domicile',
  bank_statement: 'Relevé bancaire',
  property_proof: 'Titre de propriété',
  cie_sodeci_bill: 'Facture CIE/SODECI',
  rib: 'Relevé d\'identité bancaire',
  kbis: 'Extrait Kbis',
  professional_card: 'Carte professionnelle',
  insurance: 'Assurance RC Pro',
  tax_clearance: 'Accusé de rémission fiscale',
};

export default function DossierValidationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] = useState<VerificationApplication | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadDossier(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadDossier = async (dossierId: string) => {
    try {
      setLoading(true);

      const [appData, docsData] = await Promise.all([
        verificationApplicationsService.get(dossierId),
        verificationApplicationsService.getDocuments(dossierId),
      ]);

      if (!appData) {
        toast.error('Dossier introuvable');
        navigate('/trust-agent/dossiers');
        return;
      }

      setApplication(appData);
      setDocuments(docsData);
    } catch (error) {
      console.error('Error loading dossier:', error);
      toast.error('Erreur lors du chargement du dossier');
      navigate('/trust-agent/dossiers');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!application) return;

    try {
      setUpdating(true);
      await verificationApplicationsService.approve(application.id);
      toast.success('Dossier approuvé avec succès');
      setShowApprovalDialog(false);
      loadDossier(application.id);
    } catch (error) {
      console.error('Error approving dossier:', error);
      toast.error('Erreur lors de l\'approbation');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!application || !rejectionReason.trim()) return;

    try {
      setUpdating(true);
      await verificationApplicationsService.reject(application.id, rejectionReason);
      toast.success('Dossier rejeté');
      setShowRejectDialog(false);
      setRejectionReason('');
      loadDossier(application.id);
    } catch (error) {
      console.error('Error rejecting dossier:', error);
      toast.error('Erreur lors du rejet');
    } finally {
      setUpdating(false);
    }
  };

  const handleStartReview = async () => {
    if (!application) return;

    try {
      setUpdating(true);
      await verificationApplicationsService.update(application.id, { status: 'in_review' });
      toast.success('Dossier marqué comme en cours de vérification');
      loadDossier(application.id);
    } catch (error) {
      console.error('Error starting review:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyDocument = async (documentId: string, verified: boolean) => {
    try {
      setUpdating(true);
      await verificationApplicationsService.updateDocumentStatus(
        documentId,
        verified ? 'verified' : 'rejected',
        verified ? 'Document vérifié' : 'Document rejeté'
      );
      toast.success(verified ? 'Document vérifié' : 'Document rejeté');
      // Reload documents
      const docs = await verificationApplicationsService.getDocuments(application!.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Error verifying document:', error);
      toast.error('Erreur lors de la vérification du document');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!application) {
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

  const typeConfig = TYPE_CONFIG[application.dossier_type];
  const TypeIcon = typeConfig.icon;
  const statusConfig = STATUS_CONFIG[application.status];
  const StatusIcon = statusConfig.icon;

  const canModify = application.status === 'pending' || application.status === 'in_review' || application.status === 'more_info_requested';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="small"
                className="p-2 h-auto"
                onClick={() => navigate('/trust-agent/dossiers')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <h1 className="text-xl font-semibold">
                    Validation Dossier {typeConfig.label}
                  </h1>
                  <Badge variant={statusConfig.variant} className={statusConfig.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  ID: {application.id.slice(0, 8)}... • Soumis le{' '}
                  {new Date(application.submitted_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canModify ? (
                <>
                  {application.status === 'pending' && (
                    <Button variant="outline" onClick={handleStartReview} disabled={updating}>
                      <Eye className="h-4 w-4 mr-2" />
                      Commencer la vérification
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={updating}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeter
                  </Button>
                  <Button onClick={() => setShowApprovalDialog(true)} disabled={updating}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approuver
                  </Button>
                </>
              ) : application.status === 'approved' ? (
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
            {/* Documents Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents du dossier
                </CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Aucun document disponible</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-lg ${
                              doc.verification_status === 'verified'
                                ? 'bg-green-100'
                                : doc.verification_status === 'rejected'
                                  ? 'bg-red-100'
                                  : 'bg-muted'
                            }`}
                          >
                            <FileText
                              className={`h-5 w-5 ${
                                doc.verification_status === 'verified'
                                  ? 'text-green-600'
                                  : doc.verification_status === 'rejected'
                                    ? 'text-red-600'
                                    : 'text-muted-foreground'
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-medium">
                              {DOCUMENT_LABELS[doc.document_type] || doc.document_type}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {doc.file_name || 'Document'} • {(doc.file_size || 0) / 1024} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.verification_status === 'verified' ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Vérifié
                            </Badge>
                          ) : doc.verification_status === 'rejected' ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejeté
                            </Badge>
                          ) : (
                            <>
                              <Button
                                size="small"
                                variant="outline"
                                onClick={() => window.open(doc.document_url, '_blank')}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Voir
                              </Button>
                              {canModify && (
                                <>
                                  <Button
                                    size="small"
                                    variant="outline"
                                    className="text-green-600 border-green-200 hover:bg-green-50"
                                    onClick={() => handleVerifyDocument(doc.id, true)}
                                    disabled={updating}
                                  >
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Valider
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleVerifyDocument(doc.id, false)}
                                    disabled={updating}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Rejeter
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completion Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Progression du dossier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Documents vérifiés</span>
                    <span className="text-sm font-semibold text-primary-600">
                      {documents.filter((d) => d.verification_status === 'verified').length} / {documents.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${documents.length > 0 ? (documents.filter((d) => d.verification_status === 'verified').length / documents.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  {application.completion_percentage !== undefined && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Complétion globale</span>
                      <span className="font-semibold">{application.completion_percentage}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Rejection Reason */}
            {application.rejection_reason && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Motif de rejet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-800">{application.rejection_reason}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea placeholder="Ajoutez vos notes..." rows={6} />
                <Button className="mt-4">Sauvegarder</Button>
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
                        {new Date(application.submitted_at).toLocaleDateString('fr-FR')} à{' '}
                        {new Date(application.submitted_at).toLocaleTimeString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {application.reviewed_at && (
                    <div className="flex gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <div>
                        <p className="text-sm font-medium">Dossier examiné</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(application.reviewed_at).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(application.reviewed_at).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  )}
                  {application.approved_at && (
                    <div className="flex gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <p className="text-sm font-medium">Dossier approuvé</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(application.approved_at).toLocaleDateString('fr-FR')} à{' '}
                          {new Date(application.approved_at).toLocaleTimeString('fr-FR')}
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

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approuver ce dossier</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Confirmer l'approbation du dossier {typeConfig.label} ? Cette action permettra à l'utilisateur de bénéficier de la
              certification ANSUT.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)} disabled={updating}>
              Annuler
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700" disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
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
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={updating}>
              Annuler
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectionReason.trim() || updating}>
              {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Rejeter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
