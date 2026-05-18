'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calendar, Clock, MapPin, User, CheckCircle2, Bell, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface VisitRequest {
  id: string; visitType: string; requestedDate: string; timeSlot: string; status: string
  tenantMessage: string | null; createdAt: string
  tenant: { firstName: string; lastName: string; phone: string }
  property: { title: string; city: string }
}

interface Agent { id: string; firstName: string; lastName: string; email: string; role: string }

interface AgenceData { visitRequests: VisitRequest[]; agents: Agent[] }

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const statusConfig: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-amber-100 text-amber-700' },
  ACCEPTED: { label: 'Acceptée', cls: 'bg-green-100 text-green-700' },
  COMPLETED: { label: 'Terminée', cls: 'bg-teal-100 text-teal-700' },
  REJECTED: { label: 'Refusée', cls: 'bg-red-100 text-red-700' },
  COUNTER_PROPOSED: { label: 'Contre-proposition', cls: 'bg-orange-100 text-orange-700' },
  CANCELLED: { label: 'Annulée', cls: 'bg-neutral-100 text-neutral-500' },
}

export function AgenceVisits() {
  const { isAuthenticated } = useAuthStore()
  const [visits, setVisits] = useState<VisitRequest[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<AgenceData>('/api/dashboard/agence')
      setVisits(d.visitRequests ?? [])
      setAgents(d.agents ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = visits.filter((v) => statusFilter === 'all' || v.status === statusFilter)

  // Group by date for calendar view
  const groupedByDate = filtered.reduce<Record<string, VisitRequest[]>>((acc, v) => {
    const dateKey = new Date(v.requestedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(v)
    return acc
  }, {})

  const pendingVisits = visits.filter((v) => v.status === 'PENDING')
  const upcomingVisits = visits.filter((v) => v.status === 'ACCEPTED')
  const completedVisits = visits.filter((v) => v.status === 'COMPLETED')

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}</div>

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="size-6 text-[#FF6C2F]" /> Visites
        </h1>
        <p className="text-muted-foreground mt-1">
          {pendingVisits.length} en attente · {upcomingVisits.length} à venir · {completedVisits.length} terminées
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid sm:grid-cols-3 gap-4">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="size-8 text-amber-500" />
            <div><p className="text-2xl font-bold text-amber-700">{pendingVisits.length}</p><p className="text-xs text-amber-600">En attente</p></div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="size-8 text-green-500" />
            <div><p className="text-2xl font-bold text-green-700">{upcomingVisits.length}</p><p className="text-xs text-green-600">Acceptées</p></div>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="size-8 text-teal-500" />
            <div><p className="text-2xl font-bold text-teal-700">{completedVisits.length}</p><p className="text-xs text-teal-600">Terminées</p></div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filter */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="ACCEPTED">Acceptée</SelectItem>
            <SelectItem value="COMPLETED">Terminée</SelectItem>
            <SelectItem value="REJECTED">Refusée</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => toast.info('Rappels envoyés')}>
          <Bell className="size-3" /> Envoyer rappels
        </Button>
      </motion.div>

      {/* Calendar View */}
      <motion.div variants={itemVariants} className="space-y-4">
        {Object.keys(groupedByDate).length === 0 ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center text-muted-foreground">Aucune visite planifiée</CardContent>
          </Card>
        ) : (
          Object.entries(groupedByDate).map(([date, dateVisits]) => (
            <Card key={date} className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="size-4 text-[#FF6C2F]" /> {date}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dateVisits.map((v) => (
                  <div key={v.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="size-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                        <User className="size-4 text-[#FF6C2F]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{v.tenant.firstName} {v.tenant.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{v.property.title} · {v.timeSlot}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={statusConfig[v.status]?.cls || 'bg-neutral-100'}>
                        {statusConfig[v.status]?.label || v.status}
                      </Badge>
                      {v.visitType === 'VIRTUAL' && (
                        <Badge className="bg-purple-50 text-purple-700 text-[10px]">Virtuelle</Badge>
                      )}
                      <Select>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Assigner" /></SelectTrigger>
                        <SelectContent>
                          {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </motion.div>

      {/* Post-visit Feedback */}
      {completedVisits.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageSquare className="size-4 text-[#FF6C2F]" /> Retour après visite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {completedVisits.slice(0, 5).map((v) => (
                <div key={v.id} className="p-3 rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{v.tenant.firstName} {v.tenant.lastName}</p>
                    <Badge className="bg-teal-100 text-teal-700 text-[10px]">Terminée</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{v.property.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
