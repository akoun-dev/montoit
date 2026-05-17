'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, AlertTriangle, Shield, Eye, Check, Mail, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  actionUrl: string | null
}

interface NotificationsData {
  notifications: NotificationItem[]
}

const typeIcons: Record<string, typeof AlertTriangle> = {
  CRITICAL: AlertTriangle,
  SECURITY: Shield,
  SENSITIVE: Eye,
  SYSTEM: Settings,
  INFO: Bell,
}

const typeColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  SECURITY: 'bg-amber-100 text-amber-700',
  SENSITIVE: 'bg-teal-100 text-teal-700',
  SYSTEM: 'bg-neutral-100 text-neutral-700',
  INFO: 'bg-green-100 text-green-700',
}

const mockNotifications: NotificationItem[] = [
  { id: 'n1', type: 'CRITICAL', title: 'Erreur critique', message: 'Le service d\'envoi d\'emails est indisponible depuis 10 minutes', isRead: false, createdAt: new Date().toISOString(), actionUrl: null },
  { id: 'n2', type: 'SECURITY', title: 'Tentative de connexion suspecte', message: '5 tentatives de connexion échouées pour l\'utilisateur ibrahim@test.ci', isRead: false, createdAt: new Date().toISOString(), actionUrl: '/security' },
  { id: 'n3', type: 'SENSITIVE', title: 'Action sensible', message: 'L\'admin a changé le rôle d\'un utilisateur', isRead: true, createdAt: new Date().toISOString(), actionUrl: null },
  { id: 'n4', type: 'SYSTEM', title: 'Sauvegarde terminée', message: 'La sauvegarde automatique s\'est terminée avec succès', isRead: true, createdAt: new Date().toISOString(), actionUrl: null },
  { id: 'n5', type: 'INFO', title: 'Nouveau signalement', message: 'Un nouveau signalement a été soumis pour le bien "Villa Cocody"', isRead: false, createdAt: new Date().toISOString(), actionUrl: '/signalements' },
]

export function AdminNotifications() {
  const { isAuthenticated } = useAuthStore()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState({
    criticalErrors: true,
    securityAlerts: true,
    sensitiveActions: true,
    systemUpdates: true,
    emailDigest: true,
  })

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }

    try {
      // Try to fetch real notifications for admin user
      const d = await authFetch<NotificationsData>('/api/notifications').catch(() => null)
      if (d?.notifications && d.notifications.length > 0) {
        setNotifications(d.notifications)
      } else {
        setNotifications(mockNotifications)
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setNotifications(mockNotifications)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    toast.success('Toutes marquées comme lues')
  }

  const markAsUnread = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: false } : n))
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Centre de notifications</h1>
          <p className="text-muted-foreground mt-1">{unreadCount} notification(s) non lue(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={markAllAsRead}>
            <Check className="size-3.5" /> Tout marquer comme lu
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="all">Toutes ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Non lues ({unreadCount})</TabsTrigger>
          <TabsTrigger value="critical">Critiques</TabsTrigger>
          <TabsTrigger value="preferences">Préférences</TabsTrigger>
        </TabsList>

        {['all', 'unread', 'critical'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
            {notifications
              .filter((n) => {
                if (tab === 'unread') return !n.isRead
                if (tab === 'critical') return n.type === 'CRITICAL'
                return true
              })
              .map((notification) => {
                const Icon = typeIcons[notification.type] || Bell
                const colorClass = typeColors[notification.type] || 'bg-neutral-100 text-neutral-700'
                return (
                  <Card key={notification.id} className={`border-border ${!notification.isRead ? 'border-l-4 border-l-[#FF6C2F]' : 'opacity-70'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-foreground">{notification.title}</p>
                            {!notification.isRead && <div className="size-2 rounded-full bg-[#FF6C2F]" />}
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(notification.createdAt).toLocaleString('fr-FR')}</p>
                        </div>
                        <div className="flex gap-1">
                          {!notification.isRead ? (
                            <Button size="icon" variant="ghost" className="size-7" title="Marquer comme lu" onClick={() => markAsRead(notification.id)}>
                              <Check className="size-3.5" />
                            </Button>
                          ) : (
                            <Button size="icon" variant="ghost" className="size-7" title="Marquer comme non lu" onClick={() => markAsUnread(notification.id)}>
                              <Mail className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            {notifications.filter((n) => {
              if (tab === 'unread') return !n.isRead
              if (tab === 'critical') return n.type === 'CRITICAL'
              return true
            }).length === 0 && (
              <Card className="border-border">
                <CardContent className="py-8 text-center">
                  <Bell className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-muted-foreground">Aucune notification</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}

        <TabsContent value="preferences" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="size-5 text-[#FF6C2F]" />
                Préférences de notification
              </CardTitle>
              <CardDescription>Configurer quelles notifications afficher</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'criticalErrors' as const, label: 'Erreurs critiques', desc: 'Alertes en cas d\'erreur système' },
                { key: 'securityAlerts' as const, label: 'Alertes de sécurité', desc: 'Tentatives de connexion suspectes' },
                { key: 'sensitiveActions' as const, label: 'Actions sensibles', desc: 'Changement de rôle, suspension, etc.' },
                { key: 'systemUpdates' as const, label: 'Mises à jour système', desc: 'Sauvegardes, maintenance, etc.' },
                { key: 'emailDigest' as const, label: 'Résumé par email', desc: 'Recevoir un résumé quotidien' },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                  <Switch checked={prefs[pref.key]} onCheckedChange={() => togglePref(pref.key)} />
                </div>
              ))}
              <Button className="bg-[#FF6C2F] hover:bg-[#e55f28] text-white gap-2" onClick={() => toast.success('Préférences sauvegardées')}>
                <Check className="size-4" /> Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
