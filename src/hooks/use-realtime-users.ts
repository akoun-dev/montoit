'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface RealtimeUserPayload {
  id: string
  phone: string | null
  email: string
  first_name: string
  last_name: string
  role: string
  active_role: string
  avatar_url: string | null
  is_active: boolean
  is_email_verified: boolean
  is_phone_verified: boolean
  gender: string | null
  city: string | null
  address: string | null
  birth_date: string | null
  nni: string | null
  neoface_verified: boolean
  neoface_verified_at: string | null
  kyc_document_id: string | null
  oneci_verified: boolean
  oneci_verified_at: string | null
  password_updated_at: string | null
  bio: string | null
  company_name: string | null
  show_phone: boolean
  show_email: boolean
  two_factor_enabled: boolean
  created_at: string
  updated_at: string
}

type UserChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeUsersOptions {
  userId: string | undefined
  /**
   * If true, receives events for ALL users — intended for admin views only.
   * For security, when this is enabled the hook does NOT filter events.
   */
  watchAll?: boolean
  /**
   * Optional list of user IDs to watch (for targeted tracking).
   */
  watchedUserIds?: string[]
  onUserChange: (event: UserChangeEvent, payload: RealtimeUserPayload) => void
}

/**
 * Subscribes to INSERT, UPDATE, and DELETE events on the `users` table
 * via Supabase Realtime.
 *
 * ⚠️ SECURITY: Only use `watchAll` in admin/TC views where the user has
 * explicit permission to see all user data. The hook does NOT perform
 * server-side authorization — the parent component is responsible for
 * access control.
 *
 * The hook filters incoming events:
 *   - If `watchAll` is true → all user changes (admin)
 *   - If `watchedUserIds` is provided → only those specific users
 *   - Otherwise → only events for `userId` (own profile)
 */
export function useRealtimeUsers({
  userId,
  watchAll,
  watchedUserIds,
  onUserChange,
}: UseRealtimeUsersOptions) {
  const callbackRef = useRef(onUserChange)
  const watchedRef = useRef(watchedUserIds)
  const watchAllRef = useRef(watchAll)

  useEffect(() => {
    callbackRef.current = onUserChange
    watchedRef.current = watchedUserIds
    watchAllRef.current = watchAll
  }, [onUserChange, watchedUserIds, watchAll])

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    const supabase = getSupabaseBrowserClient()

    // Create the channel synchronously so cleanup always works
    const channel = supabase.channel('users-realtime')

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session?.access_token) {
        console.warn('[realtime-users] No session — subscribing anyway (will likely fail)')
      }

      channel
        .on<RealtimeUserPayload>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users',
          },
          (payload: RealtimePostgresChangesPayload<RealtimeUserPayload>) => {
            const raw = payload.eventType === 'DELETE' ? payload.old : payload.new
            if (!raw?.id) return
            const user = raw as RealtimeUserPayload

            // If watchAll is enabled, forward all events (admin)
            if (watchAllRef.current) {
              callbackRef.current(payload.eventType as UserChangeEvent, user)
              return
            }

            // If specific watched IDs are provided, filter by them
            if (watchedRef.current?.length) {
              if (watchedRef.current.includes(user.id)) {
                callbackRef.current(payload.eventType as UserChangeEvent, user)
              }
              return
            }

            // Otherwise, only forward events for the current user's own profile
            if (user.id === userId) {
              callbackRef.current(payload.eventType as UserChangeEvent, user)
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('[realtime-users] Subscribed')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-users] Channel error')
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
