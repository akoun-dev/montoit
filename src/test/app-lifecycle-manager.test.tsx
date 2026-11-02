import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import React from 'react'

// ─── Hoisted mocks ───────────────────────────────────────────────────────────
// These must be declared before any vi.mock() calls

const mockRefreshNotifications = vi.hoisted(() => vi.fn())
const mockSetView = vi.hoisted(() => vi.fn())
const mockSetDashboardSection = vi.hoisted(() => vi.fn())
const mockCheckAuth = vi.hoisted(() => vi.fn())
const mockIsNativePlatform = vi.hoisted(() => vi.fn(() => false))
const mockGetState = vi.hoisted(() => {
  return vi.fn(() => ({
    isAuthenticated: true,
    checkAuth: mockCheckAuth,
    setView: mockSetView,
    setDashboardSection: mockSetDashboardSection,
  }))
})
const mockMatchMedia = vi.hoisted(() => vi.fn())
const mockReload = vi.hoisted(() => vi.fn())

// ─── Module mocks ────────────────────────────────────────────────────────────
// vi.mock() calls are hoisted above imports by vitest

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mockIsNativePlatform,
  },
}))

vi.mock('@/hooks/capacitor/use-app', () => ({
  useApp: vi.fn(() => ({ isActive: true } as any)),
}))

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: vi.fn(() => ({
    refreshNotifications: mockRefreshNotifications,
  })),
}))

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: any) => any) => {
      const state = mockGetState()
      return selector ? selector(state) : state
    },
    { getState: mockGetState },
  ),
}))

// ─── Import component (mocks are already hoisted) ────────────────────────────

import { AppLifecycleManager } from '@/components/app-lifecycle-manager'

// ─── Test helpers ────────────────────────────────────────────────────────────

/**
 * Renders the component and returns the registered visibilitychange handler.
 * We call the handler directly instead of dispatching DOM events, because
 * async handlers on raw DOM events create microtasks that act() can't flush.
 */
function renderAndGetVisibilityHandler() {
  const addSpy = vi.spyOn(document, 'addEventListener')
  render(React.createElement(AppLifecycleManager))

  const found = addSpy.mock.calls.find(
    ([event]: any) => event === 'visibilitychange',
  )
  addSpy.mockRestore()
  return (found?.[1] as any) as (ev: Event) => Promise<void>
}

function mockDateNow(value: number) {
  vi.spyOn(Date, 'now').mockReturnValue(value)
}

function mockMatchMediaReturn(matches: boolean) {
  mockMatchMedia.mockReturnValue({ matches })
  Object.defineProperty(window, 'matchMedia', {
    value: mockMatchMedia,
    configurable: true,
    writable: true,
  })
}

// ─── Pre-built mock states ───────────────────────────────────────────────────

function mockStateAuthenticated() {
  return {
    isAuthenticated: true,
    checkAuth: mockCheckAuth,
    setView: mockSetView,
    setDashboardSection: mockSetDashboardSection,
  }
}

