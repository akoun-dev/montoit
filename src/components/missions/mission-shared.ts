/**
 * Helpers partagés des composants mission (page publique /m/[token]).
 * Labels métier, formatage FR, constantes et types locaux — aucun import React ni composant.
 */

export const MAX_MISSION_PHOTOS = 6
/** Garde-fou client (8 Mo) — le serveur reste la source de vérité (413). */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024

export const MISSION_TYPE_LABELS: Record<string, string> = {
  PROPERTY_VERIFICATION: 'Vérification de bien',
  INVENTORY_REPORT: 'État des lieux',
}

export function missionTypeLabel(type: string): string {
  return MISSION_TYPE_LABELS[type] ?? 'Mission'
}

export const MISSION_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'À faire',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
}

export function missionStatusLabel(status: string): string {
  return MISSION_STATUS_LABELS[status] ?? status
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** ID local stable (crypto.randomUUID si dispo, fallback suffisant pour un usage local). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

const shortDateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

/** "mardi 3 novembre à 10:30" — null si absent/invalide. */
export function formatMissionDateTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return dateTimeFormatter.format(date)
}

/** "3 novembre à 10:30" — pour la date d'expiration du lien. */
export function formatExpiry(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return shortDateTimeFormatter.format(date)
}

/** Élément photo suivi par le formulaire (upload + preview + retry). */
export interface MissionPhotoItem {
  id: string
  name: string
  /** Fichier local — null si la photo vient d'un brouillon (déjà envoyée, seul `path` subsiste). */
  file: File | null
  /** Aperçu local (object URL) — null si la photo est déjà en ligne. */
  previewUrl: string | null
  /** Chemin Storage renvoyé par POST /upload une fois l'envoi réussi. */
  path: string | null
  status: 'pending' | 'uploading' | 'uploaded' | 'error'
  errorMessage?: string
}
