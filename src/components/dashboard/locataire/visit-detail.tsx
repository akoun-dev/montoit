'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, ArrowLeft, Eye, Calendar, Clock, MapPin, Building2, MessageSquare, XCircle, Loader2, FileText } from 'lucide-react'
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
  tenantRating: number | null
  tenantReview: string | null
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

// ─── Interactive Stars ──────────────────────────────────────────────────────
function InteractiveStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`size-8 transition-colors ${
              i <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'text-neutral-200 hover:text-amber-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function StarsDisplay({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`size-4 ${i <= score ? 'fill-amber-400 text-amber-400' : 'text-neutral-200'}`}
        />
      ))}
    </div>
  )
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
  const { user, isAuthenticated, setDashboardSection } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')

  const queryKey = ['visit', visitId]

  const { data: visit, isLoading, error } = useQuery<VisitItem>({
    queryKey,
    queryFn: async () => {
      const result = await authFetch<{ data: VisitItem }>(`/api/visits/${visitId}`)
      if (!result.data) throw new Error('Visite introuvable')
      return result.data
    },
    enabled: isAuthenticated && !!visitId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await authFetch(`/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      toast.success('Visite annulée avec succès')
      setShowCancelDialog(false)
    },
    onError: (err) => {
      toast.error(err instanceof AuthError ? err.message : "Erreur lors de l'annulation")
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ rating, comment }: { rating: number; comment?: string }) => {
      const result = await authFetch<{ data: VisitItem }>(`/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantRating: rating, tenantReview: comment }),
      })
      if (!result.data) throw new Error("Erreur lors de l'envoi de l'avis")
      return result.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data)
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      setShowReviewDialog(false)
      toast.success('Avis enregistré avec succès !')
    },
    onError: (err) => {
      toast.error(err instanceof AuthError ? err.message : "Erreur lors de l'envoi de l'avis")
    },
  })

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!visit) throw new Error('Visite introuvable')
      const res = await authFetch<{ error?: string; data?: { rentalFileId?: string } }>('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: visit.property.id }),
      })
      if (res.error) throw new Error(res.error)
      // Vérifier si le dossier locataire a des documents
      try {
        const rentalRes = await authFetch<{ data?: { documents?: Array<unknown> } }>('/api/rental-file')
        const docs = rentalRes?.data?.documents ?? []
        if (docs.length === 0) {
          return { dossierIncomplete: true }
        }
      } catch { /* ignore */ }
      return { dossierIncomplete: false }
    },
    onSuccess: (result) => {
      toast.success('Candidature envoyée avec succès !')
      if (result?.dossierIncomplete) {
        toast.warning('Votre dossier locataire est incomplet. Complétez-le pour que votre candidature soit prise en compte.', {
          duration: 8000,
          action: {
            label: 'Compléter',
            onClick: () => setDashboardSection('rental-file'),
          },
        })
      }
      setDashboardSection('applications')
    },
    onError: (err) => {
      if (err instanceof AuthError && err.status === 409) {
        toast.error('Vous avez déjà candidaté pour ce bien')
      } else {
        toast.error(err instanceof AuthError ? err.message : "Erreur lors de l'envoi de la candidature")
      }
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">{error instanceof Error ? error.message : 'Visite introuvable'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!visit) return null

  const config = statusConfig[visit.status] || statusConfig.PENDING
  const StatusIcon = config.icon
  const property = visit.property
  const canCancel = visit.status === 'PENDING' || visit.status === 'ACCEPTED'

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-brand-500/10 to-transparent -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 rounded-none">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground -ml-2 mb-3">
          <ArrowLeft className="size-4" /> Retour aux visites
        </Button>
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100">
            <Eye className="size-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Détail de la visite</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Demandée le {formatShortDate(visit.createdAt)}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <Badge variant="outline" className={`text-xs px-3 py-1 border ${config.color} w-fit`}>
            <StatusIcon className="size-3 mr-1" />
            {config.label}
          </Badge>
        </div>
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

      {/* Avis du locataire — visible quand la visite est effectuée */}
      {visit.status === 'COMPLETED' && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="size-4" /> Mon avis sur le bien
            </CardTitle>
          </CardHeader>
          <CardContent>
            {visit.tenantRating ? (
              <div className="space-y-2">
                <StarsDisplay score={visit.tenantRating} />
                {visit.tenantReview && (
                  <p className="text-sm text-foreground italic">&ldquo;{visit.tenantReview}&rdquo;</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-7 text-xs text-muted-foreground"
                  onClick={() => { setReviewRating(visit.tenantRating!); setReviewComment(visit.tenantReview || ''); setShowReviewDialog(true) }}
                >
                  Modifier mon avis
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={async () => {
                    try {
                      await authFetch(`/api/visits/${visit.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tenantRating: null, tenantReview: null }),
                      })
                      queryClient.invalidateQueries({ queryKey })
                      toast.success('Avis supprimé')
                    } catch {
                      toast.error("Erreur lors de la suppression de l'avis")
                    }
                  }}
                >
                  Supprimer
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => { setReviewRating(0); setReviewComment(''); setShowReviewDialog(true) }}
              >
                <Star className="size-4" />
                Donner mon avis
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Postuler — visible quand la visite est confirmée ou effectuée */}
      {(visit.status === 'ACCEPTED' || visit.status === 'COMPLETED') && (
        <div className="pt-2">
          <Button
            className="w-full gap-2"
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending}
          >
            {applyMutation.isPending ? (
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
              disabled={cancelMutation.isPending}
            >
              Non, garder la visite
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="gap-2"
            >
              {cancelMutation.isPending ? (
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

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="size-5 text-amber-500" />
              Donner mon avis
            </DialogTitle>
            <DialogDescription className="pt-2">
              Notez votre visite pour <span className="font-semibold text-foreground">{property?.title}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">Votre note</p>
              <InteractiveStars value={reviewRating} onChange={setReviewRating} />
              <p className="text-xs text-muted-foreground">
                {['', 'Très insatisfait', 'Insatisfait', 'Moyen', 'Satisfait', 'Très satisfait'][reviewRating]}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Commentaire (optionnel)</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Partagez votre expérience de la visite..."
                rows={3}
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 transition-colors resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              disabled={reviewMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (reviewRating === 0) { toast.error('Veuillez donner une note'); return }
                reviewMutation.mutate({ rating: reviewRating, comment: reviewComment || undefined })
              }}
              disabled={reviewMutation.isPending || reviewRating === 0}
              className="gap-2"
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Star className="size-4" />
                  Envoyer mon avis
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
