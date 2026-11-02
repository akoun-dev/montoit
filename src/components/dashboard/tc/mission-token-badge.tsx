'use client'

/**
 * TC-006 — Badge & actions « lien d'accès éphémère » des missions TC.
 *
 * Deux briques réutilisables (une seule implémentation, zéro duplication
 * entre missions.tsx et agents.tsx) :
 * - `MissionTokenBadge`  : badge compact de statut du lien (listes).
 * - `MissionAccessPanel` : badge + (Re)envoyer / Révoquer (détail de mission).
 *
 * Palette SANS bleu (design system Mon Toit CI — orange primaire `brand`) :
 *   envoyé = gris · ouvert = ambre · rendu = vert · expiré = rouge ·
 *   révoqué = gris barré.
 *
 * Dégradation gracieuse : tant que GET /api/tc/missions/[id]/access-link
 * n'existe pas (404/405 → `data: null`), aucun badge n'est rendu et aucun
 * crash possible (feature flag implicite). Le POST/DELETE (livrés en TC-002)
 * restent utilisables depuis le panneau.
 *
 * Accessibilité : `title` (tooltip) + `aria-label` sur les badges et boutons
 * icône, focus-visible natif des composants shadcn/ui, contrastes AA (textes
 * -600/-700 sur fonds -100).
 */

import { useState } from 'react'
import { Ban, Check, Copy, ExternalLink, Link2, Loader2, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  deriveTokenStatus,
  pickCurrentToken,
  type MissionTokenStatus,
} from '@/services/tc/mission-access'
import {
  useMissionTokens,
  useResendToken,
  useRevokeToken,
} from '@/hooks/tc/use-mission-access'

// ─── Métadonnées des 5 statuts de badge ─────────────────────────────────────

const TOKEN_STATUS_META: Record<
  MissionTokenStatus,
  { label: string; badgeClass: string; title: string }
> = {
  sent: {
    label: 'Envoyé',
    badgeClass: 'bg-gray-100 text-gray-600 border-gray-200',
    title: 'Lien envoyé à l\u2019agent, pas encore ouvert',
  },
  opened: {
    label: 'Ouvert',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    title: 'Lien ouvert par l\u2019agent — rapport pas encore rendu',
  },
  submitted: {
    label: 'Rendu',
    badgeClass: 'bg-green-100 text-green-700 border-green-200',
    title: 'Rapport rendu via le lien d\u2019accès',
  },
  expired: {
    label: 'Expiré',
    badgeClass: 'bg-red-100 text-red-700 border-red-200',
    title: 'Lien expiré — générez un nouveau lien',
  },
  revoked: {
    label: 'Révoqué',
    badgeClass: 'bg-gray-100 text-gray-500 border-gray-200 line-through',
    title: 'Lien révoqué — il n\u2019est plus utilisable',
  },
}

/** URL absolue depuis le chemin relatif `/m/{token}` (SSR-safe). */
function toAbsoluteUrl(url: string): string {
  if (typeof window === 'undefined') return url
  try {
    return new URL(url, window.location.origin).toString()
  } catch {
    return url
  }
}

// ─── Badge compact (listes) ─────────────────────────────────────────────────

/**
 * Badge de statut du lien d'accès d'une mission. Ne rend RIEN tant que le
 * GET n'a pas répondu (chargement), s'il est indisponible (404/405) ou en
 * erreur — dégradation gracieuse, jamais de crash.
 */
export function MissionTokenBadge({ missionId }: { missionId: string }) {
  const tokensQuery = useMissionTokens(missionId)
  const tokens = tokensQuery.data

  if (tokens === undefined || tokens === null || tokensQuery.isError) return null

  const current = pickCurrentToken(tokens)
  if (!current) return null

  const meta = TOKEN_STATUS_META[deriveTokenStatus(current)]
  return (
    <Badge
      className={cn('gap-1 border text-[10px]', meta.badgeClass)}
      title={meta.title}
      aria-label={`Lien d'accès : ${meta.label}`}
    >
      <Link2 className="size-3" aria-hidden="true" />
      {meta.label}
    </Badge>
  )
}

// ─── Panneau complet (détail de mission) ────────────────────────────────────

interface MissionAccessPanelProps {
  missionId: string
  /** Statut de la mission — désactive l'envoi si CANCELLED (refus serveur). */
  missionStatus?: string
  /** Ouvre le lien généré (ex. openInWebView Capacitor) — défaut : window.open. */
  onOpenUrl?: (url: string) => void
}

type ConfirmAction = 'resend' | 'revoke' | null

/**
 * Panneau « Lien d'accès agent » du dialog de détail mission (missions.tsx) :
 * badge de statut + (Re)envoyer le lien (confirmation) + Révoquer (si un lien
 * actif existe, confirmation) + affichage du token clair une seule fois.
 */
