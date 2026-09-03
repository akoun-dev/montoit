import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ─── Module mocks ─────────────────────────────────────────────────────────────

// Mock authFetch
const mockAuthFetch = vi.fn()
vi.mock('@/lib/auth-fetch', () => ({
  authFetch: (...args: any[]) => mockAuthFetch(...args),
  AuthError: class AuthError extends Error {
    status: number
    constructor(status: number, message: string) {
      super(message)
      this.status = status
      this.name = 'AuthError'
    }
  },
}))

// Mock auth-store
const mockUseAuthStore = vi.fn()
vi.mock('@/lib/auth-store', () => ({
  useAuthStore: (selector?: (state: any) => any) => {
    const state = {
      user: { id: 'test-user-1', firstName: 'Jean', lastName: 'Dupont', email: 'jean@test.com', phone: '0102030405' },
      isAuthenticated: true,
      checkAuth: vi.fn(),
      logout: vi.fn(),
    }
    return selector ? selector(state) : state
  },
}))

// Mock realtime hooks
vi.mock('@/hooks/use-realtime-rental-files', () => ({
  useRealtimeRentalFiles: vi.fn(),
}))

vi.mock('@/hooks/use-realtime-ownership-docs', () => ({
  useRealtimeOwnershipDocs: vi.fn(),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => React.createElement('div', props, children),
  },
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}))

// Mock ConfirmDialog
vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ open, title, description }: any) =>
    open ? React.createElement('div', { 'data-testid': 'confirm-dialog' }, title, description) : null,
}))

// ─── Mock data builders ───────────────────────────────────────────────────────

function buildMockRentalFile(overrides: Partial<any> = {}) {
  return {
    id: 'rental-file-1',
    status: 'DRAFT',
    tenantCategory: null,
    monthlyIncome: null,
    employer: null,
    employmentType: null,
    guarantorName: null,
    guarantorPhone: null,
    guarantorRelation: null,
    validUntil: null,
    rejectionReason: null,
    tcComment: null,
    reviewedAt: null,
    createdAt: '2026-05-25T00:00:00Z',
    updatedAt: '2026-05-25T00:00:00Z',
    documents: [],
    leases: [],
    reviewedBy: null,
    ...overrides,
  }
}

function buildMockOwnerFile(overrides: Partial<any> = {}) {
  return {
    id: 'owner-file-1',
    status: 'DRAFT',
    validUntil: null,
    rejectionReason: null,
    tcComment: null,
    reviewedAt: null,
    createdAt: '2026-05-25T00:00:00Z',
    updatedAt: '2026-05-25T00:00:00Z',
    documents: [],
    reviewedBy: null,
    ...overrides,
  }
}

// ─── Helper to render components with mocked data ────────────────────────────

async function renderRentalFileForm(mockFiles: any[]) {
  mockAuthFetch.mockResolvedValue({ data: mockFiles, stats: {} })

  const { RentalFileForm } = await import('@/components/dashboard/locataire/rental-file')
  render(React.createElement(RentalFileForm))
  // Wait for component to finish loading — "Dossier locatif" title only appears after loading state ends
  await vi.waitFor(() => {
    expect(screen.getByText('Dossier locatif')).toBeInTheDocument()
  }, { timeout: 3000 })
}

async function renderOwnerFileForm(mockFiles: any[]) {
  mockAuthFetch.mockResolvedValue({ data: mockFiles, stats: {} })

  const { OwnerFileForm } = await import('@/components/dashboard/proprietaire/owner-file')
  render(React.createElement(OwnerFileForm))
  // Wait for component to finish loading — "Dossier propriétaire" title only appears after loading state ends
  await vi.waitFor(() => {
    expect(screen.getByText('Dossier propriétaire')).toBeInTheDocument()
  }, { timeout: 3000 })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Reset authFetch mock
  mockAuthFetch.mockReset()
})

