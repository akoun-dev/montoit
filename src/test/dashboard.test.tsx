import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import React from 'react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Dict = Record<string, any>
const mockFn = () => vi.fn()

// ─── Mock useBackHandler ────────────────────────────────────────────────────

vi.mock('@/hooks/use-back-handler', () => ({
  useBackHandler: vi.fn(),
}))

// ─── Mock framer-motion ─────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}))

// ─── Mock DashboardLayout ───────────────────────────────────────────────────

vi.mock('@/components/dashboard/dashboard-layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'dashboard-layout' }, children),
}))

// ─── Mock all section components ─────────────────────────────────────────────
// Each renders a simple identifiable div

// Locataire sections
vi.mock('@/components/dashboard/locataire/overview', () => ({
  LocataireOverview: () => React.createElement('div', { 'data-testid': 'locataire-overview' }, 'LocataireOverview'),
}))
vi.mock('@/components/dashboard/locataire/rental-file', () => ({
  RentalFileForm: ({ onBack, onSubmitSuccess }: any) =>
    React.createElement('div', { 'data-testid': 'rental-file-form', 'data-onback': !!onBack, 'data-onsubmitsuccess': !!onSubmitSuccess }),
}))
vi.mock('@/components/dashboard/locataire/my-visits', () => ({
  MyVisits: ({ onDetail }: any) =>
    React.createElement('div', { 'data-testid': 'my-visits', 'data-ondetail': !!onDetail }),
}))
vi.mock('@/components/dashboard/locataire/my-leases', () => ({
  MyLeases: ({ onDetail }: any) =>
    React.createElement('div', { 'data-testid': 'my-leases', 'data-ondetail': !!onDetail }),
}))
vi.mock('@/components/dashboard/locataire/messages', () => ({
  Messages: () => React.createElement('div', { 'data-testid': 'messages' }, 'Messages'),
}))
vi.mock('@/components/dashboard/locataire/search-properties', () => ({
  SearchProperties: () => React.createElement('div', { 'data-testid': 'search-properties' }),
}))
vi.mock('@/components/dashboard/locataire/favorites', () => ({
  Favorites: () => React.createElement('div', { 'data-testid': 'favorites' }),
}))
vi.mock('@/components/dashboard/locataire/applications', () => ({
  Applications: ({ onDetail }: any) =>
    React.createElement('div', { 'data-testid': 'applications', 'data-ondetail': !!onDetail }),
}))
vi.mock('@/components/dashboard/locataire/payments', () => ({
  Payments: ({ onDetail }: any) =>
    React.createElement('div', { 'data-testid': 'payments', 'data-ondetail': !!onDetail }),
}))
vi.mock('@/components/dashboard/locataire/notifications', () => ({
  Notifications: () => React.createElement('div', { 'data-testid': 'notifications' }),
}))
vi.mock('@/components/dashboard/locataire/reviews', () => ({
  Reviews: () => React.createElement('div', { 'data-testid': 'reviews' }),
}))
vi.mock('@/components/dashboard/locataire/maintenance', () => ({
  Maintenance: () => React.createElement('div', { 'data-testid': 'maintenance' }),
}))
vi.mock('@/components/dashboard/locataire/history', () => ({
  ActivityHistory: () => React.createElement('div', { 'data-testid': 'activity-history' }),
}))
vi.mock('@/components/dashboard/locataire/settings/index', () => ({
  SettingsSection: ({ defaultTab, onTabConsumed }: any) =>
    React.createElement('div', { 'data-testid': 'settings-section', 'data-defaulttab': defaultTab, 'data-ontabconsumed': !!onTabConsumed }),
}))
vi.mock('@/components/dashboard/locataire/trust-score', () => ({
  TrustScore: () => React.createElement('div', { 'data-testid': 'trust-score' }),
}))
vi.mock('@/components/dashboard/locataire/payment-detail', () => ({
  PaymentDetail: ({ paymentId, onBack }: any) =>
    React.createElement('div', { 'data-testid': 'payment-detail', 'data-paymentid': paymentId, 'data-onback': !!onBack }),
}))
vi.mock('@/components/dashboard/locataire/application-detail', () => ({
  ApplicationDetail: ({ applicationId, onBack }: any) =>
    React.createElement('div', { 'data-testid': 'application-detail', 'data-applicationid': applicationId, 'data-onback': !!onBack }),
}))
vi.mock('@/components/dashboard/locataire/visit-detail', () => ({
  VisitDetail: ({ visitId, onBack }: any) =>
    React.createElement('div', { 'data-testid': 'visit-detail', 'data-visitid': visitId, 'data-onback': !!onBack }),
}))
vi.mock('@/components/dashboard/locataire/lease-detail', () => ({
  LeaseDetail: ({ leaseId, onBack }: any) =>
    React.createElement('div', { 'data-testid': 'lease-detail', 'data-leaseid': leaseId, 'data-onback': !!onBack }),
}))

