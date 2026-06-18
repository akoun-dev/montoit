'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type OwnerFileEvent = 'INSERT' | 'UPDATE' | 'DELETE'

interface UseRealtimeOwnerFilesOptions {
  userId: string | undefined
  /** Si true, écoute tous les owner_files (mode TC). Sinon, filtre par owner_id. */
  watchAll?: boolean
  /**
   * Si fourni, filtre les abonnements realtime à ce dossier uniquement (mode "page détail").
   * Évite de re-fetch quand un autre dossier ou un autre document d'un autre owner change.
   */
  fileId?: string
  onOwnerFileChange: (event: OwnerFileEvent) => void
}

export function useRealtimeOwnerFiles({
  userId,
  watchAll,
  fileId,
  onOwnerFileChange,
}: UseRealtimeOwnerFilesOptions) {
  const callbackRef = useRef(onOwnerFileChange)
  const watchAllRef = useRef(watchAll)
  const fileIdRef = useRef(fileId)

  useEffect(() => {
    callbackRef.current = onOwnerFileChange
    watchAllRef.current = watchAll
    fileIdRef.current = fileId
  }, [onOwnerFileChange, watchAll, fileId])

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    const supabase = getSupabaseBrowserClient()
    // Channel name unique par fileId pour éviter les conflits entre détails ouverts en parallèle
    const channel = supabase.channel(`owner-files-realtime${fileId ? `-${fileId}` : ''}`)

    async function subscribeAfterAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      // Filtre pour owner_files : priorité au fileId (mode détail), sinon owner_id (mode owner), sinon rien (mode TC liste)
      let ownerFilesFilter: string | undefined
      if (fileIdRef.current) {
        ownerFilesFilter = `id=eq.${fileIdRef.current}`
      } else if (!watchAllRef.current) {
        ownerFilesFilter = `owner_id=eq.${userId}`
      }

      // Filtre pour owner_file_documents : si on a un fileId, on ne s'intéresse qu'aux docs de CE dossier.
      // Sinon (liste owner ou liste TC), on doit écouter tous les docs car le filtre owner_id n'existe
      // pas sur cette table (la jointure se ferait via owner_file_id qu'on ne connaît pas à l'avance).
      const docsFilter = fileIdRef.current ? `owner_file_id=eq.${fileIdRef.current}` : undefined

      channel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'owner_files',
            filter: ownerFilesFilter,
          },
          () => {
            callbackRef.current('UPDATE')
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'owner_file_documents',
            filter: docsFilter,
          },
          () => {
            callbackRef.current('UPDATE')
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[realtime-owner-files] Channel error')
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
