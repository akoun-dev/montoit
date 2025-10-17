import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { 
  VerificationWithUser, 
  PassportVerification,
  VerificationAction,
  VerificationStatus,
  VerificationType
} from '@/types/admin';
import { AdminVerificationStats } from '@/components/admin/AdminVerificationStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Clock, User, FileText, Shield, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { handleError } from '@/lib/errorHandler';

export default function AdminVerificationQueue() {
  const [verifications, setVerifications] = useState<VerificationWithUser[]>([]);
  const [passportVerifications, setPassportVerifications] = useState<PassportVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<VerificationAction | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPendingVerifications = async () => {
    try {
      // Fetch ONECI/CNAM verifications
      const { data, error } = await supabase.rpc('get_verifications_for_admin_review');
      if (error) throw error;

      const enrichedData = (data || []).map((verification: {
        user_id: string;
        oneci_status: string;
        cnam_status: string;
        oneci_data: unknown;
        cnam_data: unknown;
        oneci_cni_number: string | null;
        cnam_employer: string | null;
        created_at: string;
        full_name: string;
      }): VerificationWithUser => ({
        user_id: verification.user_id,
        oneci_status: verification.oneci_status as VerificationStatus,
        cnam_status: verification.cnam_status as VerificationStatus,
        passport_status: 'not_submitted' as VerificationStatus,
        oneci_data: verification.oneci_data as any,
        cnam_data: verification.cnam_data as any,
        passport_data: null,
        oneci_cni_number: verification.oneci_cni_number,
        cnam_employer: verification.cnam_employer,
        passport_number: null,
        passport_nationality: null,
        created_at: verification.created_at,
        profiles: {
          full_name: verification.full_name || 'N/A',
          avatar_url: null,
          email: 'user@example.com'
        }
      }));

      setVerifications(enrichedData);

      // Fetch passport verifications
      const { data: passportData, error: passportError } = await supabase
        .rpc('get_passport_verifications_for_admin' as never);
      
      if (!passportError && passportData) {
        setPassportVerifications(passportData as unknown as PassportVerification[]);
      }
    } catch (error: any) {
      handleError(error, 'Impossible de charger les vérifications en attente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const handleAction = async () => {
    if (!selectedVerification) return;

    setSubmitting(true);
    try {
      let functionName: string;
      
      if (selectedVerification.type === 'passport') {
        functionName = selectedVerification.action === 'approve' 
          ? 'approve_passport_verification' 
          : 'reject_passport_verification';
        
        const { error } = await supabase.rpc(functionName as any, {
          p_user_id: selectedVerification.userId,
          p_review_notes: reviewNotes || null,
        });
        if (error) throw error;
      } else {
        functionName = selectedVerification.action === 'approve' 
          ? 'approve_verification' 
          : 'reject_verification';

        const { error } = await supabase.rpc(functionName as any, {
          p_user_id: selectedVerification.userId,
          p_verification_type: selectedVerification.type,
          p_review_notes: reviewNotes || null,
        });
        if (error) throw error;
      }

      toast({
        title: selectedVerification.action === 'approve' ? 'Vérification approuvée' : 'Vérification rejetée',
        description: `La vérification ${selectedVerification.type.toUpperCase()} a été ${selectedVerification.action === 'approve' ? 'approuvée' : 'rejetée'} avec succès.`,
      });

      setSelectedVerification(null);
      setReviewNotes('');
      fetchPendingVerifications();
    } catch (error: any) {
      handleError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" /> En attente</Badge>;
      case 'verified':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Vérifié</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejeté</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Statistics Dashboard */}
        <AdminVerificationStats />
        
        <Tabs defaultValue="oneci_cnam" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="oneci_cnam">ONECI & CNAM ({verifications.length})</TabsTrigger>
              <TabsTrigger value="passport">Passeports ({passportVerifications.length})</TabsTrigger>
            </TabsList>
            <Button onClick={fetchPendingVerifications} variant="outline">
              Rafraîchir
            </Button>
          </div>

          <TabsContent value="oneci_cnam" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Vérifications ONECI & CNAM</h2>
              <p className="text-muted-foreground">
                {verifications.length} vérification{verifications.length > 1 ? 's' : ''} en attente de validation
              </p>
            </div>

        {verifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <CheckCircle2 className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Aucune vérification en attente</p>
              <p className="text-sm text-muted-foreground">Toutes les vérifications ont été traitées</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {verifications.map((verification) => (
              <Card key={verification.user_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={verification.profiles.avatar_url || undefined} />
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{verification.profiles.full_name}</CardTitle>
                        <CardDescription className="text-sm">{verification.profiles.email}</CardDescription>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(verification.created_at), 'PPp', { locale: fr })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ONECI Verification */}
                  {verification.oneci_status === 'pending_review' && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <span className="font-semibold">Vérification ONECI</span>
                        </div>
                        {getStatusBadge(verification.oneci_status)}
                      </div>
                      
                      {verification.oneci_data && (
                        <div className="bg-muted/50 rounded p-3 space-y-1 text-sm">
                          <div><strong>CNI:</strong> {verification.oneci_cni_number}</div>
                          <div><strong>Nom:</strong> {verification.oneci_data.lastName}</div>
                          <div><strong>Prénom:</strong> {verification.oneci_data.firstName}</div>
                          <div><strong>Date de naissance:</strong> {verification.oneci_data.birthDate}</div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedVerification({ userId: verification.user_id, type: 'oneci', action: 'approve' })}
                          className="flex-1"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedVerification({ userId: verification.user_id, type: 'oneci', action: 'reject' })}
                          className="flex-1"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* CNAM Verification */}
                  {verification.cnam_status === 'pending_review' && (
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="font-semibold">Vérification CNAM</span>
                        </div>
                        {getStatusBadge(verification.cnam_status)}
                      </div>
                      
                      {verification.cnam_data && (
                        <div className="bg-muted/50 rounded p-3 space-y-1 text-sm">
                          <div><strong>Employeur:</strong> {verification.cnam_employer}</div>
                          <div><strong>Type de contrat:</strong> {verification.cnam_data.contractType || 'N/A'}</div>
                          <div><strong>Salaire estimé:</strong> {verification.cnam_data.estimatedSalary || 'N/A'} FCFA</div>
                          <div><strong>Statut:</strong> {verification.cnam_data.employmentStatus || 'N/A'}</div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedVerification({ userId: verification.user_id, type: 'cnam', action: 'approve' })}
                          className="flex-1"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approuver
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setSelectedVerification({ userId: verification.user_id, type: 'cnam', action: 'reject' })}
                          className="flex-1"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Rejeter
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="passport" className="space-y-4">
            <div className="mb-4">
              <h2 className="text-2xl font-bold">Vérifications Passeport</h2>
              <p className="text-muted-foreground">
                {passportVerifications.length} vérification{passportVerifications.length > 1 ? 's' : ''} passeport en attente
              </p>
            </div>

            {passportVerifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <CheckCircle2 className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">Aucune vérification passeport en attente</p>
                  <p className="text-sm text-muted-foreground">Toutes les vérifications passeport ont été traitées</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {passportVerifications.map((verification: any) => (
                  <Card key={verification.user_id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              <User className="h-5 w-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{verification.full_name}</CardTitle>
                            <CardDescription className="text-sm">Nationalité: {verification.passport_nationality}</CardDescription>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(verification.created_at), 'PPp', { locale: fr })}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Vérification Passeport</span>
                          </div>
                          {getStatusBadge(verification.passport_status)}
                        </div>
                        
                        {verification.passport_data && (
                          <div className="bg-muted/50 rounded p-3 space-y-1 text-sm">
                            <div><strong>Numéro passeport:</strong> {verification.passport_number}</div>
                            <div><strong>Nationalité:</strong> {verification.passport_nationality}</div>
                            <div><strong>Nom:</strong> {verification.passport_data.lastName}</div>
                            <div><strong>Prénom:</strong> {verification.passport_data.firstName}</div>
                            <div><strong>Date de naissance:</strong> {verification.passport_data.birthDate}</div>
                            <div><strong>Date d'émission:</strong> {verification.passport_data.issueDate}</div>
                            <div><strong>Date d'expiration:</strong> {verification.passport_data.expiryDate}</div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setSelectedVerification({ userId: verification.user_id, type: 'passport', action: 'approve' })}
                            className="flex-1"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setSelectedVerification({ userId: verification.user_id, type: 'passport', action: 'reject' })}
                            className="flex-1"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de confirmation */}
      <Dialog open={!!selectedVerification} onOpenChange={() => setSelectedVerification(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedVerification?.action === 'approve' ? 'Approuver' : 'Rejeter'} la vérification {selectedVerification?.type.toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              {selectedVerification?.action === 'approve' 
                ? 'Confirmez-vous vouloir approuver cette vérification ?'
                : 'Veuillez indiquer le motif du rejet (obligatoire).'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">
                Notes {selectedVerification?.action === 'reject' && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={selectedVerification?.action === 'approve' 
                  ? 'Notes optionnelles...'
                  : 'Motif du rejet (obligatoire)...'
                }
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVerification(null)} disabled={submitting}>
              Annuler
            </Button>
            <Button 
              onClick={handleAction} 
              disabled={submitting || (selectedVerification?.action === 'reject' && !reviewNotes.trim())}
              variant={selectedVerification?.action === 'approve' ? 'default' : 'destructive'}
            >
              {submitting ? 'Traitement...' : selectedVerification?.action === 'approve' ? 'Approuver' : 'Rejeter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
