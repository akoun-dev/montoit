'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  FileSignature, Plus, Building2, User, AlertTriangle, Loader2,
  MoreVertical, Eye, PenLine, Ban, CheckCircle2, Clock, XCircle,
  Archive, Search, ChevronDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────────

type MandatStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'TERMINATED' | 'EXPIRED'
type MandatType = 'GESTION_COMPLETE' | 'GESTION_LOCATION' | 'MANDAT_SIMPLE'
type CommissionType = 'PERCENTAGE' | 'FIXED'

interface MandatAgency {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string | null
}

interface MandatProperty {
  id: string
  title: string
  city: string
  address: string
  type: string
  images: Array<{ url: string }>
}

interface MandatItem {
  id: string
  type: MandatType
  status: MandatStatus
  commissionRate: number
  commissionType: CommissionType
  fixedCommission: number | null
  startDate: string
  endDate: string
  conditions: string | null
  ownerSignedAt: string | null
  agencySignedAt: string | null
  terminatedAt: string | null
  terminationReason: string | null
  createdAt: string
  property: MandatProperty
  agency: MandatAgency
}

interface OwnerProperty {
  id: string
  title: string
  city: string
  images: Array<{ url: string }>
}

interface AgencyUser {
  id: string
  firstName: string
  lastName: string
  email: string
  avatarUrl?: string | null
  role: string
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const MANDAT_TYPE_LABELS: Record<MandatType, string> = {
  GESTION_COMPLETE: 'Gestion complète',
  GESTION_LOCATION: 'Gestion location',
  MANDAT_SIMPLE: 'Mandat simple',
}

const MANDAT_TYPE_COLORS: Record<MandatType, string> = {
  GESTION_COMPLETE: 'bg-teal-50 text-teal-700',
  GESTION_LOCATION: 'bg-brand-50 text-brand-700',
  MANDAT_SIMPLE: 'bg-neutral-100 text-neutral-700',
}

const STATUS_LABELS: Record<MandatStatus, string> = {
  DRAFT: 'Brouillon',
  PENDING_SIGNATURE: 'En attente de signature',
  ACTIVE: 'Actif',
  TERMINATED: 'Résilié',
  EXPIRED: 'Expiré',
}

const STATUS_COLORS: Record<MandatStatus, string> = {
  DRAFT: 'bg-amber-100 text-amber-700',
  PENDING_SIGNATURE: 'bg-brand-50 text-brand-600',
  ACTIVE: 'bg-green-100 text-green-700',
  TERMINATED: 'bg-red-50 text-red-600',
  EXPIRED: 'bg-neutral-100 text-neutral-600',
}

const STATUS_ICONS: Record<MandatStatus, React.ElementType> = {
  DRAFT: PenLine,
  PENDING_SIGNATURE: Clock,
  ACTIVE: CheckCircle2,
  TERMINATED: XCircle,
  EXPIRED: Archive,
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function ProprietaireMandats() {
  const { isAuthenticated } = useAuthStore()

  // Data
  const [mandats, setMandats] = useState<MandatItem[]>([])
  const [loading, setLoading] = useState(true)

  // Properties for create form
  const [properties, setProperties] = useState<OwnerProperty[]>([])

  // Agencies for create form
  const [agencies, setAgencies] = useState<AgencyUser[]>([])
  const [agencySearch, setAgencySearch] = useState('')
  const [agencySearchLoading, setAgencySearchLoading] = useState(false)

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSignDialog, setShowSignDialog] = useState(false)
  const [showTerminateDialog, setShowTerminateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  // Selected mandat
  const [selectedMandat, setSelectedMandat] = useState<MandatItem | null>(null)

  // Form state
  const [formPropertyId, setFormPropertyId] = useState('')
  const [formAgencyId, setFormAgencyId] = useState('')
  const [formType, setFormType] = useState<MandatType>('GESTION_LOCATION')
  const [formCommissionRate, setFormCommissionRate] = useState('')
  const [formCommissionType, setFormCommissionType] = useState<CommissionType>('PERCENTAGE')
  const [formFixedCommission, setFormFixedCommission] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formConditions, setFormConditions] = useState('')

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [editMandatId, setEditMandatId] = useState<string | null>(null)

  // Termination reason
  const [terminationReason, setTerminationReason] = useState('')

  // Loading states
  const [creating, setCreating] = useState(false)
  const [signing, setSigning] = useState(false)
  const [terminating, setTerminating] = useState(false)

  // ─── Fetch mandats ──────────────────────────────────────────────────────
  const fetchMandats = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    try {
      const d = await authFetch<{ mandats: MandatItem[] }>('/api/mandats')
      setMandats(d.mandats || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setMandats([])
        return
      }
      setMandats([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  // ─── Fetch owner properties ─────────────────────────────────────────────
  const fetchProperties = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const d = await authFetch<{ properties: OwnerProperty[] }>('/api/properties?mine=true&all=true')
      setProperties(d.properties || [])
    } catch {
      setProperties([])
    }
  }, [isAuthenticated])

  // ─── Search agencies ────────────────────────────────────────────────────
  const searchAgencies = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setAgencies([])
      return
    }
    setAgencySearchLoading(true)
    try {
      const d = await authFetch<{ users: AgencyUser[] }>(`/api/users?role=AGENCE&q=${encodeURIComponent(query)}`)
      setAgencies(d.users || [])
    } catch {
      setAgencies([])
    } finally {
      setAgencySearchLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMandats()
  }, [fetchMandats])

  useEffect(() => {
    if (showCreateDialog) {
      fetchProperties()
    }
  }, [showCreateDialog, fetchProperties])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (agencySearch.length >= 2) {
        searchAgencies(agencySearch)
      } else {
        setAgencies([])
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [agencySearch, searchAgencies])

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = {
    active: mandats.filter((m) => m.status === 'ACTIVE').length,
    pending: mandats.filter((m) => m.status === 'PENDING_SIGNATURE' || m.status === 'DRAFT').length,
    terminated: mandats.filter((m) => m.status === 'TERMINATED' || m.status === 'EXPIRED').length,
  }

  // ─── Reset form ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormPropertyId('')
    setFormAgencyId('')
    setFormType('GESTION_LOCATION')
    setFormCommissionRate('')
    setFormCommissionType('PERCENTAGE')
    setFormFixedCommission('')
    setFormStartDate('')
    setFormEndDate('')
    setFormConditions('')
    setAgencySearch('')
    setAgencies([])
    setEditMode(false)
    setEditMandatId(null)
  }

  // ─── Open create dialog ─────────────────────────────────────────────────
  const openCreateDialog = () => {
    resetForm()
    setShowCreateDialog(true)
  }

  // ─── Open edit dialog ───────────────────────────────────────────────────
  const openEditDialog = (mandat: MandatItem) => {
    setFormPropertyId(mandat.property.id)
    setFormAgencyId(mandat.agency.id)
    setFormType(mandat.type)
    setFormCommissionRate(String(mandat.commissionRate))
    setFormCommissionType(mandat.commissionType || 'PERCENTAGE')
    setFormFixedCommission(mandat.fixedCommission ? String(mandat.fixedCommission) : '')
    setFormStartDate(mandat.startDate ? new Date(mandat.startDate).toISOString().split('T')[0] : '')
    setFormEndDate(mandat.endDate ? new Date(mandat.endDate).toISOString().split('T')[0] : '')
    setFormConditions(mandat.conditions || '')
    setAgencySearch(mandat.agency.email || '')
    setEditMode(true)
    setEditMandatId(mandat.id)
    setShowCreateDialog(true)
  }

  // ─── Create / Update mandat ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!formPropertyId || !formAgencyId || !formCommissionRate || !formStartDate || !formEndDate) {
      toast.error('Veuillez remplir tous les champs requis')
      return
    }

    const payload: Record<string, unknown> = {
      propertyId: formPropertyId,
      agencyId: formAgencyId,
      type: formType,
      commissionRate: parseFloat(formCommissionRate),
      commissionType: formCommissionType,
      startDate: formStartDate,
      endDate: formEndDate,
      conditions: formConditions || null,
    }

    if (formCommissionType === 'FIXED' && formFixedCommission) {
      payload.fixedCommission = parseFloat(formFixedCommission)
    }

    setCreating(true)
    try {
      if (editMode && editMandatId) {
        await authFetch(`/api/mandats/${editMandatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: formType,
            commissionRate: parseFloat(formCommissionRate),
            commissionType: formCommissionType,
            fixedCommission: formCommissionType === 'FIXED' ? parseFloat(formFixedCommission) : null,
            startDate: formStartDate,
            endDate: formEndDate,
            conditions: formConditions || null,
          }),
        })
        toast.success('Mandat modifié avec succès')
      } else {
        await authFetch('/api/mandats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        toast.success('Mandat créé avec succès')
      }
      setShowCreateDialog(false)
      resetForm()
      fetchMandats()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la création')
      } else {
        toast.error('Erreur lors de la création du mandat')
      }
    } finally {
      setCreating(false)
    }
  }

  // ─── Sign mandat ────────────────────────────────────────────────────────
  const handleSign = async () => {
    if (!selectedMandat) return
    setSigning(true)
    try {
      await authFetch(`/api/mandats/${selectedMandat.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'owner' }),
      })
      toast.success('Mandat signé avec succès')
      setShowSignDialog(false)
      setSelectedMandat(null)
      fetchMandats()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la signature')
      } else {
        toast.error('Erreur lors de la signature du mandat')
      }
    } finally {
      setSigning(false)
    }
  }

  // ─── Terminate mandat ───────────────────────────────────────────────────
  const handleTerminate = async () => {
    if (!selectedMandat) return
    if (!terminationReason.trim()) {
      toast.error('La raison de la résiliation est requise')
      return
    }
    setTerminating(true)
    try {
      await authFetch(`/api/mandats/${selectedMandat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'terminate', terminationReason: terminationReason.trim() }),
      })
      toast.success('Mandat résilié avec succès')
      setShowTerminateDialog(false)
      setSelectedMandat(null)
      setTerminationReason('')
      fetchMandats()
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || 'Erreur lors de la résiliation')
      } else {
        toast.error('Erreur lors de la résiliation du mandat')
      }
    } finally {
      setTerminating(false)
    }
  }

  // ─── Loading skeleton ───────────────────────────────────────────────────
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
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes Mandats</h1>
          <p className="text-muted-foreground mt-1">Gérez vos mandats de gestion avec les agences</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2 bg-brand-500 hover:bg-brand-600 text-white"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Nouveau mandat</span>
          <span className="sm:hidden">Nouveau</span>
        </Button>
      </motion.div>

      {/* ─── Stats Cards ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                <Clock className="size-5 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-100">
                <Archive className="size-5 text-neutral-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.terminated}</p>
                <p className="text-xs text-muted-foreground">Terminés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Mandat Cards ────────────────────────────────────────────────── */}
      {mandats.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <FileSignature className="size-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun mandat</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Créez un mandat pour confier la gestion de vos biens à une agence
              </p>
              <Button
                onClick={openCreateDialog}
                className="mt-4 gap-2 bg-brand-500 hover:bg-brand-600 text-white"
              >
                <Plus className="size-4" />
                Créer un mandat
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {mandats.map((mandat) => (
              <MandatCard
                key={mandat.id}
                mandat={mandat}
                onSign={() => {
                  setSelectedMandat(mandat)
                  setShowSignDialog(true)
                }}
                onEdit={() => openEditDialog(mandat)}
                onTerminate={() => {
                  setSelectedMandat(mandat)
                  setTerminationReason('')
                  setShowTerminateDialog(true)
                }}
                onViewDetail={() => {
                  setSelectedMandat(mandat)
                  setShowDetailDialog(true)
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Create / Edit Mandat Dialog ─────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        if (!open) resetForm()
        setShowCreateDialog(open)
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="size-5 text-brand-500" />
              {editMode ? 'Modifier le mandat' : 'Nouveau mandat'}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? 'Modifiez les informations du mandat'
                : 'Confiez la gestion de votre bien à une agence'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Property selection */}
            <div className="space-y-2">
              <Label htmlFor="property">Bien immobilier *</Label>
              <Select
                value={formPropertyId}
                onValueChange={setFormPropertyId}
                disabled={editMode}
              >
                <SelectTrigger className="w-full" id="property">
                  <SelectValue placeholder="Sélectionnez un bien" />
                </SelectTrigger>
                <SelectContent>
                  {properties.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      Aucun bien disponible
                    </SelectItem>
                  ) : (
                    properties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} — {p.city}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Agency selection */}
            <div className="space-y-2">
              <Label htmlFor="agency">Agence *</Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="agency"
                    placeholder="Rechercher une agence par nom ou email..."
                    value={agencySearch}
                    onChange={(e) => {
                      setAgencySearch(e.target.value)
                      setFormAgencyId('')
                    }}
                    className="pl-9 pr-3"
                    disabled={editMode}
                  />
                </div>
                {agencySearchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {/* Agency results dropdown */}
              {agencies.length > 0 && !editMode && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {agencies.map((agency) => (
                    <button
                      key={agency.id}
                      type="button"
                      onClick={() => {
                        setFormAgencyId(agency.id)
                        setAgencySearch(`${agency.firstName} ${agency.lastName} (${agency.email})`)
                        setAgencies([])
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                        formAgencyId === agency.id ? 'bg-brand-50 text-brand-700' : ''
                      }`}
                    >
                      <div className="size-8 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                        <Building2 className="size-4 text-teal-600" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="font-medium truncate">{agency.firstName} {agency.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{agency.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {formAgencyId && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Agence sélectionnée
                </p>
              )}
            </div>

            {/* Mandat type */}
            <div className="space-y-2">
              <Label htmlFor="mandat-type">Type de mandat *</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as MandatType)}>
                <SelectTrigger className="w-full" id="mandat-type">
                  <SelectValue placeholder="Sélectionnez le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GESTION_COMPLETE">Gestion complète</SelectItem>
                  <SelectItem value="GESTION_LOCATION">Gestion location</SelectItem>
                  <SelectItem value="MANDAT_SIMPLE">Mandat simple</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Commission type */}
            <div className="space-y-2">
              <Label htmlFor="commission-type">Type de commission *</Label>
              <Select value={formCommissionType} onValueChange={(v) => setFormCommissionType(v as CommissionType)}>
                <SelectTrigger className="w-full" id="commission-type">
                  <SelectValue placeholder="Sélectionnez le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Pourcentage</SelectItem>
                  <SelectItem value="FIXED">Montant fixe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Commission rate / fixed amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="commission-rate">
                  {formCommissionType === 'PERCENTAGE' ? 'Taux (%) *' : 'Taux de référence (%)'}
                </Label>
                <Input
                  id="commission-rate"
                  type="number"
                  placeholder="ex: 8.5"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formCommissionRate}
                  onChange={(e) => setFormCommissionRate(e.target.value)}
                />
              </div>
              {formCommissionType === 'FIXED' && (
                <div className="space-y-2">
                  <Label htmlFor="fixed-commission">Montant fixe (FCFA) *</Label>
                  <Input
                    id="fixed-commission"
                    type="number"
                    placeholder="ex: 50000"
                    min="0"
                    value={formFixedCommission}
                    onChange={(e) => setFormFixedCommission(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-date">Date de début *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Date de fin *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <Label htmlFor="conditions">Conditions particulières</Label>
              <Textarea
                id="conditions"
                placeholder="Conditions spécifiques du mandat (optionnel)..."
                value={formConditions}
                onChange={(e) => setFormConditions(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                resetForm()
              }}
              disabled={creating}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={creating || !formPropertyId || !formAgencyId || !formCommissionRate || !formStartDate || !formEndDate}
              className="gap-2 bg-brand-500 hover:bg-brand-600 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {editMode ? 'Modification...' : 'Création...'}
                </>
              ) : (
                editMode ? 'Enregistrer' : 'Créer le mandat'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Sign Mandat Dialog ──────────────────────────────────────────── */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="size-5 text-brand-500" />
              Signer le mandat
            </DialogTitle>
            <DialogDescription className="pt-2">
              Vous êtes sur le point de signer électroniquement le mandat pour
              <span className="font-semibold text-foreground"> {selectedMandat?.property?.title}</span> avec l&apos;agence
              <span className="font-semibold text-foreground"> {selectedMandat?.agency?.firstName} {selectedMandat?.agency?.lastName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-brand-50 border border-brand-100 my-2">
            <p className="text-xs text-brand-700">
              En signant ce mandat, vous autorisez l&apos;agence à gérer votre bien selon les conditions définies. Votre signature électronique a la même valeur légale qu&apos;une signature manuscrite.
            </p>
          </div>
          {selectedMandat?.agencySignedAt && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xs text-green-700 flex items-center gap-1">
                <CheckCircle2 className="size-3.5" />
                L&apos;agence a déjà signé ce mandat. Votre signature l&apos;activera immédiatement.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowSignDialog(false)
                setSelectedMandat(null)
              }}
              disabled={signing}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSign}
              disabled={signing}
              className="gap-2 bg-brand-500 hover:bg-brand-600 text-white"
            >
              {signing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signature...
                </>
              ) : (
                <>
                  <FileSignature className="size-4" />
                  Confirmer la signature
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Terminate Mandat Dialog ─────────────────────────────────────── */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              Résilier le mandat
            </DialogTitle>
            <DialogDescription className="pt-2">
              Êtes-vous sûr de vouloir résilier le mandat pour
              <span className="font-semibold text-foreground"> {selectedMandat?.property?.title}</span> ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 my-2">
            <p className="text-xs text-red-700">
              En résiliant ce mandat, vous mettez fin au contrat de gestion avec l&apos;agence. Les obligations en cours restent dues selon les conditions du mandat.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="termination-reason">Raison de la résiliation *</Label>
            <Textarea
              id="termination-reason"
              placeholder="Expliquez la raison de la résiliation..."
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowTerminateDialog(false)
                setSelectedMandat(null)
                setTerminationReason('')
              }}
              disabled={terminating}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleTerminate}
              disabled={terminating || !terminationReason.trim()}
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

      {/* ─── Mandat Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5 text-brand-500" />
              Détails du mandat
            </DialogTitle>
            <DialogDescription>
              Mandat pour {selectedMandat?.property?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedMandat && (
            <div className="space-y-4 py-2">
              {/* Property & Agency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <div className="size-10 rounded-lg overflow-hidden shrink-0">
                    {selectedMandat.property.images?.[0]?.url ? (
                      <img
                        src={selectedMandat.property.images[0].url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center bg-brand-50">
                        <Building2 className="size-4 text-brand-500" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{selectedMandat.property.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedMandat.property.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <div className="size-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                    <Building2 className="size-5 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {selectedMandat.agency.firstName} {selectedMandat.agency.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{selectedMandat.agency.email}</p>
                  </div>
                </div>
              </div>

              {/* Type & Status */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={MANDAT_TYPE_COLORS[selectedMandat.type]}>
                  {MANDAT_TYPE_LABELS[selectedMandat.type]}
                </Badge>
                <Badge className={STATUS_COLORS[selectedMandat.status]}>
                  {STATUS_LABELS[selectedMandat.status]}
                </Badge>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-xs text-muted-foreground">Commission</p>
                  <p className="text-sm font-semibold">
                    {selectedMandat.commissionType === 'FIXED' && selectedMandat.fixedCommission
                      ? `${selectedMandat.fixedCommission.toLocaleString('fr-FR')} FCFA`
                      : `${selectedMandat.commissionRate}%`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Type de commission</p>
                  <p className="text-sm font-semibold">
                    {selectedMandat.commissionType === 'FIXED' ? 'Montant fixe' : 'Pourcentage'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Début</p>
                  <p className="text-sm font-semibold">
                    {new Date(selectedMandat.startDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fin</p>
                  <p className="text-sm font-semibold">
                    {new Date(selectedMandat.endDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Signatures status */}
              <div className="p-3 rounded-lg border border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">État des signatures</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Votre signature</span>
                    {selectedMandat.ownerSignedAt ? (
                      <Badge className="bg-green-100 text-green-700 gap-1">
                        <CheckCircle2 className="size-3" /> Signé le {new Date(selectedMandat.ownerSignedAt).toLocaleDateString('fr-FR')}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 gap-1">
                        <Clock className="size-3" /> En attente
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Signature agence</span>
                    {selectedMandat.agencySignedAt ? (
                      <Badge className="bg-green-100 text-green-700 gap-1">
                        <CheckCircle2 className="size-3" /> Signé le {new Date(selectedMandat.agencySignedAt).toLocaleDateString('fr-FR')}
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 gap-1">
                        <Clock className="size-3" /> En attente
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Conditions */}
              {selectedMandat.conditions && (
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Conditions particulières</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedMandat.conditions}</p>
                </div>
              )}

              {/* Termination info */}
              {selectedMandat.status === 'TERMINATED' && selectedMandat.terminationReason && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-xs font-medium text-red-700 mb-1">Raison de la résiliation</p>
                  <p className="text-sm text-red-600">{selectedMandat.terminationReason}</p>
                  {selectedMandat.terminatedAt && (
                    <p className="text-xs text-red-500 mt-1">
                      Résilié le {new Date(selectedMandat.terminatedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ─── Mandat Card Sub-component ─────────────────────────────────────────────────

function MandatCard({
  mandat,
  onSign,
  onEdit,
  onTerminate,
  onViewDetail,
}: {
  mandat: MandatItem
  onSign: () => void
  onEdit: () => void
  onTerminate: () => void
  onViewDetail: () => void
}) {
  const StatusIcon = STATUS_ICONS[mandat.status]

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -10 }}
      layout
    >
      <Card className="border-border">
        <CardContent className="p-5">
          {/* Top row: Property + Agency + Status */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-3">
              {/* Property image */}
              <div className="size-12 rounded-lg overflow-hidden shrink-0">
                {mandat.property.images?.[0]?.url ? (
                  <img
                    src={mandat.property.images[0].url}
                    alt={mandat.property.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center bg-brand-50">
                    <Building2 className="size-5 text-brand-500" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{mandat.property.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Building2 className="size-3.5" />
                  {mandat.agency.firstName} {mandat.agency.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{mandat.agency.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={STATUS_COLORS[mandat.status]}>
                <StatusIcon className="size-3 mr-1" />
                {STATUS_LABELS[mandat.status]}
              </Badge>
              {/* Actions dropdown */}
              {(mandat.status === 'DRAFT' || mandat.status === 'PENDING_SIGNATURE' || mandat.status === 'ACTIVE') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="size-8 p-0">
                      <MoreVertical className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onViewDetail} className="cursor-pointer">
                      <Eye className="size-4 mr-2" />
                      Voir les détails
                    </DropdownMenuItem>
                    {(mandat.status === 'DRAFT' || mandat.status === 'PENDING_SIGNATURE') && !mandat.ownerSignedAt && (
                      <DropdownMenuItem onClick={onSign} className="cursor-pointer text-brand-600 focus:text-brand-600 focus:bg-brand-50">
                        <FileSignature className="size-4 mr-2" />
                        Signer le mandat
                      </DropdownMenuItem>
                    )}
                    {mandat.status === 'DRAFT' && (
                      <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                        <PenLine className="size-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                    )}
                    {(mandat.status === 'ACTIVE' || mandat.status === 'PENDING_SIGNATURE') && (
                      <DropdownMenuItem onClick={onTerminate} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                        <Ban className="size-4 mr-2" />
                        Résilier
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {/* For TERMINATED/EXPIRED, only show view detail */}
              {(mandat.status === 'TERMINATED' || mandat.status === 'EXPIRED') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                  onClick={onViewDetail}
                >
                  <Eye className="size-3" />
                  Détails
                </Button>
              )}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <Badge className={`${MANDAT_TYPE_COLORS[mandat.type]} text-[11px] mt-0.5`}>
                {MANDAT_TYPE_LABELS[mandat.type]}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Commission</p>
              <p className="text-sm font-semibold">
                {mandat.commissionType === 'FIXED' && mandat.fixedCommission
                  ? `${mandat.fixedCommission.toLocaleString('fr-FR')} FCFA`
                  : `${mandat.commissionRate}%`}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Début</p>
              <p className="text-sm font-semibold">{new Date(mandat.startDate).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fin</p>
              <p className="text-sm font-semibold">{new Date(mandat.endDate).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>

          {/* Quick action buttons for DRAFT */}
          {mandat.status === 'DRAFT' && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={onSign}
                className="gap-1.5 bg-brand-500 hover:bg-brand-600 text-white h-8 text-xs"
              >
                <FileSignature className="size-3.5" />
                Signer
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                className="gap-1.5 h-8 text-xs"
              >
                <PenLine className="size-3.5" />
                Modifier
              </Button>
            </div>
          )}

          {/* Quick sign for PENDING_SIGNATURE if owner hasn't signed */}
          {mandat.status === 'PENDING_SIGNATURE' && !mandat.ownerSignedAt && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={onSign}
                className="gap-1.5 bg-brand-500 hover:bg-brand-600 text-white h-8 text-xs"
              >
                <FileSignature className="size-3.5" />
                Signer le mandat
              </Button>
            </div>
          )}

          {/* Termination reason for TERMINATED */}
          {mandat.status === 'TERMINATED' && mandat.terminationReason && (
            <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
              <p className="text-xs text-red-600">
                <span className="font-medium">Raison :</span> {mandat.terminationReason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
