'use client'

/**
 * Sélecteur de photos du constat — capture caméra arrière ou galerie, miniatures, retry par photo.
 * Présentation seule : la logique d'upload (hooks React Query) vit dans mission-report-form.tsx.
 * Input `capture="environment"` + `multiple` (spec TC-001 : upload natif caméra, mobile 3G).
 */

import { useRef } from 'react'
import { Camera, CheckCircle2, ImagePlus, Loader2, RotateCw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MAX_MISSION_PHOTOS, type MissionPhotoItem } from './mission-shared'

export interface MissionPhotoNotice {
  tone: 'info' | 'error'
  text: string
}

interface MissionPhotoPickerProps {
  photos: MissionPhotoItem[]
  onPick: (files: FileList | null) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  notice?: MissionPhotoNotice | null
}

export function MissionPhotoPicker({ photos, onPick, onRemove, onRetry, notice }: MissionPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const atMax = photos.length >= MAX_MISSION_PHOTOS

  return (
    <section
      aria-labelledby="mission-photos-title"
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="mission-photos-title" className="text-base font-semibold text-neutral-900">
          Photos du constat
        </h2>
        <p className="text-xs font-medium text-neutral-500" aria-live="polite">
          {photos.length}/{MAX_MISSION_PHOTOS}
        </p>
      </div>
      <p className="mt-1 text-sm text-neutral-500">
        Obligatoire : au moins 1 photo. Jusqu&apos;à {MAX_MISSION_PHOTOS} images (JPG, PNG, WEBP — 8&nbsp;Mo max).
      </p>

      {/* Input natif caché — déclenché par le gros bouton (cible de tap ≥ 56 px, clavier OK). */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          onPick(event.target.files)
          event.target.value = ''
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="mt-3 h-14 w-full border-dashed text-base font-semibold"
        onClick={() => inputRef.current?.click()}
        disabled={atMax}
      >
        <Camera className="size-5" aria-hidden="true" />
        {atMax ? `Maximum ${MAX_MISSION_PHOTOS} photos atteint` : 'Prendre une photo / choisir'}
      </Button>

      {notice && (
        <p
          role={notice.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'mt-3 rounded-xl p-3 text-sm font-medium',
            notice.tone === 'error' ? 'bg-error/10 text-error' : 'bg-info/10 text-info',
          )}
        >
          {notice.text}
        </p>
      )}

      {photos.length > 0 && (
        <ul className="mt-3.5 grid grid-cols-3 gap-2.5">
          {photos.map((photo, index) => (
            <li key={photo.id} className="relative">
              <div
                className={cn(
                  'relative aspect-square overflow-hidden rounded-xl border',
                  photo.status === 'error' ? 'border-error border-2' : 'border-neutral-200',
                )}
              >
                {photo.previewUrl ? (
                  <img
                    src={photo.previewUrl}
                    alt={`Aperçu de la photo ${index + 1}`}
                    className="size-full object-cover"
                  />
                ) : (
                  // Photo restaurée depuis le brouillon (déjà uploadée) — pas d'URL locale.
                  <div className="flex size-full flex-col items-center justify-center gap-1 bg-neutral-50 p-1 text-center">
                    <ImagePlus className="size-5 text-neutral-400" aria-hidden="true" />
                    <span className="text-[10px] leading-tight text-neutral-400">Photo déjà envoyée</span>
                  </div>
                )}

                {photo.status === 'uploading' && (
                  <div className="absolute inset-0 grid place-items-center bg-neutral-900/40">
                    <Loader2 className="size-6 animate-spin text-white" aria-hidden="true" />
                    <span className="sr-only">Envoi en cours</span>
                  </div>
                )}

                {photo.status === 'uploaded' && (
                  <span className="absolute bottom-1 right-1 grid size-6 place-items-center rounded-full bg-success text-white shadow">
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    <span className="sr-only">Photo envoyée</span>
                  </span>
                )}

                {photo.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => onRetry(photo.id)}
                    className="absolute inset-0 grid place-items-center bg-error/60 text-white transition-colors hover:bg-error/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-error"
                    aria-label={`Réessayer l'envoi de la photo ${index + 1}`}
                  >
                    <RotateCw className="size-6" aria-hidden="true" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => onRemove(photo.id)}
                className="absolute -right-2 -top-2 z-10 grid size-8 place-items-center rounded-full bg-neutral-900 text-white shadow-md transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={`Supprimer la photo ${index + 1}`}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
