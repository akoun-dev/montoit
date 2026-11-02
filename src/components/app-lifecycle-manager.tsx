'use client'

import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { useApp } from '@/hooks/capacitor/use-app'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuthStore } from '@/lib/auth-store'

const DEBOUNCE_MS = 300

/**
 * Refreshes notifications and re-validates the session on app resume.
 *
 * Contrairement à l'ancienne version, on ne force PLUS le changement de vue
 * vers 'dashboard' ou 'home'. L'utilisateur reste sur la page où il se trouvait.
 * checkAuth() gère déjà le cas 401 (session expirée) en resetant vers 'home'
 * via le store.
 */
async function runResumeLogic(refreshNotifications?: () => void) {
  refreshNotifications?.()

  const state = useAuthStore.getState()

  if (state.isAuthenticated) {
    try {
      await state.checkAuth()
    } catch {
      // Network error — keep current state
    }
  }
}

/**
 * Manages app lifecycle events.
 *
 * **Capacitor (native)** — écoute le `resume` via `useApp().isActive`.
 * **Web / PWA** — écoute `visibilitychange` (changement d'onglet / PWA resume).
 *
 * Au retour au premier plan :
 * 1. Re-fetches notifications.
 * 2. Re-valide la session via `checkAuth()`.
 * 3. ~~Ne redirige plus vers le tableau de bord ou l'accueil.~~
 *    L'utilisateur reste sur la page en cours. checkAuth() reset vers
 *    'home' uniquement si la session a expiré (401).
 *
 * Renders nothing — composant pur effet monté dans le layout racine.
 */
export function AppLifecycleManager() {
  const { isActive } = useApp()
  const { refreshNotifications } = useNotifications()
  const lastRefreshRef = useRef(0)
  const isInitialMount = useRef(true)

  // ――― Capacitor : écoute `resume` (isActive true → false → true) ――――――――
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const now = Date.now()
    if (now - lastRefreshRef.current < DEBOUNCE_MS) return
    lastRefreshRef.current = now

    refreshNotifications()

    if (!isActive) return

    runResumeLogic()
  }, [isActive, refreshNotifications])

  // ――― Web / PWA : écoute `visibilitychange` ―――――――――――――――――――――――――――
  useEffect(() => {
    // En mode Capacitor natif, c'est géré par l'effet ci-dessus
    if (Capacitor.isNativePlatform()) return

    let hasBeenHidden = false

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        hasBeenHidden = true
        return
      }

      // Ignorer le premier appel au chargement de la page
      if (!hasBeenHidden) return

      const now = Date.now()
      if (now - lastRefreshRef.current < DEBOUNCE_MS) return
      lastRefreshRef.current = now

      // Re-valide la session et rafraîchit les notifications
      await runResumeLogic(refreshNotifications)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [refreshNotifications])

  return null
}
