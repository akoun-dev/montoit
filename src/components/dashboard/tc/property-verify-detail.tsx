'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, MapPin, User, Phone, Mail, Calendar,
  Check, X, FileText, Building2, Ruler, Bed, Bath,
  Car, Zap, Droplets, Wifi, Shield, ChevronLeft, ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PropertyDetail {
  id: string
  title: string
  type: string
  description: string
  price: number
  area: number
  commune: string
  address: string
  images: Array<{ id: string; url: string; order: number }>
  bedrooms?: number
  bathrooms?: number
  hasParking?: boolean
  hasGarden?: boolean
  hasPool?: boolean
  hasGuardian?: boolean
  hasClimate?: boolean
  isFurnished?: boolean
  amenities: string
  owner: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email: string
  }
  createdAt: string
}

const typeLabels: Record<string, string> = {
  APARTMENT: 'Appartement',
  HOUSE: 'Maison',
  STUDIO: 'Studio',
  VILLA: 'Villa',
  COMMERCIAL: 'Local commercial',
  LAND: 'Terrain',
}

const featureIcons: Record<string, React.ElementType> = {
  parking: Car,
  electricity: Zap,
  water: Droplets,
  wifi: Wifi,
  security: Shield,
}

export function PropertyVerifyDetail() {
  const { isAuthenticated, selectedItemId, setDashboardSection, setSelectedItemId } = useAuthStore()
  const [property, setProperty] = useState<PropertyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectComment, setRejectComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const goBack = () => {
    setSelectedItemId('')
    setDashboardSection('property-verifications')
  }

  const goToInventoryForm = () => {
    setDashboardSection('inventory-report-form')
  }

  const fetchProperty = useCallback(async () => {
    if (!isAuthenticated || !selectedItemId) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ property: PropertyDetail }>(`/api/tc/verifications?propertyId=${selectedItemId}`)
      setProperty(d.property || null)
    } catch (err) {
      if (err instanceof AuthError && (err.status === 401 || err.status === 403)) {
        setProperty(null)
        return
      }
      // Try fallback via properties API (property may no longer be PENDING_VERIFICATION)
      try {
        const d2 = await authFetch<{ property: PropertyDetail }>(`/api/properties/${selectedItemId}`)
        setProperty(d2.property || null)
      } catch {
        setProperty(null)
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, selectedItemId])

  useEffect(() => {
    fetchProperty()
  }, [fetchProperty])

  const handleApprove = async () => {
    if (!selectedItemId) return
    setActionLoading(true)
    try {
      await authFetch('/api/tc/verifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: selectedItemId, action: 'APPROVE' }),
      })
      toast.success('Bien approuvé avec succès !')
      goBack()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'approbation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedItemId) return
    setActionLoading(true)
    try {
      await authFetch('/api/tc/verifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: selectedItemId, action: 'REJECT', comment: rejectComment }),
      })
      toast.success('Bien rejeté')
      goBack()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du rejet')
    } finally {
      setActionLoading(false)
    }
  }

  const nextImage = () => {
    if (!property?.images) return
    setCurrentImage((prev) => (prev + 1) % property.images.length)
  }

  const prevImage = () => {
    if (!property?.images) return
    setCurrentImage((prev) => (prev - 1 + property.images.length) % property.images.length)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={goBack} className="gap-2">
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Building2 className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Bien introuvable</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={goBack} className="gap-2 -ml-2">
        <ArrowLeft className="size-4" /> Retour
      </Button>

      {/* Image Gallery */}
      <Card className="border-border overflow-hidden">
        <div className="relative h-64 sm:h-80 bg-muted">
          {property.images && property.images.length > 0 ? (
            <>
              <img
                src={property.images[currentImage]?.url || property.images[0]?.url}
                alt={`${property.title} - ${currentImage + 1}`}
                className="w-full h-full object-cover"
              />
              {property.images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-8 rounded-full"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-8 rounded-full"
                    onClick={nextImage}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {property.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        className={cn(
                          'w-2 h-2 rounded-full transition-colors',
                          idx === currentImage ? 'bg-white' : 'bg-white/50'
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="size-16 text-muted-foreground/30" />
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-brand-500 text-white">
            {typeLabels[property.type] || property.type}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property details */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-foreground">{property.title}</CardTitle>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{property.commune} — {property.address}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-brand-500">
                  {property.price.toLocaleString('fr-FR')} <span className="text-sm font-normal text-muted-foreground">FCFA/mois</span>
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quick stats */}
              <div className="flex flex-wrap gap-4">
                {property.area && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Ruler className="size-4 text-brand-500" />
                    {property.area} m²
                  </div>
                )}
                {property.bedrooms != null && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Bed className="size-4 text-brand-500" />
                    {property.bedrooms} chambre{property.bedrooms > 1 ? 's' : ''}
                  </div>
                )}
                {property.bathrooms != null && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Bath className="size-4 text-brand-500" />
                    {property.bathrooms} SDB
                  </div>
                )}
                {property.hasParking && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Car className="size-4 text-brand-500" />
                    Parking
                  </div>
                )}
                {property.hasClimate && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Zap className="size-4 text-brand-500" />
                    Climatisé
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="size-4 text-brand-500" />
                  Soumis le {new Date(property.createdAt).toLocaleDateString('fr-FR')}
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {property.description || 'Aucune description fournie'}
                </p>
              </div>

              {/* Amenities */}
              {(() => {
                let amenities: string[] = []
                try { amenities = JSON.parse((property as Record<string, unknown>).amenities as string || '[]') } catch { amenities = [] }
                if (amenities.length === 0) return null
                return (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">Équipements</h4>
                    <div className="flex flex-wrap gap-2">
                      {amenities.map((feature, i) => {
                        const Icon = featureIcons[feature.toLowerCase()]
                        return (
                          <Badge key={i} variant="secondary" className="gap-1.5">
                            {Icon && <Icon className="size-3" />}
                            {feature}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Owner Info Sidebar */}
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Propriétaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-brand-50 flex items-center justify-center">
                  <User className="size-5 text-brand-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{property.owner.firstName} {property.owner.lastName}</p>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-4" />
                  {property.owner.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4" />
                  {property.owner.email}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                <Check className="size-4" /> Approuver le bien
              </Button>
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50 gap-2"
                onClick={() => setShowRejectDialog(true)}
                disabled={actionLoading}
              >
                <X className="size-4" /> Rejeter
              </Button>
              <div className="pt-2 border-t border-border">
                <Button
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white gap-2"
                  onClick={goToInventoryForm}
                >
                  <FileText className="size-4" /> Créer un État des Lieux
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
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
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectComment('') }}>
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={!rejectComment.trim() || actionLoading}
            >
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
