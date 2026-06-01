'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2, Edit, Power, PlusCircle, FileText, Trash2,
  Search, CheckCircle2, Hourglass, X, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { useRealtimeProperties } from '@/hooks/use-realtime-properties'
import { toast } from 'sonner'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AddProperty } from './add-property'
import type { ScoringData } from '@/components/dashboard/locataire/settings/types'

interface PropertyItem {
  id: string; title: string; description: string; type: string; price: number; city: string; address: string; commune: string | null; status: string
  bedrooms: number | null; bathrooms: number | null; area: number; isFurnished: boolean; hasParking: boolean; hasGarden: boolean; hasPool: boolean
  images: Array<{ url: string; order: number }>
}

const typeLabels: Record<string, string> = {
  APPARTEMENT: 'Appartement', MAISON: 'Maison', STUDIO: 'Studio',
  DUPLEX: 'Duplex', PENTHOUSE: 'Penthouse', VILLA: 'Villa',
  CHAMBRE: 'Chambre', CONCESSION: 'Concession', IMMEUBLE: 'Immeuble',
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Brouillon', className: 'bg-amber-100 text-amber-700' },
  ACTIVE: { label: 'Actif', className: 'bg-green-100 text-green-700' },
  PENDING_VERIFICATION: { label: 'En cours de vérification', className: 'bg-blue-100 text-blue-700' },
  SUSPENDED: { label: 'Suspendu', className: 'bg-red-100 text-red-700' },
  CLOSED: { label: 'Fermé', className: 'bg-neutral-100 text-neutral-600' },
  RENTED: { label: 'Loué', className: 'bg-teal-100 text-teal-700' },
}

