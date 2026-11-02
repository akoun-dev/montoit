/**
 * Route GET /api/payments/[id]/quittance — Quittance de loyer (FUN-001)
 *
 * Contrat (spec FUN-001 §5, adapté en JSON pour rendu modale côté client) :
 *   - Auth      : resolveRequestUser → 401 si absent (middleware /api/payments).
 *   - Autorisation : payments.tenant_id = user OU leases.owner_id = user
 *     OU role ADMIN. Sinon 404 (anti-énumération : 404 plutôt que 403 ;
 *     AGENCE / TIERS_CONFIANCE hors scope v1 → 404 par la même règle).
 *   - Éligibilité  : status = 'PAID' OU ('PARTIAL' ET amount_paid >= amount
 *     - 0.01). Sinon 409 { error: "Quittance disponible uniquement pour les
 *     paiements effectués" }.
 *   - Effet de bord : 1re demande → INSERT rent_receipts (numéro séquentiel
 *     idempotent via UNIQUE(payment_id) + ON CONFLICT DO NOTHING) + audit_logs
 *     (RENT_RECEIPT_ISSUED) ; demandes suivantes → lecture seule, MÊME numéro.
 *     Numérotation FAIL-CLOSED : si le RPC next_rent_receipt_number est
 *     indisponible → 503 (aucun numéro aléatoire jamais généré — la quittance
 *     est un document à valeur probante) ; retry borné (3) sur conflit
 *     d'unicité 23505 avec ré-interrogation du RPC.
 *   - Réponse : JSON 200 { data } avec Cache-Control: no-store (données
 *     financières) et X-Content-Type-Options: nosniff.
 *   - Arrondi FCFA : montants arrondis à l'entier (le FCFA n'a pas de
 *     subdivision) ; warning loggé si le `real` source comportait un écart.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveRequestUser } from '@/lib/auth/request-user'
import { formatAmountInWordsFcfa, NUMBER_TO_WORDS_FR_MAX } from '@/lib/number-to-words-fr'

// ─── Libellés ───────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  MOOV_MONEY: 'Moov Money',
  WAVE: 'Wave',
}

// Paiements hors loyer mensuel (préfixe de référence) : libellé de période dédié.
const REFERENCE_TYPE_LABELS: ReadonlyArray<{ prefix: string; label: string }> = [
  { prefix: 'CAUTION-', label: 'Caution (dépôt de garantie)' },
  { prefix: 'AVANCE-', label: 'Avance sur loyer' },
  { prefix: 'AGENCE-', label: "Frais d'agence" },
]

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

// ─── Helpers ────────────────────────────────────────────────────────────────

/** FCFA : pas de subdivision → arrondi à l'entier. */
function toIntFcfa(value: unknown): number {
  return Math.round(Number(value) || 0)
}

/** Période mensuelle couverte par l'échéance : [1er jour du mois, dernier jour]. */
function monthPeriod(dueDate: string): { periodStart: string; periodEnd: string } {
  const d = new Date(dueDate)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 0))
  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  }
}

/** « Loyer de Mars 2026 » ou « Caution (dépôt de garantie) — Mars 2026 ». */
function periodLabel(dueDate: string, reference: string | null): string {
  const d = new Date(dueDate)
  const monthName = MONTHS_FR[d.getUTCMonth()] ?? String(d.getUTCMonth() + 1)
  const label = `${monthName} ${d.getUTCFullYear()}`
  const type = REFERENCE_TYPE_LABELS.find((t) => reference?.startsWith(t.prefix))
  return type ? `${type.label} — ${label}` : `Loyer de ${label}`
}

interface ReceiptRow {
  id: string
  receipt_number: string
  issued_at: string
  currency: string | null
  period_start: string | null
  period_end: string | null
}

/**
 * Numéro séquentiel `QT-YYYY-NNNNNN` via le RPC Postgres (migration
 * 20261027000010 : séquence dédiée + fonction SECURITY DEFINER exécutable
 * par service_role uniquement). Le nextval est atomique : deux appels
 * concurrents obtiennent deux numéros distincts.
 *
 * FAIL-CLOSED : en cas d'indisponibilité du RPC (erreur réseau, fonction
 * absente, format inattendu), retourne { number: null } — la route renverra
 * alors 503. AUCUN numéro aléatoire n'est généré : un numéro hors séquence
 * risquerait une collision sur UNIQUE(receipt_number) (500 sans recouvrement)
 * et ruinerait la valeur probante du document.
 */
