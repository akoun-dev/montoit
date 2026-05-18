'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, MessageSquare, FileText, Calendar, CreditCard, Megaphone, Settings, CheckCheck, Filter, Wrench, Home, Shield, Scale, Star, Target, CheckCircle, AlertTriangle, Award, BadgeCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ──────────────────────────────────────────────────────────────────
interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  actionUrl: string | null
  entityId: string | null
  createdAt: string
}

interface NotificationsResponse {
  data: NotificationItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  unreadCount: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const typeConfig: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  MESSAGE: { icon: MessageSquare, label: 'Messages', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  DOSSIER_UPDATE: { icon: FileText, label: 'Candidatures', color: 'bg-brand-50 text-brand-600 border-brand-200' },
  VISIT_REMINDER: { icon: Calendar, label: 'Visites', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  PAYMENT_ALERT: { icon: CreditCard, label: 'Paiements', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  MAINTENANCE: { icon: Wrench, label: 'Maintenance', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  LEASE_UPDATE: { icon: Home, label: 'Baux', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  PROMOTION: { icon: Megaphone, label: 'Promotions', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  SECURITY: { icon: Shield, label: 'Sécurité', color: 'bg-red-50 text-red-700 border-red-200' },
  SYSTEM: { icon: Settings, label: 'Système', color: 'bg-muted text-muted-foreground border-border' },
  DISPUTE_UPDATE: { icon: Scale, label: 'Litiges', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  DISPUTE_ASSIGNED: { icon: Scale, label: 'Litiges', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  APPLICATION: { icon: FileText, label: 'Candidatures', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  REVIEW: { icon: Star, label: 'Avis', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  MISSION_ASSIGNED: { icon: Target, label: 'Missions', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  MISSION_COMPLETED: { icon: CheckCircle, label: 'Missions', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  FRAUD_ALERT: { icon: AlertTriangle, label: 'Fraude', color: 'bg-red-50 text-red-700 border-red-200' },
  CERTIFICATION: { icon: Award, label: 'Certifications', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  PROPERTY_VERIFICATION: { icon: BadgeCheck, label: 'Vérifications', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  VERIFICATION_RESULT: { icon: BadgeCheck, label: 'Vérifications', color: 'bg-teal-50 text-teal-700 border-teal-200' },
}

const notificationCategories = [
  { type: '', label: 'Toutes', color: 'bg-muted text-foreground border-border' },
  { type: 'MESSAGE', label: 'Messages', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'DOSSIER_UPDATE', label: 'Candidatures', color: 'bg-brand-50 text-brand-600 border-brand-200' },
  { type: 'VISIT_REMINDER', label: 'Visites', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'PAYMENT_ALERT', label: 'Paiements', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { type: 'MAINTENANCE', label: 'Maintenance', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { type: 'LEASE_UPDATE', label: 'Baux', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { type: 'DISPUTE_UPDATE', label: 'Litiges', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { type: 'APPLICATION', label: 'Candidatures', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { type: 'REVIEW', label: 'Avis', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { type: 'MISSION_ASSIGNED', label: 'Missions', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { type: 'FRAUD_ALERT', label: 'Fraude', color: 'bg-red-50 text-red-700 border-red-200' },
  { type: 'CERTIFICATION', label: 'Certifications', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { type: 'SECURITY', label: 'Sécurité', color: 'bg-red-50 text-red-700 border-red-200' },
  { type: 'SYSTEM', label: 'Système', color: 'bg-muted text-muted-foreground border-border' },
]

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

// ─── Animation Variants ────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function Notifications() {
  const { user, isAuthenticated } = useAuthStore()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeFilter, setActiveFilter] = useState('')
  const [markingRead, setMarkingRead] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const query = activeFilter ? `?type=${activeFilter}` : ''
      const result = await authFetch<NotificationsResponse>(`/api/notifications${query}`)
      setNotifications(result.data ?? [])
      setUnreadCount(result.unreadCount ?? 0)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) { setNotifications([]); return }
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, activeFilter])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const { setDashboardSection } = useAuthStore()

  const handleMarkAsRead = async (notif: NotificationItem) => {
    try {
      await authFetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notif.id] }),
      })
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n))
      setUnreadCount((prev) => Math.max(0, prev - 1))
      // Navigate to the relevant dashboard section if actionUrl exists
      if (notif.actionUrl) {
        setDashboardSection(notif.actionUrl)
      }
    } catch {
      // Silently fail
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingRead(true)
    try {
      await authFetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // Silently fail
    } finally {
      setMarkingRead(false)
    }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 bg-muted animate-pulse rounded-full" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Mes notifications</h1>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-700">Impossible de charger vos notifications. Veuillez réessayer.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Mes notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-brand-500 text-white border-0 text-xs px-2 py-0.5">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Restez informé de vos démarches</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingRead}
            className="gap-1.5 text-brand-600 border-brand-200 hover:bg-brand-50"
          >
            <CheckCheck className="size-4" />
            Tout marquer lu
          </Button>
        )}
      </motion.div>

      {/* Category Badges */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              Catégories
            </CardTitle>
            <CardDescription>Filtrez vos notifications par type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {notificationCategories.map((cat) => (
                <Badge
                  key={cat.type || 'all'}
                  variant="outline"
                  className={`${activeFilter === cat.type ? 'ring-2 ring-brand-300 ring-offset-1' : ''} ${cat.color} cursor-pointer hover:opacity-80 transition-opacity py-1.5 px-3`}
                  onClick={() => { setActiveFilter(cat.type); setLoading(true) }}
                >
                  {cat.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Notifications List */}
      <AnimatePresence mode="wait">
        {notifications.length === 0 ? (
          /* Empty State */
          <motion.div key="empty" variants={itemVariants} initial="hidden" animate="show" exit="hidden">
            <Card className="border-dashed border-border bg-muted/50">
              <CardContent className="py-12 flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-brand-50 mb-4">
                  <Bell className="size-7 text-brand-500" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Aucune notification
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {user?.firstName}, vous serez notifié dès qu&apos;une mise à jour intervient sur vos démarches.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="list" variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
            {notifications.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.SYSTEM
              const IconComp = config.icon

              return (
                <motion.div
                  key={notif.id}
                  variants={itemVariants}
                  layout
                  className={`cursor-pointer rounded-xl border transition-all ${
                    notif.isRead
                      ? 'border-border bg-card'
                      : 'border-brand-100 bg-brand-50/30 hover:bg-brand-50/60'
                  }`}
                  onClick={() => { if (!notif.isRead || notif.actionUrl) handleMarkAsRead(notif) }}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Icon */}
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                      notif.isRead ? 'bg-muted' : 'bg-brand-100'
                    }`}>
                      <IconComp className={`size-5 ${notif.isRead ? 'text-muted-foreground' : 'text-brand-500'}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-medium truncate ${notif.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <div className="size-2 shrink-0 rounded-full bg-brand-500" />
                        )}
                      </div>
                      <p className={`text-sm line-clamp-2 ${notif.isRead ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(notif.createdAt)}
                      </p>
                    </div>

                    {/* Type badge */}
                    <Badge variant="outline" className={`shrink-0 text-[10px] px-1.5 py-0 border ${config.color}`}>
                      {config.label}
                    </Badge>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
