import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  Camera,
  Shield,
  Fingerprint,
  FileCheck,
  User,
  Home,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Share2,
  Clock,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { toast } from '@/hooks/shared/useSafeToast';
import { AddressValue, formatAddress } from '@/shared/utils/address';

// CEV Mission interfaces
interface CEVMission {
  id: string;
  mission_type: 'cev_complete' | 'cev_property' | 'cev_tenant';
  status: 'pending' | 'in_progress' | 'biometric_pending' | 'biometric_failed' | 'signature_pending' | 'completed' | 'cancelled';
  property_id: string;
  property?: {
    title: string;
    address: AddressValue;
    city: string;
    owner_id: string;
  };
  scheduled_date: string | null;
  created_at: string;
  completed_at: string | null;

  // Biometric verification data
  biometric_verification?: {
    status: 'pending' | 'in_progress' | 'success' | 'failed';
    provider: 'neoface';
    confidence_score: number | null;
    threshold: number;
    verified_at: string | null;
    failure_reason: string | null;
    attempt_count: number;
  };

  // Electronic signature data
  electronic_signature?: {
    status: 'pending' | 'sent' | 'signed' | 'failed';
    provider: 'cryptoneo';
    signature_url: string | null;
    signed_at: string | null;
    expires_at: string | null;
  };

  // Certificate data
  certificate?: {
    id: string;
    certificate_url: string | null;
    issued_at: string | null;
    expires_at: string | null;
    verification_code: string | null;
  };

  // Checklist items
  verification_checklist?: {
    identity_verified: boolean;
    property_verified: boolean;
    documents_verified: boolean;
    photos_verified: boolean;
    biometric_completed: boolean;
    signature_completed: boolean;
  };

  notes?: string;
}

