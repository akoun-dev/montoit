import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

// State that persists across page refreshes via localStorage
interface PersistedAuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  currentView: AppView
  previousView: AppView
  dashboardSection: string
  selectedPropertyId: string
  lastAuthenticatedAt: number | null  // timestamp of last successful auth
}

// Transient state that does NOT persist
interface TransientAuthState {
  isLoading: boolean
  isInitialized: boolean
  pendingPhone: string
  pendingEmail: string
  authMethod: AuthMethod
  devCode: string
  otpPurpose: OtpPurpose
}

interface AuthActions {
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
  updateUser: (partial: Partial<AuthUser>) => void
  checkAuth: () => Promise<void>
  seedData: () => Promise<void>
}

type AuthState = PersistedAuthState & TransientAuthState & AuthActions

const defaultPersisted: PersistedAuthState = {
  user: null,
  isAuthenticated: false,
  currentView: 'home',
  previousView: 'home',
  dashboardSection: 'overview',
  selectedPropertyId: '',
  lastAuthenticatedAt: null,
}

const defaultTransient: TransientAuthState = {
  isLoading: false,
  isInitialized: false,
  pendingPhone: '',
  pendingEmail: '',
  authMethod: 'email',
  devCode: '',
  otpPurpose: 'login',
}

// ─── checkAuth deduplication guard ──────────────────────────────────────────
// Prevents multiple simultaneous checkAuth calls
let checkAuthPromise: Promise<void> | null = null

