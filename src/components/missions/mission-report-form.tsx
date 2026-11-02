'use client'

/**
 * Formulaire de rapport de mission — page publique /m/[token].
 * Acteur : AGENT_TERRAIN (agent de terrain du Tiers de Confiance, SANS compte) — spec TC-001.
 *
 * - Données : exclusivement via hooks React Query (src/hooks/tc/use-mission-token.ts) —
 *   AUCUN appel HTTP direct, AUCUN import depuis src/components/dashboard/**.
 * - États obligatoires (TC-004) : chargement, introuvable (404), expiré/révoqué (410),
 *   déjà soumis (already_submitted / 409), fiche mission, formulaire (checklist + photos + notes),
 *   succès + récap.
 * - Résilience : brouillon localStorage + IndexedDB (mission-draft.ts), retry upload par photo,
 *   anti double-soumission (idempotence client via état `submitted` + `isPending`).
 * - Mobile-first + a11y : boutons ≥ 44 px, labels explicites, aria-live sur les messages.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  Loader2,
  MapPin,
  Play,
  SearchCheck,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ErrorState, LoadingState } from '@/components/shared/states'

import {
  missionTokenErrorMessage,
  useMissionFiche,
  useStartMission,
  useSubmitMission,
  useUploadMissionPhoto,
} from '@/hooks/tc/use-mission-token'

import { MissionChecklist } from './mission-checklist'
import { MissionPhotoPicker, type MissionPhotoNotice } from './mission-photo-picker'
import {
  AlreadySubmittedScreen,
  MissionErrorScreen,
  MissionSuccessScreen,
} from './mission-screens'
import { MissionShell } from './mission-shell'
import {
  clearMissionDraft,
  clearMissionFiles,
  loadMissionDraft,
  loadMissionFiles,
  saveMissionDraft,
  saveMissionFiles,
  type MissionDraftFile,
} from './mission-draft'
import {
  capitalize,
  formatExpiry,
  formatMissionDateTime,
  MAX_MISSION_PHOTOS,
  MAX_PHOTO_BYTES,
  missionStatusLabel,
  missionTypeLabel,
  uid,
  type MissionPhotoItem,
} from './mission-shared'

interface MissionReportFormProps {
  token: string
}

const NOTES_MAX_LENGTH = 1200

/** Ligne d'information de la fiche mission (icône + valeur, label pour lecteurs d'écran). */
function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden="true" />
      <div>
        <dt className="sr-only">{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  )
}