export function MissionAccessPanel({ missionId, missionStatus, onOpenUrl }: MissionAccessPanelProps) {
  const tokensQuery = useMissionTokens(missionId)
  const resend = useResendToken(missionId)
  const revoke = useRevokeToken(missionId)

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [copied, setCopied] = useState(false)

  const tokens = tokensQuery.data
  // `null` = GET absent (404/405) → pas de badge ni de bouton Révoquer
  // (on ne sait pas si un lien actif existe), mais l'envoi reste possible.
  const tokensAvailable = Array.isArray(tokens)
  const current = Array.isArray(tokens) ? pickCurrentToken(tokens) : null
  const currentStatus = current ? deriveTokenStatus(current) : null
  const hasActiveLink = Boolean(current) && currentStatus !== 'revoked' && currentStatus !== 'expired'
  const isCancelled = missionStatus === 'CANCELLED'

  // Token clair : n'existe qu'après un POST réussi — affiché une seule fois.
  const sentLink = resend.data
  const sentLinkUrl = sentLink ? toAbsoluteUrl(sentLink.url) : ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sentLinkUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
      toast.success('Lien copié dans le presse-papiers')
    } catch {
      toast.error('Copie impossible — sélectionnez le lien manuellement')
    }
  }

  const handleOpen = () => {
    const open =
      onOpenUrl ?? ((url: string) => window.open(url, '_blank', 'noopener,noreferrer'))
    open(sentLinkUrl)
  }

  const handleConfirmResend = () => {
    setConfirmAction(null)
    resend.mutate({}, {
      onSuccess: () => toast.success('Nouveau lien généré — transmettez-le à l\u2019agent'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Échec de l\u2019envoi du lien'),
    })
  }

  const handleConfirmRevoke = () => {
    if (!current) return
    setConfirmAction(null)
    revoke.mutate(current.id, {
      onSuccess: (res) =>
        toast.success(
          res.revoked > 0
            ? 'Lien révoqué — il n\u2019est plus utilisable'
            : 'Aucun lien actif à révoquer',
        ),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Échec de la révocation'),
    })
  }

  const meta = currentStatus ? TOKEN_STATUS_META[currentStatus] : null

  return (
    <div className="p-3 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Link2 className="size-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs font-medium text-muted-foreground">Lien d’accès agent (éphémère)</p>
      </div>

      {/* Badge statut + échéance — masqués si le GET n'est pas encore disponible */}
      {tokensAvailable && current && meta && currentStatus && (
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge
            className={cn('gap-1 border text-[10px]', meta.badgeClass)}
            title={meta.title}
            aria-label={`Lien d'accès : ${meta.label}`}
          >
            <Link2 className="size-3" aria-hidden="true" />
            {meta.label}
          </Badge>
          {currentStatus !== 'revoked' && currentStatus !== 'expired' && (
            <span className="text-xs text-muted-foreground">
              expire le{' '}
              {new Date(current.expires_at).toLocaleString('fr-FR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          className="bg-brand-500 hover:bg-brand-600 text-white gap-1"
          onClick={() => setConfirmAction('resend')}
          disabled={isCancelled || resend.isPending}
          title={
            isCancelled
              ? 'Mission annulée — lien indisponible'
              : 'Générer et envoyer un nouveau lien d\u2019accès à l\u2019agent'
          }
          aria-label="Envoyer le lien d'accès à l'agent"
        >
          {resend.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-3.5" aria-hidden="true" />
          )}
          (Re)envoyer le lien
        </Button>

        {tokensAvailable && hasActiveLink && current && (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
            onClick={() => setConfirmAction('revoke')}
            disabled={revoke.isPending}
            title="Invalider immédiatement le lien actif"
            aria-label="Révoquer le lien d'accès actif"
          >
            {revoke.isPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Ban className="size-3.5" aria-hidden="true" />
            )}
            Révoquer
          </Button>
        )}
      </div>

      {/* Token clair — visible UNE seule fois après génération (TC-002) */}
      {sentLink && (
        <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200" role="status">
          <p className="text-xs font-medium text-amber-700 mb-1">
            Lien généré — visible une seule fois, transmettez-le à l’agent
          </p>
          <p className="text-xs font-mono break-all text-foreground select-all">{sentLinkUrl}</p>
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-7 text-xs"
              onClick={handleCopy}
              title="Copier le lien d'accès"
              aria-label="Copier le lien d'accès dans le presse-papiers"
            >
              {copied ? (
                <Check className="size-3.5 text-green-600" aria-hidden="true" />
              ) : (
                <Copy className="size-3.5" aria-hidden="true" />
              )}
              Copier
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 h-7 text-xs"
              onClick={handleOpen}
              title="Ouvrir le lien d'accès"
              aria-label="Ouvrir le lien d'accès dans le navigateur"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Ouvrir
            </Button>
          </div>
          <p className="text-[11px] text-amber-700 mt-2">
            Canal : {sentLink.channel} · expire le{' '}
            {new Date(sentLink.expiresAt).toLocaleString('fr-FR', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
            {sentLink.revokedPrevious > 0 &&
              ` · ${sentLink.revokedPrevious} ancien${sentLink.revokedPrevious > 1 ? 's' : ''} lien${sentLink.revokedPrevious > 1 ? 's' : ''} révoqué${sentLink.revokedPrevious > 1 ? 's' : ''}`}
          </p>
        </div>
      )}

      {/* Confirmation (Re)envoi : la relance révoque les liens actifs */}
      <ConfirmDialog
        open={confirmAction === 'resend'}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        title="Envoyer le lien d'accès ?"
        description="Un nouveau lien sera généré et transmis à l'agent. Les liens encore actifs de cette mission seront automatiquement révoqués."
        confirmLabel={resend.isPending ? 'Envoi…' : 'Envoyer le lien'}
        cancelLabel="Annuler"
        onConfirm={handleConfirmResend}
        variant="default"
      />

      {/* Confirmation Révocation (destructive) */}
      <ConfirmDialog
        open={confirmAction === 'revoke'}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        title="Révoquer le lien d'accès ?"
        description="L'agent ne pourra plus utiliser ce lien pour accéder à la mission. Vous pourrez en générer un nouveau à tout moment."
        confirmLabel={revoke.isPending ? 'Révocation…' : 'Révoquer'}
        cancelLabel="Annuler"
        onConfirm={handleConfirmRevoke}
        variant="destructive"
      />
    </div>
  )
}