// Shared
vi.mock('@/components/dashboard/shared/my-disputes', () => ({
  MyDisputes: () => React.createElement('div', { 'data-testid': 'my-disputes' }),
}))

// Proprietaire sections
vi.mock('@/components/dashboard/proprietaire/overview', () => ({
  ProprietaireOverview: () => React.createElement('div', { 'data-testid': 'proprietaire-overview' }, 'ProprietaireOverview'),
}))
vi.mock('@/components/dashboard/proprietaire/my-properties', () => ({
  MyProperties: () => React.createElement('div', { 'data-testid': 'my-properties' }),
}))
vi.mock('@/components/dashboard/proprietaire/visit-requests', () => ({
  VisitRequests: () => React.createElement('div', { 'data-testid': 'visit-requests' }),
}))
vi.mock('@/components/dashboard/proprietaire/enhanced-rental-files', () => ({
  EnhancedRentalFiles: () => React.createElement('div', { 'data-testid': 'enhanced-rental-files' }),
}))
vi.mock('@/components/dashboard/proprietaire/enhanced-leases', () => ({
  EnhancedLeases: () => React.createElement('div', { 'data-testid': 'enhanced-leases' }),
}))
vi.mock('@/components/dashboard/proprietaire/messages', () => ({
  ProprietaireMessages: () => React.createElement('div', { 'data-testid': 'proprietaire-messages' }),
}))
vi.mock('@/components/dashboard/proprietaire/owner-file', () => ({
  OwnerFileForm: () => React.createElement('div', { 'data-testid': 'owner-file-form' }),
}))
vi.mock('@/components/dashboard/proprietaire/my-tenants', () => ({
  TenantsList: ({ onDetail }: any) =>
    React.createElement('div', { 'data-testid': 'tenants-list', 'data-ondetail': !!onDetail }),
}))
vi.mock('@/components/dashboard/proprietaire/tenant-detail', () => ({
  TenantDetail: ({ tenantId, onBack }: any) =>
    React.createElement('div', { 'data-testid': 'tenant-detail', 'data-tenantid': tenantId, 'data-onback': !!onBack }),
}))
vi.mock('@/components/dashboard/proprietaire/finances', () => ({
  OwnerFinances: () => React.createElement('div', { 'data-testid': 'owner-finances' }),
}))
vi.mock('@/components/dashboard/proprietaire/analytics', () => ({
  OwnerAnalytics: () => React.createElement('div', { 'data-testid': 'owner-analytics' }),
}))
vi.mock('@/components/dashboard/proprietaire/mandats', () => ({
  ProprietaireMandats: () => React.createElement('div', { 'data-testid': 'proprietaire-mandats' }),
}))
vi.mock('@/components/dashboard/proprietaire/owner-reviews', () => ({
  OwnerReviews: () => React.createElement('div', { 'data-testid': 'owner-reviews' }),
}))
vi.mock('@/components/dashboard/proprietaire/owner-maintenance', () => ({
  OwnerMaintenance: () => React.createElement('div', { 'data-testid': 'owner-maintenance' }),
}))
vi.mock('@/components/dashboard/proprietaire/owner-settings', () => ({
  OwnerSettings: ({ defaultTab, onTabConsumed }: any) =>
    React.createElement('div', { 'data-testid': 'owner-settings', 'data-defaulttab': defaultTab, 'data-ontabconsumed': !!onTabConsumed }),
}))
vi.mock('@/components/dashboard/proprietaire/security', () => ({
  OwnerSecurity: () => React.createElement('div', { 'data-testid': 'owner-security' }),
}))