describe('RentalFileForm - Bouton Soumettre à nouveau', () => {
  it('should show "Soumettre à nouveau" button when status is REJECTED', async () => {
    const mockFile = buildMockRentalFile({
      id: 'rental-file-rejected',
      status: 'REJECTED',
      rejectionReason: 'Revenus insuffisants',
      tcComment: 'Veuillez fournir des bulletins de salaire.',
      documents: [
        { id: 'doc-1', type: 'ID_CARD', status: 'VALIDATED', name: 'id.pdf', url: '', createdAt: '2026-05-20T00:00:00Z' },
        { id: 'doc-2', type: 'PROOF_OF_ADDRESS', status: 'REJECTED', name: 'facture.pdf', url: '', createdAt: '2026-05-20T00:00:00Z' },
      ],
    })

    await renderRentalFileForm([mockFile])

    // Should show rejection reason
    expect(screen.getByText('Motif du rejet')).toBeInTheDocument()
    expect(screen.getByText('Revenus insuffisants')).toBeInTheDocument()

    // Should show the resubmit button (may appear multiple times — in banner + main button)
    const resubmitButtons = screen.getAllByText('Soumettre à nouveau')
    expect(resubmitButtons.length).toBeGreaterThanOrEqual(1)
    expect(resubmitButtons[0]).not.toBeDisabled()
  })

  it('should show "Soumettre à nouveau" button when status is TC_REVIEW', async () => {
    const mockFile = buildMockRentalFile({
      id: 'rental-file-tcreview',
      status: 'TC_REVIEW',
      tcComment: 'Veuillez fournir un justificatif de domicile.',
    })

    await renderRentalFileForm([mockFile])

    const resubmitButtons = screen.getAllByText('Soumettre à nouveau')
    expect(resubmitButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('should NOT show "Soumettre à nouveau" button when status is DRAFT', async () => {
    const mockFile = buildMockRentalFile({
      id: 'rental-file-draft',
      status: 'DRAFT',
    })

    await renderRentalFileForm([mockFile])

    // Should NOT have "Soumettre à nouveau" — DRAFT has "Soumettre le dossier" instead on step 2
    expect(screen.queryByText('Soumettre à nouveau')).not.toBeInTheDocument()
  })

  it('should NOT show "Soumettre à nouveau" button when status is SUBMITTED', async () => {
    const mockFile = buildMockRentalFile({
      id: 'rental-file-submitted',
      status: 'SUBMITTED',
    })

    await renderRentalFileForm([mockFile])

    expect(screen.queryByText('Soumettre à nouveau')).not.toBeInTheDocument()
  })

  it('should NOT show "Soumettre à nouveau" button when status is VALIDATED', async () => {
    const mockFile = buildMockRentalFile({
      id: 'rental-file-validated',
      status: 'VALIDATED',
    })

    await renderRentalFileForm([mockFile])

    expect(screen.queryByText('Soumettre à nouveau')).not.toBeInTheDocument()
  })
})

describe('OwnerFileForm - Bouton Soumettre à nouveau', () => {
  it('should show "Soumettre à nouveau" button when status is REJECTED', async () => {
    const mockFile = buildMockOwnerFile({
      id: 'owner-file-rejected',
      status: 'REJECTED',
      rejectionReason: 'Titre de propriété manquant',
      tcComment: 'Veuillez fournir le titre de propriété.',
      documents: [
        { id: 'doc-1', type: 'ID_CARD', status: 'VALIDATED', name: 'id.pdf', url: '', createdAt: '2026-05-20T00:00:00Z' },
      ],
    })

    await renderOwnerFileForm([mockFile])

    // Should show rejection reason
    expect(screen.getByText('Motif du rejet')).toBeInTheDocument()
    expect(screen.getByText('Titre de propriété manquant')).toBeInTheDocument()

    // Should show the resubmit button (may appear multiple times — in banner + main button)
    const resubmitButtons = screen.getAllByText('Soumettre à nouveau')
    expect(resubmitButtons.length).toBeGreaterThanOrEqual(1)
    expect(resubmitButtons[0]).not.toBeDisabled()
  })

  it('should show "Soumettre à nouveau" button when status is TC_REVIEW', async () => {
    const mockFile = buildMockOwnerFile({
      id: 'owner-file-tcreview',
      status: 'TC_REVIEW',
      tcComment: 'Documents complémentaires requis.',
    })

    await renderOwnerFileForm([mockFile])

    const resubmitButtons = screen.getAllByText('Soumettre à nouveau')
    expect(resubmitButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('should NOT show "Soumettre à nouveau" button when status is DRAFT', async () => {
    const mockFile = buildMockOwnerFile({
      id: 'owner-file-draft',
      status: 'DRAFT',
    })

    await renderOwnerFileForm([mockFile])

    expect(screen.queryByText('Soumettre à nouveau')).not.toBeInTheDocument()
  })

  it('should NOT show "Soumettre à nouveau" button when status is SUBMITTED', async () => {
    const mockFile = buildMockOwnerFile({
      id: 'owner-file-submitted',
      status: 'SUBMITTED',
    })

    await renderOwnerFileForm([mockFile])

    expect(screen.queryByText('Soumettre à nouveau')).not.toBeInTheDocument()
  })

  it('should NOT show "Soumettre à nouveau" button when status is VALIDATED', async () => {
    const mockFile = buildMockOwnerFile({
      id: 'owner-file-validated',
      status: 'VALIDATED',
    })

    await renderOwnerFileForm([mockFile])

    expect(screen.queryByText('Soumettre à nouveau')).not.toBeInTheDocument()
  })
})
