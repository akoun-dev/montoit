'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Network } from '@capacitor/network'
import type { ConnectionStatus, ConnectionType } from '@capacitor/network'

export interface UseNetworkReturn {
  /** Whether the device has an active network connection */
  isConnected: boolean
  /** The type of network connection (wifi, cellular, none, unknown) */
  connectionType: ConnectionType
  /** Manually refresh the network status */
  refresh: () => Promise<void>
}

/**
 * React hook for monitoring network connectivity using @capacitor/network.
 *
 * In web mode (non-Capacitor), falls back to `navigator.onLine`.
 *
 * @example
 * ```tsx
 * const { isConnected, connectionType } = useNetwork()
 * if (!isConnected) return <OfflineBanner />
 * ```
 */
export function useNetwork(): UseNetworkReturn {
  const [isConnected, setIsConnected] = useState(true)
  const [connectionType, setConnectionType] = useState<ConnectionType>('unknown')
  const listenerRef = useRef<{ remove: () => void } | null>(null)

  const refresh = useCallback(async () => {
    try {
      const status = await Network.getStatus()
      setIsConnected(status.connected)
      setConnectionType(status.connectionType)
    } catch {
      // Web fallback
      setIsConnected(navigator.onLine)
      setConnectionType(navigator.onLine ? 'wifi' : 'none')
    }
  }, [])

  useEffect(() => {
    refresh()

    let cancelled = false

    Network.addListener('networkStatusChange', (status) => {
      setIsConnected(status.connected)
      setConnectionType(status.connectionType)
    }).then((l) => {
      if (cancelled) {
        l.remove()
        return
      }
      listenerRef.current = l
    })

    // Web fallback: listen for online/offline events
    const handleOnline = () => {
      setIsConnected(true)
      setConnectionType('wifi')
    }
    const handleOffline = () => {
      setIsConnected(false)
      setConnectionType('none')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      cancelled = true
      listenerRef.current?.remove()
      listenerRef.current = null
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [refresh])

  return { isConnected, connectionType, refresh }
}
