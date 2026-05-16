'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState, useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="shrink-0" aria-label="Thème">
        <Sun className="size-5" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0"
      aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? (
        <Sun className="size-5 text-amber-400" />
      ) : (
        <Moon className="size-5 text-muted-foreground" />
      )}
    </Button>
  )
}

function getTimeString() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function getDateString() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function LiveClock() {
  const mounted = useMounted()
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  return (
    <div className="hidden sm:flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{getDateString()}</span>
      <span className="font-semibold text-foreground tabular-nums">{getTimeString()}</span>
    </div>
  )
}
