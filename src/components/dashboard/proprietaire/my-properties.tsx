'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2, Edit, Eye, Power, PlusCircle, FileText, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { AddProperty } from './add-property'

interface PropertyItem {
  id: string; title: string; type: string; price: number; city: string; commune: string | null; status: string
  bedrooms: number | null; bathrooms: number | null; area: number; isFurnished: boolean; hasParking: boolean; hasGarden: boolean; hasPool: boolean
  images: Array<{ url: string; order: number }>
}

export function MyProperties() {
  const { isAuthenticated } = useAuthStore()
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ properties?: PropertyItem[] }>('/api/dashboard/proprietaire')
      setProperties(d.properties || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        setProperties([])
        return
      }
      setProperties([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleResumeDraft = (id: string) => {
    setEditingId(id)
    setShowAddForm(true)
  }

  const handlePublishDraft = async (id: string) => {
    try {
      await authFetch(`/api/properties/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      })
      toast.success('Bien publié avec succès !')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la publication')
    }
  }

  const handleDeleteDraft = async (id: string) => {
    try {
      await authFetch(`/api/properties/${id}`, {
        method: 'DELETE',
      })
      toast.success('Brouillon supprimé')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  const handleFormSuccess = () => {
    setShowAddForm(false)
    setEditingId(null)
    setLoading(true)
    fetchData()
  }

  const handleFormCancel = () => {
    setShowAddForm(false)
    setEditingId(null)
  }

  // If showing the add/edit form, render it instead
  if (showAddForm) {
    return (
      <AddProperty
        editId={editingId || undefined}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    )
  }

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}</div>

  const typeLabels: Record<string, string> = {
    APPARTEMENT: 'Appartement', MAISON: 'Maison', STUDIO: 'Studio',
    DUPLEX: 'Duplex', PENTHOUSE: 'Penthouse', VILLA: 'Villa',
  }

  // Separate drafts from published properties
  const drafts = properties.filter((p) => p.status === 'DRAFT')
  const published = properties.filter((p) => p.status !== 'DRAFT')

  const statusConfig: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: 'Actif', className: 'bg-green-100 text-green-700' },
    SUSPENDED: { label: 'Suspendu', className: 'bg-amber-100 text-amber-700' },
    CLOSED: { label: 'Fermé', className: 'bg-neutral-100 text-neutral-600' },
    RENTED: { label: 'Loué', className: 'bg-blue-100 text-blue-700' },
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes biens</h1>
          <p className="text-muted-foreground mt-1">{properties.length} bien(s) enregistré(s)</p>
        </div>
        <Button
          onClick={() => { setEditingId(null); setShowAddForm(true) }}
          className="gap-2 bg-brand-500 hover:bg-brand-600 text-white"
        >
          <PlusCircle className="size-4" />
          <span className="hidden sm:inline">Ajouter un bien</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-brand-50">
                <Building2 className="size-8 text-brand-500" />
              </div>
              <div>
                <p className="text-foreground font-semibold">Aucun bien enregistré</p>
                <p className="text-sm text-muted-foreground mt-1">Ajoutez votre premier bien immobilier</p>
              </div>
              <Button
                onClick={() => { setEditingId(null); setShowAddForm(true) }}
                className="gap-2 bg-brand-500 hover:bg-brand-600 text-white"
              >
                <PlusCircle className="size-4" />
                Ajouter mon premier bien
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Drafts section ──────────────────────────────────────────── */}
          {drafts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-foreground">Brouillons ({drafts.length})</h2>
                <p className="text-xs text-muted-foreground">— Reprenez où vous vous êtes arrêté</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {drafts.map((p) => (
                  <Card key={p.id} className="border-amber-200 bg-amber-50/30 overflow-hidden hover:shadow-md transition-shadow">
                    {p.images?.[0] ? (
                      <div className="aspect-video relative overflow-hidden bg-muted">
                        <img src={p.images[0].url} alt={p.title || 'Brouillon'} className="size-full object-cover" />
                        <Badge className="absolute top-2 right-2 bg-amber-100 text-amber-700">
                          Brouillon
                        </Badge>
                      </div>
                    ) : (
                      <div className="aspect-video relative bg-muted flex items-center justify-center">
                        <Building2 className="size-10 text-muted-foreground/30" />
                        <Badge className="absolute top-2 right-2 bg-amber-100 text-amber-700">
                          Brouillon
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground">{p.title || 'Sans titre'}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {p.city || 'Ville non renseignée'}{p.commune ? ` · ${p.commune}` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {p.type && <Badge variant="outline" className="text-xs">{typeLabels[p.type] || p.type}</Badge>}
                        {p.area > 0 && <span className="text-xs text-muted-foreground">{p.area} m²</span>}
                      </div>
                      {p.price > 0 && (
                        <p className="text-lg font-bold text-brand-600 mt-2">
                          {p.price.toLocaleString('fr-FR')} <span className="text-sm font-normal text-muted-foreground">FCFA/mois</span>
                        </p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 gap-1 bg-brand-500 hover:bg-brand-600 text-white"
                          onClick={() => handleResumeDraft(p.id)}
                        >
                          <Edit className="size-3.5" /> Reprendre
                        </Button>
                        {p.title && p.description && p.price > 0 && p.area > 0 && p.address && p.city && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handlePublishDraft(p.id)}
                          >
                            Publier
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                          onClick={() => handleDeleteDraft(p.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ── Published properties section ────────────────────────────── */}
          {published.length > 0 && (
            <div className="space-y-3">
              {drafts.length > 0 && (
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-emerald-500" />
                  <h2 className="text-sm font-semibold text-foreground">Biens publiés ({published.length})</h2>
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {published.map((p) => {
                  const status = statusConfig[p.status] || { label: p.status, className: 'bg-neutral-100 text-neutral-600' }
                  return (
                    <Card key={p.id} className="border-border overflow-hidden hover:shadow-md transition-shadow">
                      {p.images?.[0] ? (
                        <div className="aspect-video relative overflow-hidden bg-muted">
                          <img src={p.images[0].url} alt={p.title} className="size-full object-cover" />
                          <Badge className={`absolute top-2 right-2 ${status.className}`}>
                            {status.label}
                          </Badge>
                        </div>
                      ) : (
                        <div className="aspect-video relative bg-muted flex items-center justify-center">
                          <Building2 className="size-10 text-muted-foreground/30" />
                          <Badge className={`absolute top-2 right-2 ${status.className}`}>
                            {status.label}
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-foreground">{p.title}</h3>
                        <p className="text-sm text-muted-foreground mt-0.5">{p.city}{p.commune ? ` · ${p.commune}` : ''}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{typeLabels[p.type] || p.type}</Badge>
                          {p.bedrooms && <span className="text-xs text-muted-foreground">{p.bedrooms} ch.</span>}
                          <span className="text-xs text-muted-foreground">{p.area} m²</span>
                        </div>
                        <p className="text-lg font-bold text-brand-600 mt-2">
                          {p.price.toLocaleString('fr-FR')} <span className="text-sm font-normal text-muted-foreground">FCFA/mois</span>
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button variant="outline" size="sm" className="flex-1 gap-1">
                            <Edit className="size-3.5" /> Modifier
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1">
                            <Power className="size-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