function mockStateUnauthenticated() {
  return {
    isAuthenticated: false,
    checkAuth: mockCheckAuth,
    setView: mockSetView,
    setDashboardSection: mockSetDashboardSection,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockDateNow(10000)
  mockIsNativePlatform.mockReturnValue(false)
  mockMatchMediaReturn(false)
  Object.defineProperty(window, 'location', {
    value: { reload: mockReload, href: '' },
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AppLifecycleManager', () => {
  it('renders null (aucun contenu visible)', () => {
    const { container } = render(React.createElement(AppLifecycleManager))
    expect(container.innerHTML).toBe('')
  })

  describe('runResumeLogic', () => {
    it('quand connecté : refreshNotifications + checkAuth sans changer de vue', async () => {
      mockCheckAuth.mockResolvedValue(undefined)
      mockGetState.mockReturnValue(mockStateAuthenticated())

      const handler = renderAndGetVisibilityHandler()
      expect(handler).toBeDefined()

      // Simule: page hidden → visible
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      })
      mockDateNow(10000)
      await act(async () => { handler(new Event('visibilitychange')) })

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      })
      mockDateNow(10500) // 500ms > debounce 300ms
      await act(async () => { handler(new Event('visibilitychange')) })

      expect(mockRefreshNotifications).toHaveBeenCalledOnce()
      expect(mockCheckAuth).toHaveBeenCalledOnce()
      expect(mockSetView).not.toHaveBeenCalled()
    })

    it('quand connecté mais checkAuth expire la session : ne redirige pas', async () => {
      mockCheckAuth.mockResolvedValue(undefined)
      mockGetState
        .mockReturnValueOnce(mockStateAuthenticated())
        .mockReturnValueOnce(mockStateUnauthenticated())

      const handler = renderAndGetVisibilityHandler()
      expect(handler).toBeDefined()

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden', configurable: true,
      })
      mockDateNow(10000)
      await act(async () => { handler(new Event('visibilitychange')) })

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible', configurable: true,
      })
      mockDateNow(10500)
      await act(async () => { handler(new Event('visibilitychange')) })

      expect(mockSetView).not.toHaveBeenCalledWith('dashboard')
    })

    it('quand connecté mais checkAuth jette une erreur : garde l état actuel', async () => {
      mockCheckAuth.mockRejectedValue(new Error('Network error'))
      mockGetState.mockReturnValue(mockStateAuthenticated())

      const handler = renderAndGetVisibilityHandler()
      expect(handler).toBeDefined()

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden', configurable: true,
      })
      mockDateNow(10000)
      await act(async () => { handler(new Event('visibilitychange')) })

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible', configurable: true,
      })
      mockDateNow(10500)
      await act(async () => { handler(new Event('visibilitychange')) })

      expect(mockSetView).not.toHaveBeenCalled()
    })

    it('quand non connecté : ne change pas directement la vue', async () => {
      mockGetState.mockReturnValue(mockStateUnauthenticated())

      const handler = renderAndGetVisibilityHandler()
      expect(handler).toBeDefined()

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden', configurable: true,
      })
      mockDateNow(10000)
      await act(async () => { handler(new Event('visibilitychange')) })

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible', configurable: true,
      })
      mockDateNow(10500)
      await act(async () => { handler(new Event('visibilitychange')) })

      expect(mockSetView).not.toHaveBeenCalled()
      expect(mockSetDashboardSection).not.toHaveBeenCalled()
    })
  })

  describe('visibilitychange (web/PWA)', () => {
    it('ignore le premier passage visible après chargement de la page', async () => {
      const handler = renderAndGetVisibilityHandler()
      expect(handler).toBeDefined()

      // Premier visible sans hidden préalable → ignoré
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible', configurable: true,
      })
      await act(async () => { handler(new Event('visibilitychange')) })

      expect(mockRefreshNotifications).not.toHaveBeenCalled()
    })

    it("ne recharge PAS la page si durée d'absence < 30s", async () => {
      mockGetState.mockReturnValue(mockStateUnauthenticated())

      const handler = renderAndGetVisibilityHandler()
      expect(handler).toBeDefined()

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden', configurable: true,
      })
      mockDateNow(10000)
      await act(async () => { handler(new Event('visibilitychange')) })

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible', configurable: true,
      })
      mockDateNow(11000) // 1s < 30s
      await act(async () => { handler(new Event('visibilitychange')) })

      expect(mockReload).not.toHaveBeenCalled()
    })

    it("ne recharge pas la page automatiquement après une longue absence", async () => {
      mockMatchMediaReturn(true)
      mockGetState.mockReturnValue(mockStateUnauthenticated())

      const handler = renderAndGetVisibilityHandler()
      expect(handler).toBeDefined()

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden', configurable: true,
      })
      mockDateNow(10000)
      await act(async () => { handler(new Event('visibilitychange')) })

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible', configurable: true,
      })
      mockDateNow(45000) // 35s > 30s
      await act(async () => { handler(new Event('visibilitychange')) })

      expect(mockReload).not.toHaveBeenCalled()
    })

    it("ne recharge PAS la page si > 30s mais PAS en mode standalone", async () => {
      mockMatchMediaReturn(false)
      mockGetState.mockReturnValue(mockStateUnauthenticated())

      const handler = renderAndGetVisibilityHandler()
      expect(handler).toBeDefined()

      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden', configurable: true,
      })
      mockDateNow(10000)
      await act(async () => { handler(new Event('visibilitychange')) })

      Object.defineProperty(document, 'visibilityState', {
        value: 'visible', configurable: true,
      })
      mockDateNow(45000)
      await act(async () => { handler(new Event('visibilitychange')) })

      expect(mockReload).not.toHaveBeenCalled()
    })

    it("ne s'attache pas à visibilitychange si Capacitor natif", () => {
      mockIsNativePlatform.mockReturnValue(true)
      const addSpy = vi.spyOn(document, 'addEventListener')

      render(React.createElement(AppLifecycleManager))

      const visibilityCalls = addSpy.mock.calls.filter(
        ([event]: any) => event === 'visibilitychange',
      )
      expect(visibilityCalls).toHaveLength(0)
      addSpy.mockRestore()
    })
  })

  describe('useApp isActive (Capacitor resume)', () => {
    it('ignore le premier mount (isInitialMount)', async () => {
      const { useApp } = await import('@/hooks/capacitor/use-app')
      const useAppMock = vi.mocked(useApp)

      useAppMock.mockReturnValue({ isActive: true } as any)
      render(React.createElement(AppLifecycleManager))

      expect(mockRefreshNotifications).not.toHaveBeenCalled()
    })

    it("appelle runResumeLogic quand isActive passe à true (resume natif)", async () => {
      const { useApp } = await import('@/hooks/capacitor/use-app')
      const useAppMock = vi.mocked(useApp)

      useAppMock.mockReturnValue({ isActive: false } as any)
      mockGetState.mockReturnValue(mockStateAuthenticated())
      mockCheckAuth.mockResolvedValue(undefined)

      const { rerender } = render(React.createElement(AppLifecycleManager))

      useAppMock.mockReturnValue({ isActive: true } as any)
      await act(async () => {
        rerender(React.createElement(AppLifecycleManager))
      })

      expect(mockCheckAuth).toHaveBeenCalled()
    })

    it("ne fait rien si isActive ne change pas", async () => {
      const { useApp } = await import('@/hooks/capacitor/use-app')
      const useAppMock = vi.mocked(useApp)

      useAppMock.mockReturnValue({ isActive: false } as any)
      render(React.createElement(AppLifecycleManager))

      expect(mockCheckAuth).not.toHaveBeenCalled()
    })
  })

  describe('nettoyage', () => {
    it('retire l event listener visibilitychange au démontage', () => {
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const { unmount } = render(React.createElement(AppLifecycleManager))
      unmount()

      expect(removeSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function),
      )
      removeSpy.mockRestore()
    })
  })
})