const STATUS_CONFIG = {
  pending: { label: 'En attente', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700', icon: Clock },
  in_progress: { label: 'En cours', variant: 'default' as const, color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  biometric_pending: { label: 'Biométrie en attente', variant: 'default' as const, color: 'bg-purple-100 text-purple-700', icon: Fingerprint },
  biometric_failed: { label: 'Biométrie échouée', variant: 'destructive' as const, color: 'bg-red-100 text-red-700', icon: XCircle },
  signature_pending: { label: 'Signature en attente', variant: 'default' as const, color: 'bg-amber-100 text-amber-700', icon: FileCheck },
  completed: { label: 'Terminée', variant: 'secondary' as const, color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', variant: 'destructive' as const, color: 'bg-red-100 text-red-700', icon: XCircle },
};

const BIOMETRIC_THRESHOLD = 85; // NeoFace threshold

export default function CEVMissionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mission, setMission] = useState<CEVMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState('');

  // Biometric verification state
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricResult, setBiometricResult] = useState<{ success: boolean; score?: number; message: string } | null>(null);

  // Signature state
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [signatureSent, setSignatureSent] = useState(false);

  useEffect(() => {
    if (id) {
      loadMission(id);
    }
  }, [id]);

  const loadMission = async (missionId: string) => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('cev_missions')
        .select(
          `
          *,
          property:properties(title, address, city, owner_id)
        `
        )
        .eq('id', missionId)
        .single();

      if (error) throw error;

      setMission(data as CEVMission);
      setNotes(data?.notes || '');
    } catch (error) {
      console.error('Error loading mission:', error);
      toast.error('Erreur lors du chargement de la mission');
    } finally {
      setLoading(false);
    }
  };

  const updateMissionStatus = async (newStatus: CEVMission['status']) => {
    if (!mission) return;

    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('cev_missions')
        .update(updateData)
        .eq('id', mission.id);

      if (error) throw error;

      setMission((prev) => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Statut mis à jour: ${STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const initiateBiometricVerification = async () => {
    if (!mission) return;

    setBiometricLoading(true);
    setBiometricResult(null);

    try {
      // Simulate NeoFace API call for biometric verification
      // In production, this would call the actual NeoFace API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock response - simulate success
      const mockScore = Math.floor(Math.random() * 15) + 85; // 85-99
      const success = mockScore >= BIOMETRIC_THRESHOLD;

      setBiometricResult({
        success,
        score: mockScore,
        message: success
          ? `Vérification biométrique réussie avec un score de confiance de ${mockScore}%`
          : `Score de confiance (${mockScore}%) inférieur au seuil requis (${BIOMETRIC_THRESHOLD}%)`,
      });

      if (success) {
        // Update mission with biometric verification data
        await supabase
          .from('cev_missions')
          .update({
            biometric_verification: {
              status: 'success',
              provider: 'neoface',
              confidence_score: mockScore,
              threshold: BIOMETRIC_THRESHOLD,
              verified_at: new Date().toISOString(),
              failure_reason: null,
              attempt_count: 1,
            },
            verification_checklist: {
              ...(mission.verification_checklist || {}),
              biometric_completed: true,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', mission.id);

        toast.success('Vérification biométrique réussie!');
        loadMission(mission.id);
      } else {
        await supabase
          .from('cev_missions')
          .update({
            biometric_verification: {
              status: 'failed',
              provider: 'neoface',
              confidence_score: mockScore,
              threshold: BIOMETRIC_THRESHOLD,
              verified_at: null,
              failure_reason: `Score ${mockScore}% < seuil ${BIOMETRIC_THRESHOLD}%`,
              attempt_count: 1,
            },
            status: 'biometric_failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', mission.id);

        toast.error('Vérification biométrique échouée');
        loadMission(mission.id);
      }
    } catch (error) {
      console.error('Error during biometric verification:', error);
      setBiometricResult({
        success: false,
        message: 'Erreur lors de la vérification biométrique',
      });
      toast.error('Erreur lors de la vérification biométrique');
    } finally {
      setBiometricLoading(false);
    }
  };

  const initiateElectronicSignature = async () => {
    if (!mission) return;

    setSignatureLoading(true);

    try {
      // Simulate CryptoNeo API call for electronic signature
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Generate mock signature URL
      const signatureUrl = `https://cryptoneo.demo/sign/${mission.id}`;

      await supabase
        .from('cev_missions')
        .update({
          electronic_signature: {
            status: 'sent',
            provider: 'cryptoneo',
            signature_url: signatureUrl,
            signed_at: null,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', mission.id);

      setSignatureSent(true);
      toast.success('Demande de signature envoyée avec succès');
      loadMission(mission.id);
    } catch (error) {
      console.error('Error initiating signature:', error);
      toast.error('Erreur lors de l\'envoi de la demande de signature');
    } finally {
      setSignatureLoading(false);
    }
  };

  const generateCertificate = async () => {
    if (!mission) return;

    try {
      // Generate mock certificate
      const certificateData = {
        id: `CEV-${Date.now()}`,
        certificate_url: `https://storage.example.com/certificates/${mission.id}.pdf`,
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        verification_code: Math.random().toString(36).substring(2, 12).toUpperCase(),
      };

      await supabase
        .from('cev_missions')
        .update({
          certificate: certificateData,
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', mission.id);

      toast.success('Certificat généré avec succès!');
      loadMission(mission.id);
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Erreur lors de la génération du certificat');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b sticky top-0 z-10">
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="small" className="p-2 h-auto" onClick={() => navigate('/trust-agent/missions')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">Mission introuvable</h1>
            </div>
          </div>
        </header>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[mission.status];
  const StatusIcon = statusConfig.icon;

  // Calculate progress
  const checklist = mission.verification_checklist || {};
  const completedSteps = Object.values(checklist).filter(Boolean).length;
  const totalSteps = 6;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="small"
                className="p-2 h-auto w-auto"
                onClick={() => navigate('/trust-agent/missions')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-6 w-6 text-primary" />
                  <div>
                    <h1 className="text-xl font-semibold">Mission CEV</h1>
                    <p className="text-sm text-muted-foreground">{mission.property?.title}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant={statusConfig.variant} className={statusConfig.color}>
                <StatusIcon className="h-4 w-4 mr-1" />
                {statusConfig.label}
              </Badge>
              <Badge variant="outline">{progress}% complété</Badge>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">
              <Home className="h-4 w-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="biometric">
              <Fingerprint className="h-4 w-4 mr-2" />
              Biométrie
            </TabsTrigger>
            <TabsTrigger value="signature">
              <FileCheck className="h-4 w-4 mr-2" />
              Signature
            </TabsTrigger>
            <TabsTrigger value="certificate">
              <Shield className="h-4 w-4 mr-2" />
              Certificat
            </TabsTrigger>
            <TabsTrigger value="documents">
              <ClipboardList className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Property Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Informations du bien
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{mission.property?.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {formatAddress(mission.property?.address, mission.property?.city)}
                    </p>
                  </div>
                  {mission.scheduled_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Planifiée le :</span>
                      <span className="font-medium">
                        {new Date(mission.scheduled_date).toLocaleDateString('fr-FR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Progression de la mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { key: 'identity', label: 'Vérification identité', icon: User, completed: checklist.identity_verified },
                    { key: 'property', label: 'Vérification propriété', icon: Home, completed: checklist.property_verified },
                    { key: 'documents', label: 'Validation documents', icon: FileCheck, completed: checklist.documents_verified },
                    { key: 'photos', label: 'Vérification photos', icon: Camera, completed: checklist.photos_verified },
                    { key: 'biometric', label: 'Biométrie NeoFace', icon: Fingerprint, completed: checklist.biometric_completed },
                    { key: 'signature', label: 'Signature CryptoNeo', icon: FileCheck, completed: checklist.signature_completed },
                  ].map((step) => {
                    const StepIcon = step.icon;

                    return (
                      <div key={step.key} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${step.completed ? 'bg-green-100' : 'bg-muted'}`}>
                            <StepIcon className={`h-4 w-4 ${step.completed ? 'text-green-600' : 'text-muted-foreground'}`} />
                          </div>
                          <span className={step.completed ? '' : 'text-muted-foreground'}>{step.label}</span>
                        </div>
                        {step.completed && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!checklist.biometric_completed && (
                  <Button
                    className="w-full justify-start"
                    onClick={() => setActiveTab('biometric')}
                    disabled={biometricLoading}
                  >
                    <Fingerprint className="h-4 w-4 mr-2" />
                    Lancer la vérification biométrique
                  </Button>
                )}
                {checklist.biometric_completed && !checklist.signature_completed && (
                  <Button
                    className="w-full justify-start"
                    onClick={() => setActiveTab('signature')}
                    disabled={signatureLoading}
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    Envoyer la demande de signature
                  </Button>
                )}
                {checklist.signature_completed && !mission.certificate && (
                  <Button
                    className="w-full justify-start"
                    onClick={generateCertificate}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Générer le certificat CEV
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Biometric Tab */}
          <TabsContent value="biometric" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="h-5 w-5" />
                  Vérification biométrique NeoFace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status */}
                <div className={`p-4 rounded-lg ${mission.biometric_verification?.status === 'success' ? 'bg-green-50' : mission.biometric_verification?.status === 'failed' ? 'bg-red-50' : 'bg-muted'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Statut de la vérification</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {mission.biometric_verification?.status === 'success' && 'Vérification réussie'}
                        {mission.biometric_verification?.status === 'failed' && 'Vérification échouée'}
                        {!mission.biometric_verification?.status || mission.biometric_verification?.status === 'pending' && 'En attente'}
                      </p>
                    </div>
                    {mission.biometric_verification?.status === 'success' && (
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    )}
                    {mission.biometric_verification?.status === 'failed' && (
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                </div>

                {/* Score Display */}
                {mission.biometric_verification?.confidence_score && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">Score de confiance</p>
                      <Badge
                        className={
                          mission.biometric_verification.confidence_score >= BIOMETRIC_THRESHOLD
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {mission.biometric_verification.confidence_score}%
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          mission.biometric_verification.confidence_score >= BIOMETRIC_THRESHOLD
                            ? 'bg-green-600'
                            : 'bg-red-600'
                        }`}
                        style={{ width: `${mission.biometric_verification.confidence_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Seuil requis: {BIOMETRIC_THRESHOLD}%
                    </p>
                  </div>
                )}

                {/* Biometric Button */}
                {!checklist.biometric_completed && (
                  <Button
                    className="w-full"
                    onClick={initiateBiometricVerification}
                    disabled={biometricLoading}
                  >
                    {biometricLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Vérification en cours...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="h-4 w-4 mr-2" />
                        Lancer la vérification biométrique
                      </>
                    )}
                  </Button>
                )}

                {/* Result Display */}
                {biometricResult && (
                  <div className={`p-4 rounded-lg ${biometricResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                    <div className="flex items-start gap-3">
                      {biometricResult.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">{biometricResult.success ? 'Succès' : 'Échec'}</p>
                        <p className="text-sm text-muted-foreground mt-1">{biometricResult.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="text-sm text-muted-foreground">
                  <p><strong>NeoFace</strong> fournit une vérification biométrique avancée avec reconnaissance faciale.</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Seuil de confiance: {BIOMETRIC_THRESHOLD}%</li>
                    <li>Détection de fraude: activée</li>
                    <li>Conformité RGPD: oui</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signature Tab */}
          <TabsContent value="signature" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Signature électronique CryptoNeo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-sm text-muted-foreground">
                  <p>CryptoNeo permet la signature électronique légale et sécurisée des documents CEV.</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Signature qualifiée électronique</li>
                    <li>Horodatage certifié</li>
                    <li>Archivage à valeur probante</li>
                    <li>Conformité eIDAS</li>
                  </ul>
                </div>

                {!checklist.signature_completed && (
                  <Button
                    className="w-full"
                    onClick={initiateElectronicSignature}
                    disabled={signatureLoading || signatureSent}
                  >
                    {signatureLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : signatureSent ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Demande envoyée
                      </>
                    ) : (
                      <>
                        <FileCheck className="h-4 w-4 mr-2" />
                        Envoyer la demande de signature
                      </>
                    )}
                  </Button>
                )}

                {signatureSent && mission.electronic_signature?.signature_url && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Signature envoyée!</strong> Le destinataire peut signer le document via:
                    </p>
                    <a
                      href={mission.electronic_signature.signature_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline mt-2 inline-block"
                    >
                      {mission.electronic_signature.signature_url}
                    </a>
                  </div>
                )}

                {checklist.signature_completed && mission.electronic_signature?.signed_at && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Document signé avec succès</p>
                        <p className="text-sm text-green-700">
                          Signé le {new Date(mission.electronic_signature.signed_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificate Tab */}
          <TabsContent value="certificate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Certificat CEV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {!mission.certificate ? (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {progress < 100
                        ? 'Complétez toutes les étapes pour générer le certificat'
                        : 'Prêt à générer le certificat'}
                    </p>
                    <Button
                      className="mt-4"
                      onClick={generateCertificate}
                      disabled={progress < 100}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Générer le certificat
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">Certificat généré avec succès</p>
                          <p className="text-sm text-green-700">
                            Code de vérification: {mission.certificate.verification_code}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Date d'émission</p>
                        <p className="font-medium">
                          {mission.certificate.issued_at
                            ? new Date(mission.certificate.issued_at).toLocaleDateString('fr-FR')
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date d'expiration</p>
                        <p className="font-medium">
                          {mission.certificate.expires_at
                            ? new Date(mission.certificate.expires_at).toLocaleDateString('fr-FR')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {mission.certificate.certificate_url && (
                        <Button onClick={() => window.open(mission.certificate.certificate_url, '_blank')}>
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </Button>
                      )}
                      <Button variant="outline">
                        <Share2 className="h-4 w-4 mr-2" />
                        Partager
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Contenu de l'onglet Documents à implémenter</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
