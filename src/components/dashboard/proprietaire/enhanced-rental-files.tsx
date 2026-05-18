'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ClipboardCheck,
  FileText,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronDown,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  CreditCard,
  AlertTriangle,
  Eye,
  ArrowLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────
interface TenantInfo {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string
  avatarUrl: string | null
  gender: string | null
  city: string | null
  address: string | null
  birthDate: string | null
  createdAt: string
}

interface DocumentInfo {
  id: string
  type: string
  name: string
  status: string
  tcComment: string | null
  createdAt: string
}

interface PropertyInfo {
  id: string
  title: string
  city: string
  address: string
}

interface LeaseInfo {
  id: string
  property: PropertyInfo & { images: Array<{ url: string }> }
}

interface OtherFileInfo {
  id: string
  status: string
  createdAt: string
  tenantCategory: string | null
  leases: Array<{ property: { title: string; city: string } }>
}

interface RentalFileItem {
  id: string
  status: string
  tenantCategory: string | null
  monthlyIncome: number | null
  employer: string | null
  employmentType: string | null
  guarantorName: string | null
  guarantorPhone: string | null
  guarantorRelation: string | null
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  tenant: TenantInfo
  documents: DocumentInfo[]
  leases: LeaseInfo[]
  tenantPaymentScore: number | null
  tenantOtherFiles: OtherFileInfo[]
}

interface OwnerRentalFilesResponse {
  data: RentalFileItem[]
  stats: Record<string, number>
  properties: Array<{ id: string; title: string; city: string; address: string }>
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT': return 'Brouillon'
    case 'SUBMITTED': return 'Soumis'
    case 'TC_REVIEW': return 'En revue TC'
    case 'VALIDATED': return 'Validé'
    case 'REJECTED': return 'Refusé'
    case 'EXPIRED': return 'Expiré'
    default: return status
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'VALIDATED': return 'bg-emerald-100 text-emerald-700'
    case 'TC_REVIEW': return 'bg-amber-100 text-amber-700'
    case 'SUBMITTED': return 'bg-amber-100 text-amber-700'
    case 'REJECTED': return 'bg-red-100 text-red-700'
    case 'EXPIRED': return 'bg-neutral-100 text-neutral-600'
    case 'DRAFT': return 'bg-neutral-100 text-neutral-600'
    default: return 'bg-neutral-100 text-neutral-600'
  }
}

function getCategoryLabel(cat: string | null): string {
  switch (cat) {
    case 'SALARIE': return 'Salarié'
    case 'ENTREPRENEUR': return 'Entrepreneur'
    case 'ETUDIANT': return 'Étudiant'
    default: return 'Non renseigné'
  }
}

function getCategoryColor(cat: string | null): string {
  switch (cat) {
    case 'SALARIE': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'ENTREPRENEUR': return 'bg-brand-50 text-brand-700 border-brand-200'
    case 'ETUDIANT': return 'bg-sky-50 text-sky-700 border-sky-200'
    default: return 'bg-neutral-50 text-neutral-600 border-neutral-200'
  }
}

function getDocStatusLabel(status: string): string {
  switch (status) {
    case 'VALIDATED': return 'Validé'
    case 'REJECTED': return 'Refusé'
    case 'PENDING': return 'En attente'
    default: return status
  }
}

function getDocStatusColor(status: string): string {
  switch (status) {
    case 'VALIDATED': return 'text-emerald-600'
    case 'REJECTED': return 'text-red-600'
    case 'PENDING': return 'text-amber-600'
    default: return 'text-neutral-500'
  }
}

type TabType = 'pending' | 'validated' | 'rejected' | 'all'

