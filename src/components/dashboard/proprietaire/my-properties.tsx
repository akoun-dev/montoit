'use client'

import { useCallback, useEffect, useState } from 'react'
import { Building2, Edit, Eye, Power } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/auth-store'
import { authFetch, AuthError } from '@/lib/auth-fetch'
import { motion } from 'framer-motion'

export function MyProperties() {
  const { isAuthenticated } = useAuthStore()
  const [properties, setProperties] = useState<Array<{
    id: string; title: string; type: string; price: number; city: string; commune: string | null; status: string
    bedrooms: number | null; bathrooms: number | null; area: number; isFurnished: boolean; hasParking: boolean; hasGarden: boolean; hasPool: boolean
    images: Array<{ url: string; order: number }>
  }>>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      const d = await authFetch<{ properties?: Array<{
        id: string; title: string; type: string; price: number; city: string; commune: string | null; status: string
        bedrooms: number | null; bathrooms: number | null; area: number; isFurnished: boolean; hasParking: boolean; hasGarden: boolean; hasPool: boolean
        images: Array<{ url: string; order: number }>
      }> }>('/api/dashboard/proprietaire')
      setProperties(d.properties || [])
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        // authFetch already handled logout — just show default data
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

  if (loading) return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />)}</div>

  const typeLabels: Record<string, string> = {
    APPARTEMENT: 'Appartement', MAISON: 'Maison', STUDIO: 'Studio',
    DUPLEX: 'Duplex', PENTHOUSE: 'Penthouse', VILLA: 'Villa',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mes biens</h1>
          <p className="text-muted-foreground mt-1">{properties.length} bien(s) enregistré(s)</p>
        </div>
      </div>

      {properties.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Building2 className="size-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">Aucun bien enregistré</p>
            <p className="text-sm text-muted-foreground mt-1">Ajoutez votre premier bien immobilier</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p) => (
            <Card key={p.id} className="border-border overflow-hidden hover:shadow-md transition-shadow">
              {p.images?.[0] && (
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <img src={p.images[0].url} alt={p.title} className="size-full object-cover" />
                  <Badge className={`absolute top-2 right-2 ${
                    p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : p.status === 'SUSPENDED' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {p.status === 'ACTIVE' ? 'Actif' : p.status === 'SUSPENDED' ? 'Suspendu' : 'Fermé'}
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
          ))}
        </div>
      )}
    </motion.div>
  )
}
