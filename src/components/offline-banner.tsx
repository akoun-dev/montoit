'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNetwork } from '@/hooks/capacitor/use-network'
import { WifiOff, RefreshCw, Wifi, Smartphone, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'

const CONNECTION_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  cellular: 'Réseau mobile',
  ethernet: 'Ethernet',
  none: 'Aucune connexion',
  unknown: 'Inconnu',
  bluetooth: 'Bluetooth',
  mixed: 'Mixte',
  other: 'Autre',
}

const CELLULAR_GENERATION_LABELS: Record<string, string> = {
  'slow-2g': '2G',
  '2g': '2G',
  '3g': '3G',
  '4g': '4G',
  '5g': '5G',
}

function ConnectionIcon({ type }: { type: string }) {
  switch (type) {
    case 'cellular':
      return <Smartphone className="size-3 shrink-0" />
    case 'wifi':
    case 'ethernet':
      return <Wifi className="size-3 shrink-0" />
    default:
      return <WifiOff className="size-3 shrink-0" />
  }
}

/**
 * Attempt to read the effective cellular generation (4G, 5G, …)
 * from the Network Information API (`navigator.connection.effectiveType`).
 * Works on modern browsers and Chrome-based Capacitor WebViews (Android).
 */
function getEffectiveCellularType(): string | null {
  try {
    const conn = (navigator as any).connection
    if (conn?.effectiveType) {
      const label = CELLULAR_GENERATION_LABELS[conn.effectiveType as string]
      return label ?? (conn.effectiveType as string).toUpperCase()
    }
  } catch {
    // navigator.connection not available (e.g. iOS WebView, old browser)
  }
  return null
}

/**
 * Format a duration in seconds to a human-readable short string.
 *
 * Examples: 5s, 3min 12s, 1h 05min, 2h
 */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  if (mins < 60) {
    return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`
  }
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`
}

export function OfflineBanner() {
  const { isConnected, connectionType, refresh } = useNetwork()
  const [visible, setVisible] = useState(false)
  const [cellularGeneration, setCellularGeneration] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const offlineSinceRef = useRef<number | null>(null)
  const wasOfflineRef = useRef(false)

  // ── Delay showing on mount to avoid flash ──
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // ── Detect cellular generation when on mobile network ──
  useEffect(() => {
    if (connectionType === 'cellular') {
      setCellularGeneration(getEffectiveCellularType())
    } else {
      setCellularGeneration(null)
    }
  }, [connectionType])

  // ── Track when the user goes offline / comes back ──
  useEffect(() => {
    if (!isConnected && !wasOfflineRef.current) {
      // Just transitioned to offline
      wasOfflineRef.current = true
      offlineSinceRef.current = Date.now()
      setElapsedSeconds(0)
    } else if (isConnected && wasOfflineRef.current) {
      // Just came back online
      wasOfflineRef.current = false
      offlineSinceRef.current = null
      setElapsedSeconds(0)
    }
  }, [isConnected])

  // ── Tick every second when offline ──
  useEffect(() => {
    if (isConnected || !visible) return

    const interval = setInterval(() => {
      if (offlineSinceRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - offlineSinceRef.current) / 1000))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isConnected, visible])

  const isOffline = visible && !isConnected

  // Build connection label: "Réseau mobile 4G" / "Wi-Fi" / etc.
  const connectionLabel =
    connectionType === 'cellular' && cellularGeneration
      ? `Réseau mobile ${cellularGeneration}`
      : CONNECTION_LABELS[connectionType] ?? connectionType

  const offlineDuration = isOffline ? formatDuration(elapsedSeconds) : null

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{
            height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 0.2 },
          }}
          className={cn(
            'fixed top-0 left-0 right-0 z-[60]',
            'bg-gradient-to-r from-amber-50 via-amber-100 to-yellow-100',
            'dark:from-amber-950/60 dark:via-amber-900/50 dark:to-yellow-950/50',
            'border-b border-amber-200 dark:border-amber-800/60',
            'shadow-sm overflow-hidden'
          )}
          role="alert"
          aria-live="polite"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
            {/* Left: Icon + Message */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <WifiOff className="size-4 text-amber-600 dark:text-amber-400" />
                <motion.span
                  className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 truncate">
                  Vous êtes hors ligne
                </p>
                <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300/80 flex-wrap">
                  <span className="flex items-center gap-1">
                    <ConnectionIcon type={connectionType} />
                    <span className="truncate max-w-[160px] sm:max-w-none">
                      {connectionLabel}
                    </span>
                  </span>

                  {offlineDuration && (
                    <>
                      <span className="hidden sm:inline mx-0.5">·</span>
                      <span
                        className="hidden sm:inline-flex items-center gap-1"
                        aria-label={`Hors ligne depuis ${offlineDuration}`}
                      >
                        <Timer className="size-3" />
                        {offlineDuration}
                      </span>
                    </>
                  )}

                  <span className="hidden md:inline mx-0.5">·</span>
                  <span className="hidden md:inline text-amber-600/70 dark:text-amber-400/60">
                    Fonctionnalités limitées
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Retry button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={refresh}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                'text-xs font-semibold text-amber-700 dark:text-amber-300',
                'bg-amber-200/60 dark:bg-amber-800/40',
                'hover:bg-amber-200 dark:hover:bg-amber-800/60',
                'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
              )}
              aria-label="Vérifier la connexion"
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">Réessayer</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
