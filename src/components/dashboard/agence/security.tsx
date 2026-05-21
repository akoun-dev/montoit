'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, Eye, Lock, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useRealtimeUsers } from '@/hooks/use-realtime-users'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

interface ActivityLog {
  id: string; agentName: string; action: string; date: string; ip: string
}

export function AgenceSecurity() {
  const { user, isAuthenticated } = useAuthStore()
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [consent, setConsent] = useState({ marketing: false, analytics: true, thirdParty: false })

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const data = await authFetch<{ logs: ActivityLog[] }>('/api/user/connection-logs?limit=50')
      setActivityLogs(data.logs || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      console.error('Failed to fetch connection logs:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime: connection log updates
  useRealtimeUsers({
    userId: user?.id,
    watchAll: true,
    onUserChange: useCallback(() => {
      fetchData()
    }, [fetchData]),
  })

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="size-5 sm:size-6 text-[#FF6C2F]" /> Sécurité
        </h1>
        <p className="text-muted-foreground mt-1">Sécurité des comptes et conformité RGPD</p>
      </motion.div>

      {/* Agent Account Security */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lock className="size-4 text-[#FF6C2F]" /> Sécurité du compte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Authentification à deux facteurs</p>
                <p className="text-xs text-muted-foreground">Protégez votre compte avec 2FA</p>
              </div>
              <Badge className={user?.twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                {user?.twoFactorEnabled ? 'Activé' : 'Désactivé'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Dernier changement de mot de passe</p>
                <p className="text-xs text-muted-foreground">{user?.passwordUpdatedAt ? new Date(user.passwordUpdatedAt).toLocaleDateString('fr-FR') : 'Jamais'}</p>
              </div>
              <Button variant="outline" size="sm" className="text-[#FF6C2F]" onClick={() => toast.info('Redirection vers le changement de mot de passe')}>
                Changer
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity Logs */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="size-4 text-[#FF6C2F]" /> Journal d&apos;activité des agents
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune activité enregistrée</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden md:table-cell">IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-medium">{log.agentName}</TableCell>
                      <TableCell className="text-xs">{log.action}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{log.date}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{log.ip}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* RGPD Compliance */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="size-4 text-[#FF6C2F]" /> Conformité RGPD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Politique de confidentialité</p>
                <p className="text-xs text-muted-foreground">Dernière mise à jour : 01/01/2025</p>
              </div>
              <CheckCircle2 className="size-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Consentement cookies</p>
                <p className="text-xs text-muted-foreground">Bannière active sur le site</p>
              </div>
              <CheckCircle2 className="size-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Droit à l&apos;oubli</p>
                <p className="text-xs text-muted-foreground">Suppression des données sur demande</p>
              </div>
              <CheckCircle2 className="size-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium">Portabilité des données</p>
                <p className="text-xs text-muted-foreground">Export des données client disponible</p>
              </div>
              <AlertTriangle className="size-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Communication Consent */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Consentements de communication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(consent).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <span className="text-sm">{key === 'marketing' ? 'Communications marketing' : key === 'analytics' ? 'Analytique' : 'Partage tiers'}</span>
                <button onClick={() => setConsent({ ...consent, [key]: !enabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#FF6C2F]' : 'bg-neutral-300'}`}>
                  <div className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
            <Button className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white mt-2" onClick={() => toast.success('Préférences sauvegardées')}>
              Sauvegarder
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
