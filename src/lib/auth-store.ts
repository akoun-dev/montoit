import { create } from 'zustand'

export type AuthMethod = 'email' | 'sms'

export type AppView = 'home' | 'nos-biens' | 'a-propos' | 'nous-contacter' | 'login' | 'register' | 'otp-verify' | 'dashboard' | 'property-detail'

export interface AuthUser {
  id: string
  phone: string | null
  email: string | null
  firstName: string
  lastName: string
  role: 'LOCATAIRE' | 'PROPRIETAIRE' | 'ADMIN' | 'TIERS_CONFIANCE'
  avatarUrl: string | null
  isActive: boolean
  isEmailVerified: boolean
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  currentView: AppView
  isLoading: boolean
  // SMS flow state
  pendingPhone: string
  authMethod: AuthMethod
  dashboardSection: string
  selectedPropertyId: number

  loginWithEmail: (email: string, password: string) => Promise<void>
  loginWithSms: (phone: string) => Promise<void>
  verifySmsOtp: (phone: string, code: string) => Promise<void>
  registerWithEmail: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string; role?: string }) => Promise<void>
  registerWithSms: (data: { phone: string; firstName: string; lastName: string; email?: string; role?: string }) => Promise<void>
  logout: () => Promise<void>
  setView: (view: AppView) => void
  setAuthMethod: (method: AuthMethod) => void
  setDashboardSection: (section: string) => void
  setSelectedPropertyId: (id: number) => void
  checkAuth: () => Promise<void>
  seedData: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  currentView: 'home',
  isLoading: false,
  pendingPhone: '',
  authMethod: 'email',
  dashboardSection: 'overview',
  selectedPropertyId: 0,

  loginWithEmail: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Identifiants incorrects')

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        currentView: 'dashboard',
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  loginWithSms: async (phone: string) => {
    set({ isLoading: true, pendingPhone: phone })
    try {
      const res = await fetch('/api/auth/send-sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      set({ isLoading: false, currentView: 'otp-verify' })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  verifySmsOtp: async (phone: string, code: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/verify-sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Code invalide')

      if (data.needsRegistration) {
        set({ isLoading: false, currentView: 'register', authMethod: 'sms' })
        return
      }

      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        currentView: 'dashboard',
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  registerWithEmail: async (data) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, method: 'email' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur')

      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        currentView: 'dashboard',
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  registerWithSms: async (data) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, method: 'sms' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur')

      set({
        user: result.user,
        isAuthenticated: true,
        isLoading: false,
        currentView: 'dashboard',
      })
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
        pendingPhone: '',
        authMethod: 'email',
        dashboardSection: 'overview',
        selectedPropertyId: 0,
      })
    }
  },

  setView: (view) => set({ currentView: view }),
  setAuthMethod: (method) => set({ authMethod: method }),
  setDashboardSection: (section) => set({ dashboardSection: section }),
  setSelectedPropertyId: (id) => set({ selectedPropertyId: id }),

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