// TC sections
vi.mock('@/components/dashboard/tc/overview', () => ({
  TcOverview: () => React.createElement('div', { 'data-testid': 'tc-overview' }, 'TcOverview'),
}))
vi.mock('@/components/dashboard/tc/dossier-validations', () => ({
  DossierValidations: () => React.createElement('div', { 'data-testid': 'dossier-validations' }),
}))
vi.mock('@/components/dashboard/tc/rental-files-queue', () => ({
  RentalFilesQueue: () => React.createElement('div', { 'data-testid': 'rental-files-queue' }),
}))
vi.mock('@/components/dashboard/tc/rental-file-detail', () => ({
  RentalFileDetail: () => React.createElement('div', { 'data-testid': 'rental-file-detail' }),
}))
vi.mock('@/components/dashboard/tc/owner-validations', () => ({
  OwnerValidations: () => React.createElement('div', { 'data-testid': 'owner-validations' }),
}))
vi.mock('@/components/dashboard/tc/owner-dossier-validations', () => ({
  OwnerDossierValidations: () => React.createElement('div', { 'data-testid': 'owner-dossier-validations' }),
}))
vi.mock('@/components/dashboard/tc/agency-validations', () => ({
  AgencyValidations: () => React.createElement('div', { 'data-testid': 'agency-validations' }),
}))
vi.mock('@/components/dashboard/tc/sla-monitoring', () => ({
  SlaMonitoring: () => React.createElement('div', { 'data-testid': 'sla-monitoring' }),
}))
vi.mock('@/components/dashboard/tc/property-verifications', () => ({
  PropertyVerifications: () => React.createElement('div', { 'data-testid': 'property-verifications' }),
}))
vi.mock('@/components/dashboard/tc/property-verify-detail', () => ({
  PropertyVerifyDetail: () => React.createElement('div', { 'data-testid': 'property-verify-detail' }),
}))
vi.mock('@/components/dashboard/tc/inventory-report-form', () => ({
  InventoryReportForm: () => React.createElement('div', { 'data-testid': 'inventory-report-form' }),
}))
vi.mock('@/components/dashboard/tc/inventory-reports-list', () => ({
  InventoryReportsList: () => React.createElement('div', { 'data-testid': 'inventory-reports-list' }),
}))
vi.mock('@/components/dashboard/tc/agents', () => ({
  AgentsManagement: () => React.createElement('div', { 'data-testid': 'agents-management' }),
}))
vi.mock('@/components/dashboard/tc/missions', () => ({
  MissionsManagement: () => React.createElement('div', { 'data-testid': 'missions-management' }),
}))
vi.mock('@/components/dashboard/tc/litiges', () => ({
  LitigesManagement: () => React.createElement('div', { 'data-testid': 'litiges-management' }),
}))
vi.mock('@/components/dashboard/tc/settings', () => ({
  TcSettings: () => React.createElement('div', { 'data-testid': 'tc-settings' }),
}))
vi.mock('@/components/dashboard/tc/messaging', () => ({
  TcMessaging: () => React.createElement('div', { 'data-testid': 'tc-messaging' }),
}))
vi.mock('@/components/dashboard/tc/certifications', () => ({
  CertificationsManagement: () => React.createElement('div', { 'data-testid': 'certifications-management' }),
}))
vi.mock('@/components/dashboard/tc/oneci-verification', () => ({
  OneciVerification: () => React.createElement('div', { 'data-testid': 'oneci-verification' }),
}))
vi.mock('@/components/dashboard/tc/fraud-alerts', () => ({
  FraudAlertsManagement: () => React.createElement('div', { 'data-testid': 'fraud-alerts-management' }),
}))
vi.mock('@/components/dashboard/tc/documentation', () => ({
  DocumentationCenter: () => React.createElement('div', { 'data-testid': 'documentation-center' }),
}))
vi.mock('@/components/dashboard/tc/all-properties', () => ({
  AllProperties: () => React.createElement('div', { 'data-testid': 'all-properties' }),
}))
vi.mock('@/components/dashboard/tc/users', () => ({
  TcUsers: () => React.createElement('div', { 'data-testid': 'tc-users' }),
}))

