import { supabase } from '@/integrations/supabase/client';
import { generateContractPDF } from './lazyPdfGenerator';
import type { ContractData } from './contractPdfGenerator';

interface ContractWithDetails {
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
  custom_clauses: string | null;
  properties: {
    title: string;
    address: string | null;
    city: string;
  };
}

interface ProfileData {
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Génère le PDF du contrat et l'upload vers Supabase Storage
 * @returns L'URL signée du document uploadé
 */
export async function generateAndUploadContract(leaseId: string): Promise<string> {
  // 1. Récupérer le contrat avec la propriété
  const { data: contractData, error: contractError } = await supabase
    .from('lease_contracts')
    .select(
      `
      id,
      contract_number,
      property_id,
      owner_id,
      tenant_id,
      monthly_rent,
      deposit_amount,
      charges_amount,
      start_date,
      end_date,
      payment_day,
      custom_clauses,
      properties!lease_contracts_property_id_fkey (
        title,
        address,
        city
      )
    `
    )
    .eq('id', leaseId)
    .single();

  if (contractError || !contractData) {
    throw new Error(
      `Erreur lors de la récupération du contrat: ${contractError?.message || 'Contrat introuvable'}`
    );
  }

  const contract = contractData as unknown as ContractWithDetails;

  // 2. Récupérer les profils du propriétaire et du locataire
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles_with_user_id')
    .select('user_id, full_name, email, phone')
    .in('user_id', [contract.owner_id, contract.tenant_id]);

  if (profilesError || !profiles) {
    throw new Error(`Erreur lors de la récupération des profils: ${profilesError?.message}`);
  }

  const ownerProfile = profiles.find((p: ProfileData) => p.user_id === contract.owner_id);
  const tenantProfile = profiles.find((p: ProfileData) => p.user_id === contract.tenant_id);

  if (!ownerProfile || !tenantProfile) {
    throw new Error('Profils du propriétaire ou du locataire introuvables');
  }

  // 3. Préparer les données pour le PDF
  const pdfData: ContractData = {
    leaseId: contract.id,
    propertyTitle: contract.properties.title,
    propertyAddress: contract.properties.address || 'Adresse non renseignée',
    propertyCity: contract.properties.city,
    landlordName: ownerProfile.full_name || 'Propriétaire',
    landlordPhone: ownerProfile.phone || 'Non renseigné',
    landlordEmail: ownerProfile.email || 'Non renseigné',
    tenantName: tenantProfile.full_name || 'Locataire',
    tenantPhone: tenantProfile.phone || 'Non renseigné',
    tenantEmail: tenantProfile.email || 'Non renseigné',
    monthlyRent: contract.monthly_rent,
    depositAmount: contract.deposit_amount || 0,
    chargesAmount: contract.charges_amount || 0,
    startDate: contract.start_date,
    endDate: contract.end_date,
    paymentDay: contract.payment_day || 5,
    customClauses: contract.custom_clauses || undefined,
  };

  // 4. Générer le PDF
  const pdfBlob = await generateContractPDF(pdfData);

  // 5. Upload vers Supabase Storage
  const fileName = `contrat-${contract.contract_number.replace(/[^a-zA-Z0-9-]/g, '')}.pdf`;
  const filePath = `${leaseId}/${fileName}`;

  // Ajout de logs pour debug
  console.log('Tentative d\'upload:', { fileName, filePath, bucket: 'lease-documents' });

  // Vérifier que l'utilisateur est authentifié
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session utilisateur:', !!session, session?.user?.role);

  const { error: uploadError } = await supabase.storage
    .from('lease-documents')
    .upload(filePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('Erreur upload détaillée:', uploadError);
    throw new Error(`Erreur lors de l'upload du PDF: ${uploadError.message}`);
  }

  console.log('Upload réussi pour:', filePath);

  // 6. Créer une URL signée valide 1 an
  const { data: urlData, error: urlError } = await supabase.storage
    .from('lease-documents')
    .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 an

  if (urlError || !urlData) {
    throw new Error(`Erreur lors de la création de l'URL: ${urlError?.message}`);
  }

  // 7. Mettre à jour le contrat avec l'URL du document
  const { error: updateError } = await supabase
    .from('lease_contracts')
    .update({ document_url: urlData.signedUrl })
    .eq('id', leaseId);

  if (updateError) {
    throw new Error(`Erreur lors de la mise à jour du contrat: ${updateError.message}`);
  }

  return urlData.signedUrl;
}

/**
 * Régénère le PDF du contrat (par ex. après modification)
 */
export async function regenerateContract(leaseId: string): Promise<string> {
  // Supprimer l'ancien fichier s'il existe
  const { data: contract } = await supabase
    .from('lease_contracts')
    .select('contract_number')
    .eq('id', leaseId)
    .single();

  if (contract) {
    const fileName = `contrat-${contract.contract_number.replace(/[^a-zA-Z0-9-]/g, '')}.pdf`;
    const filePath = `${leaseId}/${fileName}`;

    await supabase.storage.from('lease-documents').remove([filePath]);
  }

  return generateAndUploadContract(leaseId);
}

/**
 * Télécharge le PDF du contrat
 */
export async function downloadContract(documentUrl: string, filename: string): Promise<void> {
  const response = await fetch(documentUrl);
  const blob = await response.blob();

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Supprime un contrat brouillon
 */
export async function deleteContract(leaseId: string): Promise<void> {
  // Vérifier que le contrat est un brouillon
  const { data: contract, error: fetchError } = await supabase
    .from('lease_contracts')
    .select('status, contract_number')
    .eq('id', leaseId)
    .single();

  if (fetchError || !contract) {
    throw new Error('Contrat introuvable');
  }

  if (contract.status !== 'brouillon') {
    throw new Error('Seuls les brouillons peuvent être supprimés');
  }

  // Supprimer les fichiers du storage
  const fileName = `contrat-${contract.contract_number.replace(/[^a-zA-Z0-9-]/g, '')}.pdf`;
  const filePath = `${leaseId}/${fileName}`;

  await supabase.storage.from('lease-documents').remove([filePath]);

  // Supprimer le contrat
  const { error: deleteError } = await supabase.from('lease_contracts').delete().eq('id', leaseId);

  if (deleteError) {
    throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
  }
}

/**
 * Envoie un rappel de signature au locataire
 */
export async function sendSignatureReminder(leaseId: string, tenantId: string): Promise<void> {
  // Créer une notification pour le locataire
  const { error } = await supabase.from('notifications').insert({
    user_id: tenantId,
    title: 'Rappel de signature',
    message: 'Vous avez un contrat de bail en attente de votre signature.',
    type: 'info',
    action_url: `/signer-bail/${leaseId}`,
    channel: 'in_app',
  });

  if (error) {
    throw new Error(`Erreur lors de l'envoi du rappel: ${error.message}`);
  }
}

/**
 * Résilie un contrat actif
 */
export async function terminateContract(leaseId: string, _reason: string): Promise<void> {
  // Get lease details first
  const { data: lease } = await supabase
    .from('lease_contracts')
    .select('property_id')
    .eq('id', leaseId)
    .single();

  const { error } = await supabase
    .from('lease_contracts')
    .update({
      status: 'resilie',
      updated_at: new Date().toISOString(),
    })
    .eq('id', leaseId);

  if (error) {
    throw new Error(`Erreur lors de la résiliation: ${error.message}`);
  }

  // Update property status back to available
  if (lease?.property_id) {
    await supabase.from('properties').update({ status: 'disponible' }).eq('id', lease.property_id);
  }

  // Send termination notification
  try {
    const { notifyLeaseTerminated } =
      await import('@/services/notifications/leaseNotificationService');
    await notifyLeaseTerminated(leaseId);
  } catch (notifError) {
    console.error('Error sending termination notification:', notifError);
  }
}
