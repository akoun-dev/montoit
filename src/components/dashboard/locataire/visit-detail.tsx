'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Eye, Calendar, Clock, MapPin, Building2, MessageSquare, XCircle, Loader2, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────
interface VisitItem {
  id: string
  status: string
  requestedDate: string
  timeSlot: string
  counterDate: string | null
  counterTimeSlot: string | null
  ownerComment: string | null
  createdAt: string
  property: {
    id: string
    title: string
    address?: string
    city: string
    images: Array<{ url: string }>
    owner?: { firstName: string; lastName: string }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock; description: string }> = {
  PENDING: { label: 'En attente', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, description: 'Votre demande de visite est en cours de traitement par le propriétaire.' },
  ACCEPTED: { label: 'Accepté', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Eye, description: 'Le propriétaire a accepté votre demande de visite.' },
  REJECTED: { label: 'Rejeté', color: 'bg-red-50 text-red-700 border-red-200', icon: Eye, description: 'Le propriétaire a décliné votre demande de visite.' },
  COUNTER_PROPOSED: { label: 'Contre-proposition', color: 'bg-brand-50 text-brand-700 border-brand-200', icon: Calendar, description: 'Le propriétaire propose une autre date pour la visite.' },
  COMPLETED: { label: 'Complété', color: 'bg-muted text-foreground border-border', icon: Eye, description: 'La visite a été effectuée.' },
  CANCELLED: { label: 'Annulé', color: 'bg-muted text-muted-foreground border-border', icon: XCircle, description: 'La visite a été annulée.' },
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ──────────────────────────────────────────────────────────────
interface VisitDetailProps {
  visitId: string
  onBack: () => void
}

export function VisitDetail({ visitId, onBack }: VisitDetailProps) {
  const { isAuthenticated, setDashboardSection } = useAuthStore()
  const [visit, setVisit] = useState<VisitItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [applying, setApplying] = useState(false)

  const fetchVisit = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<{ data: VisitItem }>(`/api/visits/${visitId}`)
      if (result.data) {
        setVisit(result.data)
      } else {
        setError('Visite introuvable')
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      if (err instanceof AuthError && err.status === 404) {
        setError('Visite introuvable')
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, visitId])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchVisit() }, [fetchVisit])

  const handleApply = async () => {
    if (!visit) return
    setApplying(true)
    try {
      await authFetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: visit.property.id }),
      })
      toast.success('Candidature envoyée avec succès !')
      setDashboardSection('applications')
    } catch (err) {
      if (err instanceof AuthError && err.status === 409) {
        toast.error('Vous avez déjà candidaté pour ce bien')
      } else if (err instanceof AuthError) {
        toast.error(err.message || "Erreur lors de l'envoi de la candidature")
      } else {
        toast.error("Erreur lors de l'envoi de la candidature")
      }
    } finally {
      setApplying(false)
    }
  }

  const handleCancel = async () => {
    if (!visit) return
    setCancelling(true)
    try {
      await authFetch(`/api/visits/${visit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      toast.success('Visite annulée avec succès')
      setShowCancelDialog(false)
      // Refresh data
      setVisit((prev) => prev ? { ...prev, status: 'CANCELLED' } : null)
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error(err.message || "Erreur lors de l'annulation")
      } else {
        toast.error("Erreur lors de l'annulation de la visite")
      }
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (error || !visit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">{error || 'Visite introuvable'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const config = statusConfig[visit.status] || statusConfig.PENDING
  const StatusIcon = config.icon
  const property = visit.property
  const canCancel = visit.status === 'PENDING' || visit.status === 'ACCEPTED'

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground -ml-2">
        <ArrowLeft className="size-4" /> Retour aux visites
      </Button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Détail de la visite</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Demandée le {formatShortDate(visit.createdAt)}
          </p>
        </div>
        <Badge variant="outline" className={`shrink-0 text-xs px-3 py-1 border ${config.color} w-fit`}>
          <StatusIcon className="size-3 mr-1" />
          {config.label}
        </Badge>
      </div>

      {/* Status description */}
      <Card className="border-border">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="size-4" /> Date et heure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <Calendar className="size-5 text-brand-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Date demandée</p>
              <p className="text-sm font-semibold text-foreground capitalize">{formatDate(visit.requestedDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <Clock className="size-5 text-brand-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Créneau horaire</p>
              <p className="text-sm font-semibold text-foreground">{visit.timeSlot}</p>
            </div>
          </div>

          {/* Counter-proposition */}
          {visit.status === 'COUNTER_PROPOSED' && visit.counterDate && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-50 border border-brand-100">
              <Calendar className="size-5 text-brand-500 shrink-0" />
              <div>
                <p className="text-xs text-brand-500 font-medium">Contre-proposition du propriétaire</p>
                <p className="text-sm font-semibold text-brand-700 capitalize">{formatDate(visit.counterDate)}</p>
                {visit.counterTimeSlot && (
                  <p className="text-sm text-brand-600">{visit.counterTimeSlot}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Property info */}
      {property && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="size-4" /> Bien à visiter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              {property.images?.[0]?.url ? (
                <div className="size-16 sm:size-20 rounded-lg bg-muted overflow-hidden shrink-0">
                  <img src={property.images[0].url} alt={property.title} className="size-full object-cover" />
                </div>
              ) : (
                <div className="size-16 sm:size-20 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                  <Building2 className="size-8 text-brand-400" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{property.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3" /> {property.city}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Owner comment */}
      {visit.ownerComment && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="size-4" /> Commentaire du propriétaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded-lg bg-muted italic text-sm text-foreground">
              &ldquo;{visit.ownerComment}&rdquo;
            </div>
          </CardContent>
        </Card>
      )}

      {/* Postuler — visible quand la visite est confirmée ou effectuée */}
      {(visit.status === 'ACCEPTED' || visit.status === 'COMPLETED') && (
        <div className="pt-2">
          <Button
            className="w-full gap-2"
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <FileText className="size-4" />
                Postuler pour ce bien
              </>
            )}
          </Button>
        </div>
      )}

      {/* Cancel Visit Button */}
      {canCancel && (
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 gap-2"
            onClick={() => setShowCancelDialog(true)}
          >
            <XCircle className="size-4" />
            Annuler la visite
          </Button>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-5 text-red-500" />
              Annuler la visite
            </DialogTitle>
            <DialogDescription className="pt-2">
              Êtes-vous sûr de vouloir annuler cette visite pour
              <span className="font-semibold text-foreground"> {property?.title}</span> ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 my-2">
            <p className="text-xs text-red-700">
              Le propriétaire sera informé de votre annulation.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelling}
            >
              Non, garder la visite
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling}
              className="gap-2"
            >
              {cancelling ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Annulation...
                </>
              ) : (
                <>
                  <XCircle className="size-4" />
                  Confirmer l&apos;annulation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
