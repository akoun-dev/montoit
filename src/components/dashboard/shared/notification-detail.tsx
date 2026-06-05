'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, Bell, ExternalLink, Calendar, Clock,
  Loader2, FileText,
} from 'lucide-react'
import { useBackHandler } from '@/hooks/use-back-handler'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

interface NotificationDetail {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  actionUrl: string | null
  entityId: string | null
  createdAt: string
  userId: string
}

const typeLabels: Record<string, string> = {
  MESSAGE: 'Message',
  DOSSIER_UPDATE: 'Mise à jour dossier',
  VISIT_REMINDER: 'Rappel de visite',
  PAYMENT_ALERT: 'Alerte paiement',
  MAINTENANCE: 'Maintenance',
  LEASE_UPDATE: 'Mise à jour bail',
  PROMOTION: 'Promotion',
  SECURITY: 'Sécurité',
  SYSTEM: 'Système',
  DISPUTE_UPDATE: 'Litige',
  DISPUTE_ASSIGNED: 'Litige assigné',
  APPLICATION: 'Candidature',
  REVIEW: 'Avis',
  MISSION_ASSIGNED: 'Mission assignée',
  MISSION_COMPLETED: 'Mission terminée',
  FRAUD_ALERT: 'Alerte fraude',
  CERTIFICATION: 'Certification',
  PROPERTY_VERIFICATION: 'Vérification bien',
  VERIFICATION_RESULT: 'Résultat vérification',
}

const typeColors: Record<string, string> = {
  MESSAGE: 'bg-amber-50 text-amber-700 border-amber-200',
  DOSSIER_UPDATE: 'bg-brand-50 text-brand-600 border-brand-200',
  VISIT_REMINDER: 'bg-amber-50 text-amber-700 border-amber-200',
  PAYMENT_ALERT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MAINTENANCE: 'bg-orange-50 text-orange-700 border-orange-200',
  LEASE_UPDATE: 'bg-teal-50 text-teal-700 border-teal-200',
  PROMOTION: 'bg-purple-50 text-purple-700 border-purple-200',
  SECURITY: 'bg-red-50 text-red-700 border-red-200',
  SYSTEM: 'bg-muted text-muted-foreground border-border',
  DISPUTE_UPDATE: 'bg-rose-50 text-rose-700 border-rose-200',
  DISPUTE_ASSIGNED: 'bg-rose-50 text-rose-700 border-rose-200',
  APPLICATION: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  REVIEW: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  MISSION_ASSIGNED: 'bg-violet-50 text-violet-700 border-violet-200',
  MISSION_COMPLETED: 'bg-violet-50 text-violet-700 border-violet-200',
  FRAUD_ALERT: 'bg-red-50 text-red-700 border-red-200',
  CERTIFICATION: 'bg-sky-50 text-sky-700 border-sky-200',
  PROPERTY_VERIFICATION: 'bg-teal-50 text-teal-700 border-teal-200',
  VERIFICATION_RESULT: 'bg-teal-50 text-teal-700 border-teal-200',
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  if (diffD < 7) return `Il y a ${diffD}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function NotificationDetail() {
  const { selectedItemId, setDashboardSection, setSelectedItemId } = useAuthStore()
  const [notif, setNotif] = useState<NotificationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const goBack = () => {
    setSelectedItemId('')
    setDashboardSection('notifications')
  }

  useBackHandler('notification-detail', goBack)

  const fetchNotification = useCallback(async () => {
    if (!selectedItemId) {
      setLoading(false)
      setNotFound(true)
      return
    }
    setLoading(true)
    setNotFound(false)
    setNotif(null)
    try {
      const d = await authFetch<{ data: NotificationDetail }>(
        `/api/notifications?id=${selectedItemId}`
      )
      if (d.data) {
        setNotif(d.data)
      } else {
        setNotFound(true)
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 404) {
        setNotFound(true)
        return
      }
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [selectedItemId])

  useEffect(() => { fetchNotification() }, [fetchNotification])

  const handleAction = () => {
    if (!notif?.actionUrl) return
    setSelectedItemId(notif.entityId || '')
    setDashboardSection(notif.actionUrl)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  if (notFound || !notif) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={goBack} className="gap-2">
          <ArrowLeft className="size-4" /> Retour
        </Button>
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Bell className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Notification introuvable</p>
            <p className="text-sm text-muted-foreground mt-1">
              Cette notification n&apos;existe pas ou a été supprimée.
            </p>
            <Button variant="outline" className="mt-4 gap-2" onClick={goBack}>
              <ArrowLeft className="size-4" /> Retour aux notifications
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500/10 to-transparent rounded-xl p-4 sm:p-6 -mx-4 sm:-mx-6">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" onClick={goBack} className="gap-2 -ml-2">
            <ArrowLeft className="size-4" /> Retour
          </Button>
          <Badge className={typeColors[notif.type] || 'bg-muted text-muted-foreground'}>
            {typeLabels[notif.type] || notif.type}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand-100 shrink-0">
            <Bell className="size-5 text-brand-500" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground">{notif.title}</h2>
            <p className="text-sm text-muted-foreground">
              {formatTimeAgo(notif.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Content card */}
      <Card className="border-border">
        <CardContent className="p-6 space-y-6">
          {/* Full message */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {notif.message}
            </p>
          </div>

          {/* Metadata */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="size-4 shrink-0" />
              <span>Reçue le {formatDateTime(notif.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" />
              <span>{formatTimeAgo(notif.createdAt)}</span>
            </div>
          </div>

          {/* Action button */}
          {notif.actionUrl && (
            <div className="border-t border-border pt-4">
              <Button
                className="w-full gap-2"
                onClick={handleAction}
              >
                <ExternalLink className="size-4" />
                Accéder à la section concernée
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
