'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  FileSignature, Building2, User, AlertTriangle, Loader2, Check, X,
  Download, Eye, PenLine, Plus, ChevronRight, ChevronLeft, Search, Clock,
  ShieldCheck, FileText, CalendarDays, Banknote, PenTool, CheckCircle2, Bell, Mail
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { apiFetch } from '@/lib/capacitor'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { SignaturePad } from '@/components/ui/signature-pad'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PropertyItem {
  id: string; title: string; address: string; city: string; price: number
  images: Array<{ url: string }>; status: string; rentalStatus: string
}

interface TenantInfo {
  id: string; firstName: string; lastName: string; avatarUrl: string | null; email?: string; phone?: string
}

interface PropertyInfo {
  id: string; title: string; address: string; city: string
  images: Array<{ url: string }>
}

interface PaymentInfo {
  id: string; amount: number; status: string; dueDate: string; paidAt: string | null
}

interface LeaseItem {
  id: string; status: string; monthlyRent: number; charges: number; deposit: number
  startDate: string; endDate: string; specialConditions: string | null
  ownerSignedAt: string | null; tenantSignedAt: string | null
  createdAt: string; updatedAt: string
  tenant: TenantInfo
  property: PropertyInfo
  payments?: PaymentInfo[]
  paymentStatus?: 'up_to_date' | 'late' | 'pending'
  latePaymentsCount?: number
  totalPaid?: number
  nextPayment?: { id: string; amount: number; dueDate: string; status: string } | null
}

interface RentalFileItem {
  id: string; status: string; tenantId: string; monthlyIncome: number | null
  tenant: { id: string; firstName: string; lastName: string; avatarUrl: string | null }
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Brouillon', className: 'bg-neutral-100 text-neutral-600' },
    PENDING_SIGNATURE: { label: 'En attente', className: 'bg-amber-50 text-amber-700' },
    ACTIVE: { label: 'Actif', className: 'bg-green-100 text-green-700' },
    TERMINATED: { label: 'Résilié', className: 'bg-red-50 text-red-600' },
    EXPIRED: { label: 'Expiré', className: 'bg-neutral-100 text-neutral-500' },
  }
  const info = map[status] || { label: status, className: 'bg-neutral-100 text-neutral-600' }
  return <Badge className={info.className}>{info.label}</Badge>
}

