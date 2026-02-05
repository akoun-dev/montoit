import { supabase } from '@/integrations/supabase/client';

export interface SignatureData {
  contractId: string;
  userId: string;
  signatureType: 'landlord' | 'tenant';
  signatureData: string; // Base64 encoded signature
  ipAddress?: string;
  userAgent?: string;
  signedAt: string;
}

/**
 * Enregistre une signature de contrat en utilisant les tables existantes
 */
export async function saveContractSignature(signatureData: SignatureData): Promise<void> {
  try {
    // Vérifier si l'utilisateur a le droit de signer ce contrat
    const { data: contract, error: contractError } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('id', signatureData.contractId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contrat non trouvé');
    }

    // Vérifier que l'utilisateur est soit propriétaire soit locataire
    const isOwner = contract.owner_id === signatureData.userId;
    const isTenant = contract.tenant_id === signatureData.userId;

    if (!isOwner && !isTenant) {
      throw new Error('Vous n\'êtes pas autorisé à signer ce contrat');
    }

    // Vérifier que le type de signature correspond au rôle
    if (signatureData.signatureType === 'landlord' && !isOwner) {
      throw new Error('Seul le propriétaire peut signer en tant que bailleur');
    }

    if (signatureData.signatureType === 'tenant' && !isTenant) {
      throw new Error('Seul le locataire peut signer en tant que locataire');
    }

    // Enregistrer le log de signature électronique
    const { error: logError } = await supabase
      .from('electronic_signature_logs')
      .insert({
        lease_id: signatureData.contractId,
        initiated_by: signatureData.userId,
        operation_id: `sig-${signatureData.userId}-${Date.now()}`,
        status: 'completed',
        cryptoneo_response: {
          signature_type: signatureData.signatureType,
          signature_data: signatureData.signatureData,
          ip_address: signatureData.ipAddress,
          user_agent: signatureData.userAgent,
          signed_at: signatureData.signedAt,
        },
      });

    if (logError) {
      throw new Error(`Erreur lors de l'enregistrement du log de signature: ${logError.message}`);
    }

    // Mettre à jour le statut du contrat
    const updateData: {
      owner_signed_at?: string;
      tenant_signed_at?: string;
      status?: string;
    } = {};

    if (signatureData.signatureType === 'landlord') {
      updateData.owner_signed_at = signatureData.signedAt;
    } else {
      updateData.tenant_signed_at = signatureData.signedAt;
    }

    // Si les deux parties ont signé, mettre à jour le statut
    const ownerWillSign = updateData.owner_signed_at || contract.owner_signed_at;
    const tenantWillSign = updateData.tenant_signed_at || contract.tenant_signed_at;

    if (ownerWillSign && tenantWillSign) {
      updateData.status = 'actif';
    } else if (ownerWillSign || tenantWillSign) {
      updateData.status = 'en_attente_signature';
    }

    const { error: updateError } = await supabase
      .from('lease_contracts')
      .update(updateData)
      .eq('id', signatureData.contractId);

    if (updateError) {
      throw new Error(`Erreur lors de la mise à jour du contrat: ${updateError.message}`);
    }

    // Envoyer une notification à l'autre partie
    await sendSignatureNotification(signatureData);

  } catch (error) {
    console.error('Error saving signature:', error);
    throw error;
  }
}

/**
 * Vérifie si un utilisateur a déjà signé un contrat
 */
export async function hasUserSigned(contractId: string, userId: string, signatureType: 'landlord' | 'tenant'): Promise<boolean> {
  const { data: contract, error } = await supabase
    .from('lease_contracts')
    .select('owner_signed_at, tenant_signed_at')
    .eq('id', contractId)
    .single();

  if (error) {
    throw new Error(`Erreur lors de la vérification de la signature: ${error.message}`);
  }

  if (!contract) return false;

  if (signatureType === 'landlord') {
    return !!contract.owner_signed_at;
  } else {
    return !!contract.tenant_signed_at;
  }
}

/**
 * Récupère les logs de signature d'un contrat
 */
export async function getContractSignatures(contractId: string) {
  const { data, error } = await supabase
    .from('electronic_signature_logs')
    .select(`
      *,
      profiles!electronic_signature_logs_initiated_by_fkey (
        full_name,
        email
      )
    `)
    .eq('lease_id', contractId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Erreur lors de la récupération des signatures: ${error.message}`);
  }

  return data;
}

/**
 * Envoie une notification de signature
 */
async function sendSignatureNotification(signatureData: SignatureData): Promise<void> {
  try {
    // Récupérer les détails du contrat pour notifier l'autre partie
    const { data: contract } = await supabase
      .from('lease_contracts')
      .select('*')
      .eq('id', signatureData.contractId)
      .single();

    if (!contract) return;

    // Déterminer qui notifier
    const notifyUserId = signatureData.signatureType === 'landlord' 
      ? contract.tenant_id 
      : contract.owner_id;

    // Récupérer le profil du signataire
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', signatureData.userId)
      .single();

    const signerName = profile?.full_name || 'Un utilisateur';

    // Créer la notification
    await supabase
      .from('notifications')
      .insert({
        user_id: notifyUserId,
        title: 'Nouvelle signature',
        message: `${signerName} a signé le contrat ${contract.contract_number}`,
        type: 'info',
        action_url: `/proprietaire/contrats/${signatureData.contractId}`,
        channel: 'in_app',
      });

  } catch (error) {
    console.error('Error sending signature notification:', error);
    // Ne pas bloquer le processus si la notification échoue
  }
}

/**
 * Convertit un canvas en base64
 */
export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * Obtient l'adresse IP du client
 */
export async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting client IP:', error);
    return '';
  }
}