'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, Mail, Phone, ToggleLeft, ToggleRight, Building2, CreditCard } from 'lucide-react'
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

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

export function TeamManagement() {
  const { isAuthenticated } = useAuthStore()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'AGENT' })

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

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="size-6 text-[#FF6C2F]" /> Gestion de l&apos;équipe
          </h1>
          <p className="text-muted-foreground mt-1">{agents.length} agent{agents.length > 1 ? 's' : ''} dans votre équipe</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#FF6C2F] hover:bg-[#e55e27] text-white gap-2">
              <Plus className="size-4" /> Ajouter un agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel agent</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
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

      <motion.div variants={itemVariants}>
        <Card className="border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="hidden sm:table-cell">Biens</TableHead>
                  <TableHead className="hidden md:table-cell">Commissions</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucun agent dans votre équipe
                    </TableCell>
                  </TableRow>
                ) : (
                  agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">{agent.firstName} {agent.lastName}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="flex items-center gap-1.5 text-xs"><Mail className="size-3" />{agent.email}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="flex items-center gap-1.5 text-xs"><Phone className="size-3" />{agent.phone || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-orange-100 text-orange-700">{roleLabels[agent.role] || agent.role}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="flex items-center gap-1 text-xs"><Building2 className="size-3" />{agent.assignedPropertiesCount}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="flex items-center gap-1 text-xs"><CreditCard className="size-3" />{agent.totalCommissions.toLocaleString('fr-FR')} FCFA</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={agent.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}>
                          {statusLabels[agent.status] || agent.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => toggleAgentStatus(agent)} className="gap-1">
                          {agent.status === 'ACTIVE' ? <ToggleRight className="size-4 text-green-500" /> : <ToggleLeft className="size-4 text-neutral-400" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

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
                    <div className="grid grid-cols-2 gap-2 text-xs">
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
    </motion.div>
  )
}