export function MissionReportForm({ token }: MissionReportFormProps) {
  const ficheQuery = useMissionFiche(token)
  const { mutate: startMissionMutate, isPending: startPending, isSuccess: startSuccess } = useStartMission(token)
  const { mutate: submitMissionMutate, isPending: submitPending } = useSubmitMission(token)
  const { mutate: uploadPhotoMutate } = useUploadMissionPhoto(token)

  // ── État du formulaire ─────────────────────────────────────────────────────
  const [checkedIds, setCheckedIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<MissionPhotoItem[]>([])
  const [startedLocally, setStartedLocally] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [pickerNotice, setPickerNotice] = useState<MissionPhotoNotice | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  /** Forcé si le serveur répond 409 au start/submit (déjà soumis entre-temps). */
  const [forceAlreadySubmitted, setForceAlreadySubmitted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [recap, setRecap] = useState<{ photoCount: number; checkedCount: number; checklistTotal: number } | null>(null)

  const restoredRef = useRef(false)
  const previewUrlsRef = useRef<Set<string>>(new Set())

  const fiche = ficheQuery.data

  const addPreviewUrl = useCallback((file: File): string => {
    const url = URL.createObjectURL(file)
    previewUrlsRef.current.add(url)
    return url
  }, [])

  // ── Upload d'une photo (retry fin par photo) ───────────────────────────────
  const uploadItem = useCallback(
    (item: MissionPhotoItem) => {
      if (!item.file) return
      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === item.id ? { ...photo, status: 'uploading', errorMessage: undefined } : photo,
        ),
      )
      uploadPhotoMutate(item.file, {
        onSuccess: (data) => {
          setPhotos((prev) =>
            prev.map((photo) => (photo.id === item.id ? { ...photo, status: 'uploaded', path: data.path } : photo)),
          )
        },
        onError: (error) => {
          setPhotos((prev) =>
            prev.map((photo) =>
              photo.id === item.id
                ? {
                    ...photo,
                    status: 'error',
                    errorMessage: missionTokenErrorMessage(error) ?? "Échec de l'envoi de la photo.",
                  }
                : photo,
            ),
          )
        },
      })
    },
    [uploadPhotoMutate],
  )

  // ── Restauration du brouillon (une seule fois, quand la fiche arrive) ──────
  useEffect(() => {
    if (!fiche || restoredRef.current) return
    restoredRef.current = true

    // Mission déjà rendue : rien à restaurer, on purge un éventuel brouillon résiduel.
    if (fiche.already_submitted || fiche.mission.status === 'COMPLETED') {
      clearMissionDraft(token)
      void clearMissionFiles(token)
      return
    }

    const restore = async () => {
      const draft = loadMissionDraft(token)
      const checklistIds = new Set(fiche.checklist.map((item) => item.id))
      const localFiles = await loadMissionFiles(token)

      const restoredUploaded: MissionPhotoItem[] = (draft?.uploadedPaths ?? []).map((path) => ({
        id: uid(),
        name: path.split('/').pop() || 'Photo',
        file: null,
        previewUrl: null,
        path,
        status: 'uploaded',
      }))
      const restoredPending: MissionPhotoItem[] = localFiles.map((entry: MissionDraftFile) => ({
        id: entry.id,
        name: entry.file.name,
        file: entry.file,
        previewUrl: addPreviewUrl(entry.file),
        path: null,
        status: 'pending' as const,
      }))

      setCheckedIds((draft?.checkedIds ?? []).filter((id) => checklistIds.has(id)))
      setNotes(draft?.notes ?? '')
      setStartedLocally(draft?.startedLocally ?? false)
      setPhotos([...restoredUploaded, ...restoredPending])
      setDraftRestored(Boolean(draft || localFiles.length > 0))

      // Reprise automatique des uploads interrompus (perte réseau / refresh).
      if (restoredPending.length > 0) {
        restoredPending.forEach((item) => uploadItem(item))
      }
    }

    void restore()
  }, [fiche, token, uploadItem, addPreviewUrl])

  // ── Persistance du brouillon (après restauration uniquement, jamais après soumission) ──
  useEffect(() => {
    if (!fiche || !restoredRef.current || submitted) return
    saveMissionDraft(token, {
      checkedIds,
      notes,
      uploadedPaths: photos
        .filter((photo) => photo.status === 'uploaded' && photo.path)
        .map((photo) => photo.path as string),
      startedLocally,
    })
  }, [fiche, token, checkedIds, notes, photos, startedLocally, submitted])

  // Fichiers locaux non envoyés → IndexedDB (retry possible après refresh / perte réseau).
  useEffect(() => {
    if (!fiche || !restoredRef.current || submitted) return
    const pending: MissionDraftFile[] = photos
      .filter((photo) => photo.file && photo.status !== 'uploaded')
      .map((photo) => ({ id: photo.id, file: photo.file as File }))
    void saveMissionFiles(token, pending)
  }, [fiche, token, photos, submitted])

  // Libère les object URLs au démontage.
  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      previewUrlsRef.current.clear()
    },
    [],
  )

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggle = (id: string, checked: boolean) => {
    setCheckedIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((value) => value !== id),
    )
  }

  const handlePickFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    const slotsLeft = MAX_MISSION_PHOTOS - photos.length

    const accepted: File[] = []
    let badType = 0
    let tooBig = 0
    let overflow = 0
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) {
        badType += 1
      } else if (file.size > MAX_PHOTO_BYTES) {
        tooBig += 1
      } else if (accepted.length < slotsLeft) {
        accepted.push(file)
      } else {
        overflow += 1
      }
    }

    const warnings: string[] = []
    if (badType > 0) warnings.push(`${badType} fichier(s) ignoré(s) : seules les images sont acceptées.`)
    if (tooBig > 0) warnings.push(`${tooBig} photo(s) trop lourde(s) (8 Mo max).`)
    if (overflow > 0) warnings.push(`Maximum ${MAX_MISSION_PHOTOS} photos : ${overflow} ignorée(s).`)
    setPickerNotice(warnings.length > 0 ? { tone: 'error', text: warnings.join(' ') } : null)

    if (accepted.length === 0) return
    const items: MissionPhotoItem[] = accepted.map((file) => ({
      id: uid(),
      name: file.name,
      file,
      previewUrl: addPreviewUrl(file),
      path: null,
      status: 'pending',
    }))
    setPhotos((prev) => [...prev, ...items])
    // Upload immédiat (3G : une requête à la fois par photo, retry fin en cas d'échec).
    items.forEach((item) => uploadItem(item))
  }

  const handleRemove = (id: string) => {
    const target = photos.find((photo) => photo.id === id)
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl)
      previewUrlsRef.current.delete(target.previewUrl)
    }
    setPhotos((prev) => prev.filter((photo) => photo.id !== id))
    setPickerNotice(null)
  }

  const handleRetry = (id: string) => {
    const target = photos.find((photo) => photo.id === id)
    if (target) uploadItem(target)
  }

  const handleStart = () => {
    if (startPending) return
    setStartError(null)
    startMissionMutate(undefined, {
      onSuccess: () => setStartedLocally(true),
      onError: (error) => {
        // Lien expiré/révoqué depuis l'ouverture → on refetch pour afficher l'écran dédié.
        if (error.code === 'EXPIRED' || error.code === 'REVOKED') {
          void ficheQuery.refetch()
          return
        }
        if (error.code === 'ALREADY_SUBMITTED') {
          setForceAlreadySubmitted(true)
          return
        }
        setStartError(missionTokenErrorMessage(error) ?? 'Impossible de démarrer la mission. Réessayez.')
      },
    })
  }

  const handleSubmit = () => {
    // Idempotence client : ni double-tap, ni re-soumission après succès.
    if (submitPending || submitted) return
    setSubmitError(null)

    const submittedPhotos = photos
      .filter((photo) => photo.status === 'uploaded' && photo.path)
      .map((photo) => photo.path as string)
    const submittedCheckedCount = checkedIds.length
    const submittedChecklistTotal = fiche?.checklist.length ?? 0
    const submittedNotes = notes.trim()

    submitMissionMutate(
      { photos: submittedPhotos, notes: submittedNotes ? submittedNotes : undefined },
      {
        onSuccess: () => {
          setRecap({
            photoCount: submittedPhotos.length,
            checkedCount: submittedCheckedCount,
            checklistTotal: submittedChecklistTotal,
          })
          setSubmitted(true)
          clearMissionDraft(token)
          void clearMissionFiles(token)
          previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
          previewUrlsRef.current.clear()
        },
        onError: (error) => {
          if (error.code === 'ALREADY_SUBMITTED') {
            setForceAlreadySubmitted(true)
            return
          }
          // 410 : le lien a expiré pendant la saisie → refetch pour l'écran dédié (le brouillon est conservé).
          if (error.code === 'EXPIRED' || error.code === 'REVOKED') {
            void ficheQuery.refetch()
          }
          setSubmitError(
            missionTokenErrorMessage(error) ??
              "Échec de l'envoi. Vérifiez votre connexion puis réessayez — votre brouillon est conservé.",
          )
        },
      },
    )
  }

  // ── Dérivés ────────────────────────────────────────────────────────────────

  const uploadedCount = photos.filter((photo) => photo.status === 'uploaded').length
  const unsettledCount = photos.filter((photo) => photo.status !== 'uploaded').length
  const errorCount = photos.filter((photo) => photo.status === 'error').length
  const uploadedPaths = photos
    .filter((photo) => photo.status === 'uploaded' && photo.path)
    .map((photo) => photo.path as string)

  const effectiveStatus = startedLocally ? 'IN_PROGRESS' : fiche?.mission.status
  const needsStart = effectiveStatus === 'ASSIGNED'
  const showAlreadySubmitted =
    Boolean(fiche && (fiche.already_submitted || fiche.mission.status === 'COMPLETED')) ||
    forceAlreadySubmitted

  // Règle spec TC-001 §8 (QA TC-004) : photos obligatoires ≥ 1 — et toutes les photos doivent
  // être réglées (pas de pending/uploading/error) pour éviter une soumission silencieusement incomplète.
  const canSubmit = unsettledCount === 0 && uploadedPaths.length >= 1 && !submitPending && !submitted

  const submitHint = (checklistTotal: number): string => {
    if (photos.length === 0) return 'Ajoutez au moins 1 photo pour envoyer le rapport.'
    if (unsettledCount > 0 && errorCount === 0) return 'Envoi des photos en cours…'
    if (errorCount > 0) return 'Réessayez ou supprimez les photos en échec avant d’envoyer.'
    if (checkedIds.length === 0 && checklistTotal > 0) return 'Astuce : cochez les points de contrôle vérifiés.'
    return ''
  }

  // ── Rendu par état ─────────────────────────────────────────────────────────

  let content: React.ReactNode

  if (ficheQuery.isPending) {
    content = <LoadingState variant="detail" />
  } else if (ficheQuery.error) {
    const error = ficheQuery.error
    if (error.code === 'EXPIRED') {
      content = <MissionErrorScreen kind="expired" />
    } else if (error.code === 'REVOKED') {
      content = <MissionErrorScreen kind="revoked" />
    } else if (error.code === 'NOT_FOUND') {
      content = <MissionErrorScreen kind="not_found" />
    } else {
      // 429 (rate-limit), réseau, 5xx : réessai possible.
      content = (
        <ErrorState
          title="Connexion difficile"
          description={missionTokenErrorMessage(error) ?? undefined}
          retry={() => void ficheQuery.refetch()}
        />
      )
    }
  } else if (!fiche) {
    content = <LoadingState variant="detail" />
  } else if (submitted) {
    // Soumission de CETTE session : l'écran de succès prime sur le refetch (statut → COMPLETED).
    content = (
      <MissionSuccessScreen
        missionTitle={fiche.mission.title}
        zone={fiche.mission.zone}
        tcName={fiche.tc?.name}
        photoCount={recap?.photoCount ?? uploadedPaths.length}
        checkedCount={recap?.checkedCount ?? checkedIds.length}
        checklistTotal={recap?.checklistTotal ?? fiche.checklist.length}
      />
    )
  } else if (showAlreadySubmitted) {
    content = <AlreadySubmittedScreen missionTitle={fiche.mission.title} tcName={fiche.tc?.name} />
  } else if (fiche.mission.status === 'CANCELLED') {
    content = <MissionErrorScreen kind="cancelled" tcName={fiche.tc?.name} />
  } else {
    // ── Fiche mission + formulaire ────────────────────────────────────────────
    content = (
      <>
        <section
          aria-labelledby="mission-title"
          className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs"
        >
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 bg-brand-50 text-brand-700 hover:bg-brand-50">
              {fiche.mission.type === 'INVENTORY_REPORT' ? (
                <ClipboardList className="size-3.5" aria-hidden="true" />
              ) : (
                <SearchCheck className="size-3.5" aria-hidden="true" />
              )}
              {missionTypeLabel(fiche.mission.type)}
            </Badge>
            <Badge variant="outline">{missionStatusLabel(fiche.mission.status)}</Badge>
          </div>

          <h1 id="mission-title" className="text-xl font-bold leading-tight text-neutral-900">
            {fiche.mission.title}
          </h1>

          <dl className="mt-3 space-y-2 text-sm text-neutral-700">
            <InfoRow icon={MapPin} label="Zone" value={fiche.mission.zone} />
            <InfoRow
              icon={CalendarDays}
              label="Mission prévue le"
              value={capitalize(formatMissionDateTime(fiche.mission.scheduled_at) ?? 'Date à confirmer')}
            />
            <InfoRow icon={UserRound} label="Votre contact (Tiers de Confiance)" value={fiche.tc?.name ?? 'Tiers de Confiance'} />
            <InfoRow icon={Clock3} label="Lien valable jusqu'au" value={formatExpiry(fiche.expires_at) ?? '—'} />
          </dl>

          {fiche.mission.notes && (
            <div className="mt-3.5 rounded-xl bg-neutral-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Consignes du TC</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {fiche.mission.notes}
              </p>
            </div>
          )}
        </section>

        {/* Mention d'information photos (spec TC-001 §7 — RGPD/confidentialité). */}
        <aside className="mt-3 flex items-start gap-2.5 rounded-xl border border-info/20 bg-info/5 p-3 text-sm leading-relaxed text-neutral-600">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          <p>
            Ces photos servent uniquement au suivi de cette mission. N&apos;enregistrez pas de personnes
            sans leur accord.
          </p>
        </aside>

        {draftRestored && (
          <p role="status" className="mt-3 rounded-xl bg-success/10 p-3 text-sm font-medium text-success">
            Brouillon restauré : vos cochages, notes et photos en attente ont été récupérés.
          </p>
        )}

        {needsStart ? (
          // ── Étape 1 : démarrage explicite (POST start, une seule fois) ────────
          <section
            aria-labelledby="mission-start-title"
            className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs"
          >
            <h2 id="mission-start-title" className="text-base font-semibold text-neutral-900">
              Prêt à démarrer&nbsp;?
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-neutral-500">
              Signalez le début de votre intervention : votre Tiers de Confiance voit que la mission est
              en cours.
            </p>
            <Button
              type="button"
              className="mt-4 h-14 w-full text-base font-semibold"
              onClick={handleStart}
              disabled={startPending}
            >
              {startPending ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                  Démarrage…
                </>
              ) : (
                <>
                  <Play className="size-5" aria-hidden="true" />
                  Commencer la mission
                </>
              )}
            </Button>
            <div aria-live="polite">
              {startError && <p role="alert" className="mt-3 text-sm font-medium text-error">{startError}</p>}
            </div>
          </section>
        ) : (
          // ── Étape 2 : formulaire (checklist + photos + notes + envoi) ─────────
          <>
            {startSuccess && (
              <p role="status" className="mt-3 rounded-xl bg-success/10 p-3 text-sm font-medium text-success">
                Mission démarrée — vous pouvez remplir votre rapport.
              </p>
            )}

            <div className="mt-3">
              <MissionChecklist items={fiche.checklist} checkedIds={checkedIds} onToggle={handleToggle} />
            </div>

            <div className="mt-3">
              <MissionPhotoPicker
                photos={photos}
                onPick={handlePickFiles}
                onRemove={handleRemove}
                onRetry={handleRetry}
                notice={pickerNotice}
              />
            </div>

            <section aria-label="Observations" className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
              <Label htmlFor="mission-notes" className="text-base font-semibold text-neutral-900">
                Observations <span className="font-normal text-neutral-400">(facultatif)</span>
              </Label>
              <p id="mission-notes-hint" className="mt-1 text-sm text-neutral-500">
                Précisez ce que les photos ne montrent pas : accès, occupant, anomalie, remise de clés…
              </p>
              <Textarea
                id="mission-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                maxLength={NOTES_MAX_LENGTH}
                aria-describedby="mission-notes-hint"
                className="mt-2.5 min-h-32 text-base"
                placeholder="Ex : portail bleu, remise des 2 clés, fissure salon côté fenêtre…"
              />
              <p className="mt-1 text-right text-xs text-neutral-400" aria-hidden="true">
                {notes.length}/{NOTES_MAX_LENGTH}
              </p>
            </section>

            <section
              aria-labelledby="mission-submit-title"
              className="mt-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs"
            >
              <h2 id="mission-submit-title" className="text-base font-semibold text-neutral-900">
                Envoyer le rapport
              </h2>
              <dl className="mt-2.5 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-neutral-500">Photos</dt>
                  <dd className="font-semibold text-neutral-900">
                    {uploadedCount} envoyée{uploadedCount > 1 ? 's' : ''} / {photos.length}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-neutral-500">Points cochés</dt>
                  <dd className="font-semibold text-neutral-900">
                    {checkedIds.length}/{fiche.checklist.length}
                  </dd>
                </div>
              </dl>

              <Button
                type="button"
                className="mt-4 h-14 w-full text-base font-semibold"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {submitPending ? (
                  <>
                    <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                    Envoi en cours…
                  </>
                ) : (
                  <>
                    <Send className="size-5" aria-hidden="true" />
                    Envoyer le rapport
                  </>
                )}
              </Button>

              <p aria-live="polite" className="mt-2 min-h-5 text-center text-sm text-neutral-500">
                {submitHint(fiche.checklist.length)}
              </p>

              {submitError && (
                <div role="alert" className="mt-2 rounded-xl bg-error/10 p-3">
                  <p className="text-sm font-medium leading-relaxed text-error">{submitError}</p>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="mt-1.5 min-h-11 text-sm font-semibold text-error underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Réessayer l&apos;envoi
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </>
    )
  }

  return <MissionShell>{content}</MissionShell>
}
