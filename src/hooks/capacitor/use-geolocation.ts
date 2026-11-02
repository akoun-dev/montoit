'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Geolocation } from '@capacitor/geolocation'
import type {
  Position,
  PositionOptions,
  PermissionStatus,
  WatchPositionCallback,
} from '@capacitor/geolocation'

export interface UseGeolocationReturn {
  /** Current position (or null if not yet obtained) */
  position: Position | null
  /** Whether a position update is in progress */
  isLoading: boolean
  /** Error message if location retrieval failed */
  error: string | null
  /** Permission status */
  permissionStatus: PermissionStatus | null
  /** Get the current position once */
  getCurrentPosition: (options?: PositionOptions) => Promise<Position | null>
  /** Start watching position changes */
  startWatching: (options?: PositionOptions) => void
  /** Stop watching position changes */
  stopWatching: () => void
  /** Whether the watch is active */
  isWatching: boolean
  /** Check location permissions */
  checkPermissions: () => Promise<PermissionStatus>
  /** Request location permissions */
  requestPermissions: () => Promise<PermissionStatus>
}

/**
 * React hook for geolocation using @capacitor/geolocation.
 *
 * Provides current position, watch capabilities, and permission management.
 * Falls back to the Web Geolocation API when not in Capacitor.
 *
 * @example
 * ```tsx
 * const { position, isLoading, startWatching, stopWatching, isWatching } = useGeolocation()
 * ```
 */
export function useGeolocation(options?: PositionOptions): UseGeolocationReturn {
  const [position, setPosition] = useState<Position | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null)
  const [isWatching, setIsWatching] = useState(false)
  const watchIdRef = useRef<string | null>(null)
  const webWatchIdRef = useRef<number | null>(null)

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 0,
    ...options,
  }

  /**
   * Get the current position once.
   */
  const getCurrentPosition = useCallback(async (opts?: PositionOptions): Promise<Position | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const pos = await Geolocation.getCurrentPosition(opts || defaultOptions)
      setPosition(pos)
      return pos
    } catch (err: any) {
      // Fallback to Web Geolocation API
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: defaultOptions.enableHighAccuracy,
              timeout: defaultOptions.timeout,
              maximumAge: defaultOptions.maximumAge,
            })
          })
          const mapped: Position = {
            timestamp: pos.timestamp,
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitudeAccuracy: pos.coords.altitudeAccuracy,
              altitude: pos.coords.altitude,
              speed: pos.coords.speed,
              heading: pos.coords.heading,
              magneticHeading: null,
              trueHeading: null,
              headingAccuracy: null,
              course: null,
            },
          }
          setPosition(mapped)
          return mapped
        } catch (webErr: any) {
          const msg = webErr.message || 'Impossible d\'obtenir la position'
          setError(msg)
          return null
        }
      }
      const msg = err.message || 'Erreur de géolocalisation'
      setError(msg)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Start watching position changes.
   */
  const startWatching = useCallback((opts?: PositionOptions) => {
    setIsWatching(true)
    setError(null)

    const callback: WatchPositionCallback = (pos, err) => {
      if (pos) {
        setPosition(pos)
        setError(null)
      }
      if (err) {
        setError(err.message || 'Erreur de suivi de position')
      }
    }

    Geolocation.watchPosition(opts || defaultOptions, callback)
      .then((id) => {
        watchIdRef.current = id
      })
      .catch(() => {
        // Fallback to Web Geolocation API
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          webWatchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              const mapped: Position = {
                timestamp: pos.timestamp,
                coords: {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                  altitudeAccuracy: pos.coords.altitudeAccuracy,
                  altitude: pos.coords.altitude,
                  speed: pos.coords.speed,
                  heading: pos.coords.heading,
                  magneticHeading: null,
                  trueHeading: null,
                  headingAccuracy: null,
                  course: null,
                },
              }
              setPosition(mapped)
              setError(null)
            },
            (err) => {
              setError(err.message || 'Erreur de suivi de position')
            },
            {
              enableHighAccuracy: defaultOptions.enableHighAccuracy,
              timeout: defaultOptions.timeout,
              maximumAge: defaultOptions.maximumAge,
            }
          )
        }
      })
  }, [])

  /**
   * Stop watching position changes.
   */
  const stopWatching = useCallback(() => {
    if (watchIdRef.current) {
      Geolocation.clearWatch({ id: watchIdRef.current }).catch(() => {})
      watchIdRef.current = null
    }
    if (webWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(webWatchIdRef.current)
      webWatchIdRef.current = null
    }
    setIsWatching(false)
  }, [])

  /**
   * Check location permissions.
   */
  const checkPermissions = useCallback(async (): Promise<PermissionStatus> => {
    const status = await Geolocation.checkPermissions()
    setPermissionStatus(status)
    return status
  }, [])

  /**
   * Request location permissions.
   */
  const requestPermissions = useCallback(async (): Promise<PermissionStatus> => {
    const status = await Geolocation.requestPermissions()
    setPermissionStatus(status)
    return status
  }, [])

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      stopWatching()
    }
  }, [stopWatching])

  // Check permissions on mount
  useEffect(() => {
    checkPermissions().catch(() => {})
  }, [checkPermissions])

  return {
    position,
    isLoading,
    error,
    permissionStatus,
    getCurrentPosition,
    startWatching,
    stopWatching,
    isWatching,
    checkPermissions,
    requestPermissions,
  }
}
