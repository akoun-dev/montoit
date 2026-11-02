/**
 * Service centralisé pour la gestion des règles métier
 * Permet d'accéder aux règles paramétrables depuis le backend
 */

const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'];
const SUPABASE_KEY = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];

export interface BusinessRule {
  key: string;
  name: string;
  category: string;
  type: 'number' | 'boolean' | 'percentage' | 'json';
  value: number | boolean | Record<string, unknown> | null;
  description: string | null;
  isEnabled: boolean;
  minValue: number | null;
  maxValue: number | null;
}

// Cache local pour éviter les appels répétitifs
const rulesCache: Map<string, { rule: BusinessRule; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Récupère une règle métier par sa clé
 */
export async function getBusinessRule(ruleKey: string): Promise<BusinessRule | null> {
  // Check cache first
  const cached = rulesCache.get(ruleKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.rule;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-business-rule?key=${ruleKey}`, {
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch business rule');
    }

    const rule = await response.json();

    // Update cache
    rulesCache.set(ruleKey, { rule, timestamp: Date.now() });

    return rule;
  } catch (error) {
    console.error(`[businessRulesService] Error fetching rule ${ruleKey}:`, error);
    return null;
  }
}

/**
 * Récupère plusieurs règles par catégorie
 */
export async function getBusinessRulesByCategory(category: string): Promise<BusinessRule[]> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/get-business-rule?category=${category}`,
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch business rules');
    }

    const result = await response.json();
    return result.rules || [];
  } catch (error) {
    console.error(`[businessRulesService] Error fetching category ${category}:`, error);
    return [];
  }
}

/**
 * Récupère la valeur numérique d'une règle
 */
export async function getNumericRule(ruleKey: string, defaultValue: number = 0): Promise<number> {
  const rule = await getBusinessRule(ruleKey);
  if (!rule || !rule.isEnabled) return defaultValue;
  return typeof rule.value === 'number' ? rule.value : defaultValue;
}

/**
 * Récupère la valeur booléenne d'une règle
 */
export async function getBooleanRule(
  ruleKey: string,
  defaultValue: boolean = false
): Promise<boolean> {
  const rule = await getBusinessRule(ruleKey);
  if (!rule || !rule.isEnabled) return defaultValue;
  return typeof rule.value === 'boolean' ? rule.value : defaultValue;
}

/**
 * Calcule les frais de paiement Mobile Money
 */
export async function calculatePaymentFees(amount: number): Promise<{
  montoitFee: number;
  intouchFee: number;
  totalFees: number;
  totalAmount: number;
}> {
  const [montoitRate, intouchRate] = await Promise.all([
    getNumericRule('fee_rate_montoit', 1),
    getNumericRule('fee_rate_intouch', 1.5),
  ]);

  const montoitFee = Math.round((amount * montoitRate) / 100);
  const intouchFee = Math.round((amount * intouchRate) / 100);
  const totalFees = montoitFee + intouchFee;

  return {
    montoitFee,
    intouchFee,
    totalFees,
    totalAmount: amount + totalFees,
  };
}

/**
 * Calcule la répartition des commissions sur un loyer
 */
export async function calculateCommissions(amount: number): Promise<{
  ansut: number;
  maelys: number;
  montoit: number;
  landlordAmount: number;
}> {
  const [ansutRate, maelysRate, montoitRate] = await Promise.all([
    getNumericRule('commission_ansut', 30),
    getNumericRule('commission_maelys', 20),
    getNumericRule('commission_montoit', 50),
  ]);

  // Les commissions sont prélevées sur un pourcentage du loyer (ex: 5%)
  const commissionBase = Math.round(amount * 0.05); // 5% du loyer en commission

  const ansut = Math.round((commissionBase * ansutRate) / 100);
  const maelys = Math.round((commissionBase * maelysRate) / 100);
  const montoit = Math.round((commissionBase * montoitRate) / 100);

  const landlordAmount = amount - commissionBase;

  return {
    ansut,
    maelys,
    montoit,
    landlordAmount,
  };
}

/**
 * Récupère les frais obligatoires (inscription, publication, signature)
 */
export async function getMandatoryFees(): Promise<{
  registration: number;
  publication: number;
  leaseSigning: number;
}> {
  const [registration, publication, leaseSigning] = await Promise.all([
    getNumericRule('registration_fee', 2000),
    getNumericRule('publication_fee', 1000),
    getNumericRule('lease_signing_fee', 6000),
  ]);

  return { registration, publication, leaseSigning };
}

/**
 * Récupère les délais configurés
 */
export async function getDelays(): Promise<{
  firstReminder: number;
  finalReminder: number;
  landlordTransfer: number;
}> {
  const [firstReminder, finalReminder, landlordTransfer] = await Promise.all([
    getNumericRule('reminder_delay_first', 7),
    getNumericRule('reminder_delay_final', 0),
    getNumericRule('landlord_transfer_delay', 2),
  ]);

  return { firstReminder, finalReminder, landlordTransfer };
}

/**
 * Vérifie si une gate (porte de validation) est active
 */
export async function isGateActive(gateKey: string): Promise<boolean> {
  return getBooleanRule(gateKey, true);
}

/**
 * Récupère les exigences de vérification
 */
export async function getVerificationRequirements(): Promise<{
  nni: boolean;
  face: boolean;
  cnam: boolean;
}> {
  const [nni, face, cnam] = await Promise.all([
    getBooleanRule('require_nni_verification', true),
    getBooleanRule('require_face_verification', true),
    getBooleanRule('require_cnam_verification', false),
  ]);

  return { nni, face, cnam };
}

/**
 * Récupère les limites configurées
 */
export async function getLimits(): Promise<{
  minRent: number;
  maxRent: number;
  maxPhotos: number;
  minTrustScore: number;
}> {
  const [minRent, maxRent, maxPhotos, minTrustScore] = await Promise.all([
    getNumericRule('min_rent_amount', 25000),
    getNumericRule('max_rent_amount', 5000000),
    getNumericRule('max_photos_per_property', 10),
    getNumericRule('trust_score_minimum', 50),
  ]);

  return { minRent, maxRent, maxPhotos, minTrustScore };
}

/**
 * Efface le cache (à appeler après une mise à jour)
 */
export function clearRulesCache(): void {
  rulesCache.clear();
}

/**
 * Catégories disponibles
 */
export const RULE_CATEGORIES = {
  payments: 'Paiements obligatoires',
  commissions: 'Commissions',
  fees: 'Frais de paiement',
  delays: 'Délais',
  verification: 'Vérification identité',
  gates: 'Portes de validation',
  limits: 'Limites et seuils',
} as const;

export type RuleCategory = keyof typeof RULE_CATEGORIES;
