import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
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
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/shared/useSafeToast';
import { AddressValue, formatAddress } from '@/shared/utils/address';
import { cn } from '@/shared/lib/utils';

// New Trust Agent UI Components
import {
  ProgressStepper,
  ActionCard,
  EmptyState,
  TrustAgentPageHeader,
} from '@/shared/ui/trust-agent';

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
  pending: { label: 'En attente', variant: 'secondary' as const, bg: 'bg-gray-100 text-gray-700', icon: Clock },
  in_progress: { label: 'En cours', variant: 'default' as const, bg: 'bg-blue-100 text-blue-700', icon: Loader2 },
  biometric_pending: { label: 'Biométrie en attente', variant: 'default' as const, bg: 'bg-purple-100 text-purple-700', icon: Fingerprint },
  biometric_failed: { label: 'Biométrie échouée', variant: 'destructive' as const, bg: 'bg-red-100 text-red-700', icon: AlertCircle },
  signature_pending: { label: 'Signature en attente', variant: 'default' as const, bg: 'bg-amber-100 text-amber-700', icon: FileCheck },
  completed: { label: 'Terminée', variant: 'secondary' as const, bg: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', variant: 'destructive' as const, bg: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const BIOMETRIC_THRESHOLD = 85;

export default function CEVMissionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [mission, setMission] = useState<CEVMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
        .select('*, property:properties(title, address, city, owner_id)')
        .eq('id', missionId)
        .single();

      if (error) throw error;

      setMission(data as CEVMission);
    } catch (error) {
      console.error('Error loading mission:', error);
      toast.error('Erreur lors du chargement de la mission');
    } finally {
      setLoading(false);
    }
  };

  const initiateBiometricVerification = async () => {
    if (!mission) return;

    setBiometricLoading(true);
    setBiometricResult(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockScore = Math.floor(Math.random() * 15) + 85;
      const success = mockScore >= BIOMETRIC_THRESHOLD;

      setBiometricResult({
        success,
        score: mockScore,
        message: success
          ? `Vérification biométrique réussie avec un score de confiance de ${mockScore}%`
          : `Score de confiance (${mockScore}%) inférieur au seuil requis (${BIOMETRIC_THRESHOLD}%)`,
      });

      if (success) {
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
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const signatureUrl = `https://cryptoneo.demo/sign/${mission.id}`;

      await supabase
        .from('cev_missions')
        .update({
          electronic_signature: {
            status: 'sent',
            provider: 'cryptoneo',
            signature_url: signatureUrl,
            signed_at: null,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
      const certificateData = {
        id: `CEV-${Date.now()}`,
        certificate_url: `https://storage.example.com/certificates/${mission.id}.pdf`,
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TrustAgentPageHeader
          title="Mission introuvable"
          showBackButton
          onBack={() => navigate('/trust-agent/missions')}
        />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[mission.status];

  // Calculate progress and steps
  const checklist = mission.verification_checklist || {};
  const completedSteps = Object.values(checklist).filter(Boolean).length;
  const totalSteps = 6;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  // Progress Steps
  const progressSteps: Array<{ id: string; label: string; icon?: React.ElementType; status: 'pending' | 'in_progress' | 'completed' | 'error'; description?: string }> = [
    { id: 'identity', label: 'Identité', icon: User, status: checklist.identity_verified ? 'completed' : 'pending', description: 'Vérifier l\'identité' },
    { id: 'property', label: 'Propriété', icon: Home, status: checklist.property_verified ? 'completed' : 'pending', description: 'Vérifier le bien' },
    { id: 'documents', label: 'Documents', icon: FileCheck, status: checklist.documents_verified ? 'completed' : 'pending', description: 'Valider les documents' },
    { id: 'photos', label: 'Photos', icon: Camera, status: checklist.photos_verified ? 'completed' : 'pending', description: 'Vérifier les photos' },
    { id: 'biometric', label: 'Biométrie', icon: Fingerprint, status: checklist.biometric_completed ? 'completed' : mission.biometric_verification?.status === 'failed' ? 'error' : 'pending', description: 'NeoFace' },
    { id: 'signature', label: 'Signature', icon: FileCheck, status: checklist.signature_completed ? 'completed' : 'pending', description: 'CryptoNeo' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <TrustAgentPageHeader
        title={`Mission CEV - ${mission.property?.title || 'Non définie'}`}
        subtitle={formatAddress(mission.property?.address, mission.property?.city)}
        showBackButton
        onBack={() => navigate('/trust-agent/missions')}
        badges={[
          { label: statusConfig.label, variant: statusConfig.variant },
          { label: `${progress}% complété`, variant: 'secondary' },
        ]}
      />

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 h-1.5">
        <div className="bg-gradient-to-r from-primary-500 to-primary-400 h-1.5 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <main className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white border border-gray-200 rounded-xl">
            <TabsTrigger value="overview" className="gap-2 py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              <Home className="h-4 w-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="biometric" className="gap-2 py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              <Fingerprint className="h-4 w-4" />
              Biométrie
            </TabsTrigger>
            <TabsTrigger value="signature" className="gap-2 py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              <FileCheck className="h-4 w-4" />
              Signature
            </TabsTrigger>
            <TabsTrigger value="certificate" className="gap-2 py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              <Shield className="h-4 w-4" />
              Certificat
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 py-3 data-[state=active]:bg-primary-500 data-[state=active]:text-white">
              <ClipboardList className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Property Info Card */}
            <Card className="bg-white border-gray-200">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Informations du bien</h3>
                    <p className="text-sm text-gray-500">{mission.property?.title || 'Non défini'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {formatAddress(mission.property?.address, mission.property?.city)}
                </div>
                {mission.scheduled_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Planifiée le {new Date(mission.scheduled_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Progress Stepper */}
            <Card className="bg-white border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Progression de la mission
                </h3>
                <ProgressStepper steps={progressSteps} orientation="vertical" size="md" showLabels />
              </div>
            </Card>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions disponibles</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ActionCard
                  title="Vérification biométrique"
                  description="Lancer la vérification NeoFace"
                  icon={<Fingerprint />}
                  variant={checklist.biometric_completed ? 'success' : 'primary'}
                  status={checklist.biometric_completed ? 'completed' : mission.biometric_verification?.status === 'failed' ? 'error' : 'pending'}
                  actionLabel={checklist.biometric_completed ? 'Terminé' : 'Lancer'}
                  onAction={checklist.biometric_completed ? undefined : initiateBiometricVerification}
                  loading={biometricLoading}
                />
                <ActionCard
                  title="Signature électronique"
                  description="Envoyer la demande CryptoNeo"
                  icon={<FileCheck />}
                  variant={checklist.signature_completed ? 'success' : checklist.biometric_completed ? 'primary' : 'default'}
                  status={checklist.signature_completed ? 'completed' : 'pending'}
                  actionLabel={checklist.signature_completed ? 'Signé' : checklist.biometric_completed ? 'Envoyer' : undefined}
                  onAction={checklist.signature_completed || !checklist.biometric_completed ? undefined : initiateElectronicSignature}
                  loading={signatureLoading}
                  disabled={!checklist.biometric_completed}
                />
                <ActionCard
                  title="Certificat CEV"
                  description="Générer le certificat final"
                  icon={<Shield />}
                  variant={mission.certificate ? 'success' : progress >= 100 ? 'primary' : 'default'}
                  status={mission.certificate ? 'completed' : 'pending'}
                  actionLabel={mission.certificate ? 'Généré' : progress >= 100 ? 'Générer' : undefined}
                  onAction={mission.certificate || progress < 100 ? undefined : generateCertificate}
                  disabled={progress < 100}
                />
              </div>
            </div>
          </TabsContent>

          {/* Biometric Tab */}
          <TabsContent value="biometric" className="space-y-6">
            <Card className="bg-white border-gray-200">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple/10">
                    <Fingerprint className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Vérification biométrique NeoFace</h3>
                    <p className="text-sm text-gray-500">Reconnaissance faciale avancée</p>
                  </div>
                </div>

                {/* Status Display */}
                <div className={cn(
                  'p-4 rounded-xl border',
                  mission.biometric_verification?.status === 'success' && 'bg-green-50 border-green-200',
                  mission.biometric_verification?.status === 'failed' && 'bg-red-50 border-red-200',
                  (!mission.biometric_verification?.status || mission.biometric_verification?.status === 'pending') && 'bg-gray-50 border-gray-200'
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Statut</p>
                      <p className="text-sm text-gray-600 mt-1">
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
                      <p className="font-medium text-gray-900">Score de confiance</p>
                      <Badge className={
                        mission.biometric_verification.confidence_score >= BIOMETRIC_THRESHOLD
                          ? 'bg-green-100 text-green-700 border-0'
                          : 'bg-red-100 text-red-700 border-0'
                      }>
                        {mission.biometric_verification.confidence_score}%
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={cn(
                          'h-3 rounded-full transition-all',
                          mission.biometric_verification.confidence_score >= BIOMETRIC_THRESHOLD
                            ? 'bg-green-600'
                            : 'bg-red-600'
                        )}
                        style={{ width: `${mission.biometric_verification.confidence_score}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Seuil requis: {BIOMETRIC_THRESHOLD}%</p>
                  </div>
                )}

                {/* Action Button */}
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
                  <div className={cn(
                    'p-4 rounded-xl border',
                    biometricResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  )}>
                    <div className="flex items-start gap-3">
                      {biometricResult.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{biometricResult.success ? 'Succès' : 'Échec'}</p>
                        <p className="text-sm text-gray-600 mt-1">{biometricResult.message}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info */}
                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-xl">
                  <p><strong>NeoFace</strong> fournit une vérification biométrique avancée avec reconnaissance faciale.</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Seuil de confiance: {BIOMETRIC_THRESHOLD}%</li>
                    <li>Détection de fraude: activée</li>
                    <li>Conformité RGPD: oui</li>
                  </ul>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Signature Tab */}
          <TabsContent value="signature" className="space-y-6">
            <Card className="bg-white border-gray-200">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber/10">
                    <FileCheck className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Signature électronique CryptoNeo</h3>
                    <p className="text-sm text-gray-500">Signature qualifiée électronique</p>
                  </div>
                </div>

                <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-xl">
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
                    disabled={signatureLoading || signatureSent || !checklist.biometric_completed}
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
                    ) : !checklist.biometric_completed ? (
                      <>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Complétez la biométrie d'abord
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
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm text-blue-900 font-medium">Signature envoyée!</p>
                    <p className="text-sm text-blue-700 mt-1">Le destinataire peut signer via:</p>
                    <a
                      href={mission.electronic_signature.signature_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline mt-2 inline-block text-sm"
                    >
                      {mission.electronic_signature.signature_url}
                    </a>
                  </div>
                )}

                {checklist.signature_completed && mission.electronic_signature?.signed_at && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
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
              </div>
            </Card>
          </TabsContent>

          {/* Certificate Tab */}
          <TabsContent value="certificate" className="space-y-6">
            <Card className="bg-white border-gray-200">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green/10">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Certificat CEV</h3>
                    <p className="text-sm text-gray-500">Certificat de vérification électronique</p>
                  </div>
                </div>

                {!mission.certificate ? (
                  <EmptyState
                    icon={<Shield />}
                    title={progress < 100 ? 'Complétez d\'abord la mission' : 'Prêt à générer'}
                    description={progress < 100
                      ? 'Toutes les étapes doivent être complétées pour générer le certificat'
                      : 'Cliquez sur le bouton pour générer le certificat CEV'
                    }
                    variant="default"
                  >
                    {progress >= 100 && (
                      <Button onClick={generateCertificate}>
                        <Shield className="h-4 w-4 mr-2" />
                        Générer le certificat
                      </Button>
                    )}
                  </EmptyState>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">Certificat généré avec succès</p>
                          <p className="text-sm text-green-700">
                            Code: {mission.certificate.verification_code}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Date d'émission</p>
                        <p className="font-medium text-gray-900">
                          {mission.certificate.issued_at
                            ? new Date(mission.certificate.issued_at).toLocaleDateString('fr-FR')
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Date d'expiration</p>
                        <p className="font-medium text-gray-900">
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
              </div>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card className="bg-white border-gray-200">
              <div className="p-6">
                <EmptyState
                  icon={<ClipboardList />}
                  title="Documents en cours de chargement"
                  description="Cette fonctionnalité sera disponible prochainement."
                  variant="default"
                />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