// ─── Session heartbeat interval ────────────────────────────────────────────
const SESSION_HEARTBEAT_INTERVAL = 10 * 60 * 1000 // 10 minutes
let heartbeatTimer: ReturnType<typeof setInterval> | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...defaultPersisted,
      ...defaultTransient,

      loginWithEmail: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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
              devCode: data.devCode || '',
            })
            throw new Error(data.error)
          }

          if (!res.ok) throw new Error(data.error || 'Identifiants incorrects')

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            currentView: 'dashboard',
            lastAuthenticatedAt: Date.now(),
          })
          startHeartbeat()
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
            credentials: 'include',
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
            credentials: 'include',
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
            lastAuthenticatedAt: Date.now(),
          })
          startHeartbeat()
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
            credentials: 'include',
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
            credentials: 'include',
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
              lastAuthenticatedAt: Date.now(),
            })
            startHeartbeat()
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
            credentials: 'include',
            body: JSON.stringify({ ...data, method: 'email' }),
          })
          const result = await res.json()
          if (!res.ok) throw new Error(result.error || 'Erreur')

          // Do NOT set isAuthenticated — user must verify email OTP first
          set({
            user: result.user,
            isLoading: false,
            pendingEmail: data.email,
            otpPurpose: 'email_verify',
            currentView: 'email-verify',
            devCode: result.devCode || '',
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
            credentials: 'include',
            body: JSON.stringify({ ...data, method: 'sms' }),
          })
          const result = await res.json()
          if (!res.ok) throw new Error(result.error || 'Erreur')

          // Do NOT set isAuthenticated — user must verify SMS OTP first
          set({
            user: result.user,
            isLoading: false,
            pendingPhone: data.phone,
            otpPurpose: 'login',
            currentView: 'otp-verify',
            devCode: result.devCode || '',
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
            credentials: 'include',
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
            credentials: 'include',
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
        stopHeartbeat()
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            currentView: 'home',
            previousView: 'home',
            pendingPhone: '',
            pendingEmail: '',
            authMethod: 'email',
            otpPurpose: 'login',
            devCode: '',
            dashboardSection: 'overview',
            selectedPropertyId: '',
            lastAuthenticatedAt: null,
          })
        }
      },

      setView: (view) => set((state) => ({ previousView: state.currentView, currentView: view })),
      setAuthMethod: (method) => set({ authMethod: method }),
      setOtpPurpose: (purpose) => set({ otpPurpose: purpose }),
      setDashboardSection: (section) => set({ dashboardSection: section }),
      setSelectedPropertyId: (id) => set({ selectedPropertyId: id }),
      updateUser: (partial) => set((state) => ({
        user: state.user ? { ...state.user, ...partial } : state.user,
      })),

      checkAuth: async () => {
        // Deduplicate: if a checkAuth is already in progress, reuse that promise
        if (checkAuthPromise) return checkAuthPromise

        checkAuthPromise = (async () => {
          try {
            const res = await fetch('/api/auth/me', {
              credentials: 'include',
            })

            if (res.ok) {
              const data = await res.json()
              set({
                user: data.user,
                isAuthenticated: true,
                isInitialized: true,
                lastAuthenticatedAt: Date.now(),
              })
              startHeartbeat()
            } else if (res.status === 401) {
              // Server explicitly says not authenticated — session is truly expired
              set({
                user: null,
                isAuthenticated: false,
                currentView: get().currentView === 'dashboard' ? 'home' : get().currentView,
                isInitialized: true,
                lastAuthenticatedAt: null,
              })
              stopHeartbeat()
            } else {
              // Server error (5xx) or other non-401 error — DO NOT clear auth state
              // The session might still be valid; just mark as initialized
              // Keep whatever was persisted in localStorage
              console.warn(`[checkAuth] Server returned ${res.status}, keeping current auth state`)
              set({ isInitialized: true })
            }
          } catch {
            // Network error → don't clear the persisted state, just mark as initialized
            // The persisted state might still be valid when connectivity returns
            set({ isInitialized: true })
          } finally {
            checkAuthPromise = null
          }
        })()

        return checkAuthPromise
      },

      seedData: async () => {
        try {
          const res = await fetch('/api/seed', { method: 'POST', credentials: 'include' })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          return data
        } catch (error) {
          console.error('Seed error:', error)
          throw error
        }
      },
    }),
    {
      name: 'montoit-auth',
      // Only persist these fields to localStorage
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentView: state.currentView,
        previousView: state.previousView,
        dashboardSection: state.dashboardSection,
        selectedPropertyId: state.selectedPropertyId,
        lastAuthenticatedAt: state.lastAuthenticatedAt,
      }),
      // After rehydration, merge with default transient state
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AuthState>
        // Validate persisted auth state — if lastAuthenticatedAt is too old,
        // don't trust the persisted isAuthenticated flag
        const MAX_SESSION_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days (matches server session)
        const isSessionStillValid = persisted.lastAuthenticatedAt
          ? (Date.now() - persisted.lastAuthenticatedAt) < MAX_SESSION_AGE_MS
          : false

        return {
          ...currentState,
          ...persisted,
          // If persisted session is too old, clear auth
          isAuthenticated: isSessionStillValid ? (persisted.isAuthenticated ?? false) : false,
          user: isSessionStillValid ? persisted.user : null,
          // Always reset transient state on rehydration
          isLoading: false,
          isInitialized: false,
          pendingPhone: '',
          pendingEmail: '',
          authMethod: 'email',
          devCode: '',
          otpPurpose: 'login',
        }
      },
    }
  )
)

// ─── Session Heartbeat ──────────────────────────────────────────────────────
// Periodically calls /api/auth/me to keep the session alive (sliding refresh)
// and detect server-side session expiry

function startHeartbeat() {
  if (heartbeatTimer) return // Already running
  if (typeof window === 'undefined') return

  heartbeatTimer = setInterval(async () => {
    const { isAuthenticated, checkAuth } = useAuthStore.getState()
    if (!isAuthenticated) {
      stopHeartbeat()
      return
    }
    try {
      await checkAuth()
    } catch {
      // Silently ignore heartbeat errors — the next one will retry
    }
  }, SESSION_HEARTBEAT_INTERVAL)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// Start heartbeat on store creation if already authenticated
if (typeof window !== 'undefined') {
  const { isAuthenticated } = useAuthStore.getState()
  if (isAuthenticated) {
    startHeartbeat()
  }
}
