'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, Plus, Trash2, Search, ToggleLeft, ToggleRight, Loader2, MapPin, Building2, Euro } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface SearchAlert {
  id: string
  userId: string
  name: string
  searchQuery: string | null
  city: string | null
  propertyType: string | null
  minPrice: number | null
  maxPrice: number | null
  isActive: boolean
  lastNotifiedAt: string | null
  createdAt: string
  updatedAt: string
}

interface AlertsResponse {
  data: SearchAlert[]
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function SearchAlerts() {
  const { isAuthenticated } = useAuthStore()
  const [alerts, setAlerts] = useState<SearchAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formQuery, setFormQuery] = useState('')
  const [formCity, setFormCity] = useState('')
  const [formPropertyType, setFormPropertyType] = useState('')
  const [formMinPrice, setFormMinPrice] = useState('')
  const [formMaxPrice, setFormMaxPrice] = useState('')

  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const result = await authFetch<AlertsResponse>('/api/search-alerts')
      setAlerts(result.data ?? [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) return
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const resetForm = () => {
    setFormName('')
    setFormQuery('')
    setFormCity('')
    setFormPropertyType('')
    setFormMinPrice('')
    setFormMaxPrice('')
  }

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast.error('Le nom de l\'alerte est requis')
      return
    }
    setSaving(true)
    try {
      await authFetch('/api/search-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          searchQuery: formQuery.trim() || undefined,
          city: formCity.trim() || undefined,
          propertyType: formPropertyType || undefined,
          minPrice: formMinPrice ? Number(formMinPrice) : undefined,
          maxPrice: formMaxPrice ? Number(formMaxPrice) : undefined,
        }),
      })
      toast.success('Alerte créée avec succès')
      setShowCreateDialog(false)
      resetForm()
      fetchAlerts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (alert: SearchAlert) => {
    try {
      await authFetch(`/api/search-alerts?id=${alert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !alert.isActive }),
      })
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, isActive: !a.isActive } : a))
      )
      toast.success(alert.isActive ? 'Alerte désactivée' : 'Alerte activée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const handleDelete = async (alertId: string) => {
    try {
      await authFetch(`/api/search-alerts?id=${alertId}`, { method: 'DELETE' })
      setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      toast.success('Alerte supprimée')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  const buildAlertDescription = (alert: SearchAlert): string => {
    const parts: string[] = []
    if (alert.searchQuery) parts.push(`"${alert.searchQuery}"`)
    if (alert.city) parts.push(`📍 ${alert.city}`)
    if (alert.propertyType) {
      const labels: Record<string, string> = {
        APPARTEMENT: 'Appartement',
        MAISON: 'Maison',
        STUDIO: 'Studio',
        DUPLEX: 'Duplex',
        PENTHOUSE: 'Penthouse',
        VILLA: 'Villa',
      }
      parts.push(labels[alert.propertyType] || alert.propertyType)
    }
    if (alert.minPrice !== null || alert.maxPrice !== null) {
      const range = `${alert.minPrice ? formatCurrency(alert.minPrice) : '0'} → ${alert.maxPrice ? formatCurrency(alert.maxPrice) : '∞'}`
      parts.push(range)
    }
    return parts.join(' · ') || 'Recherche libre'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500/10 to-transparent rounded-xl p-4 sm:p-6 -mx-4 sm:-mx-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100 shrink-0">
            <Bell className="size-6 text-brand-500" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Alertes recherche</h1>
            <p className="text-muted-foreground mt-0.5">
              Soyez notifié dès qu&apos;un bien correspond à vos critères
            </p>
          </div>
          <Button
            className="bg-brand-500 hover:bg-brand-600 text-white gap-2 shrink-0"
            onClick={() => { resetForm(); setShowCreateDialog(true) }}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Nouvelle alerte</span>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="secondary" className="bg-brand-50 text-brand-700">
            {alerts.length} alerte{alerts.length > 1 ? 's' : ''}
          </Badge>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
            {alerts.filter((a) => a.isActive).length} active{alerts.filter((a) => a.isActive).length > 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Bell className="size-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">Aucune alerte de recherche</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Créez une alerte pour être notifié dès qu&apos;un bien correspondant à vos critères est publié
            </p>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
              onClick={() => { resetForm(); setShowCreateDialog(true) }}
            >
              <Plus className="size-4" />
              Créer une alerte
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-border transition-colors ${!alert.isActive ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Bell className={`size-4 shrink-0 ${alert.isActive ? 'text-brand-500' : 'text-muted-foreground'}`} />
                      <h3 className="font-semibold text-foreground text-sm truncate">{alert.name}</h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${alert.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-muted text-muted-foreground'}`}
                      >
                        {alert.isActive ? 'Active' : 'Désactivée'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {buildAlertDescription(alert)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                      <span>Créée le {formatDate(alert.createdAt)}</span>
                      {alert.lastNotifiedAt && (
                        <>
                          <span>·</span>
                          <span>Dernière notification : {formatDate(alert.lastNotifiedAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      onClick={() => handleToggle(alert)}
                      title={alert.isActive ? 'Désactiver' : 'Activer'}
                    >
                      {alert.isActive ? (
                        <ToggleRight className="size-5 text-brand-500" />
                      ) : (
                        <ToggleLeft className="size-5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(alert.id)}
                      title="Supprimer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-5 text-brand-500" />
              Nouvelle alerte de recherche
            </DialogTitle>
            <DialogDescription>
              Définissez les critères pour lesquels vous souhaitez être notifié
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nom de l&apos;alerte *</Label>
              <Input
                placeholder="Ex: Appartement 3 pièces Abidjan"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Mot-clé de recherche</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Ex: 3 pièces, jardin, parking..."
                  value={formQuery}
                  onChange={(e) => setFormQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ville</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Ex: Abidjan"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Type de bien</Label>
                <Select value={formPropertyType} onValueChange={setFormPropertyType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPARTEMENT">Appartement</SelectItem>
                    <SelectItem value="MAISON">Maison</SelectItem>
                    <SelectItem value="STUDIO">Studio</SelectItem>
                    <SelectItem value="DUPLEX">Duplex</SelectItem>
                    <SelectItem value="PENTHOUSE">Penthouse</SelectItem>
                    <SelectItem value="VILLA">Villa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Budget mensuel (FCFA)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Min"
                  value={formMinPrice}
                  onChange={(e) => setFormMinPrice(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={formMaxPrice}
                  onChange={(e) => setFormMaxPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-700">
                Vous recevrez une notification lorsqu&apos;un bien correspondant à ces critères sera publié sur la plateforme.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Annuler
            </Button>
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white gap-2"
              onClick={handleCreate}
              disabled={saving || !formName.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <Bell className="size-4" />
                  Créer l&apos;alerte
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
