'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calendar, Clock, MapPin, User, CheckCircle2, Bell, MessageSquare, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
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
  const [error, setError] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<AgenceData>('/api/dashboard/agence')
      setVisits(d.visitRequests ?? [])
      setAgents(d.agents ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setError(true)
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = visits.filter((v) => {
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    const matchesSearch = !searchQuery ||
      `${v.tenant.firstName} ${v.tenant.lastName} ${v.property.title}`.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

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

  if (loading) return <div className="space-y-6"><div><div className="h-8 w-48 bg-muted animate-pulse rounded" /><div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" /></div><div className="flex gap-2">{[1,2,3].map((i) => <div key={i} className="h-9 w-24 bg-muted animate-pulse rounded-lg" />)}</div>{[1,2,3].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}</div>

  if (error) return <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6"><motion.div variants={itemVariants}><h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2"><Calendar className="size-5 sm:size-6 text-[#FF6C2F]" /> Visites</h1><p className="text-muted-foreground mt-1">Impossible de charger les visites</p></motion.div><Card className="border-amber-200 bg-amber-50"><CardContent className="p-4"><p className="text-sm text-amber-700">Impossible de charger. Veuillez réessayer.</p></CardContent></Card></motion.div>

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="size-5 sm:size-6 text-[#FF6C2F]" /> Visites
        </h1>
        <p className="text-muted-foreground mt-1">
          {pendingVisits.length} en attente · {upcomingVisits.length} à venir · {completedVisits.length} terminées
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid sm:grid-cols-3 gap-4">
        <button onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'all' : 'PENDING')}
          className={cn('relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:shadow-md', statusFilter === 'PENDING' ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-200' : 'border-amber-200 bg-amber-50/50')}>
          <div className="flex items-center gap-3">
            <Clock className="size-8 text-amber-500" />
            <div><p className="text-xl sm:text-2xl font-bold text-amber-700">{pendingVisits.length}</p><p className="text-xs text-amber-600">En attente</p></div>
          </div>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === 'ACCEPTED' ? 'all' : 'ACCEPTED')}
          className={cn('relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:shadow-md', statusFilter === 'ACCEPTED' ? 'border-green-300 bg-green-50 ring-2 ring-green-200' : 'border-green-200 bg-green-50/50')}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-8 text-green-500" />
            <div><p className="text-xl sm:text-2xl font-bold text-green-700">{upcomingVisits.length}</p><p className="text-xs text-green-600">Acceptées</p></div>
          </div>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'all' : 'COMPLETED')}
          className={cn('relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:shadow-md', statusFilter === 'COMPLETED' ? 'border-teal-300 bg-teal-50 ring-2 ring-teal-200' : 'border-teal-200 bg-teal-50/50')}>
          <div className="flex items-center gap-3">
            <MapPin className="size-8 text-teal-500" />
            <div><p className="text-xl sm:text-2xl font-bold text-teal-700">{completedVisits.length}</p><p className="text-xs text-teal-600">Terminées</p></div>
          </div>
        </button>
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Rechercher par locataire ou bien..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'PENDING', label: 'En attente' },
            { value: 'ACCEPTED', label: 'Acceptée' },
            { value: 'COMPLETED', label: 'Terminée' },
            { value: 'REJECTED', label: 'Refusée' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                statusFilter === tab.value
                  ? 'bg-brand-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {tab.label}
            </button>
          ))}
          <Button variant="outline" size="sm" className="gap-1 ml-auto" onClick={() => toast.info('Rappels envoyés')}>
            <Bell className="size-3" /> Envoyer rappels
          </Button>
        </div>
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