function SignatureStatus({ signed, label }: { signed: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {signed ? (
        <div className="flex items-center gap-1.5 text-green-600">
          <Check className="size-4" />
          <span>{label} signé</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-neutral-400">
          <X className="size-4" />
          <span>{label} non signé</span>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function EnhancedLeases() {
  const { isAuthenticated } = useAuthStore()
  const [activeTab, setActiveTab] = useState('active')

  // Data
  const [allLeases, setAllLeases] = useState<LeaseItem[]>([])
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)

  // Create lease state
  const [createStep, setCreateStep] = useState(0)
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [rentalFiles, setRentalFiles] = useState<RentalFileItem[]>([])
  const [selectedRentalFileId, setSelectedRentalFileId] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [leaseForm, setLeaseForm] = useState({
    monthlyRent: '',
    charges: '',
    deposit: '',
    startDate: '',
    endDate: '',
    specialConditions: '',
  })
  const [creating, setCreating] = useState(false)
  const [createdLeaseId, setCreatedLeaseId] = useState<string | null>(null)

  // Sign dialog
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [signLease, setSignLease] = useState<LeaseItem | null>(null)
  const [signOtp, setSignOtp] = useState('')
  const [signing, setSigning] = useState(false)
  const [signStep, setSignStep] = useState<'signature' | 'certification' | 'signature_locataire'>('signature')
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [requestingOtp, setRequestingOtp] = useState(false)
  const [otpRequested, setOtpRequested] = useState(false)

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailLease, setDetailLease] = useState<LeaseItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Modify dialog
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false)
  const [modifyLease, setModifyLease] = useState<LeaseItem | null>(null)
  const [modifyForm, setModifyForm] = useState({
    monthlyRent: '', charges: '', deposit: '', startDate: '', endDate: '', specialConditions: '',
  })
  const [modifying, setModifying] = useState(false)

  // Terminate dialog
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [leaseToTerminate, setLeaseToTerminate] = useState<LeaseItem | null>(null)
  const [terminating, setTerminating] = useState(false)

  // ─── Fetch data ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<{
        activeLeases?: LeaseItem[]
        properties?: PropertyItem[]
      }>('/api/dashboard/proprietaire')
      setAllLeases(d.activeLeases || [])
      setProperties((d.properties || []) as PropertyItem[])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { setAllLeases([]); return }
      setAllLeases([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Derived lists ──────────────────────────────────────────────────────
  const activeLeases = allLeases.filter((l) => l.status === 'ACTIVE')
  const pendingLeases = allLeases.filter((l) => l.status === 'DRAFT' || l.status === 'PENDING_SIGNATURE')
  const archivedLeases = allLeases.filter((l) => l.status === 'TERMINATED' || l.status === 'EXPIRED')

  // ─── Fetch rental files for property ────────────────────────────────────
  const fetchRentalFiles = useCallback(async (propertyId: string) => {
    try {
      const res = await authFetch<{ data: Array<{ id: string; status: string; tenantId: string; monthlyIncome: number | null; tenant: { id: string; firstName: string; lastName: string; avatarUrl: string | null } }> }>(`/api/owner/rental-files?status=VALIDATED&propertyId=${propertyId}`)
      const files = (res.data || []).map((rf) => ({
        id: rf.id,
        status: rf.status,
        tenantId: rf.tenantId,
        monthlyIncome: rf.monthlyIncome,
        tenant: rf.tenant,
      }))
      setRentalFiles(files)
    } catch {
      setRentalFiles([])
    }
  }, [])

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleSelectProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId)
    setSelectedRentalFileId('')
    setSelectedTenantId('')
    setCreateStep(1)
    fetchRentalFiles(propertyId)
  }

  const handleSelectRentalFile = (fileId: string) => {
    const file = rentalFiles.find((f) => f.id === fileId)
    if (file) {
      setSelectedRentalFileId(fileId)
      setSelectedTenantId(file.tenantId)
      // Pre-fill rent from property price
      const prop = properties.find((p) => p.id === selectedPropertyId)
      if (prop && !leaseForm.monthlyRent) {
        setLeaseForm((prev) => ({ ...prev, monthlyRent: String(prop.price) }))
      }
      setCreateStep(2)
    }
  }

  const handleCreateLease = async () => {
    setCreating(true)
    try {
      const res = await authFetch<{ data: LeaseItem }>('/api/leases/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentalFileId: selectedRentalFileId,
          propertyId: selectedPropertyId,
          tenantId: selectedTenantId,
          monthlyRent: leaseForm.monthlyRent,
          charges: leaseForm.charges || '0',
          deposit: leaseForm.deposit || '0',
          startDate: leaseForm.startDate,
          endDate: leaseForm.endDate,
          specialConditions: leaseForm.specialConditions || undefined,
        }),
      })
      setCreatedLeaseId(res.data.id)
      setCreateStep(4)
      toast.success('Bail créé avec succès')
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la création')
      } else {
        toast.error('Erreur lors de la création du bail')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleSignLease = async () => {
    if (!signLease) return
    setSigning(true)
    try {
      const result = await authFetch<{ data: LeaseItem }>(`/api/leases/${signLease.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode: signOtp, signatureImage: signatureDataUrl }),
      })
      if (result.data) {
        setSignLease(result.data)
      }
      toast.success('Bail signé avec succès ! Le locataire est maintenant notifié.')
      setSignStep('signature_locataire')
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la signature')
      } else {
        toast.error('Erreur lors de la signature')
      }
    } finally {
      setSigning(false)
    }
  }

  const handleRequestSignOtp = async () => {
    if (!signLease) return
    setRequestingOtp(true)
    try {
      const result = await authFetch<{ message: string; sentTo: string }>(`/api/leases/${signLease.id}/request-sign-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      setOtpRequested(true)
      toast.success('OTP envoyé par email', {
        description: result.message || 'Vérifiez votre boîte de réception pour le code de certification CRYPTONEO.',
      })
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur OTP')
      } else {
        toast.error('Erreur lors de l\'envoi de l\'OTP')
      }
    } finally {
      setRequestingOtp(false)
    }
  }

  const handleOpenDetail = async (lease: LeaseItem) => {
    setDetailLease(lease)
    setDetailDialogOpen(true)
    setDetailLoading(true)
    try {
      const res = await authFetch<{ data: LeaseItem }>(`/api/leases/${lease.id}`)
      setDetailLease(res.data)
    } catch {
      // Use the basic data we already have
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenModify = (lease: LeaseItem) => {
    setModifyLease(lease)
    setModifyForm({
      monthlyRent: String(lease.monthlyRent),
      charges: String(lease.charges),
      deposit: String(lease.deposit),
      startDate: lease.startDate.split('T')[0],
      endDate: lease.endDate.split('T')[0],
      specialConditions: lease.specialConditions || '',
    })
    setModifyDialogOpen(true)
  }

  const handleDeleteLease = async (leaseId: string) => {
    if (!confirm('Supprimer le bail ? Cette action est irréversible.')) return
    try {
      await authFetch(`/api/leases/${leaseId}`, { method: 'DELETE' })
      toast.success('Bail supprimé')
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la suppression')
      } else {
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  const handleModifyLease = async () => {
    if (!modifyLease) return
    setModifying(true)
    try {
      await authFetch(`/api/leases/${modifyLease.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'modify',
          monthlyRent: modifyForm.monthlyRent,
          charges: modifyForm.charges,
          deposit: modifyForm.deposit,
          startDate: modifyForm.startDate,
          endDate: modifyForm.endDate,
          specialConditions: modifyForm.specialConditions || null,
        }),
      })
      toast.success('Bail modifié avec succès')
      setModifyDialogOpen(false)
      setModifyLease(null)
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la modification')
      } else {
        toast.error('Erreur lors de la modification')
      }
    } finally {
      setModifying(false)
    }
  }

  const handleTerminateClick = (lease: LeaseItem) => {
    setLeaseToTerminate(lease)
    setShowTerminateDialog(true)
  }

  const handleTerminate = async () => {
    if (!leaseToTerminate) return
    setTerminating(true)
    try {
      await authFetch(`/api/leases/${leaseToTerminate.id}/terminate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      toast.success('Bail résilié avec succès')
      setShowTerminateDialog(false)
      setLeaseToTerminate(null)
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la résiliation')
      } else {
        toast.error('Erreur lors de la résiliation du bail')
      }
    } finally {
      setTerminating(false)
    }
  }

  const resetCreateForm = () => {
    setCreateStep(0)
    setSelectedPropertyId('')
    setSelectedRentalFileId('')
    setSelectedTenantId('')
    setLeaseForm({ monthlyRent: '', charges: '', deposit: '', startDate: '', endDate: '', specialConditions: '' })
    setCreatedLeaseId(null)
  }

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes baux</h1>
        <p className="text-muted-foreground mt-1">Gestion des contrats de location</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active" className="gap-1.5">
            <FileText className="size-3.5" />
            <span className="hidden sm:inline">Baux actifs</span>
            <span className="sm:hidden">Actifs</span>
            {activeLeases.length > 0 && (
              <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 rounded-full">{activeLeases.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            <Clock className="size-3.5" />
            <span className="hidden sm:inline">En attente</span>
            <span className="sm:hidden">Attente</span>
            {pendingLeases.length > 0 && (
              <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full">{pendingLeases.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-1.5">
            <Banknote className="size-3.5" />
            <span className="hidden sm:inline">Archivés</span>
            <span className="sm:hidden">Archivés</span>
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-1.5">
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Créer un bail</span>
            <span className="sm:hidden">Créer</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Active Leases Tab ─────────────────────────────────────────── */}
        <TabsContent value="active" className="mt-4">
          {activeLeases.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <FileSignature className="size-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun bail actif</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Créez un nouveau bail pour commencer</p>
                <Button
                  onClick={() => setActiveTab('create')}
                  className="mt-4 bg-brand-500 hover:bg-brand-600 text-white gap-2"
                >
                  <Plus className="size-4" /> Créer un bail
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeLeases.map((lease, idx) => (
                <motion.div
                  key={lease.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <LeaseCard
                    lease={lease}
                    onDetail={() => handleOpenDetail(lease)}
                    onTerminate={() => handleTerminateClick(lease)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Pending Leases Tab ────────────────────────────────────────── */}
        <TabsContent value="pending" className="mt-4">
          {pendingLeases.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Clock className="size-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun bail en attente de signature</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingLeases.map((lease, idx) => (
                <motion.div
                  key={lease.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {lease.tenant.avatarUrl ? (
                              <img
                                src={lease.tenant.avatarUrl}
                                alt={`${lease.tenant.firstName} ${lease.tenant.lastName}`}
                                className="size-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="size-10 rounded-full bg-brand-50 flex items-center justify-center">
                                <User className="size-5 text-brand-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{lease.property.title}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <User className="size-3.5" /> {lease.tenant.firstName} {lease.tenant.lastName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(lease.status)}
                        </div>
                      </div>

                      {/* Signature status */}
                      <div className="p-3 rounded-lg bg-muted mb-3 space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground mb-1">État des signatures</p>
                        <SignatureStatus signed={!!lease.ownerSignedAt} label="Propriétaire" />
                        <SignatureStatus signed={!!lease.tenantSignedAt} label="Locataire" />
                      </div>

                      {/* Lease terms */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Loyer</p>
                          <p className="text-sm font-semibold">{formatFCFA(lease.monthlyRent)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Charges</p>
                          <p className="text-sm font-semibold">{formatFCFA(lease.charges || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Début</p>
                          <p className="text-sm font-semibold">{new Date(lease.startDate).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fin</p>
                          <p className="text-sm font-semibold">{new Date(lease.endDate).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {!lease.ownerSignedAt && lease.status === 'PENDING_SIGNATURE' && (
                          <Button
                            size="sm"
                            className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
                            onClick={() => {
                              setSignLease(lease)
                              setSignDialogOpen(true)
                            }}
                          >
                            <ShieldCheck className="size-3.5" /> Signer
                          </Button>
                        )}
                        {!lease.ownerSignedAt && (lease.status === 'DRAFT' || lease.status === 'PENDING_SIGNATURE') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => handleOpenModify(lease)}
                          >
                            <PenLine className="size-3.5" /> Modifier
                          </Button>
                        )}
                        {!lease.ownerSignedAt && !lease.tenantSignedAt && (lease.status === 'DRAFT' || lease.status === 'PENDING_SIGNATURE') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteLease(lease.id)}
                          >
                            <X className="size-3.5" /> Supprimer
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => handleOpenDetail(lease)}
                        >
                          <Eye className="size-3.5" /> Détails
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Archived Leases Tab ───────────────────────────────────────── */}
        <TabsContent value="archived" className="mt-4">
          {archivedLeases.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Banknote className="size-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">Aucun bail archivé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {archivedLeases.map((lease, idx) => (
                <motion.div
                  key={lease.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-border opacity-80">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 mt-0.5">
                            {lease.tenant.avatarUrl ? (
                              <img src={lease.tenant.avatarUrl} alt="" className="size-10 rounded-full object-cover grayscale" />
                            ) : (
                              <div className="size-10 rounded-full bg-neutral-100 flex items-center justify-center">
                                <User className="size-5 text-neutral-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{lease.property.title}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <User className="size-3.5" /> {lease.tenant.firstName} {lease.tenant.lastName}
                            </p>
                          </div>
                        </div>
                        {statusBadge(lease.status)}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted">
                        <div>
                          <p className="text-xs text-muted-foreground">Loyer</p>
                          <p className="text-sm font-semibold">{formatFCFA(lease.monthlyRent)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Charges</p>
                          <p className="text-sm font-semibold">{formatFCFA(lease.charges || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Début</p>
                          <p className="text-sm font-semibold">{new Date(lease.startDate).toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Fin</p>
                          <p className="text-sm font-semibold">{new Date(lease.endDate).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleOpenDetail(lease)}>
                          <Eye className="size-3.5" /> Voir détails
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Create Lease Tab ──────────────────────────────────────────── */}
        <TabsContent value="create" className="mt-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-5 text-brand-500" />
                Créer un nouveau bail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Step indicators */}
              <div className="flex items-center justify-between mb-6 max-w-md">
                {['Bien', 'Dossier', 'Conditions', 'Récapitulatif'].map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`size-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      i <= createStep ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {i < createStep ? <Check className="size-3.5" /> : i + 1}
                    </div>
                    <span className={`text-xs hidden sm:inline ${i <= createStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                    {i < 3 && <ChevronRight className="size-3 text-muted-foreground hidden sm:block" />}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* Step 0: Select property */}
                {createStep === 0 && (
                  <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h3 className="text-lg font-semibold mb-4">Sélectionnez un bien</h3>
                    {properties.length === 0 ? (
                      <p className="text-muted-foreground text-sm">Aucun bien disponible. Créez d&apos;abord un bien.</p>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {properties.map((prop) => (
                          <button
                            key={prop.id}
                            onClick={() => handleSelectProperty(prop.id)}
                            className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                              selectedPropertyId === prop.id ? 'border-brand-500 bg-brand-50/50' : 'border-border bg-white hover:border-brand-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {prop.images?.[0]?.url ? (
                                <img src={prop.images[0].url} alt="" className="size-12 rounded-lg object-cover" />
                              ) : (
                                <div className="size-12 rounded-lg bg-muted flex items-center justify-center">
                                  <Building2 className="size-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{prop.title || 'Bien sans titre'}</p>
                                <p className="text-sm text-muted-foreground">{prop.city} — {formatFCFA(prop.price)}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 1: Select rental file */}
                {createStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h3 className="text-lg font-semibold mb-4">Sélectionnez un dossier locatif validé</h3>
                    {rentalFiles.length === 0 ? (
                      <div className="text-center py-6">
                        <Search className="size-10 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Aucun dossier locatif validé trouvé pour ce bien.</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Le locataire doit avoir un dossier validé pour ce bien.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {rentalFiles.map((file) => (
                          <button
                            key={file.id}
                            onClick={() => handleSelectRentalFile(file.id)}
                            className={`w-full text-left p-4 rounded-lg border transition-all hover:shadow-md ${
                              selectedRentalFileId === file.id ? 'border-brand-500 bg-brand-50/50' : 'border-border bg-white hover:border-brand-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {file.tenant.avatarUrl ? (
                                <img src={file.tenant.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                              ) : (
                                <div className="size-10 rounded-full bg-brand-50 flex items-center justify-center">
                                  <User className="size-5 text-brand-500" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-foreground">{file.tenant.firstName} {file.tenant.lastName}</p>
                                <p className="text-sm text-muted-foreground">
                                  Revenus: {file.monthlyIncome ? formatFCFA(file.monthlyIncome) : 'Non renseigné'}
                                </p>
                              </div>
                              <Badge className="ml-auto bg-green-100 text-green-700">Validé</Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={() => setCreateStep(0)} className="gap-1.5">
                        <ChevronLeft className="size-4" /> Retour
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Fill lease terms */}
                {createStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h3 className="text-lg font-semibold mb-4">Conditions du bail</h3>
                    <div className="space-y-4 max-w-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="monthlyRent">Loyer mensuel (FCFA) *</Label>
                          <Input
                            id="monthlyRent"
                            type="number"
                            value={leaseForm.monthlyRent}
                            onChange={(e) => setLeaseForm((p) => ({ ...p, monthlyRent: e.target.value }))}
                            placeholder="150000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="charges">Charges (FCFA)</Label>
                          <Input
                            id="charges"
                            type="number"
                            value={leaseForm.charges}
                            onChange={(e) => setLeaseForm((p) => ({ ...p, charges: e.target.value }))}
                            placeholder="25000"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="deposit">Dépôt de garantie (FCFA)</Label>
                        <Input
                          id="deposit"
                          type="number"
                          value={leaseForm.deposit}
                          onChange={(e) => setLeaseForm((p) => ({ ...p, deposit: e.target.value }))}
                          placeholder="300000"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">Date de début *</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={leaseForm.startDate}
                            onChange={(e) => setLeaseForm((p) => ({ ...p, startDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">Date de fin *</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={leaseForm.endDate}
                            onChange={(e) => setLeaseForm((p) => ({ ...p, endDate: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="specialConditions">Conditions particulières</Label>
                        <Textarea
                          id="specialConditions"
                          value={leaseForm.specialConditions}
                          onChange={(e) => setLeaseForm((p) => ({ ...p, specialConditions: e.target.value }))}
                          placeholder="Conditions spéciales du bail..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={() => setCreateStep(1)} className="gap-1.5">
                        <ChevronLeft className="size-4" /> Retour
                      </Button>
                      <Button
                        className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
                        onClick={() => setCreateStep(3)}
                        disabled={!leaseForm.monthlyRent || !leaseForm.startDate || !leaseForm.endDate}
                      >
                        Suivant <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Review */}
                {createStep === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h3 className="text-lg font-semibold mb-4">Récapitulatif du bail</h3>
                    <div className="space-y-3 max-w-lg">
                      <div className="p-4 rounded-lg bg-muted space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Bien</span>
                          <span className="font-medium">{properties.find((p) => p.id === selectedPropertyId)?.title || '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Locataire</span>
                          <span className="font-medium">
                            {rentalFiles.find((f) => f.id === selectedRentalFileId)?.tenant
                              ? (() => {
                                  const t = rentalFiles.find((f) => f.id === selectedRentalFileId)!.tenant
                                  return `${t.firstName} ${t.lastName}`
                                })()
                              : '—'}
                          </span>
                        </div>
                        <div className="h-px bg-border my-1" />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Loyer mensuel</span>
                          <span className="font-semibold">{leaseForm.monthlyRent ? formatFCFA(Number(leaseForm.monthlyRent)) : '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Charges</span>
                          <span className="font-medium">{leaseForm.charges ? formatFCFA(Number(leaseForm.charges)) : '0 FCFA'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Dépôt de garantie</span>
                          <span className="font-medium">{leaseForm.deposit ? formatFCFA(Number(leaseForm.deposit)) : '0 FCFA'}</span>
                        </div>
                        <div className="h-px bg-border my-1" />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Début</span>
                          <span className="font-medium">{leaseForm.startDate ? new Date(leaseForm.startDate).toLocaleDateString('fr-FR') : '—'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Fin</span>
                          <span className="font-medium">{leaseForm.endDate ? new Date(leaseForm.endDate).toLocaleDateString('fr-FR') : '—'}</span>
                        </div>
                        {leaseForm.specialConditions && (
                          <>
                            <div className="h-px bg-border my-1" />
                            <div className="text-sm">
                              <span className="text-muted-foreground">Conditions particulières:</span>
                              <p className="font-medium mt-1">{leaseForm.specialConditions}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" onClick={() => setCreateStep(2)} className="gap-1.5">
                        <ChevronLeft className="size-4" /> Retour
                      </Button>
                      <Button
                        className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
                        onClick={handleCreateLease}
                        disabled={creating}
                      >
                        {creating ? (
                          <>
                            <Loader2 className="size-4 animate-spin" /> Création...
                          </>
                        ) : (
                          <>
                            <FileSignature className="size-4" /> Créer le bail
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: OTP display after creation */}
                {createStep === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="text-center py-4">
                      <div className="size-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <Check className="size-8 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Bail créé avec succès !</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Le bail est en attente de signature. Cliquez sur "Signer maintenant" pour commencer le processus de signature électronique via CRYPTONEO.
                      </p>
                                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 mb-4">
                        <p className="text-xs text-blue-700 flex items-center gap-2">
                          <Bell className="size-3.5 shrink-0" />
                          Le contrat a été généré et stocké dans le cloud. Pour signer, cliquez sur "Signer maintenant". Un code OTP vous sera envoyé par email via CRYPTONEO.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
                          onClick={() => {
                            if (createdLeaseId) {
                              const lease = allLeases.find((l) => l.id === createdLeaseId)
                              if (lease) {
                                setSignLease(lease)
                                setSignDialogOpen(true)
                              }
                            }
                          }}
                        >
                          <ShieldCheck className="size-4" /> Signer maintenant
                        </Button>
                        <Button variant="outline" onClick={resetCreateForm}>
                          Créer un autre bail
                        </Button>
                        <Button variant="outline" onClick={() => { resetCreateForm(); setActiveTab('pending') }}>
                          Voir les baux en attente
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Sign Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={signDialogOpen} onOpenChange={(open) => {
        setSignDialogOpen(open)
        if (!open) { setSignOtp(''); setSignLease(null); setSignStep('signature'); setSignatureDataUrl(null); setOtpRequested(false) }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="size-5 text-brand-500" />
              Signature du bail
            </DialogTitle>
            <DialogDescription className="pt-2">
              {signStep === 'signature'
                ? <>Dessinez votre signature manuscrite pour le bail de <span className="font-semibold text-foreground">{signLease?.property?.title}</span>.</>
                : signStep === 'certification'
                  ? <>Certifiez votre signature avec un code OTP pour <span className="font-semibold text-foreground">{signLease?.property?.title}</span>.</>
                  : <>Suivi de la signature du locataire pour <span className="font-semibold text-foreground">{signLease?.property?.title}</span>.</>
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
              {[
                { key: 'signature', label: 'Signature (Propriétaire)' },
                { key: 'certification', label: 'Certification' },
                { key: 'signature_locataire', label: 'Signature (Locataire)' },
              ].map((step, i) => {
                const stepOrder = ['signature', 'certification', 'signature_locataire']
                const currentIdx = stepOrder.indexOf(signStep)
                const stepIdx = stepOrder.indexOf(step.key)
                const isActive = step.key === signStep
                const isDone = stepIdx < currentIdx

                let stepLabel = step.label
                if (step.key === 'signature_locataire') {
                  if (signLease?.tenantSignedAt) {
                    stepLabel = '✓ Locataire signé'
                  } else if (isDone) {
                    stepLabel = 'En attente du locataire'
                  }
                }

                return (
                  <div key={step.key} className="flex items-center gap-2 flex-1">
                    <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isDone ? 'bg-green-500 text-white' : isActive ? 'bg-brand-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isDone ? <CheckCircle2 className="size-3.5" /> : i + 1}
                    </div>
                    <span className={`text-xs ${isActive ? 'text-foreground font-medium' : isDone ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {stepLabel}
                    </span>
                    {i < 2 && <div className={`flex-1 h-px ${stepIdx < currentIdx ? 'bg-green-400' : 'bg-border'}`} />}
                  </div>
                )
              })}
            </div>

            {/* Step 1: Signature Propriétaire */}
            {signStep === 'signature' && (
              <>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-700">
                    Dessinez votre signature manuscrite ci-dessous. Elle sera certifiée électroniquement via CRYPTONEO.
                  </p>
                </div>
                <SignaturePad
                  onConfirm={(dataUrl) => {
                    setSignatureDataUrl(dataUrl)
                    setSignStep('certification')
                  }}
                  onCancel={() => { setSignDialogOpen(false); setSignLease(null); setSignStep('signature'); setSignatureDataUrl(null) }}
                  signatoryRole="Propriétaire"
                />
              </>
            )}

            {/* Step 2: Certification OTP — Sauvegarde immédiate de la signature propriétaire */}
            {signStep === 'certification' && (
              <div className="space-y-3">
                {signatureDataUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Votre signature manuscrite</p>
                    <div className="rounded-lg border border-border bg-white p-2">
                      <img src={signatureDataUrl} alt="Votre signature" className="h-16 w-auto mx-auto object-contain" />
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-700 flex items-center gap-2">
                    <Bell className="size-3.5 shrink-0" />
                    Après validation, le locataire sera notifié par notification pour qu'il signe à son tour.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 mb-1">
                  <p className="text-xs text-blue-700">
                    Cliquez sur "Recevoir l'OTP" pour qu'un code vous soit envoyé par email via CRYPTONEO.
                    Saisissez ensuite le code reçu pour certifier votre signature électronique.
                  </p>
                </div>

                {!otpRequested && !requestingOtp && (
                  <Button
                    onClick={handleRequestSignOtp}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    <Mail className="size-4" /> Recevoir l'OTP par email
                  </Button>
                )}
                {requestingOtp && (
                  <Button disabled className="w-full gap-2" variant="outline">
                    <Loader2 className="size-4 animate-spin" /> Envoi en cours...
                  </Button>
                )}

                {otpRequested && !requestingOtp && (
                  <>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <p className="text-xs text-amber-700 flex items-center gap-2">
                        <Mail className="size-3.5 shrink-0" />
                        Un code OTP vous a été envoyé par email. Saisissez-le ci-dessous.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="signOtp">Code OTP reçu par email</Label>
                      <Input
                        id="signOtp"
                        value={signOtp}
                        onChange={(e) => setSignOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="font-mono text-center text-lg tracking-widest"
                        maxLength={6}
                      />
                    </div>
                    <Button
                      className="w-full gap-2 bg-brand-500 hover:bg-brand-600 text-white"
                      onClick={handleSignLease}
                      disabled={signing || signOtp.length < 4}
                    >
                      {signing ? (
                        <><Loader2 className="size-4 animate-spin" /> Certification CRYPTONEO...</>
                      ) : (
                        <><ShieldCheck className="size-4" /> Signer et certifier le bail</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Attente signature locataire (après que le propriétaire a signé) */}
            {signStep === 'signature_locataire' && (
              <div className="space-y-4 py-2">
                {signatureDataUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Votre signature</p>
                    <div className="rounded-lg border border-border bg-white p-2">
                      <img src={signatureDataUrl} alt="Votre signature" className="h-16 w-auto mx-auto object-contain" />
                    </div>
                  </div>
                )}

                {signLease?.tenantSignedAt ? (
                  <>
                    <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                      <CheckCircle2 className="size-10 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-emerald-800">Le locataire a signé le bail !</p>
                      <p className="text-xs text-emerald-600 mt-1">
                        Signé le {new Date(signLease.tenantSignedAt).toLocaleDateString('fr-FR')} à {new Date(signLease.tenantSignedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {signLease.status === 'ACTIVE' && (
                        <p className="text-xs text-emerald-600 mt-2 font-medium">
                          ✓ Le bail est maintenant actif. Les deux parties ont signé.
                        </p>
                      )}
                    </div>
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await apiFetch(`/api/leases/${signLease.id}/contract?format=pdf`)
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({ error: 'Erreur' }))
                            toast.error(err.error || 'Erreur lors du téléchargement')
                            return
                          }
                          const blob = await res.blob()
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `Bail_${signLease.property?.title || 'contrat'}.pdf`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          URL.revokeObjectURL(url)
                        } catch {
                          toast.error('Erreur lors du téléchargement')
                        }
                      }}
                    >
                      <Download className="size-4" /> Télécharger le contrat signé
                    </Button>
                  </>
                ) : (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
                    <Clock className="size-10 text-amber-500 mx-auto mb-2" />
                    <p className="font-semibold text-amber-800">En attente de la signature du locataire</p>
                    <p className="text-xs text-amber-600 mt-2">
                      Votre signature a été enregistrée avec succès. Le locataire a été notifié.
                      Vous serez averti dès qu'il aura signé à son tour.
                    </p>
                  </div>
                )}

                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    setSignDialogOpen(false)
                    setSignLease(null)
                    setSignStep('signature')
                    setSignatureDataUrl(null)
                    setSignOtp('')
                    setOtpRequested(false)
                    fetchData()
                  }}
                >
                  Terminé
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {signStep === 'certification' && (
              <Button
                variant="outline"
                onClick={() => { setSignStep('signature'); setSignatureDataUrl(null); setSignOtp(''); setOtpRequested(false) }}
                disabled={signing}
              >
                Retour
              </Button>
            )}
            {signStep === 'signature' && (
              <Button
                variant="outline"
                onClick={() => { setSignDialogOpen(false); setSignLease(null); setSignStep('signature'); setSignatureDataUrl(null); setOtpRequested(false) }}
              >
                Annuler
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Dialog ────────────────────────────────────────────────── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-brand-500" />
              Détails du bail
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : detailLease ? (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                {statusBadge(detailLease.status)}
              </div>

              {/* Property & Tenant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Bien</p>
                  <p className="font-medium">{detailLease.property.title}</p>
                  <p className="text-sm text-muted-foreground">{detailLease.property.address}, {detailLease.property.city}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Locataire</p>
                  <div className="flex items-center gap-2">
                    {detailLease.tenant.avatarUrl ? (
                      <img src={detailLease.tenant.avatarUrl} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <div className="size-8 rounded-full bg-brand-50 flex items-center justify-center">
                        <User className="size-4 text-brand-500" />
                      </div>
                    )}
                    <p className="font-medium">{detailLease.tenant.firstName} {detailLease.tenant.lastName}</p>
                  </div>
                </div>
              </div>

              {/* Lease terms */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-xs text-muted-foreground">Loyer</p>
                  <p className="text-sm font-semibold">{formatFCFA(detailLease.monthlyRent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Charges</p>
                  <p className="text-sm font-semibold">{formatFCFA(detailLease.charges || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dépôt</p>
                  <p className="text-sm font-semibold">{formatFCFA(detailLease.deposit || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Début</p>
                  <p className="text-sm font-semibold">{new Date(detailLease.startDate).toLocaleDateString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fin</p>
                  <p className="text-sm font-semibold">{new Date(detailLease.endDate).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              {/* Special conditions */}
              {detailLease.specialConditions && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Conditions particulières</p>
                  <p className="text-sm">{detailLease.specialConditions}</p>
                </div>
              )}

              {/* Signature status */}
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-xs font-medium text-muted-foreground mb-2">Signatures</p>
                <SignatureStatus signed={!!detailLease.ownerSignedAt} label="Propriétaire" />
                {detailLease.ownerSignedAt && (
                  <p className="text-xs text-muted-foreground ml-6">
                    Signé le {new Date(detailLease.ownerSignedAt).toLocaleDateString('fr-FR')} à {new Date(detailLease.ownerSignedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                <SignatureStatus signed={!!detailLease.tenantSignedAt} label="Locataire" />
                {detailLease.tenantSignedAt && (
                  <p className="text-xs text-muted-foreground ml-6">
                    Signé le {new Date(detailLease.tenantSignedAt).toLocaleDateString('fr-FR')} à {new Date(detailLease.tenantSignedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              {/* Payment summary for active leases */}
              {detailLease.status === 'ACTIVE' && detailLease.payments && detailLease.payments.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Derniers paiements</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {detailLease.payments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-2 rounded bg-muted text-sm">
                        <div>
                          <p className="font-medium">{formatFCFA(payment.amount)}</p>
                          <p className="text-xs text-muted-foreground">
                            Échéance: {new Date(payment.dueDate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Badge className={
                          payment.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          payment.status === 'LATE' ? 'bg-red-50 text-red-600' :
                          'bg-amber-50 text-amber-700'
                        }>
                          {payment.status === 'PAID' ? 'Payé' : payment.status === 'LATE' ? 'En retard' : 'En attente'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {(detailLease.ownerSignedAt || detailLease.tenantSignedAt) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-brand-200 text-brand-600 hover:bg-brand-50"
                    onClick={async () => {
                      try {
                        const res = await apiFetch(`/api/leases/${detailLease.id}/contract?format=pdf`)
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({ error: 'Erreur' }))
                          toast.error(err.error || 'Erreur lors du téléchargement')
                          return
                        }
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `Bail_${detailLease.property?.title || 'contrat'}.pdf`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                        toast.success('Contrat téléchargé')
                      } catch {
                        toast.error('Erreur lors du téléchargement')
                      }
                    }}
                  >
                    <Download className="size-3.5" /> Télécharger le contrat
                  </Button>
                )}
                {detailLease.status === 'ACTIVE' && (
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      onClick={() => {
                        setDetailDialogOpen(false)
                        handleTerminateClick(detailLease)
                      }}
                    >
                      <AlertTriangle className="size-3.5" /> Résilier
                    </Button>
                  </>
                )}
                {(detailLease.status === 'DRAFT' || detailLease.status === 'PENDING_SIGNATURE') && !detailLease.ownerSignedAt && (
                  <>
                    <Button
                      size="sm"
                      className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
                      onClick={() => {
                        setDetailDialogOpen(false)
                        setSignLease(detailLease)
                        setSignDialogOpen(true)
                      }}
                    >
                      <ShieldCheck className="size-3.5" /> Signer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setDetailDialogOpen(false)
                        handleOpenModify(detailLease)
                      }}
                    >
                      <PenLine className="size-3.5" /> Modifier
                    </Button>
                    {!detailLease.ownerSignedAt && !detailLease.tenantSignedAt && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setDetailDialogOpen(false)
                          handleDeleteLease(detailLease.id)
                        }}
                      >
                        <X className="size-3.5" /> Supprimer
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Aucune donnée</p>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Modify Dialog ────────────────────────────────────────────────── */}
      <Dialog open={modifyDialogOpen} onOpenChange={(open) => { setModifyDialogOpen(open); if (!open) setModifyLease(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="size-5 text-brand-500" />
              Modifier le bail
            </DialogTitle>
            <DialogDescription>
              Modifiez les conditions du bail pour {modifyLease?.property?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modRent">Loyer mensuel (FCFA)</Label>
                <Input
                  id="modRent"
                  type="number"
                  value={modifyForm.monthlyRent}
                  onChange={(e) => setModifyForm((p) => ({ ...p, monthlyRent: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="modCharges">Charges (FCFA)</Label>
                <Input
                  id="modCharges"
                  type="number"
                  value={modifyForm.charges}
                  onChange={(e) => setModifyForm((p) => ({ ...p, charges: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="modDeposit">Dépôt de garantie (FCFA)</Label>
              <Input
                id="modDeposit"
                type="number"
                value={modifyForm.deposit}
                onChange={(e) => setModifyForm((p) => ({ ...p, deposit: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="modStart">Date de début</Label>
                <Input
                  id="modStart"
                  type="date"
                  value={modifyForm.startDate}
                  onChange={(e) => setModifyForm((p) => ({ ...p, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="modEnd">Date de fin</Label>
                <Input
                  id="modEnd"
                  type="date"
                  value={modifyForm.endDate}
                  onChange={(e) => setModifyForm((p) => ({ ...p, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="modConditions">Conditions particulières</Label>
              <Textarea
                id="modConditions"
                value={modifyForm.specialConditions}
                onChange={(e) => setModifyForm((p) => ({ ...p, specialConditions: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setModifyDialogOpen(false); setModifyLease(null) }} disabled={modifying}>
              Annuler
            </Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
              onClick={handleModifyLease}
              disabled={modifying}
            >
              {modifying ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Enregistrement...
                </>
              ) : (
                <>
                  <Check className="size-4" /> Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Terminate Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Résilier le bail
            </DialogTitle>
            <DialogDescription className="pt-2">
              Êtes-vous sûr de vouloir résilier ce bail ? Cette action est irréversible. Le bail pour
              <span className="font-semibold text-foreground"> {leaseToTerminate?.property?.title}</span> avec
              <span className="font-semibold text-foreground"> {leaseToTerminate?.tenant?.firstName} {leaseToTerminate?.tenant?.lastName}</span> sera immédiatement clôturé.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 my-2">
            <p className="text-xs text-red-700">
              En résiliant ce bail, vous mettez fin au contrat de location. Les paiements en attente restent dus selon les conditions du bail.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setShowTerminateDialog(false); setLeaseToTerminate(null) }}
              disabled={terminating}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={terminating}
              className="gap-2"
            >
              {terminating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Résiliation...
                </>
              ) : (
                <>
                  <AlertTriangle className="size-4" />
                  Confirmer la résiliation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ─── Lease Card Component ────────────────────────────────────────────────────

function LeaseCard({
  lease,
  onDetail,
  onTerminate,
}: {
  lease: LeaseItem
  onDetail: () => void
  onTerminate: () => void
}) {
  return (
    <Card className="border-border hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {lease.tenant.avatarUrl ? (
                <img
                  src={lease.tenant.avatarUrl}
                  alt={`${lease.tenant.firstName} ${lease.tenant.lastName}`}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <div className="size-10 rounded-full bg-brand-50 flex items-center justify-center">
                  <User className="size-5 text-brand-500" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{lease.property.title}</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <User className="size-3.5" /> {lease.tenant.firstName} {lease.tenant.lastName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={lease.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : lease.status === 'TERMINATED' ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-600'}>
              {lease.status === 'ACTIVE' ? 'Actif' : lease.status === 'TERMINATED' ? 'Résilié' : lease.status}
            </Badge>
            {lease.paymentStatus === 'late' && (
              <Badge className="bg-red-50 text-red-600">Retard</Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="size-8 p-0">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="3" r="1.5" fill="currentColor"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="13" r="1.5" fill="currentColor"/></svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer" onClick={onDetail}>
                  <Eye className="size-4 mr-2" /> Voir détails
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => toast.info('Fonctionnalité PDF à venir')}>
                  <Download className="size-4 mr-2" /> Télécharger PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  onClick={onTerminate}
                >
                  <AlertTriangle className="size-4 mr-2" /> Résilier le bail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted">
          <div>
            <p className="text-xs text-muted-foreground">Loyer</p>
            <p className="text-sm font-semibold">{formatFCFA(lease.monthlyRent)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Charges</p>
            <p className="text-sm font-semibold">{formatFCFA(lease.charges || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Début</p>
            <p className="text-sm font-semibold">{new Date(lease.startDate).toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fin</p>
            <p className="text-sm font-semibold">{new Date(lease.endDate).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
