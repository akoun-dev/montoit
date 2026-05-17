'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Users, UserPlus, Search, Pencil, Trash2, Power, PowerOff,
  Phone, Mail, User, ShieldCheck, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { useAuthStore } from '@/lib/auth-store'
import { ViewModeToggle, type ViewMode } from './view-mode-toggle'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Agent {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  isActive: boolean
  createdAt: string
  _count?: {
    missions: number
    activeMissions: number
  }
}

interface AgentFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
}

// API returns array directly

// ─── Validation ─────────────────────────────────────────────────────────────

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(data: AgentFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.firstName.trim()) errors.firstName = 'Le prénom est requis'
  if (!data.lastName.trim()) errors.lastName = 'Le nom est requis'
  if (!data.email.trim()) errors.email = "L'email est requis"
  else if (!emailRegex.test(data.email)) errors.email = "Format d'email invalide"
  return errors
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AgentsManagement() {
  const { isAuthenticated } = useAuthStore()

  // Data
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  const [search, setSearch] = useState('')

  // Dialogs
  const [formDialog, setFormDialog] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    agent: Agent | null
  }>({ open: false, mode: 'create', agent: null })
  const [formData, setFormData] = useState<AgentFormData>({
    firstName: '', lastName: '', email: '', phone: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; agent: Agent | null }>({
    open: false, agent: null,
  })

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const data = await authFetch<Agent[]>('/api/tc/agents')
      setAgents(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setAgents([])
        return
      }
      setAgents([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Filtered agents ──────────────────────────────────────────────────

  const filteredAgents = agents.filter((a) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      a.firstName.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.phone && a.phone.includes(q))
    )
  })

  // ─── Stats ─────────────────────────────────────────────────────────────

  const totalAgents = agents.length
  const activeAgents = agents.filter((a) => a.isActive).length
  const onMission = agents.filter((a) => (a._count?.activeMissions ?? 0) > 0).length
  const completedMissions = agents.reduce((sum, a) => sum + (a._count?.missions ?? 0), 0)

  // ─── Form handlers ─────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setFormData({ firstName: '', lastName: '', email: '', phone: '' })
    setFormErrors({})
    setFormDialog({ open: true, mode: 'create', agent: null })
  }

  const openEditDialog = (agent: Agent) => {
    setFormData({
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      phone: agent.phone || '',
    })
    setFormErrors({})
    setFormDialog({ open: true, mode: 'edit', agent })
  }

  const handleFormSubmit = async () => {
    const errors = validateForm(formData)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    try {
      if (formDialog.mode === 'create') {
        await authFetch('/api/tc/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        toast.success('Agent créé avec succès !')
      } else if (formDialog.agent) {
        await authFetch('/api/tc/agents', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: formDialog.agent.id, ...formData }),
        })
        toast.success('Agent mis à jour !')
      }
      setFormDialog({ open: false, mode: 'create', agent: null })
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'opération")
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Toggle active ─────────────────────────────────────────────────────

  const handleToggleActive = async (agent: Agent) => {
    setActionLoading(agent.id)
    try {
      await authFetch('/api/tc/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agent.id, isActive: !agent.isActive }),
      })
      toast.success(agent.isActive ? 'Agent désactivé' : 'Agent activé')
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteDialog.agent) return
    setActionLoading(deleteDialog.agent.id)
    try {
      await authFetch('/api/tc/agents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteDialog.agent.id }),
      })
      toast.success('Agent supprimé')
      setDeleteDialog({ open: false, agent: null })
      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
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
          <h1 className="text-2xl font-bold text-foreground">Agents de vérification</h1>
          <p className="text-muted-foreground mt-1">Gérez vos agents de vérification terrain</p>
        </div>
        <Button className="bg-brand-500 hover:bg-brand-600 text-white gap-2 shrink-0" onClick={openCreateDialog}>
          <UserPlus className="size-4" /> Nouvel agent
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                <Users className="size-5 text-brand-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalAgents}</p>
                <p className="text-xs text-muted-foreground">Total agents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-green-50">
                <ShieldCheck className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{activeAgents}</p>
                <p className="text-xs text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50">
                <Users className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{onMission}</p>
                <p className="text-xs text-muted-foreground">En mission</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50">
                <ShieldCheck className="size-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{completedMissions}</p>
                <p className="text-xs text-muted-foreground">Missions terminées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Search + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Empty state */}
      {filteredAgents.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Users className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              {agents.length === 0 ? 'Aucun agent enregistré' : 'Aucun agent trouvé'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {agents.length === 0
                ? 'Ajoutez votre premier agent de vérification'
                : 'Essayez une autre recherche'}
            </p>
            {agents.length === 0 && (
              <Button
                className="bg-brand-500 hover:bg-brand-600 text-white gap-2 mt-4"
                onClick={openCreateDialog}
              >
                <UserPlus className="size-4" /> Ajouter un agent
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        /* ─── Card View ──────────────────────────────────────────────── */
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filteredAgents.map((agent) => (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn('border hover:shadow-md transition-shadow', agent.isActive ? 'border-border' : 'border-border opacity-60')}>
                  <CardContent className="p-4 sm:p-6">
                    {/* Agent info row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'size-12 rounded-full flex items-center justify-center shrink-0',
                          agent.isActive ? 'bg-brand-500/10' : 'bg-muted'
                        )}>
                          <User className={cn('size-6', agent.isActive ? 'text-brand-500' : 'text-muted-foreground')} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {agent.firstName} {agent.lastName}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="size-3.5 shrink-0" />
                            <span className="truncate">{agent.email}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={agent.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                        {agent.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                      {agent.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="size-3.5 shrink-0" />
                          <span className="truncate">{agent.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 shrink-0" />
                        <span>{agent._count?.missions ?? 0} mission(s)</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 flex-1 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(agent)}
                        disabled={actionLoading === agent.id}
                      >
                        <Pencil className="size-3.5" /> Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                          'gap-1 flex-1',
                          agent.isActive
                            ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        )}
                        onClick={() => handleToggleActive(agent)}
                        disabled={actionLoading === agent.id}
                      >
                        {actionLoading === agent.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : agent.isActive ? (
                          <PowerOff className="size-3.5" />
                        ) : (
                          <Power className="size-3.5" />
                        )}
                        {agent.isActive ? 'Désactiver' : 'Activer'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                        onClick={() => setDeleteDialog({ open: true, agent })}
                        disabled={actionLoading === agent.id}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* ─── List View ──────────────────────────────────────────────── */
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-medium text-muted-foreground p-3">Nom</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden md:table-cell">Email</th>
                  <th className="text-left font-medium text-muted-foreground p-3 hidden lg:table-cell">Téléphone</th>
                  <th className="text-center font-medium text-muted-foreground p-3">Statut</th>
                  <th className="text-center font-medium text-muted-foreground p-3 hidden sm:table-cell">Missions</th>
                  <th className="text-right font-medium text-muted-foreground p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredAgents.map((agent) => (
                    <motion.tr
                      key={agent.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className={cn(
                        'border-b border-border hover:bg-muted/30 transition-colors',
                        !agent.isActive && 'opacity-60'
                      )}
                    >
                      {/* Name */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'size-8 rounded-full flex items-center justify-center shrink-0',
                            agent.isActive ? 'bg-brand-500/10' : 'bg-muted'
                          )}>
                            <User className={cn('size-4', agent.isActive ? 'text-brand-500' : 'text-muted-foreground')} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {agent.firstName} {agent.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate md:hidden">{agent.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="p-3 hidden md:table-cell">
                        <span className="text-muted-foreground truncate block max-w-[200px]">{agent.email}</span>
                      </td>

                      {/* Phone */}
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">
                        {agent.phone || '—'}
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        <Badge className={agent.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                          {agent.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>

                      {/* Missions */}
                      <td className="p-3 text-center hidden sm:table-cell">
                        <span className="font-medium text-foreground">{agent._count?.missions ?? 0}</span>
                      </td>

                      {/* Actions */}
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                            onClick={() => openEditDialog(agent)}
                            disabled={actionLoading === agent.id}
                            title="Modifier"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                              'h-8 w-8 p-0',
                              agent.isActive
                                ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                            )}
                            onClick={() => handleToggleActive(agent)}
                            disabled={actionLoading === agent.id}
                            title={agent.isActive ? 'Désactiver' : 'Activer'}
                          >
                            {actionLoading === agent.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : agent.isActive ? (
                              <PowerOff className="size-4" />
                            ) : (
                              <Power className="size-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                            onClick={() => setDeleteDialog({ open: true, agent })}
                            disabled={actionLoading === agent.id}
                            title="Supprimer"
                          >
                            <Trash2 className="size-4" />
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

      {/* ─── Add/Edit Agent Dialog ────────────────────────────────────── */}
      <Dialog
        open={formDialog.open}
        onOpenChange={(open) => {
          if (!open) setFormDialog({ open: false, mode: 'create', agent: null })
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formDialog.mode === 'create' ? 'Nouvel agent' : 'Modifier l\'agent'}
            </DialogTitle>
            <DialogDescription>
              {formDialog.mode === 'create'
                ? 'Ajoutez un nouvel agent de vérification terrain'
                : 'Modifiez les informations de l\'agent'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  placeholder="Prénom"
                  value={formData.firstName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  className={formErrors.firstName ? 'border-red-300' : ''}
                />
                {formErrors.firstName && (
                  <p className="text-xs text-red-600">{formErrors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  placeholder="Nom"
                  value={formData.lastName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  className={formErrors.lastName ? 'border-red-300' : ''}
                />
                {formErrors.lastName && (
                  <p className="text-xs text-red-600">{formErrors.lastName}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@example.com"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                className={formErrors.email ? 'border-red-300' : ''}
              />
              {formErrors.email && (
                <p className="text-xs text-red-600">{formErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                placeholder="+225 XX XX XX XX"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setFormDialog({ open: false, mode: 'create', agent: null })}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white"
              onClick={handleFormSubmit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
              {formDialog.mode === 'create' ? 'Créer l\'agent' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ────────────────────────────────── */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog({ open: false, agent: null })
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;agent</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l&apos;agent{' '}
              <span className="font-semibold text-foreground">
                {deleteDialog.agent?.firstName} {deleteDialog.agent?.lastName}
              </span>{' '}
              ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading !== null}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading !== null && <Loader2 className="size-4 animate-spin mr-2" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