// ─── Animation Variants ────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function EnhancedRentalFiles() {
  const { isAuthenticated, setDashboardSection } = useAuthStore()
  const [data, setData] = useState<RentalFileItem[]>([])
  const [properties, setProperties] = useState<Array<{ id: string; title: string; city: string; address: string }>>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('pending')
  const [propertyFilter, setPropertyFilter] = useState<string>('all')

  // Accept/Reject dialog state
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedFileId, setSelectedFileId] = useState<string>('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Tenant profile dialog state
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<RentalFileItem | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<OwnerRentalFilesResponse>('/api/owner/rental-files')
      setData(d.data || [])
      setStats(d.stats || {})
      setProperties(d.properties || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setData([])
        return
      }
      setData([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Filter logic ────────────────────────────────────────────────────────
  const filteredData = data.filter((rf) => {
    // Status filter
    if (activeTab === 'pending' && !['SUBMITTED', 'TC_REVIEW', 'VALIDATED'].includes(rf.status)) return false
    if (activeTab === 'validated' && rf.status !== 'VALIDATED') return false
    if (activeTab === 'rejected' && rf.status !== 'REJECTED') return false

    // Property filter
    if (propertyFilter !== 'all') {
      const hasProperty = rf.leases.some((l) => l.property.id === propertyFilter)
      if (!hasProperty) return false
    }

    return true
  })

  // ─── Accept handler ──────────────────────────────────────────────────────
  const handleAccept = async () => {
    setActionLoading(true)
    try {
      await authFetch(`/api/rental-files/${selectedFileId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })
      toast.success('Dossier accepté et brouillon de bail créé')
      setAcceptDialogOpen(false)
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de l\'acceptation')
      } else {
        toast.error('Erreur lors de l\'acceptation')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Reject handler ──────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Veuillez fournir une raison de refus')
      return
    }
    setActionLoading(true)
    try {
      await authFetch(`/api/rental-files/${selectedFileId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: rejectionReason.trim() }),
      })
      toast.success('Dossier refusé')
      setRejectDialogOpen(false)
      setRejectionReason('')
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors du refus')
      } else {
        toast.error('Erreur lors du refus')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  const pendingCount = (stats['SUBMITTED'] || 0) + (stats['TC_REVIEW'] || 0) + (stats['VALIDATED'] || 0)
  const validatedCount = stats['VALIDATED'] || 0
  const rejectedCount = stats['REJECTED'] || 0
  const totalCount = Object.values(stats).reduce((a, b) => a + b, 0)

  const tabs: Array<{ key: TabType; label: string; count: number }> = [
    { key: 'pending', label: 'En attente', count: pendingCount },
    { key: 'validated', label: 'Validés', count: validatedCount },
    { key: 'rejected', label: 'Refusés', count: rejectedCount },
    { key: 'all', label: 'Tous', count: totalCount },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dossiers locatifs</h1>
        <p className="text-muted-foreground mt-1">Gérez les candidatures de location pour vos biens</p>
      </div>

      {/* Property Filter */}
      {properties.length > 1 && (
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-muted-foreground" />
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Filtrer par bien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les biens</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title} — {p.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-brand-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Files List */}
      <AnimatePresence mode="wait">
        {filteredData.length === 0 ? (
          <motion.div key="empty" variants={itemVariants} initial="hidden" animate="show" exit="hidden">
            <Card className="border-dashed border-border bg-muted/50">
              <CardContent className="py-12 flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-amber-50 mb-4">
                  <ClipboardCheck className="size-7 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {activeTab === 'pending'
                    ? 'Aucun dossier en attente'
                    : activeTab === 'validated'
                      ? 'Aucun dossier validé'
                      : activeTab === 'rejected'
                        ? 'Aucun dossier refusé'
                        : 'Aucun dossier locatif'}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {activeTab === 'pending'
                    ? 'Les nouvelles candidatures apparaîtront ici.'
                    : 'Aucun dossier dans cette catégorie.'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key={activeTab} variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
            {filteredData.map((rf) => (
              <motion.div key={rf.id} variants={itemVariants}>
                <Card className="border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    {/* Top row: Tenant info + Status + Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
                      <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => {
                          setSelectedTenant(rf)
                          setProfileDialogOpen(true)
                        }}
                      >
                        {/* Avatar */}
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-50 group-hover:bg-brand-100 transition-colors">
                          {rf.tenant.avatarUrl ? (
                            <img
                              src={rf.tenant.avatarUrl}
                              alt=""
                              className="size-12 rounded-full object-cover"
                            />
                          ) : (
                            <User className="size-6 text-brand-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-brand-600 transition-colors">
                            {rf.tenant.firstName} {rf.tenant.lastName}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 border ${getCategoryColor(rf.tenantCategory)}`}
                            >
                              {getCategoryLabel(rf.tenantCategory)}
                            </Badge>
                            <Badge className={getStatusColor(rf.status)}>
                              {getStatusLabel(rf.status)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {['SUBMITTED', 'TC_REVIEW', 'VALIDATED'].includes(rf.status) && (
                          <>
                            <Button
                              size="sm"
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => {
                                setSelectedFileId(rf.id)
                                setAcceptDialogOpen(true)
                              }}
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span className="hidden sm:inline">Accepter</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedFileId(rf.id)
                                setRejectDialogOpen(true)
                              }}
                            >
                              <XCircle className="size-3.5" />
                              <span className="hidden sm:inline">Refuser</span>
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => setDashboardSection('messages')}
                        >
                          <MessageSquare className="size-3.5" />
                          <span className="hidden sm:inline">Contacter</span>
                        </Button>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      {/* Income */}
                      {rf.monthlyIncome && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CreditCard className="size-3.5 shrink-0" />
                          <span>{rf.monthlyIncome.toLocaleString('fr-FR')} FCFA/mois</span>
                        </div>
                      )}
                      {/* Employer */}
                      {rf.employer && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="size-3.5 shrink-0" />
                          <span className="truncate">{rf.employer}</span>
                        </div>
                      )}
                      {/* Property */}
                      {rf.leases[0]?.property && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="truncate">{rf.leases[0].property.title}</span>
                        </div>
                      )}
                      {/* Date */}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="size-3.5 shrink-0" />
                        <span>Soumis le {formatDate(rf.createdAt)}</span>
                      </div>
                    </div>

                    {/* Guarantor info */}
                    {rf.guarantorName && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Garant</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                          <span className="text-foreground">{rf.guarantorName}</span>
                          {rf.guarantorPhone && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Phone className="size-3" /> {rf.guarantorPhone}
                            </span>
                          )}
                          {rf.guarantorRelation && (
                            <span className="text-muted-foreground">{rf.guarantorRelation}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rejection reason */}
                    {rf.status === 'REJECTED' && rf.rejectionReason && (
                      <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-xs font-medium text-red-700 mb-0.5">Raison du refus</p>
                        <p className="text-sm text-red-600">{rf.rejectionReason}</p>
                      </div>
                    )}

                    {/* Documents */}
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Documents ({rf.documents.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rf.documents.map((doc) => (
                          <Badge
                            key={doc.id}
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${getDocStatusColor(doc.status)}`}
                          >
                            <FileText className="size-2.5" />
                            {doc.name}
                            <span className="opacity-70">({getDocStatusLabel(doc.status)})</span>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Payment score */}
                    {rf.tenantPaymentScore !== null && (
                      <div className="mt-3 flex items-center gap-2">
                        <Shield className="size-3.5 text-brand-500" />
                        <span className="text-xs text-muted-foreground">Score de paiement :</span>
                        <span
                          className={`text-xs font-semibold ${
                            rf.tenantPaymentScore >= 80
                              ? 'text-emerald-600'
                              : rf.tenantPaymentScore >= 50
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {rf.tenantPaymentScore}%
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Accept Confirmation Dialog ──────────────────────────────────────── */}
      <AlertDialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Accepter le dossier
            </AlertDialogTitle>
            <AlertDialogDescription>
              En acceptant ce dossier, un brouillon de bail sera automatiquement créé. Vous pourrez ensuite compléter les détails du bail (loyer, charges, caution, dates).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccept}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? 'Traitement...' : 'Confirmer l\'acceptation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Reject Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-5 text-red-600" />
              Refuser le dossier
            </DialogTitle>
            <DialogDescription>
              Le locataire sera notifié du refus avec la raison que vous indiquez.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Raison du refus <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Expliquez pourquoi ce dossier est refusé..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setRejectionReason('')
              }}
              disabled={actionLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleReject}
              disabled={actionLoading || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
            >
              {actionLoading ? 'Traitement...' : 'Confirmer le refus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Tenant Profile Dialog ───────────────────────────────────────────── */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTenant && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50">
                    {selectedTenant.tenant.avatarUrl ? (
                      <img
                        src={selectedTenant.tenant.avatarUrl}
                        alt=""
                        className="size-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="size-5 text-brand-500" />
                    )}
                  </div>
                  <div>
                    <span>
                      {selectedTenant.tenant.firstName} {selectedTenant.tenant.lastName}
                    </span>
                    <p className="text-sm font-normal text-muted-foreground">
                      Profil du candidat
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Personal Info */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <User className="size-4 text-brand-500" />
                    Informations personnelles
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedTenant.tenant.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="size-3.5" />
                        {selectedTenant.tenant.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="size-3.5" />
                      {selectedTenant.tenant.email}
                    </div>
                    {selectedTenant.tenant.city && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {selectedTenant.tenant.city}
                      </div>
                    )}
                    {selectedTenant.tenant.birthDate && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="size-3.5" />
                        {formatDate(selectedTenant.tenant.birthDate)}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Financial Info */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CreditCard className="size-4 text-brand-500" />
                    Situation financière
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedTenant.monthlyIncome && (
                      <div>
                        <p className="text-xs text-muted-foreground">Revenus mensuels</p>
                        <p className="font-medium text-foreground">
                          {selectedTenant.monthlyIncome.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    )}
                    {selectedTenant.employer && (
                      <div>
                        <p className="text-xs text-muted-foreground">Employeur</p>
                        <p className="font-medium text-foreground">{selectedTenant.employer}</p>
                      </div>
                    )}
                    {selectedTenant.employmentType && (
                      <div>
                        <p className="text-xs text-muted-foreground">Type d\'emploi</p>
                        <p className="font-medium text-foreground">{selectedTenant.employmentType}</p>
                      </div>
                    )}
                    {selectedTenant.tenantPaymentScore !== null && (
                      <div>
                        <p className="text-xs text-muted-foreground">Score de paiement</p>
                        <p
                          className={`font-semibold ${
                            selectedTenant.tenantPaymentScore >= 80
                              ? 'text-emerald-600'
                              : selectedTenant.tenantPaymentScore >= 50
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {selectedTenant.tenantPaymentScore}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Guarantor */}
                {selectedTenant.guarantorName && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Shield className="size-4 text-brand-500" />
                        Garant
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Nom</p>
                          <p className="font-medium text-foreground">{selectedTenant.guarantorName}</p>
                        </div>
                        {selectedTenant.guarantorPhone && (
                          <div>
                            <p className="text-xs text-muted-foreground">Téléphone</p>
                            <p className="font-medium text-foreground">{selectedTenant.guarantorPhone}</p>
                          </div>
                        )}
                        {selectedTenant.guarantorRelation && (
                          <div>
                            <p className="text-xs text-muted-foreground">Relation</p>
                            <p className="font-medium text-foreground">{selectedTenant.guarantorRelation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Documents */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <FileText className="size-4 text-brand-500" />
                    Documents ({selectedTenant.documents.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedTenant.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground truncate">{doc.name}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 shrink-0 ${getDocStatusColor(doc.status)}`}
                        >
                          {getDocStatusLabel(doc.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Previous rental history */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <ClipboardCheck className="size-4 text-brand-500" />
                    Historique des candidatures
                  </h4>
                  {selectedTenant.tenantOtherFiles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune autre candidature trouvée</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTenant.tenantOtherFiles.map((otherFile) => (
                        <div
                          key={otherFile.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border"
                        >
                          <div className="text-sm">
                            <span className="text-foreground">
                              {otherFile.leases[0]?.property?.title || 'Bien non spécifié'}
                            </span>
                            <span className="text-muted-foreground ml-2">
                              {formatDate(otherFile.createdAt)}
                            </span>
                          </div>
                          <Badge className={getStatusColor(otherFile.status)}>
                            {getStatusLabel(otherFile.status)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
