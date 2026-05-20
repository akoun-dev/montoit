'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LogOut, ArrowLeft } from 'lucide-react'
import { useBackNavigation } from '@/components/back-navigation-provider'

/**
 * Intercepts the Android hardware back button via Capacitor's `App.addListener('backButton')`.
 *
 * Strategy (in order of priority):
 * 1. If a SPA back action is registered (dashboard detail views),
 *    calls that callback instead of navigating the browser history.
 * 2. If the WebView can go back (`event.canGoBack`), calls `window.history.back()`.
 * 3. Otherwise (app on main/home screen), shows a confirmation dialog
 *    before calling `App.exitApp()`.
 *
 * Only active on Android native; no-op on iOS and web.
 */
export function AppBackHandler() {
  const [showExitDialog, setShowExitDialog] = useState(false)
  const lastBackTimeRef = useRef(0)
  const { resolveBackAction } = useBackNavigation()

  useEffect(() => {
    // Only intercept back button on Android native
    if (Capacitor.getPlatform() !== 'android') return

    let cancelled = false
    let listener: { remove: () => void } | null = null

    App.addListener('backButton', (event) => {
      // Debounce: ignore rapid successive presses (300 ms)
      const now = Date.now()
      if (now - lastBackTimeRef.current < 300) return
      lastBackTimeRef.current = now

      // 1. Try SPA back action first (dashboard detail views)
      const spaAction = resolveBackAction()
      if (spaAction) {
        spaAction.onBack()
        return
      }

      // 2. If the WebView can go back, delegate to browser history
      if (event.canGoBack) {
        window.history.back()
        return
      }

      // 3. Otherwise show exit confirmation
      setShowExitDialog(true)
    }).then((l) => {
      if (cancelled) {
        l.remove()
        return
      }
      listener = l
    })

    return () => {
      cancelled = true
      listener?.remove()
    }
  }, [resolveBackAction])

  const handleStay = useCallback(() => setShowExitDialog(false), [])

  const handleExit = useCallback(() => {
    setShowExitDialog(false)
    App.exitApp().catch(() => {})
  }, [])

  return (
    <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 sm:mx-0">
            <LogOut className="size-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center sm:text-left">
            Quitter Mon Toit ?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center sm:text-left">
            Êtes-vous sûr de vouloir quitter l'application ?<br />
            Vous devrez vous reconnecter pour accéder à vos informations.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleStay} className="gap-2">
            <ArrowLeft className="size-4" />
            Rester
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExit}
            className="gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <LogOut className="size-4" />
            Quitter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
