'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Building2,
  Check,
  X,
  Eye,
  MapPin,
  User,
  Calendar,
  Tag,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  Home,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeProperties } from '@/hooks/use-realtime-properties'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface PropertyOwner {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  avatarUrl: string | null
  role: string
}

interface PropertyItem {
  id: string
  title: string
  description: string
  type: string
  status: string
  price: number
  currency: string
  area: number
  bedrooms: number | null
  bathrooms: number | null
  address: string
  city: string
  commune: string | null
  isFurnished: boolean
  isVerified: boolean
  createdAt: string
  image: string | null
  owner: PropertyOwner
}

// ─── Labels ─────────────────────────────────────────────────────────────────

const propertyTypeLabels: Record<string, string> = {
  APPARTEMENT: 'Appartement',
  MAISON: 'Maison',
  STUDIO: 'Studio',
  DUPLEX: 'Duplex',
  PENTHOUSE: 'Penthouse',
  VILLA: 'Villa',
  CHAMBRE: 'Chambre',
  CONCESSION: 'Concession',
  IMMEUBLE: 'Immeuble',
}

const propertyTypeColors: Record<string, string> = {
  APPARTEMENT: 'bg-teal-100 text-teal-700',
  MAISON: 'bg-amber-100 text-amber-700',
  STUDIO: 'bg-violet-100 text-violet-700',
  DUPLEX: 'bg-sky-100 text-sky-700',
  PENTHOUSE: 'bg-orange-100 text-orange-700',
  VILLA: 'bg-rose-100 text-rose-700',
  CHAMBRE: 'bg-pink-100 text-pink-700',
  CONCESSION: 'bg-lime-100 text-lime-700',
  IMMEUBLE: 'bg-slate-100 text-slate-700',
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_VERIFICATION: 'En attente',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspendu',
  CLOSED: 'Fermé',
  RENTED: 'Loué',
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_VERIFICATION: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-gray-100 text-gray-500',
  RENTED: 'bg-teal-100 text-teal-700',
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PropertiesModeration() {
  const { user, isAuthenticated } = useAuthStore()

  // Data
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [total, setTotal] = useState(0)

  // UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [processing, setProcessing] = useState<string | null>(null)

  // Dialogs
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; property: PropertyItem | null }>({ open: false, property: null })
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; property: PropertyItem | null }>({ open: false, property: null })
  const [rejectionReason, setRejectionReason] = useState('')

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }

    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (search.trim()) params.set('search', search.trim())
      if (typeFilter !== 'all') params.set('type', typeFilter)

      const data = await authFetch<{ properties: PropertyItem[]; pagination: { total: number } }>(
        `/api/admin/properties-moderation?${params.toString()}`
      )
      setProperties(data.properties || [])
      setTotal(data.pagination?.total || 0)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setProperties([])
        return
      }
      setError('Erreur lors du chargement des biens')
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, search, typeFilter])

  useRealtimeProperties({
    userId: user?.id,
    watchAll: true,
    onPropertyChange: () => { fetchData() },
  })

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Actions ────────────────────────────────────────────────────────────

  const handleApprove = async (propertyId: string) => {
    setProcessing(propertyId)
    try {
      await authFetch('/api/admin/properties-moderation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, action: 'APPROVE' }),
      })
      toast.success('Annonce approuvée')
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) toast.error(err.message)
      else toast.error('Erreur lors de l\'approbation')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async () => {
    if (!rejectDialog.property) return
    setProcessing(rejectDialog.property.id)
    try {
      await authFetch('/api/admin/properties-moderation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: rejectDialog.property.id,
          action: 'REJECT',
          comment: rejectionReason.trim() || 'Non spécifié',
        }),
      })
      toast.success('Annonce rejetée')
      setRejectDialog({ open: false, property: null })
      setRejectionReason('')
      fetchData()
    } catch (err) {
      if (err instanceof AuthError) toast.error(err.message)
      else toast.error('Erreur lors du rejet')
    } finally {
      setProcessing(null)
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-96 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ─── Error ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Modération des biens</h1>
          <p className="text-muted-foreground mt-1">Approuvez ou rejetez les annonces immobilières</p>
        </div>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="size-10 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium">{error}</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={() => { setLoading(true); fetchData() }}>
              <RefreshCw className="size-4" /> Réessayer
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Modération des biens</h1>
          <p className="text-muted-foreground mt-1">{total} annonce{total !== 1 ? 's' : ''} en attente de validation</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => { setLoading(true); fetchData() }}>
          <RefreshCw className="size-4" /> Actualiser
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, adresse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44 h-9">
            <Filter className="size-3.5 mr-1" />
            <SelectValue placeholder="Type de bien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="APPARTEMENT">Appartement</SelectItem>
            <SelectItem value="MAISON">Maison</SelectItem>
            <SelectItem value="STUDIO">Studio</SelectItem>
            <SelectItem value="CHAMBRE">Chambre</SelectItem>
            <SelectItem value="DUPLEX">Duplex</SelectItem>
            <SelectItem value="PENTHOUSE">Penthouse</SelectItem>
            <SelectItem value="VILLA">Villa</SelectItem>
            <SelectItem value="CONCESSION">Concession</SelectItem>
            <SelectItem value="IMMEUBLE">Immeuble</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {properties.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Building2 className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucune annonce en attente de modération</p>
            <p className="text-sm text-muted-foreground mt-1">Les nouvelles annonces apparaîtront ici pour validation</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {properties.map((property) => (
              <motion.div
                key={property.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border hover:shadow-md transition-shadow overflow-hidden">
                  {/* Image */}
                  {property.image ? (
                    <div className="h-40 bg-muted relative overflow-hidden">
                      <img
                        src={property.image}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className={statusColors[property.status] || 'bg-gray-100 text-gray-700'}>
                          {statusLabels[property.status] || property.status}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 bg-muted flex items-center justify-center relative">
                      <Home className="size-12 text-muted-foreground/30" />
                      <div className="absolute top-2 right-2">
                        <Badge className={statusColors[property.status] || 'bg-gray-100 text-gray-700'}>
                          {statusLabels[property.status] || property.status}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <CardContent className="p-4">
                    {/* Title & Type */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 min-w-0">
                        {property.title || 'Sans titre'}
                      </h3>
                      <Badge className={`${propertyTypeColors[property.type] || 'bg-gray-100 text-gray-700'} shrink-0 text-xs`}>
                        {propertyTypeLabels[property.type] || property.type}
                      </Badge>
                    </div>

                    {/* Price */}
                    <p className="text-lg font-bold text-foreground mb-2">
                      {property.price.toLocaleString('fr-FR')} <span className="text-sm font-normal text-muted-foreground">{property.currency}</span>
                    </p>

                    {/* Address */}
                    <div className="flex items-start gap-1.5 text-sm text-muted-foreground mb-2">
                      <MapPin className="size-3.5 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{property.address}{property.commune ? `, ${property.commune}` : ''}{property.city ? `, ${property.city}` : ''}</span>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                      {property.area > 0 && (
                        <span>{property.area} m²</span>
                      )}
                      {property.bedrooms != null && (
                        <span>{property.bedrooms} ch.</span>
                      )}
                      {property.bathrooms != null && (
                        <span>{property.bathrooms} SdB</span>
                      )}
                      {property.isFurnished && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Meublé</Badge>
                      )}
                    </div>

                    {/* Owner info */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <User className="size-3.5" />
                      <span>{property.owner.firstName} {property.owner.lastName}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <Calendar className="size-3" />
                      <span>{new Date(property.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1 flex-1"
                        disabled={processing === property.id}
                        onClick={() => handleApprove(property.id)}
                      >
                        {processing === property.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 gap-1 flex-1"
                        disabled={processing === property.id}
                        onClick={() => {
                          setRejectDialog({ open: true, property })
                          setRejectionReason('')
                        }}
                      >
                        <X className="size-4" /> Rejeter
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="size-8 p-0 shrink-0"
                        onClick={() => setDetailDialog({ open: true, property })}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ─── Detail Dialog ────────────────────────────────────────────── */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => setDetailDialog({ ...detailDialog, open })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails de l&apos;annonce</DialogTitle>
          </DialogHeader>
          {detailDialog.property && (
            <div className="space-y-4">
              {/* Image */}
              {detailDialog.property.image && (
                <div className="h-48 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={detailDialog.property.image}
                    alt={detailDialog.property.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title & Status */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground">{detailDialog.property.title || 'Sans titre'}</h3>
                <Badge className={statusColors[detailDialog.property.status] || 'bg-gray-100 text-gray-700'}>
                  {statusLabels[detailDialog.property.status] || detailDialog.property.status}
                </Badge>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-medium">{propertyTypeLabels[detailDialog.property.type] || detailDialog.property.type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prix:</span>
                  <p className="font-medium">{detailDialog.property.price.toLocaleString('fr-FR')} {detailDialog.property.currency}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Surface:</span>
                  <p className="font-medium">{detailDialog.property.area} m²</p>
                </div>
                {detailDialog.property.bedrooms != null && (
                  <div>
                    <span className="text-muted-foreground">Chambres:</span>
                    <p className="font-medium">{detailDialog.property.bedrooms}</p>
                  </div>
                )}
                {detailDialog.property.bathrooms != null && (
                  <div>
                    <span className="text-muted-foreground">Salles de bain:</span>
                    <p className="font-medium">{detailDialog.property.bathrooms}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Meublé:</span>
                  <p className="font-medium">{detailDialog.property.isFurnished ? 'Oui' : 'Non'}</p>
                </div>
              </div>

              {/* Address */}
              <div>
                <span className="text-sm text-muted-foreground">Adresse:</span>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {detailDialog.property.address}{detailDialog.property.commune ? `, ${detailDialog.property.commune}` : ''}{detailDialog.property.city ? `, ${detailDialog.property.city}` : ''}
                </p>
              </div>

              {/* Description */}
              {detailDialog.property.description && (
                <div>
                  <span className="text-sm text-muted-foreground">Description:</span>
                  <p className="text-sm text-foreground mt-1 p-3 rounded-lg border border-border max-h-32 overflow-y-auto">
                    {detailDialog.property.description}
                  </p>
                </div>
              )}

              {/* Owner */}
              <div>
                <span className="text-sm text-muted-foreground">Propriétaire:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="size-8 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                    <User className="size-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{detailDialog.property.owner.firstName} {detailDialog.property.owner.lastName}</p>
                    <p className="text-xs text-muted-foreground">{detailDialog.property.owner.email}</p>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="text-xs text-muted-foreground">
                Soumis le {new Date(detailDialog.property.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Reject Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={rejectDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setRejectDialog({ open: false, property: null })
            setRejectionReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeter l&apos;annonce</DialogTitle>
            <DialogDescription>
              {rejectDialog.property && (
                <>
                  Vous allez rejeter l&apos;annonce &laquo; {rejectDialog.property.title || 'Sans titre'} &raquo;.
                  Veuillez indiquer le motif du rejet.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motif du rejet..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, property: null })
                setRejectionReason('')
              }}
            >
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!rejectionReason.trim() || processing !== null}
              onClick={handleReject}
            >
              {processing ? (
                <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> En cours...</span>
              ) : 'Confirmer le rejet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
