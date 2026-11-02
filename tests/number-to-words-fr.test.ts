/**
 * Tests unitaires du helper de conversion en toutes lettres (français)
 * — FUN-005 / FUN-001 (quittances de loyer « Mon Toit CI »).
 *
 * Source : src/lib/number-to-words-fr.ts
 * Cas exigés par la spec .ai/SPECS/FUN-001-quittances.md §9 (FUN-005) :
 *   0, 1, 71, 80, 81, 100, 200, 1000, 21 000, 200 000, 1 000 000, 2 500 000.
 *
 * Convention orthographique : rectifications de 1990 — traits d'union entre
 * tous les éléments du nombre composé (« soixante-et-onze »,
 * « quatre-vingt-onze », « cent-soixante-mille »). Invariabilité conservée :
 * « quatre-vingts » / « deux-cents » perdent leur « s » devant « mille »
 * (« quatre-vingt-mille », « deux-cent-mille ») mais le gardent devant
 * « millions » (nom) : « quatre-vingts-millions ».
 *
 * Exécution : bunx vitest run tests/number-to-words-fr.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  numberToFrenchWords,
  formatAmountInWordsFcfa,
  NUMBER_TO_WORDS_FR_MAX,
} from '@/lib/number-to-words-fr'

// ─── Cas exigés par la spec §9 (FUN-005) ────────────────────────────────────

describe('numberToFrenchWords — cas de la spec FUN-001 §9', () => {
  it.each([
    [0, 'zéro'],
    [1, 'un'],
    [71, 'soixante-et-onze'],
    [80, 'quatre-vingts'],
    [81, 'quatre-vingt-un'],
    [100, 'cent'],
    [200, 'deux-cents'],
    [1000, 'mille'],
    [21_000, 'vingt-et-un-mille'],
    [200_000, 'deux-cent-mille'],
    [1_000_000, 'un-million'],
    [2_500_000, 'deux-millions-cinq-cent-mille'],
  ])('convertit %d en « %s »', (input, expected) => {
    expect(numberToFrenchWords(input)).toBe(expected)
  })
})

// ─── Règles linguistiques fines (rectification 1990) ────────────────────────

describe('numberToFrenchWords — règles linguistiques', () => {
  it.each([
    [16, 'seize'],
    [17, 'dix-sept'],
    [20, 'vingt'],
    [21, 'vingt-et-un'], // « et » rectifié avec traits d'union
    [22, 'vingt-deux'],
    [61, 'soixante-et-un'],
    [70, 'soixante-dix'],
    [75, 'soixante-quinze'],
    [79, 'soixante-dix-neuf'],
    [90, 'quatre-vingt-dix'],
    [91, 'quatre-vingt-onze'], // pas de « et » sur 91
    [99, 'quatre-vingt-dix-neuf'],
  ])('gère les dizaines composées : %d → « %s »', (input, expected) => {
    expect(numberToFrenchWords(input)).toBe(expected)
  })

  it.each([
    [300, 'trois-cents'], // cent multiplié + rien derrière → pluriel
    [301, 'trois-cent-un'], // cent suivi d'un nombre → invariable
    [80_000, 'quatre-vingt-mille'], // pas de « s » devant « mille »
    [100_000, 'cent-mille'],
    [160_000, 'cent-soixante-mille'], // exemple de la spec §5.2
    [180_000, 'cent-quatre-vingt-mille'], // « s » interdit devant « mille »
    [280_000, 'deux-cent-quatre-vingt-mille'], // idem, après « cent »
    [2_000_000, 'deux-millions'], // million = nom → pluriel
  ])('gère l\'invariabilité devant mille : %d → « %s »', (input, expected) => {
    expect(numberToFrenchWords(input)).toBe(expected)
  })

  it('convertit le maximum du domaine 999 999 999', () => {
    expect(numberToFrenchWords(999_999_999)).toBe(
      'neuf-cent-quatre-vingt-dix-neuf-millions-' +
        'neuf-cent-quatre-vingt-dix-neuf-mille-' +
        'neuf-cent-quatre-vingt-dix-neuf'
    )
  })
})

// ─── Cas limites et erreurs ─────────────────────────────────────────────────

describe('numberToFrenchWords — cas limites', () => {
  it('expose la borne haute du domaine : 999 999 999', () => {
    expect(NUMBER_TO_WORDS_FR_MAX).toBe(999_999_999)
    expect(() => numberToFrenchWords(NUMBER_TO_WORDS_FR_MAX)).not.toThrow()
  })

  it('rejette un nombre négatif (RangeError)', () => {
    expect(() => numberToFrenchWords(-1)).toThrow(RangeError)
    expect(() => numberToFrenchWords(-150_000)).toThrow(RangeError)
  })

  it('rejette une valeur au-delà de 999 999 999 (RangeError)', () => {
    expect(() => numberToFrenchWords(1_000_000_000)).toThrow(RangeError)
    expect(() => numberToFrenchWords(Number.MAX_SAFE_INTEGER)).toThrow(RangeError)
  })

  it('rejette les non-entiers (TypeError) — le FCFA n\'a pas de subdivision', () => {
    expect(() => numberToFrenchWords(1.5)).toThrow(TypeError)
    expect(() => numberToFrenchWords(150_000.99)).toThrow(TypeError)
  })

  it('rejette NaN et Infinity (TypeError)', () => {
    expect(() => numberToFrenchWords(Number.NaN)).toThrow(TypeError)
    expect(() => numberToFrenchWords(Number.POSITIVE_INFINITY)).toThrow(TypeError)
  })
})

// ─── formatAmountInWordsFcfa — libellé « franc(s) CFA » ─────────────────────

describe('formatAmountInWordsFcfa', () => {
  it('formate un loyer type : 160 000 → « cent-soixante-mille francs CFA »', () => {
    expect(formatAmountInWordsFcfa(160_000)).toBe('cent-soixante-mille francs CFA')
  })

  it('accorde « francs » au pluriel au-delà de 1', () => {
    expect(formatAmountInWordsFcfa(75_000)).toBe('soixante-quinze-mille francs CFA')
    expect(formatAmountInWordsFcfa(2_500_000)).toBe(
      'deux-millions-cinq-cent-mille francs CFA'
    )
  })

  it('met « franc » au singulier pour 0 et 1', () => {
    expect(formatAmountInWordsFcfa(0)).toBe('zéro franc CFA')
    expect(formatAmountInWordsFcfa(1)).toBe('un franc CFA')
  })

  it('arrondit les montants réels à l\'entier (real/float, pas de subdivision)', () => {
    expect(formatAmountInWordsFcfa(150_000.4)).toBe('cent-cinquante-mille francs CFA')
    expect(formatAmountInWordsFcfa(150_000.6)).toBe(
      'cent-cinquante-mille-un francs CFA'
    )
  })

  it('est tolérant aux valeurs non numériques (NaN → zéro franc CFA)', () => {
    expect(formatAmountInWordsFcfa(Number.NaN)).toBe('zéro franc CFA')
  })

  it('propage l\'erreur RangeError si l\'arrondi dépasse le domaine du helper', () => {
    // 999 999 999.6 s'arrondit à 1 000 000 000 → hors domaine ;
    // la route quittance entoure l'appel d'un try/catch (repli en chiffres).
    expect(() => formatAmountInWordsFcfa(999_999_999.6)).toThrow(RangeError)
  })
})