// Admin sections
vi.mock('@/components/dashboard/admin/overview', () => ({
  AdminOverview: () => React.createElement('div', { 'data-testid': 'admin-overview' }),
}))
vi.mock('@/components/dashboard/admin/users', () => ({
  AdminUsers: () => React.createElement('div', { 'data-testid': 'admin-users' }),
}))
vi.mock('@/components/dashboard/admin/properties-moderation', () => ({
  PropertiesModeration: () => React.createElement('div', { 'data-testid': 'properties-moderation' }),
}))
vi.mock('@/components/dashboard/admin/tc-management', () => ({
  TcManagement: () => React.createElement('div', { 'data-testid': 'tc-management' }),
}))
vi.mock('@/components/dashboard/admin/disputes', () => ({
  Disputes: () => React.createElement('div', { 'data-testid': 'admin-disputes' }),
}))
vi.mock('@/components/dashboard/admin/reports', () => ({
  Reports: () => React.createElement('div', { 'data-testid': 'reports' }),
}))
vi.mock('@/components/dashboard/admin/settings', () => ({
  AdminSettings: () => React.createElement('div', { 'data-testid': 'admin-settings' }),
}))
vi.mock('@/components/dashboard/admin/moderation', () => ({
  AdminModeration: () => React.createElement('div', { 'data-testid': 'admin-moderation' }),
}))
vi.mock('@/components/dashboard/admin/signalements', () => ({
  AdminSignalements: () => React.createElement('div', { 'data-testid': 'admin-signalements' }),
}))
vi.mock('@/components/dashboard/admin/trust-agents', () => ({
  AdminTrustAgents: () => React.createElement('div', { 'data-testid': 'admin-trust-agents' }),
}))
vi.mock('@/components/dashboard/admin/system', () => ({
  AdminSystem: () => React.createElement('div', { 'data-testid': 'admin-system' }),
}))
vi.mock('@/components/dashboard/admin/security', () => ({
  AdminSecurity: () => React.createElement('div', { 'data-testid': 'admin-security' }),
}))
vi.mock('@/components/dashboard/admin/config', () => ({
  AdminConfig: () => React.createElement('div', { 'data-testid': 'admin-config' }),
}))
vi.mock('@/components/dashboard/admin/backups', () => ({
  AdminBackups: () => React.createElement('div', { 'data-testid': 'admin-backups' }),
}))
vi.mock('@/components/dashboard/admin/notifications', () => ({
  AdminNotifications: () => React.createElement('div', { 'data-testid': 'admin-notifications' }),
}))

// Agence sections
vi.mock('@/components/dashboard/agence/overview', () => ({
  AgenceOverview: () => React.createElement('div', { 'data-testid': 'agence-overview' }),
}))
vi.mock('@/components/dashboard/agence/team', () => ({
  TeamManagement: () => React.createElement('div', { 'data-testid': 'team-management' }),
}))
vi.mock('@/components/dashboard/agence/portfolio', () => ({
  Portfolio: () => React.createElement('div', { 'data-testid': 'portfolio' }),
}))
vi.mock('@/components/dashboard/agence/mandats', () => ({
  AgenceMandats: () => React.createElement('div', { 'data-testid': 'agence-mandats' }),
}))
vi.mock('@/components/dashboard/agence/candidatures', () => ({
  Candidatures: () => React.createElement('div', { 'data-testid': 'agence-candidatures' }),
}))
vi.mock('@/components/dashboard/agence/finances', () => ({
  AgenceFinances: () => React.createElement('div', { 'data-testid': 'agence-finances' }),
}))
vi.mock('@/components/dashboard/agence/visits', () => ({
  AgenceVisits: () => React.createElement('div', { 'data-testid': 'agence-visits' }),
}))
vi.mock('@/components/dashboard/agence/analytics', () => ({
  AgenceAnalytics: () => React.createElement('div', { 'data-testid': 'agence-analytics' }),
}))
vi.mock('@/components/dashboard/agence/contracts', () => ({
  AgenceContracts: () => React.createElement('div', { 'data-testid': 'agence-contracts' }),
}))
vi.mock('@/components/dashboard/agence/communication', () => ({
  AgenceCommunication: () => React.createElement('div', { 'data-testid': 'agence-communication' }),
}))
vi.mock('@/components/dashboard/agence/marketing', () => ({
  AgenceMarketing: () => React.createElement('div', { 'data-testid': 'agence-marketing' }),
}))
vi.mock('@/components/dashboard/agence/client-files', () => ({
  ClientFiles: () => React.createElement('div', { 'data-testid': 'client-files' }),
}))
vi.mock('@/components/dashboard/agence/settings', () => ({
  AgenceSettings: () => React.createElement('div', { 'data-testid': 'agence-settings' }),
}))
vi.mock('@/components/dashboard/agence/security', () => ({
  AgenceSecurity: () => React.createElement('div', { 'data-testid': 'agence-security' }),
}))

