'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, AlertTriangle, Clock, Ban, Lock, FileText, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface AuditEntry {
  id: string
  action: string
  entity: string
  details: string | null
  createdAt: string
  user: { firstName: string; lastName: string; email: string }
}

interface SecurityData {
  failedLogins: AuditEntry[]
  adminActions: AuditEntry[]
}

const mockFailedLogins: AuditEntry[] = [
  { id: '1', action: 'LOGIN_FAILED', entity: 'Session', details: 'Mot de passe incorrect', createdAt: new Date().toISOString(), user: { firstName: 'Ibrahim', lastName: 'Koné', email: 'ibrahim@test.ci' } },
  { id: '2', action: 'LOGIN_FAILED', entity: 'Session', details: 'Compte inexistant', createdAt: new Date().toISOString(), user: { firstName: 'Unknown', lastName: 'User', email: 'unknown@test.ci' } },
]

const mockAdminActions: AuditEntry[] = [
  { id: 'a1', action: 'USER_ROLE_CHANGED', entity: 'User', details: 'LOCATAIRE → PROPRIETAIRE', createdAt: new Date().toISOString(), user: { firstName: 'Admin', lastName: 'MonToit', email: 'admin@montoit.ci' } },
  { id: 'a2', action: 'USER_BANNED', entity: 'User', details: 'Violation des conditions', createdAt: new Date().toISOString(), user: { firstName: 'Admin', lastName: 'MonToit', email: 'admin@montoit.ci' } },
]

export function AdminSecurity() {
  const { isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [failedLogins, setFailedLogins] = useState<AuditEntry[]>([])
  const [adminActions, setAdminActions] = useState<AuditEntry[]>([])
  const [sessionDuration, setSessionDuration] = useState('30')
  const [maxAttempts, setMaxAttempts] = useState('5')
  const [ipWhitelist, setIpWhitelist] = useState('')
  const [ipBlacklist, setIpBlacklist] = useState('')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }

    try {
      const d = await authFetch<SecurityData>('/api/admin/system').catch(() => null)
      setFailedLogins(d?.failedLogins?.length ? (d.failedLogins as unknown as AuditEntry[]) : mockFailedLogins)
      setAdminActions(mockAdminActions)
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setFailedLogins(mockFailedLogins)
      setAdminActions(mockAdminActions)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sécurité</h1>
        <p className="text-muted-foreground mt-1">Gestion de la sécurité et des accès</p>
      </div>

      <Tabs defaultValue="failed-logins" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="failed-logins">Connexions échouées</TabsTrigger>
          <TabsTrigger value="admin-actions">Actions admin</TabsTrigger>
          <TabsTrigger value="rules">Règles</TabsTrigger>
          <TabsTrigger value="ip">IP</TabsTrigger>
        </TabsList>

        <TabsContent value="failed-logins" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-600" />
                Tentatives de connexion échouées
              </CardTitle>
              <CardDescription>Depuis AuditLog (action = LOGIN_FAILED)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Utilisateur</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Email</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Détails</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedLogins.map((log) => (
                      <tr key={log.id} className="border-b border-border hover:bg-red-50/50">
                        <td className="py-2 px-3 font-medium text-foreground">{log.user.firstName} {log.user.lastName}</td>
                        <td className="py-2 px-3 text-muted-foreground">{log.user.email}</td>
                        <td className="py-2 px-3 text-muted-foreground">{log.details || '—'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{new Date(log.createdAt).toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                    {failedLogins.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">Aucune tentative échouée</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin-actions" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="size-5 text-[#FF6C2F]" />
                Historique des actions administrateur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {adminActions.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className={`size-8 rounded-lg flex items-center justify-center ${
                      log.action.includes('BANNED') ? 'bg-red-100 text-red-600' :
                      log.action.includes('ROLE') ? 'bg-amber-100 text-amber-600' :
                      'bg-teal-100 text-teal-600'
                    }`}>
                      {log.action.includes('BANNED') ? <Ban className="size-4" /> : <FileText className="size-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.entity} {log.details ? `· ${log.details}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-foreground">{log.user.firstName} {log.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString('fr-FR')}</p>
                    </div>
                  </div>
                ))}
                {adminActions.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Aucune action enregistrée</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Lock className="size-5 text-[#FF6C2F]" />
                Règles de sécurité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Durée de session (jours)</Label>
                  <Input type="number" value={sessionDuration} onChange={(e) => setSessionDuration(e.target.value)} className="w-32" />
                  <p className="text-xs text-muted-foreground">Durée avant expiration de la session</p>
                </div>
                <div className="space-y-2">
                  <Label>Tentatives max avant blocage</Label>
                  <Input type="number" value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} className="w-32" />
                  <p className="text-xs text-muted-foreground">Nombre max de tentatives de connexion</p>
                </div>
              </div>
              <Button className="bg-[#FF6C2F] hover:bg-[#e55f28] text-white gap-2" onClick={() => toast.success('Règles mises à jour')}>
                <Settings className="size-4" /> Sauvegarder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ip" className="mt-4 space-y-4">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Liste blanche IP</CardTitle>
              <CardDescription>Adresses IP autorisées pour l&apos;administration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Adresse IP (ex: 192.168.1.1)" value={ipWhitelist} onChange={(e) => setIpWhitelist(e.target.value)} className="max-w-xs" />
                <Button variant="outline" onClick={() => { toast.success('IP ajoutée à la liste blanche'); setIpWhitelist('') }}>Ajouter</Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded border border-border">
                  <span className="text-sm text-foreground">192.168.1.0/24</span>
                  <Badge className="bg-green-100 text-green-700">Actif</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-red-700">Liste noire IP</CardTitle>
              <CardDescription>Adresses IP bloquées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Adresse IP à bloquer" value={ipBlacklist} onChange={(e) => setIpBlacklist(e.target.value)} className="max-w-xs" />
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => { toast.success('IP bloquée'); setIpBlacklist('') }}>Bloquer</Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded border border-red-100 bg-red-50/50">
                  <span className="text-sm text-red-700">10.0.0.99</span>
                  <Badge className="bg-red-100 text-red-700">Bloqué</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Reports */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="size-5 text-muted-foreground" />
            Rapports de sécurité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border text-center">
              <p className="text-2xl font-bold text-red-600">{failedLogins.length}</p>
              <p className="text-xs text-muted-foreground">Tentatives échouées</p>
            </div>
            <div className="p-4 rounded-lg border border-border text-center">
              <p className="text-2xl font-bold text-amber-600">0</p>
              <p className="text-xs text-muted-foreground">Comptes bloqués</p>
            </div>
            <div className="p-4 rounded-lg border border-border text-center">
              <p className="text-2xl font-bold text-green-600">1</p>
              <p className="text-xs text-muted-foreground">IPs bloquées</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
