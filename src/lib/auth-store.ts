import { create } from 'zustand'

export type AuthMethod = 'email' | 'sms'

export type AppView = 'home' | 'nos-biens' | 'a-propos' | 'nous-contacter' | 'login' | 'register' | 'otp-verify' | 'email-verify' | 'forgot-password' | 'dashboard' | 'property-detail'

export type OtpPurpose = 'login' | 'email_verify' | 'password_reset'

export interface AuthUser {
  id: string
  phone: string | null
  email: string | null
  firstName: string
  lastName: string
  role: 'LOCATAIRE' | 'PROPRIETAIRE' | 'AGENCE' | 'ADMIN' | 'TIERS_CONFIANCE'
  avatarUrl: string | null
  isActive: boolean
  isEmailVerified: boolean
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  currentView: AppView
  previousView: AppView
  isLoading: boolean
  // SMS flow state
  pendingPhone: string
  // Email OTP flow state
  pendingEmail: string
  authMethod: AuthMethod
  // OTP purpose tracking
  otpPurpose: OtpPurpose
  dashboardSection: string
  selectedPropertyId: string

  loginWithEmail: (email: string, password: string) => Promise<void>
  loginWithSms: (phone: string) => Promise<void>
  verifySmsOtp: (phone: string, code: string) => Promise<void>
  sendEmailOtp: (email: string, purpose: OtpPurpose) => Promise<void>
  verifyEmailOtp: (email: string, code: string, purpose: OtpPurpose) => Promise<void>
  registerWithEmail: (data: { email: string; password: string; firstName: string; lastName: string; phone?: string; role?: string }) => Promise<void>
  registerWithSms: (data: { phone: string; firstName: string; lastName: string; email?: string; role?: string }) => Promise<void>
  forgotPassword: (identifier: string, method: 'email' | 'sms') => Promise<void>
  resetPassword: (data: { email?: string; phone?: string; code: string; newPassword: string }) => Promise<void>
  logout: () => Promise<void>
  setView: (view: AppView) => void
  setAuthMethod: (method: AuthMethod) => void
  setOtpPurpose: (purpose: OtpPurpose) => void
  setDashboardSection: (section: string) => void
  setSelectedPropertyId: (id: string) => void
  checkAuth: () => Promise<void>
  seedData: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  currentView: 'home',
  previousView: 'home',
  isLoading: false,
  pendingPhone: '',
  pendingEmail: '',
  authMethod: 'email',
  otpPurpose: 'login',
  dashboardSection: 'overview',
  selectedPropertyId: '',

  loginWithEmail: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      // Handle unverified email — redirect to email verification
      if (res.status === 403 && data.needsVerification) {
        set({
          isLoading: false,
          pendingEmail: data.email || email,
          otpPurpose: 'email_verify',
          currentView: 'email-verify',
        })
        throw new Error(data.error)
      }

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
    set({ isLoading: true, pendingPhone: phone, otpPurpose: 'login' })
    try {
      const res = await fetch('/api/auth/send-sms-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'login' }),
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

      // SMS OTP verified → user is now authenticated
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

  sendEmailOtp: async (email: string, purpose: OtpPurpose) => {
    set({ isLoading: true, pendingEmail: email, otpPurpose: purpose })
    try {
      const res = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      set({ isLoading: false, currentView: 'email-verify' })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  verifyEmailOtp: async (email: string, code: string, purpose: OtpPurpose) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, purpose }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Code invalide')

      if (purpose === 'password_reset' && data.valid) {
        set({ isLoading: false })
        return data
      }

      if (data.needsRegistration) {
        set({ isLoading: false, currentView: 'register', authMethod: 'email' })
        return data
      }

      // Email OTP verified → user is now authenticated
      if (data.user) {
        set({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          currentView: 'dashboard',
        })
      }

      return data
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  // ─── Registration: NO auto-login → must verify OTP first ──────────────
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

      // Do NOT set isAuthenticated — user must verify email OTP first
      // The register API already created and sent the OTP
      set({
        user: result.user,
        isLoading: false,
        pendingEmail: data.email,
        otpPurpose: 'email_verify',
        currentView: 'email-verify',
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

      // Do NOT set isAuthenticated — user must verify SMS OTP first
      // The register API already created and sent the OTP
      set({
        user: result.user,
        isLoading: false,
        pendingPhone: data.phone,
        otpPurpose: 'login',
        currentView: 'otp-verify',
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  forgotPassword: async (identifier: string, method: 'email' | 'sms') => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, method }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      if (method === 'email') {
        set({
          isLoading: false,
          pendingEmail: identifier,
          otpPurpose: 'password_reset',
          currentView: 'email-verify',
        })
      } else {
        set({
          isLoading: false,
          pendingPhone: identifier,
          otpPurpose: 'password_reset',
          currentView: 'otp-verify',
        })
      }
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  resetPassword: async (data: { email?: string; phone?: string; code: string; newPassword: string }) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur')

      set({ isLoading: false, currentView: 'login' })
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
        pendingEmail: '',
        authMethod: 'email',
        otpPurpose: 'login',
        dashboardSection: 'overview',
        selectedPropertyId: '',
      })
    }
  },

  setView: (view) => set((state) => ({ previousView: state.currentView, currentView: view })),
  setAuthMethod: (method) => set({ authMethod: method }),
  setOtpPurpose: (purpose) => set({ otpPurpose: purpose }),
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
