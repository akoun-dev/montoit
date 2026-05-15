import { create } from 'zustand'

export type AppView = 'home' | 'nos-biens' | 'a-propos' | 'nous-contacter' | 'login' | 'register' | 'otp-verify' | 'dashboard'

export interface AuthUser {
  id: string
  phone: string
  email: string | null
  firstName: string
  lastName: string
  role: 'LOCATAIRE' | 'PROPRIETAIRE' | 'ADMIN' | 'TIERS_CONFIANCE'
  avatarUrl: string | null
  isActive: boolean
  isPhoneVerified: boolean
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  currentView: AppView
  phone: string
  isLoading: boolean
  needsRegistration: boolean
  tempUserId: string | null
  dashboardSection: string

  login: (phone: string) => Promise<{ exists: boolean }>
  verifyOtp: (phone: string, code: string) => Promise<{ needsRegistration: boolean; user?: AuthUser }>
  register: (data: { phone: string; firstName: string; lastName: string; email?: string; role?: string }) => Promise<AuthUser>
  logout: () => Promise<void>
  setView: (view: AppView) => void
  setPhone: (phone: string) => void
  setDashboardSection: (section: string) => void
  checkAuth: () => Promise<void>
  seedData: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  currentView: 'home',
  phone: '',
  isLoading: false,
  needsRegistration: false,
  tempUserId: null,
  dashboardSection: 'overview',

  login: async (phone: string) => {
    set({ isLoading: true, phone })
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      set({ isLoading: false, currentView: 'otp-verify' })
      return { exists: data.exists }
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  verifyOtp: async (phone: string, code: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Code invalide')

      if (data.needsRegistration) {
        set({
          isLoading: false,
          needsRegistration: true,
          tempUserId: data.tempUserId || null,
          currentView: 'register',
        })
        return { needsRegistration: true }
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        currentView: 'dashboard',
        needsRegistration: false,
      })
      return { needsRegistration: false, user: data.user }
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (data) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur')

      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        currentView: 'dashboard',
        needsRegistration: false,
      })
      return result.user
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        currentView: 'home',
        phone: '',
        needsRegistration: false,
        tempUserId: null,
        dashboardSection: 'overview',
      })
    }
  },

  setView: (view) => set({ currentView: view }),
  setPhone: (phone) => set({ phone }),
  setDashboardSection: (section) => set({ dashboardSection: section }),

  checkAuth: async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        set({
          user: data.user,
          isAuthenticated: true,
          currentView: 'dashboard',
        })
      }
    } catch {
      // Not authenticated
    }
  },

  seedData: async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    } catch (error) {
      console.error('Seed error:', error)
      throw error
    }
  },
}))