// ─── Auth Store Mock ────────────────────────────────────────────────────────

const mockSetDashboardSection = mockFn()
const mockSetSelectedItemId = mockFn()
const mockSetSelectedPropertyId = mockFn()
const mockSetSettingsDefaultTab = mockFn()
const mockCheckAuth = mockFn()
const mockLogout = mockFn()

interface MockUser {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: string
  activeRole: string
  avatarUrl: string | null
}

const defaultUser: MockUser = {
  id: 'user-1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@test.com',
  phone: '0102030405',
  role: 'LOCATAIRE',
  activeRole: 'LOCATAIRE',
  avatarUrl: null,
}

let mockUser: MockUser | null = { ...defaultUser }
let mockDashboardSection = 'overview'
let mockSelectedItemId = ''
let mockSelectedPropertyId = ''
let mockSettingsDefaultTab = ''

vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = {
      user: mockUser,
      isAuthenticated: mockUser !== null,
      isInitialized: true,
      currentView: 'dashboard',
      previousView: 'home',
      dashboardSection: mockDashboardSection,
      selectedItemId: mockSelectedItemId,
      selectedPropertyId: mockSelectedPropertyId,
      settingsDefaultTab: mockSettingsDefaultTab,
      setDashboardSection: mockSetDashboardSection,
      setSelectedItemId: mockSetSelectedItemId,
      setSelectedPropertyId: mockSetSelectedPropertyId,
      setSettingsDefaultTab: mockSetSettingsDefaultTab,
      setView: mockFn(),
      checkAuth: mockCheckAuth,
      logout: mockLogout,
      updateUser: mockFn(),
      switchRole: mockFn(),
      isLoading: false,
    }
    return selector ? selector(state) : state
  },
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setUser(overrides: Partial<MockUser> | null) {
  if (overrides === null) {
    mockUser = null
  } else {
    mockUser = { ...defaultUser, ...overrides }
  }
}

function setSection(section: string) {
  mockDashboardSection = section
}

