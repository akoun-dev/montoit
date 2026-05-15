import { create } from 'zustand'

export type AppView = 'home' | 'nos-biens' | 'a-propos' | 'nous-contacter' | 'login' | 'register' | 'dashboard'

export interface AuthUser {
  id: string
  phone: string | null
  email: string
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
  dashboardSection: string

  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string; role?: string }) => Promise<void>
  logout: () => Promise<void>
  setView: (view: AppView) => void
  setDashboardSection: (section: string) => void
  checkAuth: () => Promise<void>
  seedData: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  currentView: 'home',
  isLoading: false,
  dashboardSection: 'overview',

  login: async (email: string, password: string) => {
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
        dashboardSection: 'overview',
      })
    }
  },

  setView: (view) => set({ currentView: view }),
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
