'use client'

import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { useApp } from '@/hooks/capacitor/use-app'
import { useNotifications } from '@/hooks/use-notifications'
import { useAuthStore } from '@/lib/auth-store'

const DEBOUNCE_MS = 300
const STALE_STATE_THRESHOLD_MS = 30_000 // 30 s — seuil pour reload complet

/**
 * Runs the full resume logic: refresh notifications, re-validate session,
 * and redirect (dashboard if authenticated, home if not).
 *
 * Accepte `refreshNotifications` en paramètre car cette fonction vient
 * du hook `useNotifications()`, pas du store zustand.
 */
async function runResumeLogic(refreshNotifications?: () => void) {
  refreshNotifications?.()

  const state = useAuthStore.getState()

  if (state.isAuthenticated) {
    try {
      await state.checkAuth()
      if (useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().setView('dashboard')
      }
    } catch {
      // Network error — keep current state
    }
  } else {
    useAuthStore.getState().setView('home')
    useAuthStore.getState().setDashboardSection('overview')
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
 * 3. Redirige :
 *    - Utilisateur connecté → tableau de bord
 *    - Utilisateur non connecté → accueil (cache vidé)
 *
 * Si l'application web/PWA est restée en arrière-plan plus de 30 s,
 * un `window.location.reload()` est déclenché en dernier recours
 * pour nettoyer un éventuel état React périmé (cas PWA).
 *
 * Renders nothing — composant pur effet monté dans le layout racine.
 */
export function AppLifecycleManager() {
  const { isActive } = useApp()
  const { refreshNotifications } = useNotifications()
  const lastRefreshRef = useRef(0)
  const hiddenSinceRef = useRef<number | null>(null)
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
        hiddenSinceRef.current = Date.now()
        return
      }

      // Ignorer le premier appel au chargement de la page
      if (!hasBeenHidden) return

      const now = Date.now()
      if (now - lastRefreshRef.current < DEBOUNCE_MS) return
      lastRefreshRef.current = now

      const hiddenDuration = hiddenSinceRef.current
        ? now - hiddenSinceRef.current
        : 0

      // Tentative normale : checkAuth + redirect
      // On attend la fin de l'async avant de décider un éventuel reload
      await runResumeLogic(refreshNotifications)

      // Si l'utilisateur est parti plus de 30 s, on force un reload
      // pour nettoyer tout état React potentiellement périmé (PWA).
      if (hiddenDuration > STALE_STATE_THRESHOLD_MS) {
        window.location.reload()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [refreshNotifications])

  return null
}
