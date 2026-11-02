'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeCertificationPayload {
  id: string
  type: string
  status: string
  notes: string | null
  revoked_at: string | null
  revocation_reason: string | null
  expires_at: string | null
  user_id: string
  granted_by_id: string
  property_id: string | null
  created_at: string
  updated_at: string
}

type CertificationChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeCertificationsOptions {
  userId: string | undefined
  /**
   * If true, receives events for ALL certifications — intended for TC/admin views
   * that manage the certification process.
   */
  watchAll?: boolean
  /**
   * Optional list of user IDs whose certifications to watch.
   * Useful for an owner watching their tenants' certifications.
   */
  watchedUserIds?: string[]
  onCertificationChange: (event: CertificationChangeEvent, payload: RealtimeCertificationPayload) => void
}

/**
 * Subscribes to INSERT, UPDATE, and DELETE events on the `certifications` table
 * via Supabase Realtime.
 *
 * The hook filters incoming events to only call `onCertificationChange` for
 * certifications relevant to the current user:
 *   - If `watchAll` is true → all certifications (TC/admin)
 *   - If `user_id` is in `watchedUserIds` → tracked users
 *   - If `user_id === userId` → the user's own certifications
 */
export function useRealtimeCertifications({
  userId,
  watchAll,
  watchedUserIds,
  onCertificationChange,
}: UseRealtimeCertificationsOptions) {
  const callbackRef = useRef(onCertificationChange)
  const watchedRef = useRef(watchedUserIds)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onCertificationChange
    watchedRef.current = watchedUserIds
    watchAllRef.current = watchAll
  }, [onCertificationChange, watchedUserIds, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('certifications-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-certifications] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeCertificationPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'certifications',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeCertificationPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return
            const cert = raw as RealtimeCertificationPayload

            // If watchAll is enabled, forward all events (TC/admin)
            if (watchAllRef.current) {
              callbackRef.current(payload.eventType as CertificationChangeEvent, cert)
              return
            }

            // Check if the certification is for a watched user
            const isWatched = watchedRef.current?.includes(cert.user_id)
            if (isWatched) {
              callbackRef.current(payload.eventType as CertificationChangeEvent, cert)
              return
            }

            // Otherwise, only forward events for the user's own certifications
            if (cert.user_id === userId) {
              callbackRef.current(payload.eventType as CertificationChangeEvent, cert)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-certifications] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-certifications] Channel error')
          }
        })
    }

    subscribeAfterAuth()

    return () => {
      cancelled = true
      channel.unsubscribe()
    }
  }, [userId])
}