const RECEIPT_NUMBER_PATTERN = /^QT-\d{4}-\d{6}$/

async function fetchNextReceiptNumber(
  supabase: ReturnType<typeof getSupabaseAdminClient>
): Promise<{ number: string | null; error: unknown }> {
  try {
    // NB : supabase-js ne lève PAS les erreurs PostgREST — il les renvoie
    // dans `error` ; le try/catch ne couvre que les échecs réseau/référence.
    const { data, error } = await (supabase as any).rpc('next_rent_receipt_number')
    if (error) return { number: null, error }
    if (typeof data === 'string' && RECEIPT_NUMBER_PATTERN.test(data)) {
      return { number: data, error: null }
    }
    return {
      number: null,
      error: new Error(`format de numéro inattendu : ${JSON.stringify(data)}`),
    }
  } catch (rpcError) {
    return { number: null, error: rpcError }
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, applyCookies } = await resolveRequestUser(req)
    if (!userId) {
      return applyCookies(
        NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      )
    }

    const { id } = await params
    const supabase = getSupabaseAdminClient()

    // ── 1) Rôle effectif (admin = supervision, cf. ACTORS.md) ───────────────
    const { data: profile } = await supabase
      .from('users')
      .select('role, active_role')
      .eq('id', userId)
      .maybeSingle()
    const isAdmin = profile?.role === 'ADMIN' || profile?.active_role === 'ADMIN'

    // ── 2) Paiement + bail + bien + parties (une seule requête) ────────────
    const { data: payment } = await (supabase
      .from('payments')
      .select(
        `
        id, amount, amount_paid, status, due_date, paid_at, reference, method,
        operator_transaction_id, operator_phone_number, tenant_id, lease_id,
        tenant:tenant_id ( id, first_name, last_name, phone, email ),
        lease:lease_id (
          id, start_date, end_date, monthly_rent, charges,
          owner_signature_image, owner_id,
          owner:owner_id ( id, first_name, last_name, company_name, phone, email ),
          property:property_id ( id, title, type, address, city )
        )
      `
      )
      .eq('id', id)
      .maybeSingle() as any)

    // ── 3) Autorisation : locataire own / propriétaire du bien / ADMIN ─────
    // 404 (et non 403) pour ne pas révéler l'existence du paiement
    // (anti-énumération). AGENCE / TIERS_CONFIANCE : hors scope v1 → 404.
    const lease = payment?.lease ?? null
    const isTenant = payment?.tenant_id === userId
    const isOwner = lease?.owner_id === userId
    if (!payment || (!isTenant && !isOwner && !isAdmin)) {
      return applyCookies(
        NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
      )
    }

    // ── 4) Éligibilité : PAID, ou PARTIAL entièrement soldé ────────────────
    const rawAmount = Number(payment.amount) || 0
    const amountPaidRaw = Number(payment.amount_paid) || 0
    const isEligible =
      payment.status === 'PAID' ||
      (payment.status === 'PARTIAL' && amountPaidRaw >= rawAmount - 0.01)
    if (!isEligible) {
      return applyCookies(
        NextResponse.json(
          { error: 'Quittance disponible uniquement pour les paiements effectués' },
          { status: 409 }
        )
      )
    }

    // ── 5) Quittance : ré-lecture idempotente, sinon émission ──────────────
    const loadReceipt = async (): Promise<ReceiptRow | null> => {
      const { data } = await (supabase
        .from('rent_receipts')
        .select('id, receipt_number, issued_at, currency, period_start, period_end')
        .eq('payment_id', id)
        .maybeSingle() as any)
      return data as ReceiptRow | null
    }

    let receipt = await loadReceipt()
    let justIssued = false

    if (!receipt) {
      // Montants arrondis FCFA + snapshots (données figées à l'émission).
      const roundedAmount = toIntFcfa(payment.amount)
      if (Math.abs(rawAmount - roundedAmount) > 0.001) {
        console.warn(
          `[quittance] Montant ${payment.id} arrondi à l'entier FCFA : ${rawAmount} → ${roundedAmount}`
        )
      }

      const { periodStart, periodEnd } = monthPeriod(payment.due_date)

      // receipt_number est fourni par tentative : en cas de conflit d'unicité
      // on ré-interroge le RPC (jamais de numéro aléatoire).
      const insertPayload = {
        payment_id: payment.id,
        lease_id: lease.id,
        period_start: periodStart,
        period_end: periodEnd,
        amount: roundedAmount,
        currency: 'XOF',
        tenant_snapshot: {
          first_name: payment.tenant?.first_name ?? null,
          last_name: payment.tenant?.last_name ?? null,
          phone: payment.tenant?.phone ?? null,
          email: payment.tenant?.email ?? null,
        },
        landlord_snapshot: {
          first_name: lease?.owner?.first_name ?? null,
          last_name: lease?.owner?.last_name ?? null,
          company_name: lease?.owner?.company_name ?? null,
          phone: lease?.owner?.phone ?? null,
          email: lease?.owner?.email ?? null,
        },
        property_snapshot: {
          title: lease?.property?.title ?? null,
          type: lease?.property?.type ?? null,
          address: lease?.property?.address ?? null,
          city: lease?.property?.city ?? null,
        },
      }

      // ── Numérotation idempotente, fail-closed ────────────────────────────
      // UNIQUE(payment_id) + ON CONFLICT DO NOTHING : sous concurrence, une
      // seule ligne survit ; la requête perdante relit la ligne gagnante
      // (pattern insert-or-select, spec FUN-001 §4).
      // Retry BORNÉ (3) : si un conflit UNIQUE(receipt_number) survient
      // (séquence déviée/réinitialisée), on ré-interroge le RPC pour obtenir
      // un NOUVEAU numéro — jamais de tirage aléatoire. Si le RPC de
      // numérotation est indisponible → 503 fail-closed (rien n'est inséré,
      // le demandeur peut réessayer sans effet de bord).
      const MAX_NUMBERING_ATTEMPTS = 3

      for (
        let attempt = 1;
        attempt <= MAX_NUMBERING_ATTEMPTS && !receipt;
        attempt++
      ) {
        if (attempt > 1) {
          // Re-lecture idempotente entre tentatives : une requête concurrente
          // a pu émettre la quittance pendant notre tentative précédente.
          receipt = await loadReceipt()
          if (receipt) break
        }

        const { number: receiptNumber, error: numberError } =
          await fetchNextReceiptNumber(supabase)
        if (!receiptNumber) {
          // Fail-closed : la quittance est un document à valeur probante —
          // pas de numérotation séquentielle ⇒ pas d'émission.
          console.error(
            '[quittance] RPC next_rent_receipt_number indisponible:',
            numberError
          )
          return applyCookies(
            NextResponse.json(
              {
                error:
                  "Service de numérotation des quittances indisponible. La quittance n'a pas été émise — veuillez réessayer.",
              },
              { status: 503, headers: { 'Retry-After': '30' } }
            )
          )
        }

        const { data: inserted, error: insertError } = await (supabase
          .from('rent_receipts') as any)
          .insert({ ...insertPayload, receipt_number: receiptNumber })
          .ignoreDuplicates()
          .select()
          .maybeSingle()

        if (insertError) {
          // 23505 = violation d'unicité (receipt_number) : théoriquement
          // impossible via séquence atomique — retry avec un nouveau numéro.
          if (
            (insertError as any)?.code === '23505' &&
            attempt < MAX_NUMBERING_ATTEMPTS
          ) {
            console.warn(
              `[quittance] Conflit de numéro ${receiptNumber} (tentative ${attempt}/${MAX_NUMBERING_ATTEMPTS}), nouveau tirage RPC…`
            )
            continue
          }
          console.error('[quittance] Erreur insertion rent_receipts:', insertError)
          return applyCookies(
            NextResponse.json(
              { error: "Erreur lors de l'émission de la quittance" },
              { status: 500 }
            )
          )
        }

        if (inserted) {
          receipt = inserted as ReceiptRow
          justIssued = true
        }
        // inserted === null : conflit d'unicité IGNORÉ (ignoreDuplicates).
        // Deux cas — soit une requête concurrente a gagné la course sur le
        // MÊME paiement (la re-lecture du prochain tour la trouvera → même
        // numéro, idempotence), soit conflit sur receipt_number (nouveau
        // numéro RPC au prochain tour).
      }

      if (!receipt) {
        // Numérotation en échec persistant après 3 tentatives (ex. séquence
        // réinitialisée) : rien n'a été inséré, on n'ÉMET PAS de quittance
        // avec un numéro douteux.
        console.error(
          `[quittance] Émission impossible après ${MAX_NUMBERING_ATTEMPTS} tentatives (conflit de numérotation), paiement ${id}`
        )
        return applyCookies(
          NextResponse.json(
            {
              error:
                "Émission de la quittance impossible (conflit de numérotation) — veuillez réessayer.",
            },
            { status: 503, headers: { 'Retry-After': '30' } }
          )
        )
      }
    }

    if (!receipt) {
      return applyCookies(
        NextResponse.json(
          { error: "Erreur lors de l'émission de la quittance" },
          { status: 500 }
        )
      )
    }

    // ── 6) Piste d'audit : RENT_RECEIPT_ISSUED, une seule fois ─────────────
    if (justIssued) {
      try {
        await (supabase.from('audit_logs') as any).insert({
          id: crypto.randomUUID(),
          action: 'RENT_RECEIPT_ISSUED',
          entity: 'RENT_RECEIPT',
          entity_id: receipt.id,
          details: JSON.stringify({
            payment_id: id,
            receipt_number: receipt.receipt_number,
            amount: toIntFcfa(payment.amount),
            issued_by: userId,
          }),
          user_id: userId,
        })
      } catch (auditError) {
        console.error('[quittance] Erreur audit_logs (non bloquant):', auditError)
      }
    }

    // ── 7) Réponse JSON : données complètes pour le rendu de la quittance ──
    let amountInWords: string
    try {
      amountInWords = formatAmountInWordsFcfa(toIntFcfa(payment.amount))
    } catch {
      // Au-delà du domaine du helper (0 → 999 999 999) : repli en chiffres.
      amountInWords = `${toIntFcfa(payment.amount).toLocaleString('fr-FR')} francs CFA`
    }
    if (toIntFcfa(payment.amount) > NUMBER_TO_WORDS_FR_MAX) {
      console.warn(`[quittance] Montant ${payment.id} hors domaine du helper lettres`)
    }

    const payload = {
      receipt: {
        id: receipt.id,
        receiptNumber: receipt.receipt_number,
        issuedAt: receipt.issued_at,
        currency: receipt.currency || 'XOF',
        amount: toIntFcfa(payment.amount),
        amountInWords,
        periodStart: receipt.period_start,
        periodEnd: receipt.period_end,
        periodLabel: periodLabel(payment.due_date, payment.reference),
      },
      tenant: {
        firstName: payment.tenant?.first_name ?? '',
        lastName: payment.tenant?.last_name ?? '',
        phone: payment.tenant?.phone ?? null,
        email: payment.tenant?.email ?? null,
      },
      landlord: {
        firstName: lease?.owner?.first_name ?? null,
        lastName: lease?.owner?.last_name ?? null,
        companyName: lease?.owner?.company_name ?? null,
        phone: lease?.owner?.phone ?? null,
        email: lease?.owner?.email ?? null,
      },
      property: {
        title: lease?.property?.title ?? '',
        type: lease?.property?.type ?? null,
        address: lease?.property?.address ?? '',
        city: lease?.property?.city ?? '',
      },
      lease: {
        startDate: lease?.start_date ?? null,
        endDate: lease?.end_date ?? null,
        monthlyRent: toIntFcfa(lease?.monthly_rent),
        charges: toIntFcfa(lease?.charges),
      },
      payment: {
        reference: payment.reference ?? null,
        method: payment.method ?? null,
        methodLabel: payment.method ? METHOD_LABELS[payment.method] ?? payment.method : null,
        operatorTransactionId: payment.operator_transaction_id ?? null,
        operatorPhoneNumber: payment.operator_phone_number ?? null,
        paidAt: payment.paid_at ?? null,
        amount: toIntFcfa(payment.amount),
        amountPaid: toIntFcfa(payment.amount_paid ?? payment.amount),
      },
      // Signature manuscrite du bailleur (data URL base64 PNG, cf. migration leases).
      signatureImage: lease?.owner_signature_image ?? null,
    }

    return applyCookies(
      NextResponse.json({ data: payload }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    )
  } catch (error) {
    console.error('Payment quittance GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
