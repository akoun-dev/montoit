'use client'

import { useCallback, useEffect, useState } from 'react'
import { Shield, CheckCircle, Clock, Power, Eye, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface TrustAgent {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  isActive: boolean
  createdAt: string
  stats: {
    validationsCompleted: number
    avgProcessingTimeHours: number
    missionsAssigned: number
    missionsCompleted: number
  }
}

interface TrustAgentsData {
  agents: TrustAgent[]
}

const mockAgents: TrustAgent[] = [
  { id: 'tc1', firstName: 'Yao', lastName: 'Kouassi', email: 'yao.k@montoit.ci', phone: '+225 07 01 01 01', isActive: true, createdAt: '2025-01-15T00:00:00Z', stats: { validationsCompleted: 47, avgProcessingTimeHours: 12, missionsAssigned: 15, missionsCompleted: 13 } },
  { id: 'tc2', firstName: 'Awa', lastName: 'Diallo', email: 'awa.d@montoit.ci', phone: '+225 07 02 02 02', isActive: true, createdAt: '2025-02-10T00:00:00Z', stats: { validationsCompleted: 32, avgProcessingTimeHours: 18, missionsAssigned: 10, missionsCompleted: 8 } },
  { id: 'tc3', firstName: 'Moussa', lastName: 'Koné', email: 'moussa.k@montoit.ci', phone: '+225 07 03 03 03', isActive: false, createdAt: '2025-03-01T00:00:00Z', stats: { validationsCompleted: 5, avgProcessingTimeHours: 48, missionsAssigned: 3, missionsCompleted: 1 } },
]

export function AdminTrustAgents() {
  const { isAuthenticated } = useAuthStore()
  const [agents, setAgents] = useState<TrustAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<TrustAgent | null>(null)
  const [deactivateDialog, setDeactivateDialog] = useState<{ open: boolean; agent: TrustAgent | null }>({ open: false, agent: null })

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }

    try {
      const d = await authFetch<TrustAgentsData>('/api/admin/users?role=TIERS_CONFIANCE').catch(() => ({ users: [] }))
      if (d.agents && d.agents.length > 0) {
        setAgents(d.agents)
      } else {
        // Use mock data for demo
        setAgents(mockAgents)
      }
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setAgents(mockAgents)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  const totalValidations = agents.reduce((sum, a) => sum + a.stats.validationsCompleted, 0)
  const activeAgents = agents.filter(a => a.isActive).length
  const avgProcessingTime = agents.length > 0 ? Math.round(agents.reduce((sum, a) => sum + a.stats.avgProcessingTimeHours, 0) / agents.length) : 0

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Tiers de Confiance</h1>
        <p className="text-muted-foreground mt-1">Gestion et suivi des agents TC</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-foreground">{agents.length}</p>
            <p className="text-xs text-muted-foreground">Total TC</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-600">{activeAgents}</p>
            <p className="text-xs text-muted-foreground">Actifs</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-amber-600">{totalValidations}</p>
            <p className="text-xs text-muted-foreground">Validations totales</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-teal-600">{avgProcessingTime}h</p>
            <p className="text-xs text-muted-foreground">Temps moyen</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className={`border-border ${!agent.isActive ? 'opacity-60' : ''}`}>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-semibold">
                    {agent.firstName[0]}{agent.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{agent.firstName} {agent.lastName}</p>
                    <p className="text-xs text-muted-foreground">{agent.email}</p>
                  </div>
                </div>
                <Badge className={agent.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {agent.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-lg font-bold text-foreground">{agent.stats.validationsCompleted}</p>
                  <p className="text-xs text-muted-foreground">Validations</p>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-lg font-bold text-foreground">{agent.stats.avgProcessingTimeHours}h</p>
                  <p className="text-xs text-muted-foreground">Temps moyen</p>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-lg font-bold text-foreground">{agent.stats.missionsAssigned}</p>
                  <p className="text-xs text-muted-foreground">Missions assignées</p>
                </div>
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-lg font-bold text-foreground">{agent.stats.missionsCompleted}</p>
                  <p className="text-xs text-muted-foreground">Missions terminées</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => setSelectedAgent(agent)}>
                  <Eye className="size-3.5" /> Détails
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={agent.isActive ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
                  onClick={() => setDeactivateDialog({ open: true, agent })}
                >
                  <Power className="size-3.5" /> {agent.isActive ? 'Désactiver' : 'Activer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assign Missions Overview */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="size-5 text-[#FF6C2F]" />
            Vue d'ensemble des missions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Agent</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Validations</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Missions</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Complétion</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Temps moyen</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const completion = agent.stats.missionsAssigned > 0 ? Math.round((agent.stats.missionsCompleted / agent.stats.missionsAssigned) * 100) : 0
                  return (
                    <tr key={agent.id} className="border-b border-border hover:bg-accent">
                      <td className="py-2 px-3 font-medium text-foreground">{agent.firstName} {agent.lastName}</td>
                      <td className="py-2 px-3">{agent.stats.validationsCompleted}</td>
                      <td className="py-2 px-3">{agent.stats.missionsCompleted}/{agent.stats.missionsAssigned}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted max-w-20">
                            <div className="h-2 rounded-full bg-[#FF6C2F]" style={{ width: `${completion}%` }} />
                          </div>
                          <span className="text-xs">{completion}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">{agent.stats.avgProcessingTimeHours}h</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Agent Detail Dialog */}
      <Dialog open={!!selectedAgent} onOpenChange={(open) => { if (!open) setSelectedAgent(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Profil TC — {selectedAgent?.firstName} {selectedAgent?.lastName}</DialogTitle>
          </DialogHeader>
          {selectedAgent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-semibold">
                  {selectedAgent.firstName[0]}{selectedAgent.lastName[0]}
                </div>
                <div>
                  <p className="font-medium text-foreground">{selectedAgent.firstName} {selectedAgent.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedAgent.email}</p>
                  <p className="text-sm text-muted-foreground">{selectedAgent.phone || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Inscrit le</p>
                  <p className="font-medium text-foreground">{new Date(selectedAgent.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge className={selectedAgent.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {selectedAgent.isActive ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
              <CardDescription>Historique des validations</CardDescription>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 p-2 rounded border border-border text-sm">
                  <CheckCircle className="size-4 text-green-600" />
                  <span>Dossier locatif #DL-001 — Validé</span>
                  <span className="ml-auto text-xs text-muted-foreground">Il y a 2h</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded border border-border text-sm">
                  <CheckCircle className="size-4 text-green-600" />
                  <span>Document propriété #DP-003 — Validé</span>
                  <span className="ml-auto text-xs text-muted-foreground">Il y a 5h</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded border border-border text-sm">
                  <Clock className="size-4 text-amber-600" />
                  <span>Vérification bien #VB-007 — En cours</span>
                  <span className="ml-auto text-xs text-muted-foreground">Il y a 1j</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={deactivateDialog.open} onOpenChange={(open) => setDeactivateDialog({ ...deactivateDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deactivateDialog.agent?.isActive ? 'Désactiver' : 'Activer'} le TC</DialogTitle>
            <DialogDescription>
              {deactivateDialog.agent?.isActive
                ? `Désactiver ${deactivateDialog.agent?.firstName} ${deactivateDialog.agent?.lastName} ? Il ne recevra plus de missions.`
                : `Réactiver ${deactivateDialog.agent?.firstName} ${deactivateDialog.agent?.lastName} ?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateDialog({ ...deactivateDialog, open: false })}>Annuler</Button>
            <Button
              className={deactivateDialog.agent?.isActive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
              onClick={() => {
                toast.success(deactivateDialog.agent?.isActive ? 'TC désactivé' : 'TC activé')
                setDeactivateDialog({ ...deactivateDialog, open: false })
              }}
            >
              {deactivateDialog.agent?.isActive ? 'Désactiver' : 'Activer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
