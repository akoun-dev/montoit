/**
 * number-to-words-fr.ts — Montants en toutes lettres (français) pour les
 * quittances de loyer (FUN-001 — mentions légales : montant en chiffres ET
 * en toutes lettres).
 *
 * Règles implémentées (orthographe rectifiée de 1990) :
 *   - Traits d'union entre TOUS les éléments d'un nombre composé
 *     (« trois-cent-quarante-deux », « vingt-et-un », « quatre-vingt-onze »),
 *     y compris autour de « et » (rectifications de 1990).
 *   - 70/71  → « soixante-dix » / « soixante-et-onze »
 *   - 80/81  → « quatre-vingts » / « quatre-vingt-un » (pas de « et »)
 *   - 90/91  → « quatre-vingt-dix » / « quatre-vingt-onze »
 *   - « cent » : invariable devant un autre nombre (« deux-cent-trois »),
 *     pluriel sinon (« deux-cents ») ; « cent » invariable (= 100).
 *   - « mille » : TOUJOURS invariable (« deux-mille », « quatre-vingt-mille »
 *     — pas de « s » non plus sur vingt/cent devant mille).
 *   - « million » : nom, prend le pluriel (« deux-cents-millions »).
 *
 * Domaine géré : entiers de 0 à 999 999 999 (les loyers FCFA n'ont pas de
 * subdivision ; la route serveur arrondit à l'entier avant appel).
 */

// ─── Tables lexicales ───────────────────────────────────────────────────────

const UNITS_0_19: readonly string[] = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit',
  'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
]

const TENS_20_69: Readonly<Record<number, string>> = {
  2: 'vingt',
  3: 'trente',
  4: 'quarante',
  5: 'cinquante',
  6: 'soixante',
}

// ─── Décompositions ─────────────────────────────────────────────────────────

/**
 * 0..99 — dizaines « simples » (20-69), « soixante-dix » (70-79),
 * « quatre-vingt(s) » (80-89, 90-99).
 * @param allowPlural autorise le « s » de « quatre-vingts » (désactivé
 * quand « mille » suit, cf. « quatre-vingt-mille »).
 */
function belowHundred(n: number, allowPlural = true): string {
  if (n < 0 || n > 99) throw new RangeError(`belowHundred: hors domaine (${n})`)
  if (n < 20) return UNITS_0_19[n]

  const tens = Math.floor(n / 10)
  const unit = n % 10

  // 70-79 et 90-99 : soixante-dix… / quatre-vingt-dix…
  if (tens === 7 || tens === 9) {
    const base = tens === 7 ? 'soixante' : 'quatre-vingt'
    const remainder = n - (tens === 7 ? 60 : 80) // 10..19
    // Seul 71 prend « et » (soixante-et-onze) ; 91 → quatre-vingt-onze.
    if (remainder === 11 && tens === 7) return `${base}-et-onze`
    return `${base}-${UNITS_0_19[remainder]}`      // 70 → soixante-dix
  }

  // 80-89 : quatre-vingt(s)-… (81 → quatre-vingt-un, sans « et » ni « s »)
  if (tens === 8) {
    if (unit === 0) return allowPlural ? 'quatre-vingts' : 'quatre-vingt'
    return `quatre-vingt-${belowHundred(unit)}`
  }

  // 20-69 : vingt/trente/…-un|deux|… (« vingt-et-un », rectifié)
  const base = TENS_20_69[tens]
  if (unit === 0) return base
  if (unit === 1) return `${base}-et-un`
  return `${base}-${UNITS_0_19[unit]}`
}

/**
 * 1..999 — « cent » : pluriel uniquement si multiplié et non suivi d'un
 * autre nombre (« deux-cents » mais « deux-cent-trois »).
 * `allowPlural` est PROPAGÉ aux dizaines sous les centaines : « quatre-vingts »
 * perd son « s » devant « mille » (« cent-quatre-vingt-mille », jamais
 * « cent-quatre-vingts-mille » — invariabilité devant un autre nombre).
 */
function belowThousand(n: number, allowPlural = true): string {
  if (n <= 0 || n > 999) throw new RangeError(`belowThousand: hors domaine (${n})`)
  if (n < 100) return belowHundred(n, allowPlural)

  const hundreds = Math.floor(n / 100)
  const rest = n % 100

  const hundredsWord =
    hundreds === 1
      ? 'cent'
      : `${UNITS_0_19[hundreds]}-cent${rest === 0 && allowPlural ? 's' : ''}`

  return rest === 0 ? hundredsWord : `${hundredsWord}-${belowHundred(rest, allowPlural)}`
}

// ─── API publique ───────────────────────────────────────────────────────────

/** Valeur maximale gérée : 999 999 999. */
export const NUMBER_TO_WORDS_FR_MAX = 999_999_999

/**
 * Convertit un entier (0 → 999 999 999) en toutes lettres (français,
 * orthographe rectifiée de 1990 — traits d'union entre tous les éléments).
 *
 * Exemples :
 *   0 → « zéro »            1 000 → « mille »
 *   71 → « soixante-et-onze »            80 → « quatre-vingts »
 *   200 000 → « deux-cent-mille »        2 500 000 → « deux-millions-cinq-cent-mille »
 */
export function numberToFrenchWords(value: number): string {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new TypeError(`numberToFrenchWords: entier attendu, reçu ${value}`)
  }
  if (value < 0) throw new RangeError('numberToFrenchWords: nombre négatif non géré')
  if (value > NUMBER_TO_WORDS_FR_MAX) {
    throw new RangeError(`numberToFrenchWords: montant au-delà de ${NUMBER_TO_WORDS_FR_MAX}`)
  }
  if (value === 0) return 'zéro'

  const millions = Math.floor(value / 1_000_000)
  const restAfterMillions = value % 1_000_000
  const thousands = Math.floor(restAfterMillions / 1_000)
  const rest = restAfterMillions % 1_000

  const parts: string[] = []

  // Millions : « nom » cardinal → pluriel conservé (« deux-cents-millions »).
  if (millions === 1) parts.push('un-million')
  else if (millions > 1) parts.push(`${belowThousand(millions)}-millions`)

  // Mille : invariable ; vingt/cent perdent leur « s » devant (« quatre-vingt-mille »).
  if (thousands === 1) parts.push('mille')
  else if (thousands > 1) parts.push(`${belowThousand(thousands, false)}-mille`)

  if (rest > 0) parts.push(belowThousand(rest))

  return parts.join('-')
}

/**
 * Montant FCFA en toutes lettres avec l'unité légale « franc(s) CFA ».
 * Les montants `real` (float) sont arrondis à l'entier : le FCFA n'a pas de
 * subdivision (spec FUN-001 §5.1 — « Arrondi FCFA »).
 *
 * Exemples : 160 000 → « cent-soixante-mille francs CFA » ;
 *            0 → « zéro franc CFA » ; 1 → « un franc CFA ».
 */
export function formatAmountInWordsFcfa(amount: number): string {
  const intAmount = Math.round(Number(amount) || 0)
  const words = numberToFrenchWords(intAmount)
  return `${words} ${intAmount > 1 ? 'francs' : 'franc'} CFA`
}
