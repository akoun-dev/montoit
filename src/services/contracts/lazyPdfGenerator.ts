import type { ContractData } from './contractPdfGenerator';

export async function generateContractPDF(contractData: ContractData): Promise<Blob> {
  const { ContractPdfGenerator } = await import('./contractPdfGenerator');

  const generator = new ContractPdfGenerator();
  return generator.generate(contractData);
}

export async function downloadContractPDF(
  contractData: ContractData,
  filename: string = 'contrat-location.pdf'
): Promise<void> {
  const { ContractPdfGenerator } = await import('./contractPdfGenerator');

  const generator = new ContractPdfGenerator();
  const pdfBlob = await generator.generate(contractData);

  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
