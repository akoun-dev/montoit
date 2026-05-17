'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  MapPin, User, Calendar, ChevronLeft, ChevronRight, Plus,
  Search, Clock, CheckCircle2, XCircle, Loader2, Home, FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useAuthStore } from '@/lib/auth-store'
import { ViewModeToggle, type ViewMode } from './view-mode-toggle'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

type MissionStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
type MissionType = 'PROPERTY_VERIFICATION' | 'INVENTORY_REPORT'

interface Mission {
  id: string
  type: MissionType
  status: MissionStatus
  scheduledAt: string
  notes: string | null
  tcComment: string | null
  completedAt: string | null
  createdAt: string
  property: {
    id: string
    title: string
    address: string
    commune: string
  }
  agent: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

interface AgentOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface PropertyOption {
  id: string
  title: string
  address: string
  commune: string
}

// API returns array directly

interface ApiAgentsResponse {
  agents: AgentOption[]
}

interface ApiPropertiesResponse {
  properties: PropertyOption[]
  pagination?: { total: number }
}

// ─── Labels & Colors ────────────────────────────────────────────────────────

const statusLabels: Record<MissionStatus, string> = {
  ASSIGNED: 'Assignée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
}

const statusColors: Record<MissionStatus, string> = {
  ASSIGNED: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-brand-100 text-brand-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

const statusDotColors: Record<MissionStatus, string> = {
  ASSIGNED: 'bg-amber-500',
  IN_PROGRESS: 'bg-brand-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-gray-400',
}

const typeLabels: Record<MissionType, string> = {
  PROPERTY_VERIFICATION: 'Vérification bien',
  INVENTORY_REPORT: 'État des lieux',
}

const typeColors: Record<MissionType, string> = {
  PROPERTY_VERIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
  INVENTORY_REPORT: 'bg-brand-50 text-brand-700 border-brand-200',
}

// ─── Calendar Helpers ───────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

// ─── Component ──────────────────────────────────────────────────────────────

export function MissionsManagement() {
  const { isAuthenticated } = useAuthStore()

  // Data
  const [missions, setMissions] = useState<Mission[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [activeTab, setActiveTab] = useState<string>('calendar')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'ALL'>('ALL')
  const [agentFilter, setAgentFilter] = useState<string>('ALL')
  const [typeFilter, setTypeFilter] = useState<MissionType | 'ALL'>('ALL')

  // Calendar
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Dialogs
  const [createDialog, setCreateDialog] = useState(false)
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; mission: Mission | null }>({
    open: false, mission: null,
  })

  // Create form
  const [createForm, setCreateForm] = useState({
    propertyId: '',
    agentId: '',
    type: 'PROPERTY_VERIFICATION' as MissionType,
    scheduledAt: '',
    notes: '',
  })
  const [creating, setCreating] = useState(false)

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchMissions = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const data = await authFetch<Mission[]>('/api/tc/missions')
      setMissions(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setMissions([])
        return
      }
      setMissions([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const fetchAgents = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await authFetch<AgentOption[] | { agents: AgentOption[] }>('/api/tc/agents?isActive=true')
      setAgents(Array.isArray(data) ? data : (data as { agents: AgentOption[] }).agents || [])
    } catch {
      // Silent fail
    }
  }, [isAuthenticated])

  const fetchProperties = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await authFetch<{ properties: PropertyOption[]; pagination: { total: number } }>('/api/tc/verifications')
      setProperties(data.properties || [])
    } catch {
      // Silent fail
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchMissions()
    fetchAgents()
    fetchProperties()
  }, [fetchMissions, fetchAgents, fetchProperties])

  // ─── Calendar data ─────────────────────────────────────────────────────

  const missionsByDate = useMemo(() => {
    const map: Record<string, Mission[]> = {}
    missions.forEach((m) => {
      const dateKey = formatDateKey(new Date(m.scheduledAt))
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(m)
    })
    return map
  }, [missions])

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth)
    const firstDay = getFirstDayOfMonth(calYear, calMonth)
    // Adjust so Monday is the first day (0=Mon, 6=Sun)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1
    const days: (number | null)[] = []
    for (let i = 0; i < adjustedFirstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(d)
    return days
  }, [calYear, calMonth])

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) }
    else setCalMonth(calMonth - 1)
  }

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) }
    else setCalMonth(calMonth + 1)
  }

  const selectedDayMissions = useMemo(() => {
    if (!selectedDay) return []
    return missionsByDate[selectedDay] || []
  }, [selectedDay, missionsByDate])

  const todayKey = formatDateKey(today)

  // ─── Filtered missions ────────────────────────────────────────────────

  const filteredMissions = missions.filter((m) => {
    if (statusFilter !== 'ALL' && m.status !== statusFilter) return false
    if (agentFilter !== 'ALL' && m.agent?.id !== agentFilter) return false
    if (typeFilter !== 'ALL' && m.type !== typeFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        m.property.title.toLowerCase().includes(q) ||
        m.property.address.toLowerCase().includes(q) ||
        (m.agent && `${m.agent.firstName} ${m.agent.lastName}`.toLowerCase().includes(q))
      )
    }
    return true
  })

  // ─── Create mission ───────────────────────────────────────────────────

  const openCreateDialog = () => {
    setCreateForm({
      propertyId: '',
      agentId: '',
      type: 'PROPERTY_VERIFICATION',
      scheduledAt: '',
      notes: '',
    })
    setCreateDialog(true)
  }

  const handleCreate = async () => {
    if (!createForm.propertyId || !createForm.agentId || !createForm.scheduledAt) {
      toast.error('Veuillez remplir tous les champs requis')
      return
    }
    setCreating(true)
    try {
      await authFetch('/api/tc/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      toast.success('Mission créée avec succès !')
      setCreateDialog(false)
      await fetchMissions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  // ─── Status workflow ──────────────────────────────────────────────────

  const handleStatusChange = async (missionId: string, newStatus: MissionStatus) => {
    setActionLoading(missionId)
    try {
      await authFetch('/api/tc/missions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: missionId, status: newStatus }),
      })
      toast.success('Statut mis à jour !')
      setDetailDialog({ open: false, mission: null })
      await fetchMissions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Loading skeleton ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Missions de vérification</h1>
          <p className="text-muted-foreground mt-1">Planifiez et suivez les missions terrain</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2 shrink-0" onClick={openCreateDialog}>
          <Plus className="size-4" /> Nouvelle mission
        </Button>
      </div>

      {/* View Toggle: Calendar / List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <TabsList className="bg-muted">
            <TabsTrigger value="calendar" className="gap-1.5">
              <Calendar className="size-4" /> Calendrier
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5">
              <Search className="size-4" /> Liste
            </TabsTrigger>
          </TabsList>

          {activeTab === 'list' && (
            <div className="flex gap-2 items-center">
              <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          )}
        </div>

        {/* ─── CALENDAR VIEW ────────────────────────────────────────────── */}
        <TabsContent value="calendar" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Calendar grid */}
            <Card className="border-border lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={prevMonth}>
                    <ChevronLeft className="size-4" />
                  </Button>
                  <CardTitle className="text-base font-semibold">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={nextMonth}>
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="aspect-square" />
                    }
                    const dateKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayMissions = missionsByDate[dateKey] || []
                    const isToday = dateKey === todayKey
                    const isSelected = dateKey === selectedDay

                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedDay(dateKey === selectedDay ? null : dateKey)}
                        className={cn(
                          'aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative transition-colors',
                          isSelected
                            ? 'bg-brand-500 text-white'
                            : isToday
                              ? 'bg-brand-50 text-brand-700 font-semibold'
                              : 'hover:bg-muted text-foreground',
                          dayMissions.length > 0 && !isSelected && 'font-medium'
                        )}
                      >
                        <span>{day}</span>
                        {dayMissions.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {dayMissions.slice(0, 3).map((m, mi) => (
                              <div
                                key={mi}
                                className={cn(
                                  'size-1.5 rounded-full',
                                  isSelected ? 'bg-white' : statusDotColors[m.status]
                                )}
                              />
                            ))}
                            {dayMissions.length > 3 && (
                              <span className={cn('text-[8px] leading-none', isSelected ? 'text-white/70' : 'text-muted-foreground')}>
                                +{dayMissions.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Day detail panel */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  {selectedDay
                    ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('fr-FR', {
                        weekday: 'long', day: 'numeric', month: 'long',
                      })
                    : 'Sélectionnez un jour'}
                </CardTitle>
                {selectedDay && (
                  <CardDescription>
                    {selectedDayMissions.length} mission(s)
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                {!selectedDay ? (
                  <div className="py-8 text-center">
                    <Calendar className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Cliquez sur un jour pour voir les missions</p>
                  </div>
                ) : selectedDayMissions.length === 0 ? (
                  <div className="py-8 text-center">
                    <Clock className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune mission ce jour</p>
                  </div>
                ) : (
                  selectedDayMissions.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setDetailDialog({ open: true, mission: m })}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <Badge className={typeColors[m.type]} variant="outline">
                          {typeLabels[m.type]}
                        </Badge>
                        <Badge className={statusColors[m.status]}>
                          {statusLabels[m.status]}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{m.property.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{m.property.address}, {m.property.commune}</span>
                      </p>
                      {m.agent && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <User className="size-3 shrink-0" />
                          {m.agent.firstName} {m.agent.lastName}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── LIST VIEW ────────────────────────────────────────────────── */}
        <TabsContent value="list" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 min-w-0 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une mission..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as MissionStatus | 'ALL')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les statuts</SelectItem>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les agents</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.firstName} {a.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as MissionType | 'ALL')}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous les types</SelectItem>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Empty state */}
          {filteredMissions.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Calendar className="size-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Aucune mission trouvée</p>
                <p className="text-sm text-muted-foreground mt-1">Créez une nouvelle mission pour commencer</p>
              </CardContent>
            </Card>
          ) : viewMode === 'card' ? (
            /* ─── Card View ─── */
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {filteredMissions.map((m) => (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-border hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-6">
                        {/* Header row */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'flex size-10 items-center justify-center rounded-lg shrink-0',
                              m.type === 'PROPERTY_VERIFICATION' ? 'bg-amber-50' : 'bg-brand-50'
                            )}>
                              {m.type === 'PROPERTY_VERIFICATION' ? (
                                <Home className="size-5 text-amber-600" />
                              ) : (
                                <FileText className="size-5 text-brand-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <Badge className={typeColors[m.type]} variant="outline">
                                {typeLabels[m.type]}
                              </Badge>
                            </div>
                          </div>
                          <Badge className={statusColors[m.status]}>{statusLabels[m.status]}</Badge>
                        </div>

                        {/* Property info */}
                        <h3 className="font-semibold text-foreground truncate mb-1">{m.property.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                          <MapPin className="size-3.5 shrink-0" />
                          <span className="truncate">{m.property.address}, {m.property.commune}</span>
                        </p>

                        {/* Agent + date */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          {m.agent && (
                            <div className="flex items-center gap-1">
                              <User className="size-3.5 shrink-0" />
                              <span>{m.agent.firstName} {m.agent.lastName}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="size-3.5 shrink-0" />
                            <span>{new Date(m.scheduledAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>

                        {/* Action */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-brand-500 border-brand-200 hover:bg-brand-50"
                          onClick={() => setDetailDialog({ open: true, mission: m })}
                        >
                          Voir les détails
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            /* ─── List View ─── */
            <Card className="border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left font-medium text-muted-foreground p-3">Bien</th>
                      <th className="text-left font-medium text-muted-foreground p-3 hidden md:table-cell">Agent</th>
                      <th className="text-center font-medium text-muted-foreground p-3">Type</th>
                      <th className="text-left font-medium text-muted-foreground p-3 hidden sm:table-cell">Date</th>
                      <th className="text-center font-medium text-muted-foreground p-3">Statut</th>
                      <th className="text-right font-medium text-muted-foreground p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {filteredMissions.map((m) => (
                        <motion.tr
                          key={m.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate max-w-[180px]">{m.property.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.property.commune}</p>
                            </div>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            {m.agent ? (
                              <span className="text-muted-foreground">{m.agent.firstName} {m.agent.lastName}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={typeColors[m.type]} variant="outline">
                              {typeLabels[m.type]}
                            </Badge>
                          </td>
                          <td className="p-3 hidden sm:table-cell text-muted-foreground">
                            {new Date(m.scheduledAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={statusColors[m.status]}>{statusLabels[m.status]}</Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-brand-500 hover:text-brand-600 hover:bg-brand-50 h-8 px-3 text-xs"
                                onClick={() => setDetailDialog({ open: true, mission: m })}
                              >
                                Détails
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Create Mission Dialog ──────────────────────────────────────── */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle mission</DialogTitle>
            <DialogDescription>Planifiez une nouvelle mission de vérification terrain</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Property */}
            <div className="space-y-2">
              <Label>Bien à vérifier *</Label>
              <Select
                value={createForm.propertyId}
                onValueChange={(v) => setCreateForm((prev) => ({ ...prev, propertyId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un bien" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} — {p.commune}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {properties.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun bien en attente de vérification</p>
              )}
            </div>

            {/* Agent */}
            <div className="space-y-2">
              <Label>Agent *</Label>
              <Select
                value={createForm.agentId}
                onValueChange={(v) => setCreateForm((prev) => ({ ...prev, agentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.filter((a) => a.isActive !== false).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.firstName} {a.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type de mission *</Label>
              <Select
                value={createForm.type}
                onValueChange={(v) => setCreateForm((prev) => ({ ...prev, type: v as MissionType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROPERTY_VERIFICATION">Vérification bien</SelectItem>
                  <SelectItem value="INVENTORY_REPORT">État des lieux</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Date planifiée *</Label>
              <Input
                id="scheduledAt"
                type="date"
                value={createForm.scheduledAt}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, scheduledAt: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Instructions ou informations complémentaires..."
                value={createForm.notes}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateDialog(false)} disabled={creating}>
              Annuler
            </Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white"
              onClick={handleCreate}
              disabled={creating || !createForm.propertyId || !createForm.agentId || !createForm.scheduledAt}
            >
              {creating && <Loader2 className="size-4 animate-spin mr-2" />}
              Créer la mission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Mission Detail Dialog ──────────────────────────────────────── */}
      <Dialog
        open={detailDialog.open}
        onOpenChange={(open) => {
          if (!open) setDetailDialog({ open: false, mission: null })
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de la mission</DialogTitle>
            <DialogDescription>
              {detailDialog.mission && typeLabels[detailDialog.mission.type]}
            </DialogDescription>
          </DialogHeader>
          {detailDialog.mission && (
            <div className="space-y-4 py-2">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Statut</span>
                <Badge className={statusColors[detailDialog.mission.status]}>
                  {statusLabels[detailDialog.mission.status]}
                </Badge>
              </div>

              {/* Property */}
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-sm font-medium text-foreground">{detailDialog.mission.property.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="size-3 shrink-0" />
                  {detailDialog.mission.property.address}, {detailDialog.mission.property.commune}
                </p>
              </div>

              {/* Agent */}
              {detailDialog.mission.agent && (
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                    <User className="size-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {detailDialog.mission.agent.firstName} {detailDialog.mission.agent.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{detailDialog.mission.agent.email}</p>
                  </div>
                </div>
              )}

              {/* Scheduled date */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Planifié le :</span>
                <span className="font-medium text-foreground">
                  {new Date(detailDialog.mission.scheduledAt).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>

              {/* Completed date */}
              {detailDialog.mission.completedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-green-600" />
                  <span className="text-muted-foreground">Terminé le :</span>
                  <span className="font-medium text-foreground">
                    {new Date(detailDialog.mission.completedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}

              {/* Notes */}
              {detailDialog.mission.notes && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm text-foreground">{detailDialog.mission.notes}</p>
                </div>
              )}

              {/* TC Comment */}
              {detailDialog.mission.tcComment && (
                <div className="p-3 rounded-lg bg-brand-50 border border-brand-200">
                  <p className="text-xs font-medium text-brand-700 mb-1">Commentaire TC</p>
                  <p className="text-sm text-foreground">{detailDialog.mission.tcComment}</p>
                </div>
              )}

              {/* Status workflow buttons */}
              <div className="flex gap-2 pt-2 border-t border-border">
                {detailDialog.mission.status === 'ASSIGNED' && (
                  <Button
                    className="bg-brand-500 hover:bg-brand-600 text-white gap-1 flex-1"
                    onClick={() => handleStatusChange(detailDialog.mission!.id, 'IN_PROGRESS')}
                    disabled={actionLoading === detailDialog.mission.id}
                  >
                    {actionLoading === detailDialog.mission.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Clock className="size-4" />
                    )}
                    Démarrer
                  </Button>
                )}
                {detailDialog.mission.status === 'IN_PROGRESS' && (
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white gap-1 flex-1"
                      onClick={() => handleStatusChange(detailDialog.mission!.id, 'COMPLETED')}
                      disabled={actionLoading === detailDialog.mission.id}
                    >
                      {actionLoading === detailDialog.mission.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Terminer
                    </Button>
                    <Button
                      variant="outline"
                      className="text-gray-600 border-gray-200 hover:bg-gray-50 gap-1"
                      onClick={() => handleStatusChange(detailDialog.mission!.id, 'CANCELLED')}
                      disabled={actionLoading === detailDialog.mission.id}
                    >
                      <XCircle className="size-4" />
                      Annuler
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
