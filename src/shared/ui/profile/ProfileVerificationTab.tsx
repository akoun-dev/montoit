import { useState } from 'react';
import { Shield, CheckCircle, XCircle, AlertTriangle, Camera, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import NeofaceVerification from '../NeofaceVerification';

interface ProfileVerificationTabProps {
  profile: any;
  verificationData: any;
  onRefresh?: () => void;
}

export default function ProfileVerificationTab({
  profile,
  verificationData,
  onRefresh,
}: ProfileVerificationTabProps) {
  const [showBiometricFlow, setShowBiometricFlow] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verifie':
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'en_attente':
      case 'pending':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verifie':
      case 'verified':
        return 'Vérifié';
      case 'en_attente':
      case 'pending':
        return 'En attente';
      default:
        return 'Non vérifié';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verifie':
      case 'verified':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'en_attente':
      case 'pending':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      default:
        return 'bg-[#FDF6E3] border-[#3C2A1E]/10 text-[#5D4037]';
    }
  };

  const handleBiometricVerified = async (verificationData: unknown) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          facial_verification_status: 'verified',
          facial_verification_date: new Date().toISOString(),
          facial_verification_score: (verificationData as any)?.matching_score || null,
        })
        .eq('user_id', profile?.user_id);

      if (error) throw error;

      toast.success('Vérification biométrique réussie !');
      setShowBiometricFlow(false);
      onRefresh?.();
    } catch (err) {
      console.error('[ProfileVerificationTab] Update error:', err);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBiometricFailed = (error: string) => {
    toast.error(`Vérification échouée: ${error}`);
    setShowBiometricFlow(false);
  };

  const facialStatus =
    profile?.facial_verification_status ||
    verificationData?.face_verification_status ||
    'non_verifie';
  const oneciStatus = profile?.oneci_verified
    ? 'verified'
    : verificationData?.oneci_status || 'non_verifie';
  const cniPhotoUrl = profile?.avatar_url || null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-[#3C2A1E]/10 overflow-hidden">
        {/* Header Premium Ivorian */}
        <div className="bg-gradient-to-r from-[#3C2A1E] to-[#5D4037] px-8 py-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="h-7 w-7" />
            <span>État de vérification</span>
          </h2>
          <p className="text-white/70 mt-1">Gérez vos certifications d'identité</p>
        </div>

        <div className="p-8 bg-[#FDF6E3] space-y-4">
          {/* ONECI Verification */}
          <div className={`p-5 rounded-xl border-2 transition-all ${getStatusColor(oneciStatus)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(oneciStatus)}
                <div>
                  <h3 className="font-bold text-[#3C2A1E]">Vérification ONECI (CNI)</h3>
                  <p className="text-sm text-[#5D4037]/70">Vérification d'identité officielle</p>
                </div>
              </div>
              <span className="font-bold text-sm uppercase tracking-wide">
                {getStatusText(oneciStatus)}
              </span>
            </div>
          </div>

          {/* Biometric Verification */}
          <div className={`p-5 rounded-xl border-2 transition-all ${getStatusColor(facialStatus)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(facialStatus)}
                <div>
                  <h3 className="font-bold text-[#3C2A1E]">Vérification biométrique</h3>
                  <p className="text-sm text-[#5D4037]/70">Reconnaissance faciale NeoFace</p>
                </div>
              </div>
              <span className="font-bold text-sm uppercase tracking-wide">
                {getStatusText(facialStatus)}
              </span>
            </div>

            {/* Show biometric action button if not verified */}
            {facialStatus !== 'verified' && facialStatus !== 'verifie' && !showBiometricFlow && (
              <div className="mt-4 pt-4 border-t border-[#3C2A1E]/10">
                <button
                  onClick={() => setShowBiometricFlow(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#F16522] text-white rounded-lg font-medium hover:bg-[#D95318] transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  Démarrer la vérification faciale
                </button>
              </div>
            )}
          </div>

          {/* Mon Toit Badge */}
          <div
            className={`p-5 rounded-xl border-2 transition-all ${profile?.is_verified ? 'bg-green-50 border-green-200 text-green-700' : 'bg-[#FDF6E3] border-[#3C2A1E]/10 text-[#5D4037]'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {profile?.is_verified ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <h3 className="font-bold text-[#3C2A1E]">Badge Mon Toit</h3>
                  <p className="text-sm text-[#5D4037]/70">Certification complète</p>
                </div>
              </div>
              <span className="font-bold text-sm uppercase tracking-wide">
                {profile?.is_verified ? 'Vérifié' : 'Non vérifié'}
              </span>
            </div>
          </div>
        </div>

        {/* Biometric Flow Integration */}
        {showBiometricFlow && (
          <div className="p-8 bg-white border-t border-[#3C2A1E]/10">
            {isUpdating ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#F16522]" />
                <span className="ml-3 text-[#3C2A1E]">Mise à jour du profil...</span>
              </div>
            ) : cniPhotoUrl ? (
              <NeofaceVerification
                userId={profile?.user_id || ''}
                cniPhotoUrl={cniPhotoUrl}
                onVerified={handleBiometricVerified}
                onFailed={handleBiometricFailed}
              />
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                <p className="text-amber-900 font-medium">Photo de profil requise</p>
                <p className="text-amber-700 text-sm mt-1">
                  Veuillez d'abord ajouter une photo de profil pour la vérification biométrique.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowBiometricFlow(false)}
              className="mt-4 text-[#5D4037] hover:text-[#3C2A1E] text-sm font-medium"
            >
              ← Annuler
            </button>
          </div>
        )}

        {/* CTA for incomplete verification */}
        {!profile?.is_verified && !showBiometricFlow && (
          <div className="p-6 bg-gradient-to-r from-[#F16522]/10 to-[#F16522]/5 border-t border-[#F16522]/20">
            <h4 className="font-bold text-[#3C2A1E] mb-2">Complétez votre vérification</h4>
            <p className="text-[#5D4037] text-sm mb-4">
              Pour bénéficier de toutes les fonctionnalités et obtenir le badge Mon Toit, complétez
              votre vérification d'identité.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/verification-biometrique"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F16522] text-white rounded-lg font-semibold hover:bg-[#D95318] transition-colors shadow-md"
              >
                <Camera className="h-4 w-4" />
                Vérification biométrique
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
