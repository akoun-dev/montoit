'use client'

import { useCallback, useEffect, useState } from 'react'
import { Home, Check, X, MapPin, User, Calendar, ArrowLeft, Search, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PendingProperty {
  id: string
  title: string
  type: string
  price: number
  commune: string
  images: string[]
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
  total: number
  page: number
  pageSize: number
}

const typeLabels: Record<string, string> = {
  APARTMENT: 'Appartement',
  HOUSE: 'Maison',
  STUDIO: 'Studio',
  VILLA: 'Villa',
  COMMERCIAL: 'Local commercial',
  LAND: 'Terrain',
}

export function PropertyVerifications() {
  const { isAuthenticated, setSelectedItemId, setDashboardSection } = useAuthStore()
  const [properties, setProperties] = useState<PendingProperty[]>([])
  const [loading, setLoading] = useState(true)
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
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'approbation')
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vérification des biens</h1>
        <p className="text-muted-foreground mt-1">Biens en attente de vérification par le Tiers de Confiance</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un bien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Commune"
            value={filterCommune}
            onChange={(e) => setFilterCommune(e.target.value)}
            className="pl-9 w-full sm:w-48"
          />
        </div>
      </div>

      {/* Property count */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-brand-50 text-brand-700">
          {properties.length} bien{properties.length !== 1 ? 's' : ''} en attente
        </Badge>
      </div>

      {/* Empty state */}
      {properties.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Home className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Aucun bien en attente de vérification</p>
            <p className="text-sm text-muted-foreground mt-1">Les biens soumis par les propriétaires apparaîtront ici</p>
          </CardContent>
        </Card>
      ) : (
        /* Property cards */
        <div className="grid gap-4 md:grid-cols-2">
          {properties.map((property) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-border overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div className="relative w-full sm:w-40 h-32 sm:h-auto bg-muted shrink-0">
                    {property.images && property.images.length > 0 ? (
                      <img
                        src={property.images[0]}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="size-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-brand-500 text-white text-[10px]">
                      {typeLabels[property.type] || property.type}
                    </Badge>
                  </div>

                  {/* Content */}
                  <CardContent className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-1">{property.title}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{property.commune}</span>
                      </div>
                      <p className="text-lg font-bold text-brand-500 mt-1">
                        {property.price.toLocaleString('fr-FR')} FCFA
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
                        <Check className="size-4" />
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
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectingId !== null} onOpenChange={(open) => { if (!open) { setRejectingId(null); setRejectComment('') } }}>
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
            <Button variant="outline" onClick={() => { setRejectingId(null); setRejectComment('') }}>
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={!rejectComment.trim() || actionLoading !== null}
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
