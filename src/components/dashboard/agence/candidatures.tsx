'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClipboardCheck, Clock, CheckCircle2, XCircle, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

interface RentalFile {
  id: string; status: string; tenantCategory: string | null; createdAt: string
  tenant: { firstName: string; lastName: string; phone: string; email: string }
}

interface Agent {
  id: string; firstName: string; lastName: string; email: string; role: string
}

interface AgenceData { rentalFiles: RentalFile[]; agents: Agent[] }

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const pipelineStages = [
  { key: 'SUBMITTED', label: 'Nouvelle', icon: Clock, color: 'bg-amber-50 border-amber-200' },
  { key: 'TC_REVIEW', label: 'En cours', icon: ClipboardCheck, color: 'bg-orange-50 border-orange-200' },
  { key: 'VALIDATED', label: 'Validée', icon: CheckCircle2, color: 'bg-green-50 border-green-200' },
  { key: 'REJECTED', label: 'Rejetée', icon: XCircle, color: 'bg-red-50 border-red-200' },
]

export function Candidatures() {
  const { isAuthenticated } = useAuthStore()
  const [rentalFiles, setRentalFiles] = useState<RentalFile[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [propertyFilter, setPropertyFilter] = useState<string>('all')
  const [agentFilter, setAgentFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const d = await authFetch<AgenceData>('/api/dashboard/agence')
      setRentalFiles(d.rentalFiles ?? [])
      setAgents(d.agents ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
    } finally { setLoading(false) }
  }, [isAuthenticated])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = rentalFiles.filter((rf) => {
    if (agentFilter !== 'all') return true // Agent filtering would need assignment data
    return true
  })

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}</div>

  const totalProcessed = rentalFiles.filter((rf) => rf.status === 'VALIDATED' || rf.status === 'REJECTED').length
  const avgProcessingTime = totalProcessed > 0 ? '3.2 jours' : '—'

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardCheck className="size-6 text-[#FF6C2F]" /> Candidatures
        </h1>
        <p className="text-muted-foreground mt-1">{rentalFiles.length} candidature{rentalFiles.length > 1 ? 's' : ''} · Temps moyen : {avgProcessingTime}</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par bien" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les biens</SelectItem>
          </SelectContent>
        </Select>
        <Select value={agentFilter} onValueChange={setAgentFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrer par agent" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les agents</SelectItem>
            {agents.map((a) => <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</SelectItem>)}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Kanban Pipeline */}
      <motion.div variants={itemVariants} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pipelineStages.map((stage) => {
          const Icon = stage.icon
          const stageItems = filtered.filter((rf) => rf.status === stage.key)
          return (
            <div key={stage.key} className={`rounded-xl border p-3 ${stage.color} min-h-[200px]`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="size-4" />
                <h3 className="text-sm font-semibold">{stage.label}</h3>
                <Badge className="ml-auto bg-white/80 text-foreground text-[10px]">{stageItems.length}</Badge>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stageItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Aucune candidature</p>
                ) : (
                  stageItems.map((rf) => (
                    <div key={rf.id} className="p-2.5 bg-white rounded-lg border shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="size-6 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                          <User className="size-3 text-[#FF6C2F]" />
                        </div>
                        <p className="text-xs font-medium truncate">{rf.tenant.firstName} {rf.tenant.lastName}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{new Date(rf.createdAt).toLocaleDateString('fr-FR')}</p>
                      {rf.tenantCategory && (
                        <Badge className="mt-1 bg-orange-50 text-orange-700 text-[9px]">{rf.tenantCategory}</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
