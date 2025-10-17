import { supabase } from "@/lib/supabase";
import { logger } from '@/services/logger';

interface ValidationResult {
  canSign: boolean;
  reason?: string;
  autoFix?: 'generate_certificate' | 'generate_pdf';
}

export const canSignElectronically = async (
  userId: string,
  leaseId: string
): Promise<ValidationResult> => {
  try {
    // 1. Verify user ONECI verification
    const { data: profile } = await supabase
      .from('profiles')
      .select('oneci_verified')
      .eq('id', userId)
      .single();

    if (!profile?.oneci_verified) {
      return {
        canSign: false,
        reason: 'Identité ONECI non vérifiée. Veuillez compléter la vérification.'
      };
    }

    // 2. Verify active certificate
    const { data: certificate } = await supabase
      .from('digital_certificates')
      .select('*')
      .eq('user_id', userId)
      .eq('certificate_status', 'active')
      .maybeSingle();

    if (!certificate) {
      return {
        canSign: false,
        reason: 'Certificat numérique requis',
        autoFix: 'generate_certificate'
      };
    }

    // Check certificate expiration
    if (certificate.expires_at && new Date(certificate.expires_at) < new Date()) {
      return {
        canSign: false,
        reason: 'Votre certificat a expiré. Veuillez en générer un nouveau.',
        autoFix: 'generate_certificate'
      };
    }

    // 3. Verify lease status
    const { data: lease } = await supabase
      .from('leases')
      .select('*')
      .eq('id', leaseId)
      .single();

    if (!lease) {
      return {
        canSign: false,
        reason: 'Bail non trouvé'
      };
    }

    if (!lease.landlord_signed_at || !lease.tenant_signed_at) {
      return {
        canSign: false,
        reason: 'Les deux parties doivent d\'abord signer avec signature simple'
      };
    }

    if (!lease.document_url) {
      return {
        canSign: false,
        reason: 'Le PDF du bail doit être généré',
        autoFix: 'generate_pdf'
      };
    }

    if (lease.is_electronically_signed) {
      return {
        canSign: false,
        reason: 'Ce bail est déjà signé électroniquement'
      };
    }

    // All checks passed
    return { canSign: true };

  } catch (error) {
    logger.logError(error, { 
      context: 'signature-validation', 
      action: 'canSignElectronically',
      userId,
      leaseId 
    });
    return {
      canSign: false,
      reason: 'Erreur lors de la vérification des prérequis'
    };
  }
};
