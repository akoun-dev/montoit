'use client'

/**
 * Écrans d'état dédiés de la page /m/[token] (spec TC-001 §8 : expiré / révoqué / déjà soumis).
 * - Les erreurs de lien réutilisent l'état mutualisé `ErrorState` (src/components/shared/states)
 *   avec une icône et un message DISTINCTS par cas.
 * - L'action "Contacter mon TC" est un message explicatif (pas de lien tel: — le numéro de l'agent
 *   n'est PAS disponible dans le contrat d'API, et aucune donnée sensible n'est exposée).
 * - Confirmations "déjà soumis" / succès : écrans dédiés (pas des erreurs).
 */

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Ban,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileQuestion,
  MapPin,
  PhoneCall,
  ShieldOff,
  UserRound,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorState } from '@/components/shared/states'

export type MissionErrorKind = 'not_found' | 'expired' | 'revoked' | 'cancelled'

interface MissionErrorConfig {
  icon: LucideIcon
  title: string
  description: string
}

const MISSION_ERROR_CONFIG: Record<MissionErrorKind, MissionErrorConfig> = {
  not_found: {
    icon: FileQuestion,
    title: 'Mission introuvable',
    description:
      "Ce lien ne correspond à aucune mission. Il a peut-être été mal recopié ou remplacé par un lien plus récent.",
  },
  expired: {
    icon: Clock3,
    title: 'Lien expiré',
    description:
      'Ce lien de mission a expiré. Demandez à votre Tiers de Confiance de vous renvoyer un nouveau lien.',
  },
  revoked: {
    icon: ShieldOff,
    title: 'Lien annulé',
    description:
      'Ce lien a été annulé par votre Tiers de Confiance. Demandez-en un nouveau pour rendre compte de votre mission.',
  },
  cancelled: {
    icon: Ban,
    title: 'Mission annulée',
    description:
      'Cette mission a été annulée : aucun rapport n\'est attendu. Contactez votre Tiers de Confiance pour plus de détails.',
  },
}

/** Bloc "Contacter mon TC" — bouton qui révèle un message simple (aria-expanded + aria-live). */
function ContactTcHint({ tcName }: { tcName?: string }) {
  const [shown, setShown] = useState(false)

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        aria-expanded={shown}
        aria-controls="contact-tc-message"
        onClick={() => setShown((value) => !value)}
      >
        <PhoneCall className="size-4" aria-hidden="true" />
        Contacter mon TC
      </Button>
      <div id="contact-tc-message" aria-live="polite">
        {shown && (
          <p className="mt-3 rounded-xl bg-neutral-100 p-3 text-sm leading-relaxed text-neutral-600">
            Le numéro de votre Tiers de Confiance figure dans le SMS de mission que vous avez reçu :
            appelez-le ou répondez à ce SMS pour obtenir un nouveau lien.
            {tcName ? ` Votre contact : ${tcName}.` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

/** Écran d'erreur de lien — message distinct par cas (404 / 410 EXPIRED / 410 REVOKED / annulée). */
export function MissionErrorScreen({ kind, tcName }: { kind: MissionErrorKind; tcName?: string }) {
  const config = MISSION_ERROR_CONFIG[kind]
  return (
    <div>
      <ErrorState icon={config.icon} title={config.title} description={config.description} />
      <ContactTcHint tcName={tcName} />
    </div>
  )
}

/** Écran "Rapport déjà envoyé" (already_submitted / 409 / mission COMPLETED). */
export function AlreadySubmittedScreen({
  missionTitle,
  tcName,
}: {
  missionTitle: string
  tcName?: string
}) {
  return (
    <Card role="status" aria-live="polite" className="border-border">
      <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
        <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">Rapport déjà envoyé</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Votre rapport pour la mission «&nbsp;{missionTitle}&nbsp;» a bien été enregistré.
          Aucune action supplémentaire n&apos;est nécessaire.
        </p>
        {tcName && <p className="mt-2 text-sm text-neutral-500">Il sera examiné par {tcName}.</p>}
        <p className="mt-4 text-xs text-neutral-400">Vous pouvez fermer cette page.</p>
      </CardContent>
    </Card>
  )
}

/** Écran de succès après soumission — confirmation + récapitulatif (titre, zone, photos, checklist). */
export function MissionSuccessScreen({
  missionTitle,
  zone,
  tcName,
  photoCount,
  checkedCount,
  checklistTotal,
}: {
  missionTitle: string
  zone?: string
  tcName?: string
  photoCount: number
  checkedCount: number
  checklistTotal: number
}) {
  return (
    <div role="status" aria-live="polite">
      <Card className="border-border">
        <CardContent className="flex flex-col items-center gap-1 py-10 text-center">
          <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="size-8 text-success" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Rapport envoyé, merci&nbsp;!</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Votre rapport pour la mission «&nbsp;{missionTitle}&nbsp;» a bien été transmis.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-3 border-border">
        <CardContent className="py-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Récapitulatif
          </h2>
          <dl className="mt-3 space-y-2.5 text-sm text-neutral-700">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
              <div className="flex-1">{zone ?? '—'}</div>
            </div>
            <div className="flex items-start gap-2.5">
              <Camera className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
              <div className="flex-1">
                {photoCount} photo{photoCount > 1 ? 's' : ''} envoyée{photoCount > 1 ? 's' : ''}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ClipboardList className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
              <div className="flex-1">
                {checkedCount}/{checklistTotal} points de contrôle cochés
              </div>
            </div>
            {tcName && (
              <div className="flex items-start gap-2.5">
                <UserRound className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
                <div className="flex-1">Votre TC : {tcName}</div>
              </div>
            )}
          </dl>
          <p className="mt-4 rounded-xl bg-brand-50 p-3 text-sm leading-relaxed text-neutral-600">
            Votre Tiers de Confiance va examiner et valider le constat. Vous pouvez fermer cette page.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
