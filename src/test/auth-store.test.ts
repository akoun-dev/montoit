import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'

// ─── Mocks ───────────────────────────────────────────────────────────────────
const mockApiFetch = vi.hoisted(() => vi.fn())

vi.mock('@/lib/capacitor', () => ({
  apiFetch: mockApiFetch,
}))

// ─── Constantes ──────────────────────────────────────────────────────────────

const defaultUser = {
  id: 'user-1',
  phone: null,
  email: 'test@test.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'LOCATAIRE' as const,
  activeRole: 'LOCATAIRE' as const,
  avatarUrl: null,
  isActive: true,
  isEmailVerified: true,
  isPhoneVerified: false,
}

const defaultPersistedState = {
  user: null,
  isAuthenticated: false,
  currentView: 'home',
  previousView: 'home',
  dashboardSection: 'overview',
  selectedPropertyId: '',
  selectedItemId: '',
  lastAuthenticatedAt: null,
  searchParams: { query: '', commune: '', propertyType: '' },
}

const defaultTransientState = {
  isLoading: false,
  isInitialized: false,
  pendingPhone: '',
  pendingEmail: '',
  pendingRole: '',
  authMethod: 'email',
  devCode: '',
  otpPurpose: 'login',
  pendingMessage: '',
  settingsDefaultTab: '',
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAuthStore', () => {
  let useAuthStore: any

  const originalScrollTo = window.scrollTo

  beforeAll(async () => {
    window.scrollTo = vi.fn()
    const mod = await import('@/lib/auth-store')
    useAuthStore = mod.useAuthStore
  })

  afterAll(() => {
    window.scrollTo = originalScrollTo
  })

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockApiFetch.mockReset()

    // Reset store state to defaults
    useAuthStore.setState({
      ...defaultPersistedState,
      ...defaultTransientState,
    })
  })

  // ─── État initial ───────────────────────────────────────────────────────

  describe('état initial', () => {
    it('a les valeurs par défaut', () => {
      const state = useAuthStore.getState()

      expect(state.isAuthenticated).toBe(false)
      expect(state.isInitialized).toBe(false)
      expect(state.currentView).toBe('home')
      expect(state.isLoading).toBe(false)
      expect(state.user).toBeNull()
      expect(state.lastAuthenticatedAt).toBeNull()
      expect(state.dashboardSection).toBe('overview')
      expect(state.pendingPhone).toBe('')
      expect(state.pendingRole).toBe('')
    })
  })

  // ─── Login par email ────────────────────────────────────────────────────

  describe('loginWithEmail', () => {
    it('connecte l utilisateur et redirige vers dashboard', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })

      await useAuthStore.getState().loginWithEmail('test@test.com', 'password')

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
      expect(state.user).toEqual(defaultUser)
      expect(state.currentView).toBe('dashboard')
      expect(state.lastAuthenticatedAt).not.toBeNull()

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com', password: 'password' }),
        }),
      )
    })

    it("gère le cas email non vérifié (403 + needsVerification)", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Email non vérifié',
          needsVerification: true,
          email: 'test@test.com',
          devCode: '123456',
        }),
      })

      await expect(
        useAuthStore.getState().loginWithEmail('test@test.com', 'password'),
      ).rejects.toThrow('Email non vérifié')

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.currentView).toBe('email-verify')
      expect(state.pendingEmail).toBe('test@test.com')
      expect(state.otpPurpose).toBe('email_verify')
      expect(state.isLoading).toBe(false)
    })

    it('gère les erreurs de connexion (mauvais mot de passe)', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Email ou mot de passe incorrect' }),
      })

      await expect(
        useAuthStore.getState().loginWithEmail('wrong@test.com', 'wrong'),
      ).rejects.toThrow('Email ou mot de passe incorrect')

      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  // ─── Login par SMS ─────────────────────────────────────────────────────

  describe('loginWithSms', () => {
    it("envoie OTP et redirige vers otp-verify", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await useAuthStore.getState().loginWithSms('+22501020304')

      const state = useAuthStore.getState()
      expect(state.pendingPhone).toBe('+22501020304')
      expect(state.currentView).toBe('otp-verify')
      expect(state.otpPurpose).toBe('login')
      expect(state.isLoading).toBe(false)

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/auth/send-sms-otp',
        expect.objectContaining({
          body: JSON.stringify({ phone: '+22501020304', purpose: 'login' }),
        }),
      )
    })
  })

  // ─── Logout ─────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('réinitialise complètement l état', async () => {
      mockApiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.currentView).toBe('home')
      expect(state.previousView).toBe('home')
      expect(state.dashboardSection).toBe('overview')
      expect(state.lastAuthenticatedAt).toBeNull()
      expect(state.pendingPhone).toBe('')
      expect(state.pendingEmail).toBe('')
      expect(state.otpPurpose).toBe('login')
      expect(state.selectedPropertyId).toBe('')
      expect(state.selectedItemId).toBe('')

      expect(mockApiFetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({
        method: 'POST',
      }))
    })
  })

  // ─── checkAuth ──────────────────────────────────────────────────────────

  describe('checkAuth', () => {
    it("met à jour l état si 200 (connecté)", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(defaultUser)
      expect(state.isInitialized).toBe(true)
      expect(state.lastAuthenticatedAt).not.toBeNull()
    })

    it("réinitialise l état si 401 (session expirée)", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non autorisé' }),
      })

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.currentView).toBe('home')
      expect(state.isInitialized).toBe(true)
      expect(state.lastAuthenticatedAt).toBeNull()
      expect(state.dashboardSection).toBe('overview')
    })

    it("ne réinitialise PAS l état si 5xx (erreur serveur)", async () => {
      // Configurer un état connecté
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
        isInitialized: true,
        lastAuthenticatedAt: Date.now(),
        currentView: 'dashboard',
      })

      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service indisponible' }),
      })

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.isInitialized).toBe(true)
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(defaultUser)
      expect(state.currentView).toBe('dashboard')
    })

    it("ne réinitialise PAS si erreur réseau", async () => {
      // Configurer un état connecté
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
        isInitialized: true,
        lastAuthenticatedAt: Date.now(),
        currentView: 'dashboard',
      })

      mockApiFetch.mockRejectedValueOnce(new Error('Network error'))

      await useAuthStore.getState().checkAuth()

      const state = useAuthStore.getState()
      expect(state.isInitialized).toBe(true)
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(defaultUser)
    })
  })

  // ─── switchRole ─────────────────────────────────────────────────────────

  describe('switchRole', () => {
    it("change activeRole et réinitialise dashboardSection à overview", async () => {
      // Connecter l'utilisateur avec un rôle
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
      })

      // Changer de section (pour vérifier la réinit)
      useAuthStore.getState().setDashboardSection('my-properties')

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await useAuthStore.getState().switchRole('PROPRIETAIRE')

      const state = useAuthStore.getState()
      expect(state.user?.activeRole).toBe('PROPRIETAIRE')
      expect(state.dashboardSection).toBe('overview') // réinitialisé
      expect(state.isLoading).toBe(false)

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/user/switch-role',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ role: 'PROPRIETAIRE' }),
        }),
      )
    })
  })

  // ─── setView & setDashboardSection ──────────────────────────────────────

  describe('setView', () => {
    it("met à jour currentView et enregistre la précédente", () => {
      useAuthStore.getState().setView('login')
      expect(useAuthStore.getState().currentView).toBe('login')
      expect(useAuthStore.getState().previousView).toBe('home')

      useAuthStore.getState().setView('dashboard')
      expect(useAuthStore.getState().currentView).toBe('dashboard')
      expect(useAuthStore.getState().previousView).toBe('login')
    })
  })

  describe('setDashboardSection', () => {
    it("met à jour la section du tableau de bord", () => {
      useAuthStore.getState().setDashboardSection('payments')
      expect(useAuthStore.getState().dashboardSection).toBe('payments')

      useAuthStore.getState().setDashboardSection('settings')
      expect(useAuthStore.getState().dashboardSection).toBe('settings')
    })
  })

  // ─── updateUser ─────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('met à jour partiellement l utilisateur connecté', () => {
      // Simuler un utilisateur connecté
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
      })

      useAuthStore.getState().updateUser({ firstName: 'Updated', lastName: 'Name' })

      const user = useAuthStore.getState().user
      expect(user?.firstName).toBe('Updated')
      expect(user?.lastName).toBe('Name')
      expect(user?.email).toBe('test@test.com') // inchangé
      expect(user?.role).toBe('LOCATAIRE') // inchangé
    })

    it('ne fait rien si aucun utilisateur connecté', () => {
      useAuthStore.getState().updateUser({ firstName: 'Updated' })
      expect(useAuthStore.getState().user).toBeNull()
    })
  })

  // ─── Inscription ────────────────────────────────────────────────────────

  describe('registerWithEmail', () => {
    it('ne connecte PAS automatiquement et redirige vers email-verify', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { ...defaultUser, id: 'new-user', email: 'new@test.com' },
          devCode: '654321',
        }),
      })

      await useAuthStore.getState().registerWithEmail({
        email: 'new@test.com',
        password: 'password',
        firstName: 'New',
        lastName: 'User',
      })

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false) // PAS de connexion auto
      expect(state.currentView).toBe('email-verify')
      expect(state.pendingEmail).toBe('new@test.com')
      expect(state.otpPurpose).toBe('email_verify')
      expect(state.isLoading).toBe(false)
    })

    it('redirige vers login si l email existe déjà', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Un compte avec cet email existe déjà' }),
      })

      await useAuthStore.getState().registerWithEmail({
        email: 'exists@test.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      })

      const state = useAuthStore.getState()
      expect(state.currentView).toBe('login')
      expect(state.pendingEmail).toBe('exists@test.com')
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('registerWithSms', () => {
    it("ne connecte PAS automatiquement et redirige vers otp-verify", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { ...defaultUser, id: 'new-user', phone: '+22501020304' },
          devCode: '654321',
        }),
      })

      await useAuthStore.getState().registerWithSms({
        phone: '+22501020304',
        firstName: 'New',
        lastName: 'User',
      })

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false) // PAS de connexion auto
      expect(state.currentView).toBe('otp-verify')
      expect(state.pendingPhone).toBe('+22501020304')
      expect(state.otpPurpose).toBe('login')
      expect(state.isLoading).toBe(false)
    })
  })

  // ─── Vérification OTP ──────────────────────────────────────────────────

  describe('verifyEmailOtp', () => {
    it("connecte l utilisateur si OTP valide (purpose: login)", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })

      await useAuthStore.getState().verifyEmailOtp('test@test.com', '123456', 'login')

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(defaultUser)
      expect(state.currentView).toBe('dashboard')
      expect(state.isLoading).toBe(false)
    })

    it("redirige vers register si needsRegistration", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ needsRegistration: true }),
      })

      const result = await useAuthStore.getState().verifyEmailOtp('new@test.com', '123456', 'login')

      expect(result?.needsRegistration).toBe(true)
      expect(useAuthStore.getState().currentView).toBe('register')
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it("redirige vers login si email vérifié (purpose: email_verify)", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requiresLogin: true, valid: true }),
      })

      const result = await useAuthStore.getState().verifyEmailOtp('test@test.com', '123456', 'email_verify')

      expect(result?.requiresLogin).toBe(true)
      expect(useAuthStore.getState().currentView).toBe('login')
      expect(useAuthStore.getState().pendingMessage).toContain('vérifiée')
    })

    it("retourne data.valid si password_reset", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      })

      const result = await useAuthStore.getState().verifyEmailOtp('test@test.com', '123456', 'password_reset')

      expect(result?.valid).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('verifySmsOtp', () => {
    it("connecte l utilisateur si OTP SMS valide", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })

      await useAuthStore.getState().verifySmsOtp('+22501020304', '123456')

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(defaultUser)
      expect(state.currentView).toBe('dashboard')
    })

    it("redirige vers register si needsRegistration", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ needsRegistration: true }),
      })

      await useAuthStore.getState().verifySmsOtp('+22501020304', '123456')

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.currentView).toBe('register')
      expect(state.authMethod).toBe('sms')
    })
  })

  // ─── verifyPhoneOtp ─────────────────────────────────────────────────────

  describe('verifyPhoneOtp', () => {
    it("marque le téléphone comme vérifié", async () => {
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
      })

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verified: true, message: 'Téléphone vérifié' }),
      })

      const result = await useAuthStore.getState().verifyPhoneOtp('+22501020304', '123456')

      expect(result?.verified).toBe(true)
      expect(useAuthStore.getState().user?.isPhoneVerified).toBe(true)
    })
  })

  // ─── forgotPassword / resetPassword ─────────────────────────────────────

  describe('forgotPassword', () => {
    it("redirige vers email-verify si méthode email", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await useAuthStore.getState().forgotPassword('test@test.com', 'email')

      const state = useAuthStore.getState()
      expect(state.pendingEmail).toBe('test@test.com')
      expect(state.otpPurpose).toBe('password_reset')
      expect(state.currentView).toBe('email-verify')
    })

    it("redirige vers otp-verify si méthode sms", async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await useAuthStore.getState().forgotPassword('+22501020304', 'sms')

      const state = useAuthStore.getState()
      expect(state.pendingPhone).toBe('+22501020304')
      expect(state.otpPurpose).toBe('password_reset')
      expect(state.currentView).toBe('otp-verify')
    })
  })

  describe('resetPassword', () => {
    it('appelle l API et redirige vers login', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await useAuthStore.getState().resetPassword({
        email: 'test@test.com',
        code: '123456',
        newPassword: 'newPassword123',
      })

      expect(useAuthStore.getState().currentView).toBe('login')
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/auth/reset-password',
        expect.objectContaining({
          body: JSON.stringify({
            email: 'test@test.com',
            code: '123456',
            newPassword: 'newPassword123',
          }),
        }),
      )
    })
  })

  // ─── Actions de navigation ─────────────────────────────────────────────

  describe('setAuthMethod', () => {
    it('met à jour la méthode d authentification', () => {
      useAuthStore.getState().setAuthMethod('sms')
      expect(useAuthStore.getState().authMethod).toBe('sms')

      useAuthStore.getState().setAuthMethod('email')
      expect(useAuthStore.getState().authMethod).toBe('email')
    })
  })

  describe('setPendingRole', () => {
    it('met à jour le rôle en attente', () => {
      useAuthStore.getState().setPendingRole('PROPRIETAIRE')
      expect(useAuthStore.getState().pendingRole).toBe('PROPRIETAIRE')
    })
  })

  describe('setOtpPurpose', () => {
    it("met à jour le purpose OTP", () => {
      useAuthStore.getState().setOtpPurpose('password_reset')
      expect(useAuthStore.getState().otpPurpose).toBe('password_reset')

      useAuthStore.getState().setOtpPurpose('login')
      expect(useAuthStore.getState().otpPurpose).toBe('login')
    })
  })

  describe('setSelectedPropertyId', () => {
    it('met à jour l ID de la propriété sélectionnée', () => {
      useAuthStore.getState().setSelectedPropertyId('prop-123')
      expect(useAuthStore.getState().selectedPropertyId).toBe('prop-123')
    })
  })

  describe('setSearchParams', () => {
    it('met à jour les paramètres de recherche', () => {
      useAuthStore.getState().setSearchParams({
        query: 'appartement',
        commune: 'Abidjan',
        propertyType: 'APPARTMENT',
      })

      expect(useAuthStore.getState().searchParams).toEqual({
        query: 'appartement',
        commune: 'Abidjan',
        propertyType: 'APPARTMENT',
      })
    })
  })
})