const statCards = [
  { key: 'total', label: 'Total', icon: Building2, color: 'text-brand-600 bg-brand-50' },
  { key: 'active', label: 'Actifs', icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  { key: 'pending', label: 'En cours de vérification', icon: Hourglass, color: 'text-blue-600 bg-blue-50' },
  { key: 'draft', label: 'Brouillons', icon: FileText, color: 'text-amber-600 bg-amber-50' },
]

export function MyProperties() {
  const { user, isAuthenticated, setDashboardSection, setSettingsDefaultTab } = useAuthStore()
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [checkingVerification, setCheckingVerification] = useState(false)
  const pendingAddRef = useRef(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const limit = 15

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    try {
      const d = await authFetch<{ properties?: PropertyItem[] }>('/api/dashboard/proprietaire')
      setProperties(d.properties || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setProperties([])
        return
      }
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime — refresh when properties change
  useRealtimeProperties({
    userId: user?.id,
    onPropertyChange: useCallback(() => { void fetchData() }, [fetchData]),
  })

  const filtered = useMemo(() => {
    let list = properties
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) =>
        p.title?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.commune?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      list = list.filter((p) => p.type === typeFilter)
    }
    return list
  }, [properties, search, statusFilter, typeFilter])

  const paginatedProperties = useMemo(() => {
    const start = (page - 1) * limit
    return filtered.slice(start, start + limit)
  }, [filtered, page, limit])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, statusFilter, typeFilter])

  const stats = useMemo(() => ({
    total: properties.length,
    active: properties.filter((p) => p.status === 'ACTIVE').length,
    pending: properties.filter((p) => p.status === 'PENDING_VERIFICATION').length,
    draft: properties.filter((p) => p.status === 'DRAFT').length,
  }), [properties])

  const handleResumeDraft = (id: string) => {
    setEditingId(id)
    setShowAddForm(true)
  }

  const handlePublishDraft = async (id: string) => {
    try {
      await authFetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
      toast.success('Bien soumis pour vérification !')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la publication')
    }
  }

  const handleDeleteDraft = (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDeleteDraft = async () => {
    if (!deleteConfirmId) return
    try {
      await authFetch(`/api/properties/${deleteConfirmId}`, { method: 'DELETE' })
      toast.success('Brouillon supprimé')
      setDeleteConfirmId(null)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
      await authFetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      toast.success(newStatus === 'ACTIVE' ? 'Bien réactivé' : 'Bien suspendu')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de statut')
    }
  }

  const handleFormSuccess = () => {
    setShowAddForm(false)
    setEditingId(null)
    setLoading(true)
    fetchData()
  }

  const handleFormCancel = () => {
    setShowAddForm(false)
    setEditingId(null)
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setTypeFilter('all')
  }

  const handleOpenAddProperty = useCallback(async () => {
    if (checkingVerification) return
    setCheckingVerification(true)
    try {
      const result = await authFetch<ScoringData>('/api/scoring')
      setScoring(result)
      const { profile, neoface, roleSpecific } = result.breakdown
      const profileComplete = profile.score >= profile.max
      const kycVerified = neoface.verified
      const dossierOk = roleSpecific.approved
      if (profileComplete && kycVerified && dossierOk) {
        setEditingId(null)
        setShowAddForm(true)
      } else {
        setShowVerificationModal(true)
      }
    } catch {
      toast.error('Impossible de vérifier votre profil')
      setEditingId(null)
      setShowAddForm(true)
    } finally {
      setCheckingVerification(false)
    }
  }, [checkingVerification])

  const handleGoToVerification = () => {
    setShowVerificationModal(false)
    setSettingsDefaultTab('verification')
    setDashboardSection('settings')
  }

  const hasActiveFilters = search || statusFilter !== 'all' || typeFilter !== 'all'

  if (showAddForm) {
    return (
      <AddProperty
        editId={editingId || undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const renderPropertyRow = (p: PropertyItem) => {
    const status = statusConfig[p.status] || { label: p.status, className: 'bg-neutral-100 text-neutral-600' }
    const isDraft = p.status === 'DRAFT'

    return (
      <div
        key={p.id}
        className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card transition-colors hover:border-brand-200"
      >
        {/* Clickable body: thumbnail + info */}
        <div
          className="flex flex-1 min-w-0 items-center gap-4 cursor-pointer rounded-lg hover:opacity-80 transition-opacity"
          onClick={() => handleResumeDraft(p.id)}
        >
          {/* Thumbnail */}
          <div className="shrink-0">
            {p.images?.[0] ? (
              <img
                src={p.images[0].url}
                alt={p.title || ''}
                className="size-16 rounded-lg object-cover bg-muted"
              />
            ) : (
              <div className="size-16 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="size-7 text-muted-foreground/40" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm sm:text-base truncate">
                {p.title || 'Sans titre'}
              </span>
              <Badge className={`shrink-0 text-[10px] px-2 py-0.5 ${status.className}`}>
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
              <span>{p.city || 'Ville non renseignée'}{p.commune ? ` · ${p.commune}` : ''}</span>
              <span className="hidden sm:inline">·</span>
              <span>{typeLabels[p.type] || p.type}</span>
              {p.bedrooms && <><span>·</span><span>{p.bedrooms} ch.</span></>}
              {p.area > 0 && <><span>·</span><span>{p.area} m²</span></>}
            </div>
            {p.price > 0 && (
              <p className="text-sm font-bold text-brand-600">
                {p.price.toLocaleString('fr-FR')} <span className="font-normal text-muted-foreground">FCFA/mois</span>
              </p>
            )}
          </div>
        </div>

        {/* CRUD Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isDraft ? (
            <>
              {p.title && p.description && p.price > 0 && p.area > 0 && p.address && p.city && (
                <Button
                  size="sm"
                  className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  onClick={() => handlePublishDraft(p.id)}
                >
                  <CheckCircle2 className="size-3.5" />
                  Publier
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                className="h-9 gap-1.5 text-xs"
                onClick={() => handleDeleteDraft(p.id)}
              >
                <Trash2 className="size-3.5" />
                Supprimer
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={() => handleResumeDraft(p.id)}
              >
                <Edit className="size-3.5" />
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`h-9 gap-1.5 text-xs ${p.status === 'ACTIVE' ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                onClick={() => handleToggleStatus(p.id, p.status)}
              >
                <Power className="size-3.5" />
                {p.status === 'ACTIVE' ? 'Suspendre' : 'Activer'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-9 gap-1.5 text-xs"
                onClick={() => handleDeleteDraft(p.id)}
              >
                <Trash2 className="size-3.5" />
                Supprimer
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes biens</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{properties.length} bien(s) enregistré(s)</p>
        </div>
        <Button
          onClick={handleOpenAddProperty}
          disabled={checkingVerification}
          className="gap-2 bg-brand-500 hover:bg-brand-600 text-white shrink-0"
        >
          <PlusCircle className="size-4" />
          <span className="hidden sm:inline">Ajouter un bien</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="border-border">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <div className={`flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
                <Icon className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-bold text-foreground">{stats[key as keyof typeof stats]}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, ville…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.keys(typeLabels).map((t) => (
              <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={clearFilters} title="Effacer les filtres">
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Empty states */}
      {properties.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-brand-50">
                <Building2 className="size-8 text-brand-500" />
              </div>
              <div>
                <p className="text-foreground font-semibold">Aucun bien enregistré</p>
                <p className="text-sm text-muted-foreground mt-1">Ajoutez votre premier bien immobilier</p>
              </div>
              <Button
                onClick={handleOpenAddProperty}
                disabled={checkingVerification}
                className="gap-2 bg-brand-500 hover:bg-brand-600 text-white"
              >
                <PlusCircle className="size-4" />
                Ajouter mon premier bien
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <Search className="size-10 text-muted-foreground/40" />
              <div>
                <p className="text-foreground font-semibold">Aucun résultat</p>
                <p className="text-sm text-muted-foreground mt-1">Essayez de modifier vos filtres</p>
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Effacer les filtres
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {paginatedProperties.map(renderPropertyRow)}
          {filtered.length > limit && (
            <PaginationControls
              page={page}
              totalPages={Math.ceil(filtered.length / limit)}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* ── Verification constraint modal ─────────────────────────────────── */}
      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="size-5 text-brand-500" />
              Vérifications requises
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2">
              Pour publier un bien, vous devez d&apos;abord compléter les vérifications suivantes&nbsp;:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {[
              {
                key: 'profile',
                label: 'Profil complet',
                done: scoring?.breakdown.profile.score === scoring?.breakdown.profile.max,
              },
              {
                key: 'neoface',
                label: 'KYC (vérification biométrique)',
                done: scoring?.breakdown.neoface.verified,
              },
              {
                key: 'dossier',
                label: 'Dossier propriétaire',
                done: scoring?.breakdown.roleSpecific.approved,
              },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className={`flex size-7 shrink-0 items-center justify-center rounded-full ${item.done ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  {item.done ? <CheckCircle2 className="size-4" /> : <Hourglass className="size-4" />}
                </div>
                <span className={`text-sm font-medium ${item.done ? 'text-green-700' : 'text-amber-700'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowVerificationModal(false)} className="sm:flex-1">
              Plus tard
            </Button>
            <Button onClick={handleGoToVerification} className="sm:flex-1 gap-2 bg-brand-500 hover:bg-brand-600 text-white">
              Aller aux vérifications
              <ArrowRight className="size-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}
        title="Supprimer le brouillon"
        description="Ce brouillon sera définitivement supprimé. Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={confirmDeleteDraft}
        variant="destructive"
      />
    </motion.div>
  )
}
