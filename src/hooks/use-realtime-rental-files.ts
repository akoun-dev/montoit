'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { markMutation } from '@/lib/response-cache'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeRentalFilePayload {
  id: string
  status: string
  monthly_income: number | null
  employer: string | null
  employment_type: string | null
  rejection_reason: string | null
  tc_comment: string | null
  tenant_id: string
  reviewed_by_id: string | null
  created_at: string
  updated_at: string
}

type RentalFileChangeEvent = 'INSERT' | 'UPDATE'

interface UseRealtimeRentalFilesOptions {
  userId: string | undefined
  /**
   * List of tenant IDs whose rental files the user wants to watch (for owners).
   * If omitted, filtering uses only `tenant_id` (for tenants).
   */
  watchedTenantIds?: string[]
  /**
   * If true, watches ALL rental files (for TC/admin).
   */
  watchAll?: boolean
  /**
   * Si fourni, filtre les abonnements realtime à ce dossier uniquement (mode "page détail").
   * Évite les re-fetch quand un autre dossier locataire change.
   */
  fileId?: string
  onRentalFileChange: (event: RentalFileChangeEvent, payload: RealtimeRentalFilePayload) => void
}

/**
 * Subscribes to INSERT and UPDATE events on the `rental_files` table
 * via Supabase Realtime.
 *
 * The hook filters incoming events to only call `onRentalFileChange` for
 * files relevant to the current user:
 *   - If `tenant_id === userId` → the user is the tenant (own file)
 *   - If `tenant_id` is in `watchedTenantIds` → the user is an owner watching
 */
export function useRealtimeRentalFiles({ userId, watchedTenantIds, watchAll, fileId, onRentalFileChange }: UseRealtimeRentalFilesOptions) {
  const callbackRef = useRef(onRentalFileChange)
  const watchedRef = useRef(watchedTenantIds)
  const watchAllRef = useRef(watchAll)
  const fileIdRef = useRef(fileId)

  useEffect(() => {
    callbackRef.current = onRentalFileChange
    watchedRef.current = watchedTenantIds
    watchAllRef.current = watchAll
    fileIdRef.current = fileId
  }, [onRentalFileChange, watchedTenantIds, watchAll, fileId])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Channel name unique par fileId pour éviter les conflits entre détails ouverts en parallèle
    const channel = supabase.channel(`rental-files-realtime${fileId ? `-${fileId}` : ''}`)

    async function subscribeAfterAuth() {
      // Ensure the auth session is initialized before subscribing,
      // otherwise the realtime WebSocket connects as anonymous and RLS blocks everything.
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-rental-files] No session — subscribing anyway (will likely fail)')
      }

      // Filtre serveur : si on a un fileId (mode "page détail"), on ne s'abonne
      // qu'aux changements de CE dossier. Sinon on écoute tout et on filtre côté client.
      const filter = fileIdRef.current ? `id=eq.${fileIdRef.current}` : undefined

      channel
        .on<RealtimeRentalFilePayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rental_files',
            filter,
          },
          (payload: RealtimePostgresChangesPayload<RealtimeRentalFilePayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return

            const rf = raw as RealtimeRentalFilePayload

            // Mark mutation so authFetch skips the response cache
            markMutation()

            // En mode fileId, le filtre serveur garantit déjà la pertinence
            if (fileIdRef.current) {
              callbackRef.current(payload.eventType as RentalFileChangeEvent, rf)
              return
            }

            // Always fire for INSERT — a new file might be from a tenant we don't know yet
            if (payload.eventType === 'INSERT') {
              callbackRef.current(payload.eventType as RentalFileChangeEvent, rf)
              return
            }

            // Skip if the file isn't relevant
            if (watchAllRef.current) {
              callbackRef.current(payload.eventType as RentalFileChangeEvent, rf)
              return
            }

            const isOwnFile = rf.tenant_id === userId
            const isWatched = watchedRef.current?.includes(rf.tenant_id)

            if (!isOwnFile && !isWatched) return

            callbackRef.current(payload.eventType as RentalFileChangeEvent, rf)
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-rental-files] Channel error')
          }
        })
    }

    subscribeAfterAuth()

    return () => {
      cancelled = true
      channel.unsubscribe()
    }
    // fileId fait partie du nom du channel → re-souscrire quand il change
  }, [userId, fileId])
}
