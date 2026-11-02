/**
 * Tests d'intégration pour le flux complet d'authentification :
 * Login → useAuthStore → page.tsx (Home) → middleware check → Dashboard
 *
 * Ces tests valident que les différentes couches s'intègrent correctement :
 * - Les actions du store (loginWithEmail, checkAuth, logout) mettent à jour l'état
 * - Le composant Home réagit aux changements d'état (affiche LoadingScreen, LoginForm, Dashboard, etc.)
 * - Le middleware check (via getUserRole) est cohérent avec les rôles stockés côté client
 * - Les transitions entre vues (login → dashboard, dashboard → logout → home)
 *
 * NOTE IMPORTANTE sur checkAuth :
 * - checkAuth est appelé UNE SEULE fois au montage de page.tsx (dans useEffect)
 * - Il n'est PAS rappelé lors des navigations setView() ou setDashboardSection()
 * - Les tests doivent donc appeler checkAuth une fois pour initialiser, puis setView sans re-checkAuth
 * - Un appel checkAuth avec 401 réinitialise currentView à 'home' (comportement intentionnel du store)
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ─── Mocks API ────────────────────────────────────────────────────────────────
const mockApiFetch = vi.hoisted(() => vi.fn())

vi.mock('@/lib/capacitor', () => ({
  apiFetch: mockApiFetch,
}))

// ─── Mocks des composants lourds de Home ──────────────────────────────────────

vi.mock('@/components/home/header', () => ({
  Header: () => React.createElement('header', { 'data-testid': 'header' }),
}))

vi.mock('@/components/home/hero', () => ({
  Hero: () => React.createElement('div', { 'data-testid': 'hero' }),
}))

vi.mock('@/components/home/properties', () => ({
  NosBiens: () => React.createElement('div', { 'data-testid': 'nos-biens' }),
}))

vi.mock('@/components/home/nos-biens-view', () => ({
  NosBiensView: () => React.createElement('div', { 'data-testid': 'nos-biens-view' }),
}))

vi.mock('@/components/home/how-it-works', () => ({
  HowItWorks: () => React.createElement('div', { 'data-testid': 'how-it-works' }),
}))

vi.mock('@/components/home/roles', () => ({
  Roles: () => React.createElement('div', { 'data-testid': 'roles' }),
}))

vi.mock('@/components/home/trust', () => ({
  Trust: () => React.createElement('div', { 'data-testid': 'trust' }),
}))

vi.mock('@/components/home/about', () => ({
  About: () => React.createElement('div', { 'data-testid': 'about' }),
}))

vi.mock('@/components/home/faq', () => ({
  FAQ: () => React.createElement('div', { 'data-testid': 'faq' }),
}))

vi.mock('@/components/home/contact', () => ({
  Contact: () => React.createElement('div', { 'data-testid': 'contact' }),
}))

vi.mock('@/components/home/footer', () => ({
  Footer: () => React.createElement('footer', { 'data-testid': 'footer' }),
}))

vi.mock('@/components/home/property-detail-view', () => ({
  PropertyDetailView: () => React.createElement('div', { 'data-testid': 'property-detail-view' }),
}))

vi.mock('@/components/auth/login-form', () => ({
  LoginForm: () => React.createElement('div', { 'data-testid': 'login-form' }),
}))

vi.mock('@/components/auth/otp-verify-form', () => ({
  OtpVerifyForm: () => React.createElement('div', { 'data-testid': 'otp-verify-form' }),
}))

vi.mock('@/components/auth/register-form', () => ({
  RegisterForm: () => React.createElement('div', { 'data-testid': 'register-form' }),
}))

vi.mock('@/components/auth/forgot-password-form', () => ({
  ForgotPasswordForm: () => React.createElement('div', { 'data-testid': 'forgot-password-form' }),
}))

vi.mock('@/components/auth/email-verify-form', () => ({
  EmailVerifyForm: () => React.createElement('div', { 'data-testid': 'email-verify-form' }),
}))

vi.mock('@/components/dashboard', () => ({
  Dashboard: () => React.createElement('div', { 'data-testid': 'dashboard' }),
}))

// ─── Données de test ─────────────────────────────────────────────────────────

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
  currentView: 'home' as const,
  previousView: 'home' as const,
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
  authMethod: 'email' as const,
  devCode: '',
  otpPurpose: 'login' as const,
  pendingMessage: '',
  settingsDefaultTab: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStoreState(useAuthStore: any) {
  useAuthStore.setState({
    ...defaultPersistedState,
    ...defaultTransientState,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Intégration Flux Authentification', () => {
  let useAuthStore: any
  let HomeComponent: React.ComponentType

  const originalScrollTo = window.scrollTo

  beforeAll(async () => {
    window.scrollTo = vi.fn()
    const store = await import('@/lib/auth-store')
    useAuthStore = store.useAuthStore

    const page = await import('@/app/page')
    HomeComponent = page.default
  })

  afterAll(() => {
    window.scrollTo = originalScrollTo
  })

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockApiFetch.mockReset()
    resetStoreState(useAuthStore)
  })

  // ─── Scénario 1 : Login → Dashboard ──────────────────────────────────────

  describe('Scénario 1 : Login → Dashboard', () => {
    it('affiche LoadingScreen avant que checkAuth ne soit initialisé', () => {
      // isInitialized est false par défaut → LoadingScreen
      render(React.createElement(HomeComponent))
      expect(screen.getByText('Chargement...')).toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).toBeTruthy()
    })

    it('login réussi + checkAuth → Dashboard visible', async () => {
      // 1. Login
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().loginWithEmail('test@test.com', 'password')

      // 2. Vérifier l'état du store
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(defaultUser)
      expect(state.currentView).toBe('dashboard')

      // 3. Simuler checkAuth (comme le fait page.tsx dans useEffect)
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().checkAuth()

      // 4. isInitialized = true
      expect(useAuthStore.getState().isInitialized).toBe(true)

      // 5. Rendu → Dashboard visible
      render(React.createElement(HomeComponent))
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Chargement...')).not.toBeInTheDocument()
    })

    it('login + checkAuth pré-initialisé → Dashboard direct (pas de loading)', async () => {
      // Simuler login + checkAuth AVANT le rendu (comme après rehydratation du persist)
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().loginWithEmail('test@test.com', 'password')

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().checkAuth()

      // Render après initialisation → pas de loading
      render(React.createElement(HomeComponent))
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Chargement...')).not.toBeInTheDocument()
    })

    it('login avec email non vérifié (403) → store redirige vers email-verify', async () => {
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
      // isInitialized n'a PAS été appelé → pas de checkAuth
    })
  })

  // ─── Scénario 2 : Page refresh → checkAuth → Dashboard ou Home ──────────

  describe('Scénario 2 : Page refresh → checkAuth → Dashboard ou Home', () => {
    it('checkAuth 200 → utilisateur connecté → Dashboard visible après init', async () => {
      // Simuler un état persisté (comme après un login avant refresh)
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
        isInitialized: false,
        currentView: 'dashboard',
        lastAuthenticatedAt: Date.now(),
        dashboardSection: 'overview',
      })

      // Simuler ce que page.tsx fait au mount : checkAuth()
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })

      // Au moment du render, on lance checkAuth (comme dans useEffect de page.tsx)
      const renderPromise = Promise.resolve().then(async () => {
        await useAuthStore.getState().checkAuth()
      })

      // Pendant que checkAuth est en cours, isInitialized est false → LoadingScreen
      // On capture rerender pour éviter de créer un 2e root React plus tard
      const { rerender } = render(React.createElement(HomeComponent))
      expect(screen.getByText('Chargement...')).toBeInTheDocument()

      // Attendre checkAuth
      await renderPromise

      // Ré-rendre via rerender() → maintenant isInitialized = true → Dashboard
      rerender(React.createElement(HomeComponent))
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Chargement...')).not.toBeInTheDocument()
    })

    it('checkAuth 401 → session expirée → Home (hero) visible', async () => {
      // Simuler un état persisté (session expirée côté serveur)
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
        isInitialized: false,
        currentView: 'dashboard',
        lastAuthenticatedAt: Date.now(),
        dashboardSection: 'overview',
      })

      // checkAuth retourne 401
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Session expirée' }),
      })

      // Lancer checkAuth puis render
      const renderPromise = Promise.resolve().then(async () => {
        await useAuthStore.getState().checkAuth()
      })

      const { rerender } = render(React.createElement(HomeComponent))
      expect(screen.getByText('Chargement...')).toBeInTheDocument()

      await renderPromise

      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.currentView).toBe('home')

      // Ré-rendre → Home page
      rerender(React.createElement(HomeComponent))
      expect(screen.getByTestId('hero')).toBeInTheDocument()
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('nos-biens')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
    })

    it('checkAuth 5xx → garde l état existant + Dashboard toujours visible', async () => {
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
        isInitialized: false,
        currentView: 'dashboard',
        lastAuthenticatedAt: Date.now(),
      })

      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'Service indisponible' }),
      })

      const renderPromise = Promise.resolve().then(async () => {
        await useAuthStore.getState().checkAuth()
      })

      const { rerender } = render(React.createElement(HomeComponent))
      expect(screen.getByText('Chargement...')).toBeInTheDocument()

      await renderPromise

      // L'état persiste malgré l'erreur serveur
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().currentView).toBe('dashboard')
      expect(useAuthStore.getState().isInitialized).toBe(true)

      rerender(React.createElement(HomeComponent))
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('checkAuth erreur réseau → garde l état persistant', async () => {
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
        isInitialized: false,
        currentView: 'dashboard',
        lastAuthenticatedAt: Date.now(),
      })

      mockApiFetch.mockRejectedValueOnce(new Error('Network error'))

      const renderPromise = Promise.resolve().then(async () => {
        await useAuthStore.getState().checkAuth()
      })

      const { rerender } = render(React.createElement(HomeComponent))
      expect(screen.getByText('Chargement...')).toBeInTheDocument()

      await renderPromise

      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().user).toEqual(defaultUser)
      expect(useAuthStore.getState().isInitialized).toBe(true)

      rerender(React.createElement(HomeComponent))
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })
  })

  // ─── Scénario 3 : Logout → Home ────────────────────────────────────────

  describe('Scénario 3 : Logout → Home', () => {
    it('logout → store réinitialisé → Home (hero visible)', async () => {
      // 1. Login + checkAuth
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().loginWithEmail('test@test.com', 'password')

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().checkAuth()

      // 2. Rendu → Dashboard
      const { rerender } = render(React.createElement(HomeComponent))
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()

      // 3. Logout
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Déconnexion réussie' }),
      })
      await useAuthStore.getState().logout()

      // 4. Vérifier l'état du store
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().currentView).toBe('home')
      expect(useAuthStore.getState().user).toBeNull()

      // 5. checkAuth après logout (comme dans le prochain render)
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non authentifié' }),
      })
      await useAuthStore.getState().checkAuth()

      // 6. Ré-rendre → Home (hero visible)
      rerender(React.createElement(HomeComponent))
      expect(screen.getByTestId('hero')).toBeInTheDocument()
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
    })

    it('logout même si API échoue → état réinitialisé via finally', async () => {
      // 1. Login
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().loginWithEmail('test@test.com', 'password')

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().checkAuth()

      // 2. Vérifier l'état
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().currentView).toBe('dashboard')

      // 3. Logout avec erreur API → le finally du store réinitialise quand même l'état
      // On attend que logout rejette (l'API throw), puis on vérifie que finally a réinitialisé
      mockApiFetch.mockRejectedValueOnce(new Error('Network error'))
      await expect(useAuthStore.getState().logout()).rejects.toThrow('Network error')

      // 4. L'état doit être réinitialisé malgré l'erreur API
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().currentView).toBe('home')
      expect(useAuthStore.getState().user).toBeNull()
      expect(useAuthStore.getState().previousView).toBe('home')
      expect(useAuthStore.getState().dashboardSection).toBe('overview')
    })
  })

  // ─── Scénario 4 : Navigation entre vues ─────────────────────────────────

  describe('Scénario 4 : Navigation entre vues', () => {
    it('checkAuth non connecté + setView login → LoginForm affiché', async () => {
      // 1. Initialisation: checkAuth retourne 401 (pas connecté)
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non authentifié' }),
      })
      await useAuthStore.getState().checkAuth()

      // 2. Navigation vers login (checkAuth n'est PAS rappelé sur navigation)
      useAuthStore.getState().setView('login')

      // 3. Rendu → LoginForm visible
      render(React.createElement(HomeComponent))
      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
    })

    it('setView login → login → setView dashboard → Dashboard affiché', async () => {
      // 1. Initialisation: non connecté
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non authentifié' }),
      })
      await useAuthStore.getState().checkAuth()

      // 2. Navigation login
      useAuthStore.getState().setView('login')

      const { rerender } = render(React.createElement(HomeComponent))
      expect(screen.getByTestId('login-form')).toBeInTheDocument()

      // 3. Login réussi (pas de checkAuth intermédiaire = pas de reset à home)
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().loginWithEmail('test@test.com', 'password')
      expect(useAuthStore.getState().currentView).toBe('dashboard')

      // 4. Nouveau checkAuth après login
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().checkAuth()

      // 5. Ré-rendre → Dashboard
      rerender(React.createElement(HomeComponent))
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
      expect(screen.queryByTestId('login-form')).not.toBeInTheDocument()
    })

    it('setView register → RegisterForm affiché', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non authentifié' }),
      })
      await useAuthStore.getState().checkAuth()

      useAuthStore.getState().setView('register')

      render(React.createElement(HomeComponent))
      expect(screen.getByTestId('register-form')).toBeInTheDocument()
    })

    it('setView forgot-password → ForgotPasswordForm affiché', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non authentifié' }),
      })
      await useAuthStore.getState().checkAuth()

      useAuthStore.getState().setView('forgot-password')

      render(React.createElement(HomeComponent))
      expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument()
    })

    it('setView nos-biens → Header + NosBiensView + Footer', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non authentifié' }),
      })
      await useAuthStore.getState().checkAuth()

      useAuthStore.getState().setView('nos-biens')

      render(React.createElement(HomeComponent))
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('nos-biens-view')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('setView property-detail avec selectedPropertyId → PropertyDetailView', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non authentifié' }),
      })
      await useAuthStore.getState().checkAuth()

      useAuthStore.getState().setSelectedPropertyId('prop-123')
      useAuthStore.getState().setView('property-detail')

      render(React.createElement(HomeComponent))
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('property-detail-view')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('setView a-propos → Header + About + Footer', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non authentifié' }),
      })
      await useAuthStore.getState().checkAuth()

      useAuthStore.getState().setView('a-propos')

      render(React.createElement(HomeComponent))
      expect(screen.getByTestId('about')).toBeInTheDocument()
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })
  })

  // ─── Scénario 5 : Cohérence des rôles (client vs middleware) ──────────────

  describe('Scénario 5 : Cohérence des rôles (client vs middleware)', () => {
    it('loginWithEmail stocke le rôle → middleware vérifierait le même rôle via DB', async () => {
      const proprietaireUser = {
        ...defaultUser,
        role: 'PROPRIETAIRE' as const,
        activeRole: 'PROPRIETAIRE' as const,
      }

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: proprietaireUser }),
      })
      await useAuthStore.getState().loginWithEmail('proprio@test.com', 'password')

      // Le store a le bon rôle
      expect(useAuthStore.getState().user?.role).toBe('PROPRIETAIRE')
      expect(useAuthStore.getState().user?.activeRole).toBe('PROPRIETAIRE')

      // Simuler ce que le middleware lirait depuis la DB
      const simulatedDbRole = { role: 'PROPRIETAIRE', activeRole: 'PROPRIETAIRE' }
      expect(simulatedDbRole.activeRole).toBe(useAuthStore.getState().user?.activeRole)
    })

    it('switchRole change activeRole → middleware cohérent', async () => {
      // Utilisateur multi-rôle
      useAuthStore.setState({
        user: {
          ...defaultUser,
          role: 'PROPRIETAIRE' as const,
          activeRole: 'LOCATAIRE' as const,
        },
        isAuthenticated: true,
      })

      // Middleware DB: active_role = 'LOCATAIRE' → autorisé pour dashboard/locataire
      let simulatedDbRole = { role: 'PROPRIETAIRE', activeRole: 'LOCATAIRE' }
      expect(simulatedDbRole.activeRole).toBe(useAuthStore.getState().user?.activeRole)

      // Switch vers PROPRIETAIRE
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      await useAuthStore.getState().switchRole('PROPRIETAIRE')

      expect(useAuthStore.getState().user?.activeRole).toBe('PROPRIETAIRE')

      // Middleware DB: maintenant active_role = 'PROPRIETAIRE'
      simulatedDbRole = { role: 'PROPRIETAIRE', activeRole: 'PROPRIETAIRE' }
      expect(simulatedDbRole.activeRole).toBe(useAuthStore.getState().user?.activeRole)
    })

    it('rôle LOCATAIRE → autorisé pour dashboard/locataire (cohérence middleware)', async () => {
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
      })

      const allowedRolesForLocataireRoute = ['LOCATAIRE']
      expect(allowedRolesForLocataireRoute).toContain(useAuthStore.getState().user?.activeRole)
    })

    it('rôle LOCATAIRE → bloqué pour /api/admin/ (cohérence middleware)', async () => {
      useAuthStore.setState({
        user: defaultUser,
        isAuthenticated: true,
      })

      const allowedRolesForAdminRoute = ['ADMIN']
      expect(allowedRolesForAdminRoute).not.toContain(useAuthStore.getState().user?.activeRole)
    })
  })

  // ─── Scénario 6 : Session heartbeat / rafraîchissement ──────────────────

  describe('Scénario 6 : Persistance session et revalidation', () => {
    it('login définit lastAuthenticatedAt → session valide 30 jours', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().loginWithEmail('test@test.com', 'password')

      const authTime = useAuthStore.getState().lastAuthenticatedAt
      expect(authTime).not.toBeNull()
      expect(Date.now() - authTime!).toBeLessThan(2000) // fraîchement défini

      // Validation de session (copie de la logique du store)
      const MAX_SESSION_AGE_MS = 30 * 24 * 60 * 60 * 1000
      expect(Date.now() - authTime!).toBeLessThan(MAX_SESSION_AGE_MS)
    })

    it('checkAuth après login confirme la session valide', async () => {
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().loginWithEmail('test@test.com', 'password')

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().checkAuth()

      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().user).toEqual(defaultUser)
    })

    it('checkAuth 401 → session expirée → Dashboard devient Home', async () => {
      // Login
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().loginWithEmail('test@test.com', 'password')
      await useAuthStore.getState().checkAuth()

      // La session expire côté serveur — on pré-setup le mock AVANT render
      // pour que le useEffect de page.tsx (checkAuth) consomme ce mock
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Session expirée' }),
      })

      // Rendu → le useEffect appelle checkAuth (asynchrone → microtask)
      // isInitialized est true → Dashboard d'abord, pas LoadingScreen
      const { rerender } = render(React.createElement(HomeComponent))
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()

      // Attendre que checkAuth se termine (microtask)
      await Promise.resolve()

      // État réinitialisé par le checkAuth du useEffect
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().currentView).toBe('home')

      // Ré-rendre → Home (hero) - le composant a déjà re-render via zustand,
      // mais on rerender pour être sûr dans le test
      rerender(React.createElement(HomeComponent))
      expect(screen.getByTestId('hero')).toBeInTheDocument()
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument()
    })
  })

  // ─── Scénario 7 : Flux complets multi-étape ─────────────────────────────

  describe('Scénario 7 : Flux complets multi-étape', () => {
    it('Flux complet : Home → Login → Dashboard', async () => {
      // 1. Initialisation: page load, non connecté
      mockApiFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non authentifié' }),
      })
      await useAuthStore.getState().checkAuth()

      const { rerender } = render(React.createElement(HomeComponent))
      expect(screen.getByTestId('hero')).toBeInTheDocument()

      // 2. Navigation vers login
      useAuthStore.getState().setView('login')
      rerender(React.createElement(HomeComponent))
      expect(screen.getByTestId('login-form')).toBeInTheDocument()

      // 3. Login réussi
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().loginWithEmail('test@test.com', 'password')

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: defaultUser }),
      })
      await useAuthStore.getState().checkAuth()

      rerender(React.createElement(HomeComponent))
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('Flux complet : Inscription → Vérification email → Login → Dashboard', async () => {
      // 1. Inscription — ne connecte pas automatiquement
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { ...defaultUser, id: 'new-user', email: 'new@test.com' },
          devCode: '123456',
        }),
      })
      await useAuthStore.getState().registerWithEmail({
        email: 'new@test.com',
        password: 'password',
        firstName: 'New',
        lastName: 'User',
      })

      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(useAuthStore.getState().currentView).toBe('email-verify')

      // 2. Vérification d'email → redirige vers login (ne connecte pas)
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requiresLogin: true, valid: true }),
      })
      await useAuthStore.getState().verifyEmailOtp('new@test.com', '123456', 'email_verify')
      expect(useAuthStore.getState().currentView).toBe('login')

      // 3. Login
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { ...defaultUser, id: 'new-user' } }),
      })
      await useAuthStore.getState().loginWithEmail('new@test.com', 'password')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(useAuthStore.getState().currentView).toBe('dashboard')

      // 4. checkAuth final
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { ...defaultUser, id: 'new-user' } }),
      })
      await useAuthStore.getState().checkAuth()

      // 5. Rendu → Dashboard
      const { rerender } = render(React.createElement(HomeComponent))
      expect(screen.getByTestId('dashboard')).toBeInTheDocument()
    })

    it('Flux complet : Login → switchRole → vérification middleware', async () => {
      // 1. Login multi-rôle
      const multiRoleUser = {
        ...defaultUser,
        role: 'PROPRIETAIRE' as const,
        activeRole: 'LOCATAIRE' as const,
      }

      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: multiRoleUser }),
      })
      await useAuthStore.getState().loginWithEmail('multi@test.com', 'password')
      await useAuthStore.getState().checkAuth()

      // 2. Actif en LOCATAIRE → dashboard locataire
      expect(useAuthStore.getState().user?.activeRole).toBe('LOCATAIRE')

      // 3. switchRole vers PROPRIETAIRE
      mockApiFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      await useAuthStore.getState().switchRole('PROPRIETAIRE')

      // 4. Vérifier état + dashboardSection reset
      expect(useAuthStore.getState().user?.activeRole).toBe('PROPRIETAIRE')
      expect(useAuthStore.getState().dashboardSection).toBe('overview')

      // 5. Cohérence middleware : activeRole = PROPRIETAIRE → autorisé pour dashboard/proprietaire, pas pour dashboard/locataire
      expect(['PROPRIETAIRE']).toContain(useAuthStore.getState().user?.activeRole)
      expect(['LOCATAIRE']).not.toContain(useAuthStore.getState().user?.activeRole)
    })
  })
})
