/**
 * Page de signature de mandat avec OTP InTouch
 * Workflow: Détails → Envoi OTP → Vérification OTP → Confirmation
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileSignature,
  CheckCircle2,
  Building2,
  User,
  Calendar,
  Percent,
  FileText,
  AlertCircle,
  ArrowLeft,
  Loader2,
  PenTool,
  Smartphone,
  Shield,
  Clock,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { cryptoneoSignatureService } from '@/services/mandates/cryptoneoSignatureService';
import Button from '@/shared/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type SignatureStep = 'details' | 'otp-sent' | 'verifying' | 'complete' | 'error';

interface MandateDetails {
  id: string;
  mandate_scope: string;
  start_date: string;
  end_date: string | null;
  commission_rate: number;
  status: string;
  cryptoneo_signature_status: string | null;
  owner_signed_at: string | null;
  agency_signed_at: string | null;
  property?: {
    id: string;
    title: string;
    city: string;
    neighborhood: string | null;
    monthly_rent?: number;
  };
  agency?: {
    id: string;
    agency_name: string;
    email?: string;
    phone?: string;
  };
  owner?: {
    full_name?: string;
    email?: string;
    phone?: string;
  };
  // Permissions
  can_view_properties: boolean;
  can_edit_properties: boolean;
  can_manage_applications: boolean;
  can_create_leases: boolean;
  can_view_financials: boolean;
}

export default function SignMandateWithOTPPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mandate, setMandate] = useState<MandateDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [currentStep, setCurrentStep] = useState<SignatureStep>('details');
  const [signerType, setSignerType] = useState<'owner' | 'agency'>('owner');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(600); // 10 minutes
  const [operationId, setOperationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (currentStep === 'otp-sent' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && currentStep === 'otp-sent') {
      setCurrentStep('error');
      setError('Le délai de signature a expiré. Veuillez demander un nouveau code.');
    }
  }, [countdown, currentStep]);

  // Fetch mandate on mount
  useEffect(() => {
    if (!id) return;
    fetchMandate();
  }, [id]);

  const fetchMandate = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('agency_mandates')
        .select(`
          *,
          property:properties(id, title, city, neighborhood, monthly_rent),
          agency:agencies(id, agency_name, email, phone),
          owner:profiles(full_name, email, phone)
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Mandat introuvable');
        navigate('/');
        return;
      }

      setMandate(data as MandateDetails);

      // Determine signer type
      if (data.owner_id === user?.id) {
        setSignerType('owner');
      } else if (data.agency?.id === user?.id || data.agency?.user_id === user?.id) {
        setSignerType('agency');
      }

      // Check if already signed
      const alreadySigned =
        (signerType === 'owner' && data.owner_signed_at) ||
        (signerType === 'agency' && data.agency_signed_at);

      if (alreadySigned) {
        setCurrentStep('complete');
      }

      // Check if signature is pending
      if (data.cryptoneo_operation_id && !alreadySigned) {
        setOperationId(data.cryptoneo_operation_id);
        setCurrentStep('otp-sent');
      }
    } catch (err) {
      console.error('Error fetching mandate:', err);
      toast.error('Erreur lors du chargement du mandat');
    } finally {
      setLoading(false);
    }
  };

  const initiateSignature = async () => {
    if (!mandate || !user) return;

    setSigning(true);
    setError(null);

    try {
      const signatoryData = {
        mandateId: mandate.id,
        signatoryRole: signerType,
        signatoryName:
          signerType === 'owner'
            ? mandate.owner?.full_name || user.user_metadata?.full_name || 'Propriétaire'
            : mandate.agency?.agency_name || 'Agence',
        signatoryEmail:
          signerType === 'owner'
            ? mandate.owner?.email || user.email
            : mandate.agency?.email || user.email,
        signatoryPhone:
          signerType === 'owner'
            ? mandate.owner?.phone || user.user_metadata?.phone
            : mandate.agency?.phone,
      };

      const result = await cryptoneoSignatureService.initiateSignature(signatoryData);

      if (!result.success) {
        setError(result.error || 'Erreur lors de l\'initialisation de la signature');
        setCurrentStep('error');
        return;
      }

      setOperationId(result.operationId || null);
      setCurrentStep('otp-sent');
      setCountdown(600); // Reset countdown to 10 minutes

      const phoneNumber =
        signerType === 'owner' ? mandate.owner?.phone : mandate.agency?.phone;
      toast.success(
        `Code OTP envoyé au ${phoneNumber || 'votre numéro'}. Valide 10 minutes.`
      );
    } catch (err) {
      console.error('Error initiating signature:', err);
      setError('Erreur lors de l\'envoi du code de signature');
      setCurrentStep('error');
    } finally {
      setSigning(false);
    }
  };

  const verifyOTP = async () => {
    if (!mandate || !operationId) return;

    setVerifying(true);
    setError(null);

    try {
      const otpCode = otp.join('');
      if (otpCode.length !== 6) {
        setError('Veuillez entrer les 6 chiffres du code');
        setVerifying(false);
        return;
      }

      const result = await cryptoneoSignatureService.verifyOTPAndSign({
        mandateId: mandate.id,
        otp: otpCode,
        signatoryRole: signerType,
      });

      if (!result.success) {
        setError(result.error || 'Code invalide. Veuillez réessayer.');
        setOtp(['', '', '', '', '', '']);
        setVerifying(false);
        return;
      }

      setCurrentStep('complete');

      if (result.error === undefined) {
        // Check if both parties have signed
        const bothSigned =
          (mandate.owner_signed_at || signerType === 'owner') &&
          (mandate.agency_signed_at || signerType === 'agency');

        if (bothSigned) {
          toast.success('🎉 Mandat complété signé par les deux parties !');
        } else {
          toast.success('Signature enregistrée avec succès');
        }
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Erreur lors de la vérification du code');
    } finally {
      setVerifying(false);
    }
  };

  const resendOTP = async () => {
    if (!mandate || !operationId) return;

    setResending(true);
    setError(null);

    try {
      const result = await cryptoneoSignatureService.resendOTP(mandate.id, signerType);

      if (!result.success) {
        setError(result.error || 'Erreur lors du renvoi du code');
        return;
      }

      setCountdown(600); // Reset countdown
      toast.success('Nouveau code envoyé avec succès');
    } catch (err) {
      console.error('Error resending OTP:', err);
      setError('Erreur lors du renvoi du code');
    } finally {
      setResending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value) {
      setTimeout(() => {
        verifyOTP();
      }, 300);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!mandate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Mandat introuvable</h2>
            <Button onClick={() => navigate('/')} className="mt-4">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(signerType === 'owner' ? '/proprietaire/mes-mandats' : '/agences/mandats')}
            className="inline-flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux mandats</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <FileSignature className="h-8 w-8 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">Signature du Mandat</h1>
          </div>
          <p className="text-gray-600">
            {signerType === 'owner'
              ? "Signez le mandat pour autoriser l'agence à gérer vos biens"
              : 'Signez le mandat pour accepter la gestion des biens'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'details' || currentStep === 'otp-sent' ||
                currentStep === 'verifying' || currentStep === 'complete'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {currentStep === 'complete' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                '1'
              )}
            </div>
            <div
              className={`w-16 h-1 ${
                currentStep !== 'details' ? 'bg-orange-500' : 'bg-gray-200'
              }`}
            />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'otp-sent' || currentStep === 'verifying' ||
                currentStep === 'complete'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {currentStep === 'complete' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                '2'
              )}
            </div>
            <div
              className={`w-16 h-1 ${
                currentStep === 'complete' ? 'bg-orange-500' : 'bg-gray-200'
              }`}
            />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 'complete' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {currentStep === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : '3'}
            </div>
          </div>
        </div>

        {/* Step 1: Details */}
        {currentStep === 'details' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Détails du Mandat
              </CardTitle>
              <CardDescription>Vérifiez les informations avant de signer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Parties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Propriétaire</span>
                    {signerType === 'owner' && (
                      <Badge variant="secondary" className="text-xs">
                        Vous
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{mandate.owner?.full_name || 'Propriétaire'}</p>
                  {mandate.owner_signed_at && (
                    <Badge variant="outline" className="mt-2 text-green-600 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Signé
                    </Badge>
                  )}
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Agence</span>
                    {signerType === 'agency' && (
                      <Badge variant="secondary" className="text-xs">
                        Vous
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{mandate.agency?.agency_name}</p>
                  {mandate.agency_signed_at && (
                    <Badge variant="outline" className="mt-2 text-green-600 border-green-300">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Signé
                    </Badge>
                  )}
                </div>
              </div>

              {/* Property or Scope */}
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Portée du mandat</h4>
                {mandate.mandate_scope === 'all_properties' ? (
                  <p className="text-sm text-gray-600">
                    Ce mandat couvre <strong>tous vos biens immobiliers</strong>
                  </p>
                ) : mandate.property ? (
                  <div>
                    <p className="font-medium">{mandate.property.title}</p>
                    <p className="text-sm text-gray-600">
                      {mandate.property.city}
                      {mandate.property.neighborhood && `, ${mandate.property.neighborhood}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Bien spécifique</p>
                )}
              </div>

              {/* Conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Date de début</span>
                  </div>
                  <p className="font-medium">
                    {format(new Date(mandate.start_date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Commission</span>
                  </div>
                  <p className="font-medium">{mandate.commission_rate}%</p>
                </div>
              </div>

              {/* Security Notice */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-amber-600" />
                  <span className="font-medium text-amber-800">Signature sécurisée OTP</span>
                </div>
                <p className="text-sm text-amber-700">
                  Vous recevrez un code de vérification à 6 chiffres par SMS pour confirmer votre
                  signature. Ce code est valide pendant 10 minutes.
                </p>
              </div>

              <Button
                onClick={initiateSignature}
                disabled={signing}
                size="large"
                className="w-full"
              >
                {signing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi du code...
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Recevoir le code de signature
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: OTP Verification */}
        {(currentStep === 'otp-sent' || currentStep === 'verifying') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Vérification par SMS
              </CardTitle>
              <CardDescription>
                Entrez le code à 6 chiffres reçu par SMS au{' '}
                {signerType === 'owner' ? mandate.owner?.phone : mandate.agency?.phone}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Countdown */}
              <div className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500" />
                <span className="text-sm text-gray-600">
                  Code valide pendant :{' '}
                  <span className="font-bold text-orange-600">{formatCountdown(countdown)}</span>
                </span>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:border-orange-500 focus:outline-none"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}

              {/* Resend Button */}
              <div className="text-center">
                <button
                  onClick={resendOTP}
                  disabled={resending || countdown < 540}
                  className="inline-flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 disabled:text-gray-400"
                >
                  {resending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Renvoyer le code
                  {countdown >= 540 && ` (${Math.floor((countdown - 540) / 60)} min d'attente)`}
                </button>
              </div>

              {/* Submit Button */}
              <Button
                onClick={verifyOTP}
                disabled={verifying || otp.join('').length !== 6}
                size="large"
                className="w-full"
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Vérifier et signer
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-green-800 mb-2">Signature enregistrée !</h2>

              <p className="text-green-700 mb-6 max-w-md mx-auto">
                {mandate.cryptoneo_signature_status === 'completed'
                  ? 'Le mandat est maintenant actif. Les deux parties ont signé.'
                  : signerType === 'owner'
                    ? "Votre signature a été enregistrée. En attente de la signature de l'agence."
                    : 'Votre signature a été enregistrée. En attente de la signature du propriétaire.'}
              </p>

              {/* Status summary */}
              <div className="inline-flex items-center gap-4 p-4 bg-white rounded-lg border mb-6">
                <div className="text-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 ${
                      mandate.owner_signed_at || signerType === 'owner'
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    <User
                      className={`h-5 w-5 ${
                        mandate.owner_signed_at || signerType === 'owner'
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <span className="text-xs">Propriétaire</span>
                  {(mandate.owner_signed_at || signerType === 'owner') && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mt-1" />
                  )}
                </div>

                <div className="w-12 h-0.5 bg-gray-200" />

                <div className="text-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 ${
                      mandate.agency_signed_at || signerType === 'agency'
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                    }`}
                  >
                    <Building2
                      className={`h-5 w-5 ${
                        mandate.agency_signed_at || signerType === 'agency'
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <span className="text-xs">Agence</span>
                  {(mandate.agency_signed_at || signerType === 'agency') && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto mt-1" />
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate(signerType === 'owner' ? '/proprietaire/mes-mandats' : '/agences/mandats')}
                >
                  Voir mes mandats
                </Button>
                <Button onClick={() => navigate(`/mandat/${mandate.id}`)}>
                  Voir le détail du mandat
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {currentStep === 'error' && (
          <Card className="border-red-200">
            <CardContent className="pt-8 text-center">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-800 mb-2">Erreur de signature</h2>
              <p className="text-red-600 mb-6">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate(signerType === 'owner' ? '/proprietaire/mes-mandats' : '/agences/mandats')}
                >
                  Retour aux mandats
                </Button>
                <Button onClick={() => setCurrentStep('details')}>
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