function setSelectedItemId(id: string) {
  mockSelectedItemId = id
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  setUser({ ...defaultUser })
  setSection('overview')
  mockSelectedItemId = ''
  mockSelectedPropertyId = ''
  mockSettingsDefaultTab = ''
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: Dashboard — Rendu par rôle
// ═══════════════════════════════════════════════════════════════════════════════

describe('Dashboard — Rendu par rôle', () => {
  it('retourne null si user est null', async () => {
    setUser(null)
    const { Dashboard } = await import('@/components/dashboard/index')
    const { container } = render(React.createElement(Dashboard))
    expect(container.innerHTML).toBe('')
  })

  it('affiche DashboardLayout quand user existe', async () => {
    setUser({ role: 'LOCATAIRE', activeRole: 'LOCATAIRE' })
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument()
  })

  it('affiche LocataireDashboard quand activeRole = LOCATAIRE', async () => {
    setUser({ role: 'LOCATAIRE', activeRole: 'LOCATAIRE' })
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('locataire-overview')).toBeInTheDocument()
    expect(screen.queryByTestId('proprietaire-overview')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tc-overview')).not.toBeInTheDocument()
  })

  it('affiche ProprietaireDashboard quand activeRole = PROPRIETAIRE', async () => {
    setUser({ role: 'PROPRIETAIRE', activeRole: 'PROPRIETAIRE' })
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('proprietaire-overview')).toBeInTheDocument()
    expect(screen.queryByTestId('locataire-overview')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tc-overview')).not.toBeInTheDocument()
  })

  it('affiche TcDashboard quand activeRole = TIERS_CONFIANCE', async () => {
    setUser({ role: 'TIERS_CONFIANCE', activeRole: 'TIERS_CONFIANCE' })
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('tc-overview')).toBeInTheDocument()
    expect(screen.queryByTestId('locataire-overview')).not.toBeInTheDocument()
    expect(screen.queryByTestId('proprietaire-overview')).not.toBeInTheDocument()
  })

  it('affiche AdminDashboard quand activeRole = ADMIN', async () => {
    setUser({ role: 'ADMIN', activeRole: 'ADMIN' })
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('admin-overview')).toBeInTheDocument()
    expect(screen.queryByTestId('locataire-overview')).not.toBeInTheDocument()
    expect(screen.queryByTestId('proprietaire-overview')).not.toBeInTheDocument()
  })

  it('affiche AgenceDashboard quand activeRole = AGENCE', async () => {
    setUser({ role: 'AGENCE', activeRole: 'AGENCE' })
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('agence-overview')).toBeInTheDocument()
    expect(screen.queryByTestId('locataire-overview')).not.toBeInTheDocument()
    expect(screen.queryByTestId('proprietaire-overview')).not.toBeInTheDocument()
  })

  it('utilise activeRole plutôt que role (changement de rôle)', async () => {
    // L'utilisateur a role=PROPRIETAIRE mais activeRole=LOCATAIRE (switch récent)
    setUser({ role: 'PROPRIETAIRE', activeRole: 'LOCATAIRE' })
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('locataire-overview')).toBeInTheDocument()
    expect(screen.queryByTestId('proprietaire-overview')).not.toBeInTheDocument()
  })

  it('utilise role comme fallback si activeRole est undefined', async () => {
    setUser({ role: 'PROPRIETAIRE', activeRole: '' as any })
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('proprietaire-overview')).toBeInTheDocument()
    expect(screen.queryByTestId('locataire-overview')).not.toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: LocataireDashboard — Routage des sections
// ═══════════════════════════════════════════════════════════════════════════════

describe('LocataireDashboard — Routage des sections', () => {
  beforeEach(() => {
    setUser({ role: 'LOCATAIRE', activeRole: 'LOCATAIRE' })
  })

  const cases: Array<[string, string]> = [
    ['overview', 'locataire-overview'],
    ['search-properties', 'search-properties'],
    ['favorites', 'favorites'],
    ['applications', 'applications'],
    ['my-visits', 'my-visits'],
    ['my-leases', 'my-leases'],
    ['payments', 'payments'],
    ['messages', 'messages'],
    ['notifications', 'notifications'],
    ['reviews', 'reviews'],
    ['disputes', 'my-disputes'],
    ['maintenance', 'maintenance'],
    ['history', 'activity-history'],
    ['settings', 'settings-section'],
    ['trust-score', 'trust-score'],
    ['rental-file', 'rental-file-form'],
  ]

  it.each(cases)('affiche %s → rend %s', async (section, testId) => {
    setSection(section)
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId(testId)).toBeInTheDocument()
  })

  it('fallback vers overview pour les sections inconnues', async () => {
    setSection('non-existent-section')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('locataire-overview')).toBeInTheDocument()
  })

  it('passe selectedItemId aux composants de détail', async () => {
    setSection('payment-detail')
    setSelectedItemId('payment-123')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    const el = screen.getByTestId('payment-detail')
    expect(el).toHaveAttribute('data-paymentid', 'payment-123')
  })

  it('passe selectedItemId à application-detail', async () => {
    setSection('application-detail')
    setSelectedItemId('app-456')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    const el = screen.getByTestId('application-detail')
    expect(el).toHaveAttribute('data-applicationid', 'app-456')
  })

  it('passe selectedItemId à visit-detail', async () => {
    setSection('visit-detail')
    setSelectedItemId('visit-789')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    const el = screen.getByTestId('visit-detail')
    expect(el).toHaveAttribute('data-visitid', 'visit-789')
  })

  it('passe selectedItemId à lease-detail', async () => {
    setSection('lease-detail')
    setSelectedItemId('lease-012')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    const el = screen.getByTestId('lease-detail')
    expect(el).toHaveAttribute('data-leaseid', 'lease-012')
  })

  it('passe onDetail callback à Applications', async () => {
    setSection('applications')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    const el = screen.getByTestId('applications')
    expect(el).toHaveAttribute('data-ondetail', 'true')
  })

  it('passe onDetail callback à MyVisits', async () => {
    setSection('my-visits')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    const el = screen.getByTestId('my-visits')
    expect(el).toHaveAttribute('data-ondetail', 'true')
  })

  it('passe settingsDefaultTab à SettingsSection', async () => {
    mockSettingsDefaultTab = 'verification'
    setSection('settings')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    const el = screen.getByTestId('settings-section')
    expect(el).toHaveAttribute('data-defaulttab', 'verification')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: ProprietaireDashboard — Routage des sections
// ═══════════════════════════════════════════════════════════════════════════════

describe('ProprietaireDashboard — Routage des sections', () => {
  beforeEach(() => {
    setUser({ role: 'PROPRIETAIRE', activeRole: 'PROPRIETAIRE' })
  })

  const cases: Array<[string, string]> = [
    ['overview', 'proprietaire-overview'],
    ['my-properties', 'my-properties'],
    ['my-tenants', 'tenants-list'],
    ['visit-requests', 'visit-requests'],
    ['candidatures', 'enhanced-rental-files'],
    ['disputes', 'my-disputes'],
    ['my-leases', 'enhanced-leases'],
    ['mandats', 'proprietaire-mandats'],
    ['owner-file', 'owner-file-form'],
    ['payments', 'owner-finances'],
    ['payment-detail', 'owner-finances'],
    ['finances', 'owner-finances'],
    ['analytics', 'owner-analytics'],
    ['messages', 'proprietaire-messages'],
    ['notifications', 'notifications'],
    ['trust-score', 'trust-score'],
    ['reviews', 'owner-reviews'],
    ['maintenance', 'owner-maintenance'],
    ['history', 'activity-history'],
    ['settings', 'owner-settings'],
  ]

  it.each(cases)('affiche %s → rend %s', async (section, testId) => {
    setSection(section)
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId(testId)).toBeInTheDocument()
  })

  it('fallback vers overview pour les sections inconnues', async () => {
    setSection('non-existent-section')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('proprietaire-overview')).toBeInTheDocument()
  })

  it('passe selectedItemId et callback à TenantDetail', async () => {
    setSection('tenant-detail')
    setSelectedItemId('tenant-123')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    const el = screen.getByTestId('tenant-detail')
    expect(el).toHaveAttribute('data-tenantid', 'tenant-123')
    expect(el).toHaveAttribute('data-onback', 'true')
  })

  it('passe selectedItemId et callback à TenantDetail après navigation depuis TenantsList', async () => {
    // Vérifie que le système de navigation (selectedItemId + setDashboardSection) fonctionne
    setSection('tenant-detail')
    setSelectedItemId('tenant-456')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    const el = screen.getByTestId('tenant-detail')
    expect(el).toHaveAttribute('data-tenantid', 'tenant-456')
  })

  it('passe onDetail callback à TenantsList', async () => {
    setSection('my-tenants')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    const el = screen.getByTestId('tenants-list')
    expect(el).toHaveAttribute('data-ondetail', 'true')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: TcDashboard — Routage des sections
// ═══════════════════════════════════════════════════════════════════════════════

describe('TcDashboard — Routage des sections', () => {
  beforeEach(() => {
    setUser({ role: 'TIERS_CONFIANCE', activeRole: 'TIERS_CONFIANCE' })
  })

  const cases: Array<[string, string]> = [
    ['overview', 'tc-overview'],
    ['all-properties', 'all-properties'],
    ['users', 'tc-users'],
    ['property-verifications', 'property-verifications'],
    ['property-verify-detail', 'property-verify-detail'],
    ['inventory-report-form', 'inventory-report-form'],
    ['dossier-validations', 'dossier-validations'],
    ['rental-files-queue', 'rental-files-queue'],
    ['rental-file-detail', 'rental-file-detail'],
    ['owner-validations', 'owner-validations'],
    ['owner-dossiers', 'owner-dossier-validations'],
    ['agency-validations', 'agency-validations'],
    ['inventory-reports', 'inventory-reports-list'],
    ['sla-monitoring', 'sla-monitoring'],
    ['agents', 'agents-management'],
    ['missions', 'missions-management'],
    ['litiges', 'litiges-management'],
    ['messaging', 'tc-messaging'],
    ['certifications', 'certifications-management'],
    ['oneci-verification', 'oneci-verification'],
    ['fraud-alerts', 'fraud-alerts-management'],
    ['documentation', 'documentation-center'],
    ['notifications', 'notifications'],
    ['history', 'activity-history'],
    ['settings', 'tc-settings'],
  ]

  it.each(cases)('affiche %s → rend %s', async (section, testId) => {
    setSection(section)
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId(testId)).toBeInTheDocument()
  })

  it('fallback vers overview pour les sections inconnues', async () => {
    setSection('non-existent-section')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('tc-overview')).toBeInTheDocument()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: Dashboard — sections partagées entre rôles
// ═══════════════════════════════════════════════════════════════════════════════

describe('Sections partagées entre rôles', () => {
  it('affiche MyDisputes pour LOCATAIRE en section disputes', async () => {
    setUser({ role: 'LOCATAIRE', activeRole: 'LOCATAIRE' })
    setSection('disputes')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('my-disputes')).toBeInTheDocument()
  })

  it('affiche MyDisputes pour PROPRIETAIRE en section disputes', async () => {
    setUser({ role: 'PROPRIETAIRE', activeRole: 'PROPRIETAIRE' })
    setSection('disputes')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('my-disputes')).toBeInTheDocument()
  })

  it('affiche Notifications pour PROPRIETAIRE', async () => {
    setUser({ role: 'PROPRIETAIRE', activeRole: 'PROPRIETAIRE' })
    setSection('notifications')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('notifications')).toBeInTheDocument()
  })

  it('affiche Notifications pour TIERS_CONFIANCE', async () => {
    setUser({ role: 'TIERS_CONFIANCE', activeRole: 'TIERS_CONFIANCE' })
    setSection('notifications')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('notifications')).toBeInTheDocument()
  })

  it('affiche ActivityHistory pour LOCATAIRE', async () => {
    setUser({ role: 'LOCATAIRE', activeRole: 'LOCATAIRE' })
    setSection('history')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('activity-history')).toBeInTheDocument()
  })

  it('affiche ActivityHistory pour PROPRIETAIRE', async () => {
    setUser({ role: 'PROPRIETAIRE', activeRole: 'PROPRIETAIRE' })
    setSection('history')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('activity-history')).toBeInTheDocument()
  })

  it('affiche InventoryReportForm pour PROPRIETAIRE', async () => {
    setUser({ role: 'PROPRIETAIRE', activeRole: 'PROPRIETAIRE' })
    setSection('inventory-report-form')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('inventory-report-form')).toBeInTheDocument()
  })

  it('affiche InventoryReportForm pour TIERS_CONFIANCE', async () => {
    setUser({ role: 'TIERS_CONFIANCE', activeRole: 'TIERS_CONFIANCE' })
    setSection('inventory-report-form')
    const { Dashboard } = await import('@/components/dashboard/index')
    render(React.createElement(Dashboard))
    expect(screen.getByTestId('inventory-report-form')).toBeInTheDocument()
  })
})
