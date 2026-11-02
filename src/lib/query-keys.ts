/**
 * Registre centralisé des queryKeys React Query (ADR-0003 §3.1).
 *
 * Format normalisé : `['<domaine>', scope, id?, filtres?]`
 * - domaine  = ressource métier (properties, payments, leases, finances…)
 * - scope    = point de vue acteur ('owner' | 'tenant' | 'agency'…) ou 'list'/'detail'
 * - id/filtres = granularité de la requête
 *
 * Règles :
 * - Toute nouvelle queryKey DOIT être déclarée ici (aucune clé inline dans les hooks/composants).
 * - Les clés `all` servent aux invalidations larges (ex. realtime → invalidateQueries).
 * - Les clés hiérarchiques permettent l'invalidation partielle :
 *   `invalidateQueries({ queryKey: queryKeys.payments.all })` invalide owner + tenant + detail.
 *
 * Ce module est une feuille : il n'importe rien du projet (aucun service, aucun composant).
 */

/** Filtres libres pour les listes (objets sérialisables uniquement). */
export type QueryFilters = Record<string, unknown>

export const queryKeys = {
  // ── Properties ────────────────────────────────────────────────────────────
  properties: {
    all: ['properties'] as const,
    lists: () => [...queryKeys.properties.all, 'list'] as const,
    list: (filters?: QueryFilters) => [...queryKeys.properties.lists(), filters ?? {}] as const,
    details: () => [...queryKeys.properties.all, 'detail'] as const,
    detail: (id: string | null | undefined) => [...queryKeys.properties.details(), id ?? ''] as const,
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  payments: {
    all: ['payments'] as const,
    owner: (filters?: QueryFilters) => [...queryKeys.payments.all, 'owner', filters ?? {}] as const,
    tenant: (filters?: QueryFilters) => [...queryKeys.payments.all, 'tenant', filters ?? {}] as const,
    details: () => [...queryKeys.payments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.payments.details(), id] as const,
  },

  // ── Leases ────────────────────────────────────────────────────────────────
  leases: {
    all: ['leases'] as const,
    owner: (filters?: QueryFilters) => [...queryKeys.leases.all, 'owner', filters ?? {}] as const,
    tenant: (filters?: QueryFilters) => [...queryKeys.leases.all, 'tenant', filters ?? {}] as const,
    details: () => [...queryKeys.leases.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leases.details(), id] as const,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: QueryFilters) => [...queryKeys.notifications.all, 'list', filters ?? {}] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },

  // ── Dashboard (agrégats par rôle) ─────────────────────────────────────────
  dashboard: {
    all: ['dashboard'] as const,
    byRole: (role: string) => [...queryKeys.dashboard.all, role] as const,
  },

  // ── Finances propriétaire (domaine pilote FE-003) ──────────────────────────
  // Couvre /api/owner/finances et /api/owner/analytics.
  finances: {
    all: ['finances'] as const,
    owner: (period?: string) => [...queryKeys.finances.all, 'owner', period ?? null] as const,
    ownerAnalytics: (period?: string) => [...queryKeys.finances.all, 'owner-analytics', period ?? null] as const,
  },

  // ── Tiers de confiance (TC) ───────────────────────────────────────────────
  tc: {
    all: ['tc'] as const,
    /** Liens d'accès éphémères d'une mission (GET/POST/DELETE /api/tc/missions/[id]/access-link — TC-006). */
    missionTokens: (missionId: string) => [...queryKeys.tc.all, 'mission-tokens', missionId] as const,
  },

  // ── Missions par token (agent de terrain, page publique /m/[token]) ───────
  // Acteur AGENT_TERRAIN sans compte — routes publiques /api/missions-token/*.
  missionToken: {
    all: ['mission-token'] as const,
    fiche: (token: string) => [...queryKeys.missionToken.all, 'fiche', token] as const,
  },
} as const

/** Type utilitaire : toute clé du registre (tuple readonly) est une QueryKey valide. */
export type AppQueryKey = readonly unknown[]

export default queryKeys
