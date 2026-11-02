import { supabase } from '@/integrations/supabase/client';

/**
 * Taux d'indexation légal du loyer en Côte d'Ivoire
 * Selon la législation ivoirienne, l'indexation du loyer est généralement limitée à 5% par an
 */
const LEGAL_INDEXATION_RATE = 0.05; // 5%
const MIN_INDEXATION_INTERVAL = 12; // 12 mois minimum entre deux indexations

export interface RentIndexation {
  id: string;
  contract_id: string;
  previous_rent: number;
  new_rent: number;
  indexation_rate: number;
  indexation_date: string;
  effective_date: string;
  reason: string;
  created_at: string;
}

export interface IndexationCalculation {
  currentRent: number;
  newRent: number;
  increaseAmount: number;
  indexationRate: number;
  legalRate: number;
  canIndex: boolean;
  reason: string;
}

/**
 * Vérifie si un contrat peut être indexé
 */
export function canIndexContract(contract: {
  start_date: string;
  end_date: string;
  last_indexation_date?: string | null;
}): boolean {
  const startDate = new Date(contract.start_date);
  const lastIndexation = contract.last_indexation_date 
    ? new Date(contract.last_indexation_date) 
    : startDate;
  
  const monthsSinceLastIndexation = 
    (new Date().getFullYear() - lastIndexation.getFullYear()) * 12 + 
    (new Date().getMonth() - lastIndexation.getMonth());
  
  return monthsSinceLastIndexation >= MIN_INDEXATION_INTERVAL;
}

/**
 * Calcule l'indexation du loyer selon la législation ivoirienne
 */
export function calculateRentIndexation(
  currentRent: number,
  lastIndexationDate?: string | null
): IndexationCalculation {
  // Vérifier si l'indexation est possible
  const monthsSinceLastIndexation = lastIndexationDate
    ? (new Date().getFullYear() - new Date(lastIndexationDate).getFullYear()) * 12 + 
      (new Date().getMonth() - new Date(lastIndexationDate).getMonth())
    : 12; // Si pas d'indexation précédente, considérer 12 mois

  if (monthsSinceLastIndexation < MIN_INDEXATION_INTERVAL) {
    return {
      currentRent,
      newRent: currentRent,
      increaseAmount: 0,
      indexationRate: 0,
      legalRate: LEGAL_INDEXATION_RATE,
      canIndex: false,
      reason: `Délai minimum de ${MIN_INDEXATION_INTERVAL} mois non atteint depuis la dernière indexation`,
    };
  }

  // Calculer l'augmentation légale (5%)
  const increaseAmount = Math.round(currentRent * LEGAL_INDEXATION_RATE);
  const newRent = currentRent + increaseAmount;

  return {
    currentRent,
    newRent,
    increaseAmount,
    indexationRate: LEGAL_INDEXATION_RATE,
    legalRate: LEGAL_INDEXATION_RATE,
    canIndex: true,
    reason: `Indexation légale de ${LEGAL_INDEXATION_RATE * 100}% applicable selon la législation ivoirienne`,
  };
}

/**
 * Récupère les indexations de loyer pour un contrat
 */
export async function getContractIndexations(contractId: string): Promise<RentIndexation[]> {
  const { data, error } = await supabase
    .from('rent_indexations')
    .select('*')
    .eq('contract_id', contractId)
    .order('indexation_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Crée une nouvelle indexation de loyer
 */
export async function createRentIndexation(
  indexation: Omit<RentIndexation, 'id' | 'created_at' | 'updated_at'>
): Promise<RentIndexation> {
  const { data, error } = await supabase
    .from('rent_indexations')
    .insert({
      ...indexation,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Applique l'indexation au contrat et met à jour le loyer
 */
export async function applyRentIndexation(
  contractId: string,
  newRent: number,
  indexationRate: number,
  reason: string
): Promise<void> {
  // Mettre à jour le contrat avec le nouveau loyer
  const { error: contractError } = await supabase
    .from('lease_contracts')
    .update({
      monthly_rent: newRent,
      last_indexation_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId);

  if (contractError) throw contractError;

  // Créer l'indexation
  await createRentIndexation({
    contract_id: contractId,
    previous_rent: 0, // À récupérer depuis le contrat
    new_rent: newRent,
    indexation_rate: indexationRate,
    indexation_date: new Date().toISOString(),
    effective_date: new Date().toISOString(),
    reason,
  });
}

/**
 * Récupère les indexations en attente pour un propriétaire
 */
export async function getPendingIndexations(ownerId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('lease_contracts')
    .select(`
      id,
      contract_number,
      monthly_rent,
      start_date,
      end_date,
      last_indexation_date,
      properties!inner (
        title,
        address
      )
    `)
    .eq('owner_id', ownerId)
    .gt('end_date', new Date().toISOString())
    .order('end_date', { ascending: true });

  if (error) throw error;
  
  // Filtrer les contrats qui peuvent être indexés
  return data
    .filter((contract: any) => canIndexContract({
      start_date: contract.start_date,
      end_date: contract.end_date,
      last_indexation_date: contract.last_indexation_date,
    }))
    .map((contract: any) => ({
      contract,
      calculation: calculateRentIndexation(
        contract.monthly_rent,
        contract.last_indexation_date
      ),
    }));
}

/**
 * Formate un pourcentage pour l'affichage
 */
export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Formate un montant en devise FCFA
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);
}
