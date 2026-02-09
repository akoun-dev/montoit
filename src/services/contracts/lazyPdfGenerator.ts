import type { ContractData } from './contractPdfGenerator';
import type { LeaseContractData } from './htmlContractGenerator';
import { generateLeaseContractPDF as generateHTMLContractPDF } from './htmlContractGenerator';

/**
 * Convertit les données de l'ancien format ContractData vers LeaseContractData
 * pour assurer la compatibilité avec le code existant
 */
function mapContractDataToLeaseContractData(data: ContractData): LeaseContractData {
  return {
    contractNumber: data.leaseId,
    propertyTitle: data.propertyTitle,
    propertyAddress: data.propertyAddress,
    propertyCity: data.propertyCity,
    propertyType: 'Appartement', // Valeur par défaut, pourrait être ajoutée à ContractData
    surfaceArea: 50, // Valeur par défaut, pourrait être ajoutée à ContractData
    bedrooms: 1, // Valeur par défaut, pourrait être ajoutée à ContractData
    bathrooms: 1, // Valeur par défaut, pourrait être ajoutée à ContractData
    landlordName: data.landlordName,
    landlordEmail: data.landlordEmail,
    landlordPhone: data.landlordPhone,
    tenantName: data.tenantName,
    tenantEmail: data.tenantEmail,
    tenantPhone: data.tenantPhone,
    monthlyRent: data.monthlyRent,
    depositAmount: data.depositAmount,
    chargesAmount: data.chargesAmount,
    startDate: data.startDate,
    endDate: data.endDate,
    paymentDay: data.paymentDay,
    customClauses: data.customClauses,
    contractCity: 'Abidjan',
    coproprieteChargesLocataire: false,
    coproprieteChargesBailleur: false,
  };
}

/**
 * Génère un PDF de contrat de bail en utilisant le nouveau générateur HTML
 * Cette fonction maintient la compatibilité avec l'ancienne interface ContractData
 */
export async function generateContractPDF(contractData: ContractData): Promise<Blob> {
  const leaseData = mapContractDataToLeaseContractData(contractData);
  return await generateHTMLContractPDF(leaseData);
}

/**
 * Télécharge le PDF du contrat
 * Cette fonction maintient la compatibilité avec l'ancienne interface ContractData
 */
export async function downloadContractPDF(
  contractData: ContractData,
  filename: string = 'contrat-location.pdf'
): Promise<void> {
  const leaseData = mapContractDataToLeaseContractData(contractData);
  const { downloadLeaseContractPDF } = await import('./htmlContractGenerator');
  await downloadLeaseContractPDF(leaseData, filename);
}

/**
 * Nouvelle fonction qui accepte directement le format LeaseContractData
 * pour les nouveaux cas d'utilisation
 */
export async function generateContractPDFFromLeaseData(leaseData: LeaseContractData): Promise<Blob> {
  return await generateHTMLContractPDF(leaseData);
}
