'use client'

import { useCallback, useEffect, useState } from 'react'
import { Home, Check, X, MapPin, User, Calendar, Search, Building2, Loader2, ImageOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeProperties } from '@/hooks/use-realtime-properties'
import { ViewModeToggle, type ViewMode } from './view-mode-toggle'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PendingProperty {
  id: string
  title: string
  type: string
  price: number
  commune: string
  images: Array<{ id: string; url: string; order: number }>
  owner: {
    firstName: string
    lastName: string
    phone: string
  }
  createdAt: string
  area?: number
}

interface VerificationResponse {
  properties: PendingProperty[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

const typeLabels: Record<string, string> = {
  APARTMENT: 'Appartement',
  HOUSE: 'Maison',
  STUDIO: 'Studio',
  VILLA: 'Villa',
  COMMERCIAL: 'Local commercial',
  LAND: 'Terrain',
}

function PropertyThumbnail({
  images,
  title,
  type,
  size = 'default',
}: {
  images: PendingProperty['images']
  title: string
  type: string
  size?: 'default' | 'compact'
}) {
  const [imgError, setImgError] = useState(false)
  const hasImage = images && images.length > 0 && !imgError

  return (
    <div
      className={cn(
        'relative bg-muted shrink-0 overflow-hidden',
        size === 'default'
          ? 'w-full sm:w-40 h-32 sm:h-auto sm:min-h-[160px]'
          : 'w-16 h-16 rounded-lg'
      )}
    >
      {hasImage ? (
        <img
          src={images[0].url}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {imgError ? (
            <ImageOff className="size-6 text-muted-foreground/40" />
          ) : (
            <Building2 className={cn('text-muted-foreground/40', size === 'compact' ? 'size-5' : 'size-8')} />
          )}
        </div>
      )}
      <Badge className="absolute top-2 left-2 bg-brand-500 text-white text-[10px]">
        {typeLabels[type] || type}
      </Badge>
    </div>
  )
}

export function PropertyVerifications() {
  const { user, isAuthenticated, setSelectedItemId, setDashboardSection } = useAuthStore()
  const [properties, setProperties] = useState<PendingProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCommune, setFilterCommune] = useState('')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (filterCommune) params.set('commune', filterCommune)
      const qs = params.toString()
      const url = `/api/tc/verifications${qs ? `?${qs}` : ''}`

      const d = await authFetch<VerificationResponse>(url)
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
  }, [isAuthenticated, searchQuery, filterCommune])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtimeProperties({
    userId: user?.id,
    watchAll: true,
    onPropertyChange: () => { fetchData() },
  })

  const handleVerify = (id: string) => {
    setSelectedItemId(id)
    setDashboardSection('property-verify-detail')
  }

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      await authFetch('/api/tc/verifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: id, action: 'APPROVE' }),
      })
      toast.success('Bien approuvé avec succès !')
      setProperties((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation")
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectingId) return
    setActionLoading(rejectingId)
    try {
      await authFetch('/api/tc/verifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: rejectingId, action: 'REJECT', comment: rejectComment }),
      })
      toast.success('Bien rejeté')
      setProperties((prev) => prev.filter((p) => p.id !== rejectingId))
      setRejectingId(null)
      setRejectComment('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du rejet')
    } finally {
      setActionLoading(null)
    }
  }

  const closeRejectDialog = () => {
    setRejectingId(null)
    setRejectComment('')
  }

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  /* ─── Empty state ─── */
  const emptyState = (
    <Card className="border-border">
      <CardContent className="py-12 text-center">
        <Home className="size-12 text-muted-foreground/50 mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Aucun bien en attente de vérification</p>
        <p className="text-sm text-muted-foreground mt-1">
          Les biens soumis par les propriétaires apparaîtront ici
        </p>
      </CardContent>
    </Card>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(0,0,0,0.08),transparent_50%)]" />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Vérification des biens</h1>
          <p className="text-emerald-100 mt-1.5 text-sm sm:text-base">Biens en attente de vérification par le Tiers de Confiance</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
              <Home className="size-3.5" />
              {properties.length} bien{properties.length !== 1 ? 's' : ''} à vérifier
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm">
              <MapPin className="size-3.5" />
              {new Set(properties.map(p => p.commune)).size} commune{new Set(properties.map(p => p.commune)).size !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Search, filter & view toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un bien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Commune"
            value={filterCommune}
            onChange={(e) => setFilterCommune(e.target.value)}
            className="pl-9 w-full sm:w-48"
          />
        </div>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Content */}
      {properties.length === 0 ? (
        emptyState
      ) : viewMode === 'card' ? (
        /* ─── CARD VIEW ─── */
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {properties.map((property) => (
              <motion.div
                key={property.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row">
                    {/* Thumbnail */}
                    <PropertyThumbnail images={property.images} title={property.title} type={property.type} />

                    {/* Content */}
                    <CardContent className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground line-clamp-1">{property.title}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="size-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{property.commune}</span>
                        </div>
                        <p className="text-lg font-bold text-brand-500 mt-1">
                          {(property.price ?? 0).toLocaleString('fr-FR')} FCFA
                          <span className="text-sm font-normal text-muted-foreground">/mois</span>
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="size-3" />
                            {property.owner.firstName} {property.owner.lastName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {new Date(property.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="bg-brand-500 hover:bg-brand-600 text-white gap-1 flex-1"
                          onClick={() => handleVerify(property.id)}
                          disabled={actionLoading === property.id}
                        >
                          Vérifier
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-1"
                          onClick={() => handleApprove(property.id)}
                          disabled={actionLoading === property.id}
                        >
                          {actionLoading === property.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                          onClick={() => setRejectingId(property.id)}
                          disabled={actionLoading === property.id}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* ─── LIST VIEW ─── */
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Bien</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Commune</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3">Prix</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Propriétaire</th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Date</th>
                  <th className="text-right font-medium text-muted-foreground px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {properties.map((property) => (
                    <motion.tr
                      key={property.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* Property info + thumbnail */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <PropertyThumbnail
                            images={property.images}
                            title={property.title}
                            type={property.type}
                            size="compact"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[200px]">
                              {property.title}
                            </p>
                            <Badge className="bg-brand-500 text-white text-[10px] mt-0.5">
                              {typeLabels[property.type] || property.type}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      {/* Commune */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="size-3.5" />
                          {property.commune}
                        </div>
                      </td>
                      {/* Price */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-brand-500">
                          {(property.price ?? 0).toLocaleString('fr-FR')}
                        </span>
                        <span className="text-muted-foreground text-xs"> FCFA/m</span>
                      </td>
                      {/* Owner */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="size-3" />
                          {property.owner.firstName} {property.owner.lastName}
                        </div>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(property.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="bg-brand-500 hover:bg-brand-600 text-white h-8 px-3 text-xs"
                            onClick={() => handleVerify(property.id)}
                            disabled={actionLoading === property.id}
                          >
                            Vérifier
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 p-0"
                            onClick={() => handleApprove(property.id)}
                            disabled={actionLoading === property.id}
                          >
                            {actionLoading === property.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Check className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0"
                            onClick={() => setRejectingId(property.id)}
                            disabled={actionLoading === property.id}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectingId !== null} onOpenChange={(open) => { if (!open) closeRejectDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeter le bien</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Veuillez indiquer la raison du rejet. Ce motif sera communiqué au propriétaire.
            </p>
            <Textarea
              placeholder="Raison du rejet..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeRejectDialog}>
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={!rejectComment.trim() || actionLoading !== null}
            >
              {actionLoading !== null ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
