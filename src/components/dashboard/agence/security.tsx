'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, Eye, Lock, Monitor, Smartphone, Globe, Clock } from 'lucide-react'
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

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

interface ConnectionLogEntry {
  id: string
  ipAddress: string | null
  userAgent: string | null
  device: string | null
  location: string | null
  createdAt: string
}

function parseDevice(ua: string | null): { device: string; browser: string } {
  if (!ua) return { device: 'Inconnu', browser: 'Inconnu' }
  let device = 'Inconnu'
  let browser = 'Inconnu'
  if (/iPhone/i.test(ua)) device = 'iPhone'
  else if (/iPad/i.test(ua)) device = 'iPad'
  else if (/Android/i.test(ua)) device = 'Android'
  else if (/Windows/i.test(ua)) device = 'Windows'
  else if (/Macintosh/i.test(ua)) device = 'Mac'
  else if (/Linux/i.test(ua)) device = 'Linux'
  if (/Edg/i.test(ua)) browser = 'Edge'
  else if (/Chrome/i.test(ua)) browser = 'Chrome'
  else if (/Firefox/i.test(ua)) browser = 'Firefox'
  else if (/Safari/i.test(ua)) browser = 'Safari'
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera'
  return { device, browser }
}

export function AgenceSecurity() {
  const { user, isAuthenticated } = useAuthStore()
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const data = await authFetch<{ logs: ConnectionLogEntry[] }>('/api/user/connection-logs?limit=20')
      setConnectionLogs(data.logs || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      console.error('Failed to fetch connection logs:', err)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

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
          <Shield className="size-5 sm:size-6 text-brand-500" /> Sécurité
        </h1>
        <p className="text-muted-foreground mt-1">Sécurité des comptes et historique des connexions</p>
      </motion.div>

      {/* Security Status */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lock className="size-4 text-brand-500" /> Sécurité du compte
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
                <p className="text-xs text-muted-foreground">
                  {user?.passwordUpdatedAt
                    ? new Date(user.passwordUpdatedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : 'Jamais'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Connection Logs */}
      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="size-4 text-brand-500" /> Journal de connexion
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {connectionLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune connexion enregistrée</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Appareil</TableHead>
                      <TableHead>Adresse IP</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                      <TableHead className="hidden md:table-cell">Localisation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connectionLogs.map((log) => {
                      const parsed = parseDevice(log.userAgent)
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Smartphone className="size-3.5 text-muted-foreground shrink-0" />
                              <span className="text-xs font-medium">{log.device || parsed.device}</span>
                              <span className="text-[10px] text-muted-foreground">· {parsed.browser}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{log.ipAddress || '—'}</TableCell>
                          <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(log.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Globe className="size-3" />
                              {log.location || '—'}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
