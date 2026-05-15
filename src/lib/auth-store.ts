import { create } from 'zustand'

export type AuthMethod = 'sms' | 'email'

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
  email: string
  authMethod: AuthMethod
  isLoading: boolean
  needsRegistration: boolean
  tempUserId: string | null
  dashboardSection: string

  login: (identifier: string, method: AuthMethod) => Promise<{ exists: boolean }>
  verifyOtp: (identifier: string, code: string, method: AuthMethod) => Promise<{ needsRegistration: boolean; user?: AuthUser }>
  register: (data: { phone?: string; email?: string; firstName: string; lastName: string; role?: string }) => Promise<AuthUser>
  logout: () => Promise<void>
  setView: (view: AppView) => void
  setPhone: (phone: string) => void
  setEmail: (email: string) => void
  setAuthMethod: (method: AuthMethod) => void
  setDashboardSection: (section: string) => void
  checkAuth: () => Promise<void>
  seedData: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  currentView: 'home',
  phone: '',
  email: '',
  authMethod: 'sms',
  isLoading: false,
  needsRegistration: false,
  tempUserId: null,
  dashboardSection: 'overview',

  login: async (identifier: string, method: AuthMethod) => {
    set({ isLoading: true, [method === 'sms' ? 'phone' : 'email']: identifier, authMethod: method })
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(method === 'sms' ? { phone: identifier } : { email: identifier }),
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

  verifyOtp: async (identifier: string, code: string, method: AuthMethod) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(method === 'sms' ? { phone: identifier, code } : { email: identifier, code }),
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
        email: '',
        authMethod: 'sms',
        needsRegistration: false,
        tempUserId: null,
        dashboardSection: 'overview',
      })
    }
  },

  setView: (view) => set({ currentView: view }),
  setPhone: (phone) => set({ phone }),
  setEmail: (email) => set({ email }),
  setAuthMethod: (method) => set({ authMethod: method }),
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
