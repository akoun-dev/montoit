import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import {
  notifyLeaseSigned,
  notifyLeaseActive,
} from '@/services/notifications/leaseNotificationService';
import Header from '@/app/layout/Header';
import Footer from '@/app/layout/Footer';
import { FormStepper, FormStepContent, useFormStepper } from '@/shared/ui/FormStepper';
import CryptoNeoSignature from '@/shared/ui/CryptoNeoSignature';
import DigitalCertificateCard from '@/shared/ui/DigitalCertificateCard';
import { useConfetti } from '@/hooks/shared/useConfetti';
import {
  FileText,
  Shield,
  CheckCircle,
  AlertCircle,
  Lock,
  Loader,
  Download,
  User,
  Calendar,
  DollarSign,
  Stamp,
  Clock,
  ArrowRight,
  ArrowLeft,
  Home,
} from 'lucide-react';
import { AddressValue, formatAddress } from '@/shared/utils/address';

interface LeaseContract {
  id: string;
  contract_number: string;
  property_id: string;
  owner_id: string;
  tenant_id: string;
  monthly_rent: number;
  deposit_amount: number | null;
  charges_amount: number | null;
  start_date: string;
  end_date: string;
  payment_day: number | null;
  status: string | null;
  signed_at: string | null;
  owner_signed_at: string | null;
  tenant_signed_at: string | null;
  document_url: string | null;
  signed_document_url: string | null;
  cryptoneo_operation_id: string | null;
  custom_clauses: string | null;
  created_at: string | null;
}

interface Property {
  title: string;
  address: AddressValue;
  city: string;
}

interface UserProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_verified: boolean | null;
  oneci_verified: boolean | null;
}

const STEP_LABELS = ['Détails du bail', 'Signature simple', 'Signature certifiée'];

