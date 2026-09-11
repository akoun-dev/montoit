'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, Plus, Mail, Phone, ToggleLeft, ToggleRight, Building2,
  CreditCard, Search, BadgeCheck, X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeUsers } from '@/hooks/use-realtime-users'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Agent {
  id: string; firstName: string; lastName: string; email: string; phone: string | null
  role: string; status: string; avatarUrl: string | null
  assignedPropertiesCount: number; totalCommissions: number
  assignedProperties: Array<{ id: string; propertyId: string; propertyTitle: string; propertyCity: string }>
}

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const roleLabels: Record<string, string> = { ADMIN: 'Admin', AGENT: 'Agent', READ_ONLY: 'Lecture seule' }
const statusLabels: Record<string, string> = { ACTIVE: 'Actif', INACTIVE: 'Inactif' }

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

export function TeamManagement() {
  const { user, isAuthenticated } = useAuthStore()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'AGENT' })
  const [agencyProperties, setAgencyProperties] = useState<Array<{ id: string; title: string; city: string }>>([])
  const [propertiesDialogAgent, setPropertiesDialogAgent] = useState<Agent | null>(null)
  const [propertyToAssign, setPropertyToAssign] = useState('')
  const [assigningProperty, setAssigningProperty] = useState(false)

  const fetchAgents = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<{ agents: Agent[] }>('/api/agence/agents')
      setAgents(d.agents ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      toast.error('Erreur lors du chargement des agents')
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchAgents() }, [fetchAgents])

  useEffect(() => {
    if (!isAuthenticated) return
    authFetch<{ properties: Array<{ id: string; title: string; city: string }> }>('/api/dashboard/agence')
      .then((d) => setAgencyProperties(d.properties ?? []))
      .catch(() => {})
  }, [isAuthenticated])

  useRealtimeUsers({
    userId: user?.id,
    watchAll: true,
    onUserChange: useCallback(() => {
      fetchAgents()
    }, [fetchAgents]),
  })

  const handleAddAgent = async () => {
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('Prénom, nom et email sont requis')
      return
    }
    setSubmitting(true)
    try {
      await authFetch('/api/agence/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      toast.success('Agent ajouté avec succès')
      setDialogOpen(false)
      setForm({ firstName: '', lastName: '', email: '', phone: '', role: 'AGENT' })
      fetchAgents()
    } catch (err) {
      if (err instanceof AuthError) toast.error(err.message)
      else toast.error('Erreur lors de l\'ajout')
    } finally { setSubmitting(false) }
  }

  const handleAssignProperty = async () => {
    if (!propertiesDialogAgent || !propertyToAssign) return
    setAssigningProperty(true)
    try {
      await authFetch(`/api/agence/agents/${propertiesDialogAgent.id}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: propertyToAssign }),
      })
      toast.success('Bien assigné à l\'agent')
      setPropertyToAssign('')
      const d = await authFetch<{ agents: Agent[] }>('/api/agence/agents')
      setAgents(d.agents ?? [])
      setPropertiesDialogAgent(d.agents?.find((a) => a.id === propertiesDialogAgent.id) ?? null)
    } catch (err) {
      if (err instanceof AuthError) toast.error(err.message)
      else toast.error('Erreur lors de l\'assignation')
    } finally { setAssigningProperty(false) }
  }

  const handleUnassignProperty = async (agent: Agent, propertyId: string) => {
    try {
      await authFetch(`/api/agence/agents/${agent.id}/properties?propertyId=${propertyId}`, { method: 'DELETE' })
      toast.success('Bien retiré de l\'agent')
      const d = await authFetch<{ agents: Agent[] }>('/api/agence/agents')
      setAgents(d.agents ?? [])
      setPropertiesDialogAgent(d.agents?.find((a) => a.id === agent.id) ?? null)
    } catch {
      toast.error('Erreur lors du retrait')
    }
  }

  const toggleAgentStatus = async (agent: Agent) => {
    try {
      await authFetch(`/api/agence/agents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, status: agent.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }),
      })
      toast.success(`Agent ${agent.status === 'ACTIVE' ? 'désactivé' : 'activé'}`)
      fetchAgents()
    } catch { toast.error('Erreur lors du changement de statut') }
  }

  const stats = {
    all: agents.length,
    ACTIVE: agents.filter((a) => a.status === 'ACTIVE').length,
    INACTIVE: agents.filter((a) => a.status === 'INACTIVE').length,
  }

  const tabs = [
    { key: 'all', label: 'Total agents', count: stats.all },
    { key: 'ACTIVE', label: 'Actifs', count: stats.ACTIVE },
    { key: 'INACTIVE', label: 'Inactifs', count: stats.INACTIVE },
  ]

  const filtered = agents.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${a.firstName} ${a.lastName}`.toLowerCase()
      if (!name.includes(q) && !a.email.toLowerCase().includes(q)) return false
    }
    return true
  })

  if (loading) return (
    <div className="space-y-6">
      <div><div className="h-8 w-56 bg-muted animate-pulse rounded" /><div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" /></div>
      <div className="flex gap-2">{[1,2,3].map((i) => <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-lg" />)}</div>
      {[1,2,3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
    </div>
  )

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="size-5 sm:size-6 text-[#FF6C2F]" /> Gestion de l&apos;équipe
          </h1>
          <p className="text-muted-foreground mt-1">{agents.length} agent{agents.length > 1 ? 's' : ''} dans votre équipe</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white gap-2 w-full sm:w-auto">
              <Plus className="size-4" /> Ajouter un agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel agent</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder="Prénom" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                <Input placeholder="Nom" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Téléphone (optionnel)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue placeholder="Rôle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGENT">Agent</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="READ_ONLY">Lecture seule</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddAgent} disabled={submitting} className="w-full bg-[#FF6C2F] hover:bg-[#e55e27] text-white">
                {submitting ? 'Ajout en cours...' : 'Ajouter l\'agent'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-3 gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'p-3 rounded-xl border text-left transition-all',
                statusFilter === tab.key
                  ? 'border-[#FF6C2F] bg-orange-50 shadow-sm'
                  : 'border-border bg-card hover:bg-muted/50'
              )}
            >
              <p className={cn(
                'text-2xl font-bold',
                statusFilter === tab.key ? 'text-[#FF6C2F]' : 'text-foreground'
              )}>{tab.count}</p>
              <p className={cn(
                'text-xs mt-0.5',
                statusFilter === tab.key ? 'text-[#FF6C2F] font-medium' : 'text-muted-foreground'
              )}>{tab.label}</p>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={itemVariants}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
      </motion.div>

      {/* Status pill tabs */}
      <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
              statusFilter === tab.key
                ? 'bg-[#FF6C2F] text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </motion.div>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed border-border bg-muted/50">
            <CardContent className="py-12 flex flex-col items-center text-center">
              <Users className="size-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {search ? 'Aucun agent trouvé' : 'Aucun agent dans votre équipe'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {search ? 'Essayez de modifier votre recherche.' : 'Ajoutez un agent pour commencer.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={statusFilter + search}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {filtered.map((agent) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card className="border-border hover:shadow-md transition-all">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="size-14 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 flex items-center justify-center shrink-0 text-lg font-bold text-[#FF6C2F]">
                        {agent.avatarUrl ? (
                          <img src={agent.avatarUrl} alt="" className="size-full object-cover rounded-lg" />
                        ) : (
                          getInitials(agent.firstName, agent.lastName)
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Top row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">
                              {agent.firstName} {agent.lastName}
                            </h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="size-3" />
                              {agent.email}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-orange-100 text-orange-700 text-xs">{roleLabels[agent.role] || agent.role}</Badge>
                            <Badge className={cn('text-xs', agent.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500')}>
                              {statusLabels[agent.status] || agent.status}
                            </Badge>
                          </div>
                        </div>

                        {/* Info rows */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Phone className="size-3.5 shrink-0" />
                            <span>{agent.phone || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Building2 className="size-3.5 shrink-0" />
                            <span>{agent.assignedPropertiesCount} bien{agent.assignedPropertiesCount > 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="size-3.5 shrink-0" />
                            <span className="text-[#FF6C2F] font-medium">{agent.totalCommissions.toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0 flex items-center gap-1">
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => setPropertiesDialogAgent(agent)}>
                          <Building2 className="size-3.5" /> Biens
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleAgentStatus(agent)} className="gap-1">
                          {agent.status === 'ACTIVE' ? (
                            <ToggleRight className="size-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="size-5 text-neutral-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Agent Performance Summary */}
      {agents.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Performance des agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {agents.map((agent) => (
                  <div key={agent.id} className="p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="size-8 rounded-full bg-orange-50 flex items-center justify-center">
                        <Users className="size-4 text-[#FF6C2F]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{agent.firstName} {agent.lastName}</p>
                        <p className="text-xs text-muted-foreground">{roleLabels[agent.role]}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Biens :</span> <span className="font-medium">{agent.assignedPropertiesCount}</span></div>
                      <div><span className="text-muted-foreground">Commissions :</span> <span className="font-medium text-[#FF6C2F]">{agent.totalCommissions.toLocaleString('fr-FR')} FCFA</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Manage assigned properties */}
      <Dialog open={!!propertiesDialogAgent} onOpenChange={(open) => { if (!open) { setPropertiesDialogAgent(null); setPropertyToAssign('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Biens assignés — {propertiesDialogAgent?.firstName} {propertiesDialogAgent?.lastName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {(propertiesDialogAgent?.assignedProperties ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun bien assigné pour le moment.</p>
              ) : (
                propertiesDialogAgent!.assignedProperties.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.propertyTitle}</p>
                      <p className="text-xs text-muted-foreground">{p.propertyCity}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="size-7 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                      onClick={() => handleUnassignProperty(propertiesDialogAgent!, p.propertyId)}>
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Select value={propertyToAssign} onValueChange={setPropertyToAssign}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Choisir un bien à assigner" /></SelectTrigger>
                <SelectContent>
                  {agencyProperties
                    .filter((p) => !propertiesDialogAgent?.assignedProperties.some((ap) => ap.propertyId === p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.title} — {p.city}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignProperty} disabled={!propertyToAssign || assigningProperty} className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white shrink-0">
                {assigningProperty ? 'Assignation...' : 'Assigner'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