export default function SignLeasePage() {
  const { user, profile } = useAuth();
  const { id: leaseId } = useParams<{ id: string }>();
  const { step, slideDirection, goToStep, nextStep, prevStep } = useFormStepper(1, 3);
  const { triggerCertifiedSignatureConfetti } = useConfetti();

  const [lease, setLease] = useState<LeaseContract | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
  const [tenantProfile, setTenantProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user && leaseId) {
      loadLeaseData();
    }
  }, [user, leaseId]);

  const loadLeaseData = async () => {
    if (!leaseId) return;

    try {
      const { data: leaseData, error: leaseError } = await supabase
        .from('lease_contracts')
        .select('*')
        .eq('id', leaseId)
        .single();

      if (leaseError) throw leaseError;

      if (leaseData.owner_id !== user?.id && leaseData.tenant_id !== user?.id) {
        setError("Vous n'êtes pas autorisé à accéder à ce bail");
        setLoading(false);
        return;
      }

      setLease(leaseData as LeaseContract);

      const [propertyRes, ownerRes, tenantRes] = await Promise.all([
        supabase
          .from('properties')
          .select('title, address, city')
          .eq('id', leaseData.property_id)
          .single(),
        supabase
          .from('profiles')
          .select('full_name, email, phone, is_verified, oneci_verified')
          .eq('id', leaseData.owner_id)
          .single(),
        supabase
          .from('profiles')
          .select('full_name, email, phone, is_verified, oneci_verified')
          .eq('id', leaseData.tenant_id)
          .single(),
      ]);

      if (propertyRes.data) setProperty(propertyRes.data as Property);
      if (ownerRes.data) setOwnerProfile(ownerRes.data as UserProfile);
      if (tenantRes.data) setTenantProfile(tenantRes.data as UserProfile);
    } catch (err: unknown) {
      console.error('Error loading lease:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement du bail');
    } finally {
      setLoading(false);
    }
  };

  const handleSimpleSign = async () => {
    if (!user || !lease || !acceptedTerms) return;

    setSigning(true);
    setError('');

    try {
      const isOwner = lease.owner_id === user.id;
      const updateField = isOwner ? 'owner_signed_at' : 'tenant_signed_at';

      const updateData: Record<string, unknown> = {
        [updateField]: new Date().toISOString(),
      };

      const otherSigned = isOwner ? lease.tenant_signed_at : lease.owner_signed_at;

      // Update status based on signature state
      // Valid statuses in DB: brouillon, en_attente_signature, actif, expire, resilie, annule
      if (otherSigned) {
        // Both parties have signed - contract is now active
        updateData['status'] = 'actif';
      }
      // If only one party signed, keep current status (en_attente_signature)

      const { error: updateError } = await supabase
        .from('lease_contracts')
        .update(updateData)
        .eq('id', lease.id);

      if (updateError) {
        // If it's a permission error, provide helpful message
        if (updateError.message.includes('permission') || updateError.code === '42501') {
          throw new Error('Permission refusée. Contactez le support pour mettre à jour les signatures.');
        }
        throw updateError;
      }

      try {
        await notifyLeaseSigned(lease.id, profile?.full_name || 'Utilisateur', isOwner);
        if (otherSigned) {
          await notifyLeaseActive(lease.id);
        }
      } catch (_notifError) {
        // Notification errors are non-blocking
      }

      setSuccess('✅ Signature simple enregistrée!');
      loadLeaseData();

      // Auto-advance to step 3 if both parties have now signed
      if (otherSigned) {
        setTimeout(() => goToStep(3), 1500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la signature');
    } finally {
      setSigning(false);
    }
  };

  const handleCertifiedSignSuccess = (signedUrl: string) => {
    triggerCertifiedSignatureConfetti();
    setSuccess('🎉 Signature certifiée CryptoNeo réussie!');
    if (signedUrl) {
      setLease((prev) =>
        prev ? { ...prev, signed_document_url: signedUrl, status: 'active' } : null
      );
    }
    loadLeaseData();
  };

  const handleCertifiedSignError = (errorMsg: string) => {
    setError(errorMsg);
  };

  if (!user) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#F9F6F1] flex items-center justify-center">
          <div className="text-center form-section-premium p-12">
            <Lock className="w-16 h-16 text-[#8B7355] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#4A2C17] mb-2">Connexion requise</h2>
            <p className="text-[#8B7355]">Veuillez vous connecter pour signer le bail</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#F9F6F1] flex items-center justify-center">
          <Loader className="w-12 h-12 text-[#F16522] animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  if (!lease || !property) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#F9F6F1] flex items-center justify-center">
          <div className="text-center form-section-premium p-12">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#4A2C17] mb-2">Bail introuvable</h2>
            <p className="text-[#8B7355]">{error || "Le bail demandé n'existe pas"}</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const isOwner = lease.owner_id === user.id;
  const hasUserSigned = isOwner ? !!lease.owner_signed_at : !!lease.tenant_signed_at;
  const hasOtherSigned = isOwner ? !!lease.tenant_signed_at : !!lease.owner_signed_at;
  const bothSigned = !!lease.owner_signed_at && !!lease.tenant_signed_at;
  const isCertifiedSigned = lease.status === 'active' && lease.signed_document_url;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#F9F6F1] pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Premium Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-gradient-to-br from-[#4A2C17] to-[#5D3A22] rounded-2xl shadow-lg">
                <FileText className="w-8 h-8 text-[#F16522]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#4A2C17]">Signature du Bail</h1>
                <p className="text-[#8B7355]">Contrat #{lease.contract_number}</p>
              </div>
            </div>

            {/* FormStepper */}
            <FormStepper
              currentStep={step}
              totalSteps={3}
              labels={STEP_LABELS}
              onStepChange={goToStep}
              allowClickNavigation={true}
            />
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-green-700">{success}</p>
            </div>
          )}

          {/* Step 1: Contract Details */}
          <FormStepContent step={1} currentStep={step} slideDirection={slideDirection}>
            <div className="space-y-6">
              {/* Signature Status Card */}
              <div className="form-section-premium">
                <h2 className="form-label-premium mb-4 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-[#F16522]" />
                  État des signatures
                </h2>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Owner Signature */}
                  <div
                    className={`p-4 rounded-xl border-2 ${
                      lease.owner_signed_at
                        ? 'border-green-500 bg-green-50'
                        : 'border-[#E8DFD5] bg-[#F9F6F1]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {lease.owner_signed_at ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Clock className="w-6 h-6 text-[#8B7355]" />
                      )}
                      <div>
                        <p className="font-semibold text-[#4A2C17]">Propriétaire</p>
                        <p className="text-sm text-[#8B7355]">
                          {ownerProfile?.full_name || 'Non renseigné'}
                        </p>
                        {lease.owner_signed_at && (
                          <p className="text-xs text-green-600 mt-1">
                            Signé le{' '}
                            {new Date(lease.owner_signed_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tenant Signature */}
                  <div
                    className={`p-4 rounded-xl border-2 ${
                      lease.tenant_signed_at
                        ? 'border-green-500 bg-green-50'
                        : 'border-[#E8DFD5] bg-[#F9F6F1]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {lease.tenant_signed_at ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <Clock className="w-6 h-6 text-[#8B7355]" />
                      )}
                      <div>
                        <p className="font-semibold text-[#4A2C17]">Locataire</p>
                        <p className="text-sm text-[#8B7355]">
                          {tenantProfile?.full_name || 'Non renseigné'}
                        </p>
                        {lease.tenant_signed_at && (
                          <p className="text-xs text-green-600 mt-1">
                            Signé le {new Date(lease.tenant_signed_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certified Status */}
                {bothSigned && (
                  <div
                    className={`mt-4 p-4 rounded-xl border-2 ${
                      isCertifiedSigned
                        ? 'border-[#F16522] bg-[#F16522]/10'
                        : 'border-dashed border-[#8B7355] bg-[#F9F6F1]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isCertifiedSigned ? (
                        <Shield className="w-6 h-6 text-[#F16522]" />
                      ) : (
                        <Stamp className="w-6 h-6 text-[#8B7355]" />
                      )}
                      <div>
                        <p className="font-semibold text-[#4A2C17]">
                          {isCertifiedSigned
                            ? 'Signature certifiée CryptoNeo ✓'
                            : 'Signature certifiée (étape 3)'}
                        </p>
                        <p className="text-sm text-[#8B7355]">
                          {isCertifiedSigned
                            ? 'Ce bail a valeur légale certifiée'
                            : 'Valeur légale équivalente à une signature notariée'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Contract Details Card */}
              <div className="form-section-premium">
                <h2 className="form-label-premium mb-6">Détails du bail</h2>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-start gap-3">
                    <Home className="w-5 h-5 text-[#F16522] mt-0.5" />
                    <div>
                      <p className="text-sm text-[#8B7355]">Propriété</p>
                      <p className="font-medium text-[#4A2C17]">{property.title}</p>
                      <p className="text-sm text-[#8B7355]">
                        {formatAddress(property.address, property.city)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[#F16522] mt-0.5" />
                    <div>
                      <p className="text-sm text-[#8B7355]">Durée du bail</p>
                      <p className="font-medium text-[#4A2C17]">
                        Du {new Date(lease.start_date).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="font-medium text-[#4A2C17]">
                        Au {new Date(lease.end_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-[#F16522] mt-0.5" />
                    <div>
                      <p className="text-sm text-[#8B7355]">Propriétaire</p>
                      <p className="font-medium text-[#4A2C17]">
                        {ownerProfile?.full_name || 'Non renseigné'}
                      </p>
                      <p className="text-sm text-[#8B7355]">{ownerProfile?.email || ''}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-[#F16522] mt-0.5" />
                    <div>
                      <p className="text-sm text-[#8B7355]">Locataire</p>
                      <p className="font-medium text-[#4A2C17]">
                        {tenantProfile?.full_name || 'Non renseigné'}
                      </p>
                      <p className="text-sm text-[#8B7355]">{tenantProfile?.email || ''}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gradient-to-br from-[#F16522]/5 to-[#F16522]/10 rounded-xl p-6 border border-[#F16522]/20">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-[#F16522]" />
                    <h3 className="font-bold text-[#4A2C17]">Montants</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-[#8B7355]">Loyer mensuel</p>
                      <p className="text-xl font-bold text-[#F16522]">
                        {lease.monthly_rent.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#8B7355]">Dépôt de garantie</p>
                      <p className="text-xl font-bold text-[#F16522]">
                        {(lease.deposit_amount || 0).toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    {(lease.charges_amount ?? 0) > 0 && (
                      <div>
                        <p className="text-sm text-[#8B7355]">Charges</p>
                        <p className="text-xl font-bold text-[#F16522]">
                          {(lease.charges_amount || 0).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-end">
                <button onClick={nextStep} className="form-button-primary flex items-center gap-2">
                  <span>Suivant</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </FormStepContent>

          {/* Step 2: Simple Signature */}
          <FormStepContent step={2} currentStep={step} slideDirection={slideDirection}>
            <div className="space-y-6">
              {/* Already signed message */}
              {hasUserSigned && (
                <div className="form-section-premium border-2 border-green-500">
                  <div className="flex items-center gap-4">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                    <div>
                      <h3 className="text-xl font-bold text-green-700">Vous avez signé!</h3>
                      <p className="text-green-600">
                        {hasOtherSigned
                          ? 'Les deux parties ont signé. Vous pouvez procéder à la signature certifiée.'
                          : `En attente de la signature ${isOwner ? 'du locataire' : 'du propriétaire'}.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Signature Form */}
              {!hasUserSigned && !isCertifiedSigned && (
                <div className="form-section-premium">
                  <h2 className="text-xl font-bold text-[#4A2C17] mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#F16522]" />
                    Signature simple
                  </h2>
                  <p className="text-[#5D4E37] mb-6">
                    Signez pour valider les termes du contrat. Les deux parties doivent signer avant
                    de pouvoir procéder à la signature certifiée.
                  </p>

                  <label className="flex items-start gap-3 cursor-pointer mb-6 p-4 bg-[#F9F6F1] rounded-xl border border-[#E8DFD5] hover:border-[#F16522] transition">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 h-5 w-5 text-[#F16522] focus:ring-[#F16522] border-[#E8DFD5] rounded"
                    />
                    <span className="text-[#4A2C17] text-sm">
                      J'ai lu et j'accepte les termes et conditions du contrat de bail. Je comprends
                      que cette signature électronique a la même valeur juridique qu'une signature
                      manuscrite.
                    </span>
                  </label>

                  <button
                    onClick={handleSimpleSign}
                    disabled={!acceptedTerms || signing}
                    className="form-button-primary w-full flex items-center justify-center gap-2"
                  >
                    {signing ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Signature en cours...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        <span>Signer le bail</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Verification Warning */}
              {!profile?.is_verified && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <Shield className="w-8 h-8 text-amber-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-bold text-amber-800 mb-2">Vérification recommandée</h3>
                      <p className="text-amber-700 mb-4">
                        La vérification de votre profil renforce la confiance et permet la signature
                        certifiée.
                      </p>
                      <Link
                        to="/locataire/profil?tab=verification"
                        className="text-[#F16522] font-medium hover:underline"
                      >
                        Vérifier mon profil →
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-[#4A2C17]/30 text-[#4A2C17] font-medium rounded-xl hover:bg-[#F9F6F1] transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Précédent</span>
                </button>

                {bothSigned && (
                  <button
                    onClick={nextStep}
                    className="form-button-primary flex items-center gap-2"
                  >
                    <span>Signature certifiée</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </FormStepContent>

          {/* Step 3: Certified Signature */}
          <FormStepContent step={3} currentStep={step} slideDirection={slideDirection}>
            <div className="space-y-6">
              {/* Already certified */}
              {isCertifiedSigned && (
                <div className="form-section-premium border-2 border-green-500 text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-green-700 mb-2">Bail signé et certifié</h2>
                  <p className="text-green-600 mb-6">
                    Ce contrat a été signé électroniquement et a valeur légale.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                      to={`/locataire/contrat/${lease.id}`}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#4A2C17] text-white rounded-xl hover:bg-[#5D3A22] transition"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Voir le contrat</span>
                    </Link>
                    {lease.signed_document_url && (
                      <a
                        href={lease.signed_document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition"
                      >
                        <Download className="w-5 h-5" />
                        <span>Télécharger PDF signé</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Not both signed yet */}
              {!bothSigned && (
                <div className="form-section-premium border-2 border-amber-400">
                  <div className="flex items-center gap-4">
                    <Clock className="w-12 h-12 text-amber-600" />
                    <div>
                      <h3 className="text-xl font-bold text-amber-800">
                        Signatures simples requises
                      </h3>
                      <p className="text-amber-700">
                        Les deux parties doivent d'abord effectuer leur signature simple avant de
                        pouvoir procéder à la signature certifiée CryptoNeo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Ready for certified signature */}
              {bothSigned && !isCertifiedSigned && (
                <>
                  {/* Digital Certificate Card */}
                  <DigitalCertificateCard />

                  {/* CryptoNeo Signature Component */}
                  <CryptoNeoSignature
                    leaseId={lease.id}
                    userPhone={profile?.phone || undefined}
                    userEmail={profile?.email || undefined}
                    onSuccess={handleCertifiedSignSuccess}
                    onError={handleCertifiedSignError}
                  />
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-start">
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-3 border-2 border-[#4A2C17]/30 text-[#4A2C17] font-medium rounded-xl hover:bg-[#F9F6F1] transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Précédent</span>
                </button>
              </div>
            </div>
          </FormStepContent>
        </div>
      </div>
      <Footer />
    </>
  );
}
